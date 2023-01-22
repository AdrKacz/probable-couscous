const puppeteer = require('puppeteer')
const betclic = require('./betclic')
const winamax = require('./winamax')

const fs = require('fs')

module.exports = async () => {
  const browser = await puppeteer.launch()

  const pages = await Promise.allSettled([
    betclic(browser),
    winamax(browser)
  ])

  const matches = link(pages)

  console.log(matches)
  console.log(Object.keys(matches).length)

  fs.writeFileSync(`football ${(new Date()).toDateString()}.json`, JSON.stringify(matches))

  await browser.close()
}

/** @function link
 * TODO Link team with similar name
 * NOTE Can remove matchs that doesn't have a pair
 *  If you do so, it goes from 832 to 182 (155 before removing invisible char) for football
*/
function link (pages) {
  const matches = {}
  for (const rawPage of pages) {
    const page = rawPage.value
    for (const [key, value] of Object.entries(page.matches)) {
      const match = { ...value, platform: page.platform }
      if (key in matches) {
        matches[key].push(match)
      } else {
        matches[key] = [match]
      }
    }
  }

  return matches
}

if (require.main === module) {
  module.exports()
}
