import { productionFiles } from './coverage-scope.mjs'
import { createInstrumenter } from 'istanbul-lib-instrument'
export function sourceCoverage() {
  const eligible = new Set(productionFiles())
  return {
    name: 'source-coordinate-coverage',
    enforce: 'pre',
    transform(code, id) {
      if (!process.argv.some((arg) => arg.startsWith('--coverage'))) return
      const file = id.split('?')[0]
      if (!eligible.has(file)) return
      const instrumenter = createInstrumenter({
        esModules: true,
        produceSourceMap: true,
        coverageGlobalScope: 'globalThis',
        coverageGlobalScopeFunc: false,
        parserPlugins: ['typescript', 'jsx'],
        compact: false,
      })
      return { code: instrumenter.instrumentSync(code, file), map: instrumenter.lastSourceMap() }
    },
  }
}
