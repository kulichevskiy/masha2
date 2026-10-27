// @vitest-environment node
import { it, expect } from 'vitest'
import { mkdtempSync, realpathSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createInstrumenter } from 'istanbul-lib-instrument'

it('CLI rejects stale, missing and threshold-30 coverage with a nonzero exit', () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'masha-crap-')))
  const command = resolve('scripts/check-crap.mjs')
  const file = join(dir, 'fixture.ts')
  const run = () => spawnSync(process.execPath, [command], { cwd: dir, encoding: 'utf8' })
  const seed = (source) => {
    writeFileSync(file, source)
    const instrumenter = createInstrumenter({ esModules: true })
    instrumenter.instrumentSync(source, file)
    mkdirSync(join(dir, 'coverage'), { recursive: true })
    writeFileSync(
      join(dir, 'coverage/coverage-final.json'),
      JSON.stringify({ [file]: instrumenter.lastFileCoverage() }),
    )
    writeFileSync(
      join(dir, 'coverage/source-hashes.json'),
      JSON.stringify({ [file]: createHash('sha256').update(source).digest('hex') }),
    )
  }
  try {
    seed('function simple() { return 1 }')
    expect(run().status).toBe(0)
    writeFileSync(file, 'function changed() { return 2 }')
    expect(run().status).not.toBe(0)
    seed('function simple() { return 1 }')
    writeFileSync(join(dir, 'coverage/coverage-final.json'), '{}')
    expect(run().status).not.toBe(0)
    seed(
      'function boundary(x) { if(x===0)return 0; if(x===1)return 1; if(x===2)return 2; if(x===3)return 3; return 4 }',
    )
    const rejected = run()
    expect(rejected.status).toBe(1)
    expect(rejected.stderr).toContain('CRAP=30.000')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
