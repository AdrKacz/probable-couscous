const puppeteer = require('puppeteer')
const { setTimeout } = require('timers/promises')

/*
* IMPORTANT
* Some team have different name on different platform
* Example
* Winamax: 'Airbus UK - The New Saints': { 'The New Saints': 1.01, Draw: 9, 'Airbus UK': 26 },
* Betclic: 'Airbus - New Saints': { 'New Saints': 1.01, Draw: 17.75, Airbus: 22 },
*/

module.exports = async (browser) => {
  const page = await browser.newPage()
  // page.setViewport({width: 1200, height: 854}) // debug
  // await page.goto('https://www.betclic.fr/') // need to be in France
  await page.goto('https://www.betclic.fr/football-s1')

  // Wait to refuse cookies
  await validateCookies(page)

  // Wait for the results page to load and display the results.
  const matchBoxSelector = 'sports-events-event'
  await page.waitForSelector(matchBoxSelector)

  // Extract the results from the page.
  const matches = {}
  let previousLastMatch
  while (true) {
    const matchBoxes = await page.$$(matchBoxSelector)
    const lastMatchBox = matchBoxes[matchBoxes.length - 1]
    let lastMatch
    try {
      ({ match: lastMatch } = await getDetails(lastMatchBox))
    } catch (error) {
      console.error(error.message)
    }

    if (previousLastMatch === lastMatch) {
      break
    }

    await Promise.allSettled(matchBoxes.map(async (matchBox) => {
      try {
        const { match, odds } = await getDetails(matchBox)
        matches[match] = odds
      } catch (error) {
        console.error(error.message)
      }
    }))

    // console.log(`Last read match: ${lastMatch}`)

    previousLastMatch = lastMatch
    try {
      await lastMatchBox.hover()
    } catch (error) {
      console.error(error.message)
    }

    await setTimeout(1000) // time to load new content
  }

  // console.log(matches)
  // console.log(Object.keys(matches).length)

  return { matches, platform: 'betclic' }
}

async function getProperty (handle, property) {
  return await (await handle.getProperty(property)).jsonValue()
}

async function getDetails (matchBox) {
  const oddSelector = 'sports-selections-selection > div:first-of-type'
  const oddDivs = await matchBox.$$(oddSelector)

  if (oddDivs.length === 0) {
    throw new Error('cannot find sports selections selection')
  }

  const odds = {}
  const teams = []
  for (const oddDiv of oddDivs) {
    // innerText has some invisible char hard to parse
    // so two team name that look the same could be different
    const title = await getProperty(oddDiv, 'title')
    let team = title
    team = team === 'Nul' ? 'Draw' : team

    const innerText = await getProperty(oddDiv, 'innerText')
    const splittedInnerText = innerText.split('\n')
    const oddString = splittedInnerText[splittedInnerText.length - 1]
    const oddFloat = parseFloat(oddString.replace(',', '.'))

    if (!isNaN(oddFloat)) {
      odds[team] = oddFloat
    }

    if (team !== 'Draw') {
      teams.push(team)
    }
  }

  teams.sort()
  return {
    match: teams.join(' - '),
    odds
  }
}

async function validateCookies (page) {
  const selector = '//button[contains(., "Continuer sans accepter")]'
  await page.waitForXPath(selector)
  for (const button of await page.$x(selector)) {
    try {
      await button.click()
    } catch (error) {
      console.log('Cannot click on this button')
    }
  }
}

if (require.main === module) {
  (async () => {
    const browser = await puppeteer.launch()
    await module.exports(browser)
    await browser.close()
  })()
}
