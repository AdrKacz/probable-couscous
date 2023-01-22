const puppeteer = require('puppeteer')
const { setTimeout } = require('timers/promises')

module.exports = async (browser) => {
  const page = await browser.newPage()

  // await page.goto('https://www.winamax.fr/paris-sportifs/')
  await page.goto('https://www.winamax.fr/paris-sportifs/sports/1')

  // Wait to refuse cookies
  await validateCookies(page)

  // Wait for the results page to load and display the results.
  const matchBoxSelector = 'a[href^="/paris-sportifs/match/"]'
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

    await setTimeout(250) // time to load new content
  }

  // console.log(matches)
  // console.log(Object.keys(matches).length)

  return { matches, platform: 'winamax' }
}

async function getProperty (handle, property) {
  return await (await handle.getProperty(property)).jsonValue()
}

async function getDetails (matchBox) {
  // use only-child because when it is not it means it is a different type of bet
  // for example "first to score" or "points difference", which is not handled
  const oddSelector = 'div.bet-group-template:only-child div.bet-group-outcome-odd > div:first-of-type'
  const oddDivs = await matchBox.$$(oddSelector)

  if (oddDivs.length === 0) {
    throw new Error('cannot find bet group outcomme odd')
  }

  const odds = {}
  const teams = []
  for (const oddDiv of oddDivs) {
    const innerText = await getProperty(oddDiv, 'innerText')
    let [team, oddString] = innerText.split('\n')

    team = team === 'Match nul' ? 'Draw' : team

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
  const selector = '//button[contains(., "Tout refuser")]'
  await page.waitForXPath(selector)
  for (const button of await page.$x(selector)) {
    try {
      await button.click()
    } catch (error) {
      console.log('cannot click on this button')
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
