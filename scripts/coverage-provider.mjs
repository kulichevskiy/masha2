// Source-coordinate Istanbul provider v1. Instrument before TS/JSX lowering;
// do not remap already-original coordinates through Vite a second time.
const provider = {
  startCoverage() {
    globalThis.__coverage__ = {}
  },
  takeCoverage() {
    return globalThis.__coverage__ || {}
  },
  stopCoverage() {},
  async getProvider() {
    const { createCoverageMap } = (await import('istanbul-lib-coverage')).default
    const { createInstrumenter } = await import('istanbul-lib-instrument')
    const { readFileSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs')
    const { createHash } = await import('node:crypto')
    const snapshot = () =>
      Object.fromEntries(
        productionFiles().map((file) => [
          file,
          createHash('sha256').update(readFileSync(file)).digest('hex'),
        ]),
      )
    const { productionFiles } = await import('./coverage-scope.mjs')
    return new (class {
      name = 'source-istanbul'
      initialize(ctx) {
        this.ctx = ctx
        this.map = createCoverageMap({})
        this.snapshot = snapshot()
      }
      resolveOptions() {
        return this.ctx.config.coverage
      }
      clean() {
        rmSync('coverage', { recursive: true, force: true })
        this.map = createCoverageMap({})
      }
      onAfterSuiteRun({ coverage }) {
        if (coverage) this.map.merge(coverage)
      }
      generateCoverage() {
        for (const file of productionFiles()) {
          if (this.map.files().includes(file)) continue
          const instrumenter = createInstrumenter({
            esModules: true,
            parserPlugins: ['typescript', 'jsx'],
          })
          instrumenter.instrumentSync(readFileSync(file, 'utf8'), file)
          this.map.addFileCoverage(instrumenter.lastFileCoverage())
        }
        return this.map
      }
      reportCoverage(map) {
        if (JSON.stringify(snapshot()) !== JSON.stringify(this.snapshot))
          throw new Error('Source changed during coverage run')
        mkdirSync('coverage', { recursive: true })
        writeFileSync('coverage/coverage-final.json', JSON.stringify(map.toJSON()))
        writeFileSync('coverage/source-hashes.json', JSON.stringify(this.snapshot))
        console.log(
          `Source Istanbul coverage: ${map.files().length} files; ${JSON.stringify(map.getCoverageSummary().toJSON())}`,
        )
      }
    })()
  },
}

export default provider
