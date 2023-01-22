const fs = require('fs')

module.exports = async (filename) => {
  const matches = JSON.parse(fs.readFileSync(filename))

  filter(matches)
  for (const [key, value] of Object.entries(matches)) {
    findArbitrage(key, value)
  }

//   console.log(JSON.stringify(transformedMatches, null, 2))
//   console.log(Object.keys(transformedMatches).length)
}

/** @function filter
 * Remove matches that don't have at least two platform
*/
function filter (matches) {
  const keys = Object.keys(matches)
  for (const key of keys) {
    if (matches[key].length <= 1) {
      delete matches[key]
    }
  }
}

function* arbitrageIterator (numberOfPlatforms, numberOfOutcomes) {
    let index = 0
    const state = new Array(numberOfOutcomes).fill(0)
    const endState = new Array(numberOfOutcomes).fill(numberOfPlatforms - 1)

    while (state.join('.') !== endState.join('.')) {
        yield state
        index += 1
        let localIndex = index
        for (let i = 0; i < numberOfOutcomes; i++) {
            state[i] = localIndex % numberOfPlatforms
            localIndex = Math.floor(localIndex / numberOfPlatforms)
        }
    }
    yield state
}

function getOutcomes(teams, sport) {
    if (sport === 'football') {
        return [...teams, 'Draw']
    } else {
        return teams
    }
}

function findArbitrage (name, match) {
    const outcomes = getOutcomes(name.split(' - '), 'football')
    for (const state of arbitrageIterator(match.length, outcomes.length)) {
        p = 0.
        for (let i = 0; i < state.length; i++) {
            const s = state[i]
            const o = outcomes[i]
            p += 1 / match[s][o]   
        }

        if (p < 1) {
            console.log(`[${name}] arbitrage (${state}), p = ${(p * 100).toFixed(2)} %`)
            return state
        }
    }
}

if (require.main === module) {
    let filename = process.argv.slice(2)[0]
    if (typeof filename === 'undefined') {
        filename = `football ${(new Date()).toDateString()}.json`
    }
  module.exports(filename)
}
