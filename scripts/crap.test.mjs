// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createInstrumenter } from 'istanbul-lib-instrument'
import { functions, measure, passes } from './crap.mjs'

describe('CRAP adapter', () => {
  it('counts classic branches and isolates nested functions, including TSX', () => {
    const found = functions(
      'export function View({x}: {x:boolean}) { const nested = () => x ? 1 : 0; return <button onClick={() => nested()}>{x && "yes"}</button> }',
      'view.tsx',
    )
    expect(found.map((fn) => fn.complexity).sort()).toEqual([1, 2, 2])
  })
  it('does not accept exactly 30, empty or invalid scores', () => {
    expect(passes([{ score: 29.999 }])).toBe(true)
    expect(passes([{ score: 30 }])).toBe(false)
    expect(passes([])).toBe(false)
    expect(passes([{ score: NaN }])).toBe(false)
  })
  it('uses execution for branchless functions and rejects missing mappings', () => {
    const fn = {
      name: 'f',
      complexity: 1,
      start: { line: 1, column: 0 },
      end: { line: 1, column: 20 },
    }
    const loc = { start: { line: 1, column: 10 }, end: { line: 1, column: 19 } }
    const coverage = { fnMap: { 0: { loc, decl: loc } }, f: { 0: 0 }, branchMap: {}, b: {} }
    expect(measure([fn], coverage)[0]).toMatchObject({ coverage: 0, score: 2 })
    coverage.f[0] = 1
    expect(measure([fn], coverage)[0]).toMatchObject({ coverage: 1, score: 1 })
    expect(() => measure([fn], { ...coverage, fnMap: {} })).toThrow(/Unmapped/)
    expect(() =>
      measure([fn], { ...coverage, fnMap: { 0: { loc, decl: loc }, 1: { loc, decl: loc } } }),
    ).toThrow(/ambiguous/)
  })
  it('maps original coordinates for nested returns, object and class methods', () => {
    const source =
      'const outer = () => () => { if (true) return 1; return 0 }; const obj={get(){return 2}}; class Example {constructor(){this.value=3} read(){return this.value}}'
    const instrumenter = createInstrumenter({ esModules: true })
    instrumenter.instrumentSync(source, 'fixture.ts')
    const rows = measure(functions(source, 'fixture.ts'), instrumenter.lastFileCoverage())
    expect(rows).toHaveLength(5)
    expect(rows.filter((row) => row.complexity === 2)).toHaveLength(1)
    expect(rows.every((row) => row.coverage === 0)).toBe(true)
  })
  it('rejects incomplete branch counters and coverage ignore pragmas', () => {
    const instrumenter = createInstrumenter({ esModules: true })
    const source = 'function branch(x) { if(x) return 1; return 0 }'
    instrumenter.instrumentSync(source, 'fixture.ts')
    const coverage = instrumenter.lastFileCoverage()
    coverage.b[0] = []
    expect(() => measure(functions(source, 'fixture.ts'), coverage)).toThrow(/branch counters/)
    expect(() =>
      functions('/* istanbul ignore next */ function skipped(){return 1}', 'fixture.ts'),
    ).toThrow(/not approved/)
  })
})
