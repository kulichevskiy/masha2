import { Linter } from 'eslint'
import { builtinRules } from 'eslint/use-at-your-own-risk'
import tsParser from '@typescript-eslint/parser'

// Adapter v1. ESLint's own classic code-path rule owns complexity semantics.
// Preserve complete function locations rather than parsing human diagnostics.
export function functions(source, filename) {
  const result = []
  const rule = builtinRules.get('complexity')
  const collect = {
    meta: rule.meta,
    create(context) {
      if (
        context.sourceCode
          .getAllComments()
          .some((comment) => /\b(?:istanbul|c8|v8)\s+ignore\b/.test(comment.value))
      ) {
        throw new Error('Coverage ignore pragmas are not approved exclusions')
      }
      const adapted = Object.create(context)
      Object.defineProperty(adapted, 'report', {
        value(descriptor) {
          result.push({
            name: descriptor.data.name,
            complexity: descriptor.data.complexity,
            start:
              descriptor.node.parent?.type === 'MethodDefinition' ||
              descriptor.node.parent?.method === true
                ? descriptor.node.parent.loc.start
                : descriptor.node.loc.start,
            end: descriptor.node.loc.end,
          })
        },
      })
      return rule.create(adapted)
    },
  }
  const errors = new Linter().verify(
    source,
    [
      {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
          parser: tsParser,
          parserOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            ecmaFeatures: { jsx: true },
          },
        },
        plugins: { measure: { rules: { complexity: collect } } },
        rules: { 'measure/complexity': ['error', { max: 0, variant: 'classic' }] },
      },
    ],
    { filename, allowInlineConfig: false },
  )
  if (errors.length) throw new Error(`${filename}: ${JSON.stringify(errors)}`)
  return result
}
const before = (a, b) => a.line < b.line || (a.line === b.line && a.column <= b.column)
const contains = (fn, loc) => before(fn.start, loc.start) && before(loc.end, fn.end)
export function measure(sourceFunctions, coverage) {
  for (const [id, branch] of Object.entries(coverage.branchMap)) {
    const counters = coverage.b[id]
    if (
      !Array.isArray(counters) ||
      !Array.isArray(branch.locations) ||
      counters.length !== branch.locations.length ||
      counters.length === 0 ||
      counters.some((count) => !Number.isSafeInteger(count) || count < 0)
    ) {
      throw new Error(`Missing or invalid branch counters ${id}`)
    }
  }
  const used = new Set()
  const measured = sourceFunctions.map((fn) => {
    // Function bodies are smaller than their declarations in Istanbul maps.
    const ownsDeclaration = (owner, item) =>
      before(owner.start, item.decl.start) && before(item.decl.start, owner.end)
    const candidates = Object.entries(coverage.fnMap)
      .filter(([, item]) => ownsDeclaration(fn, item))
      .filter(
        ([, item]) =>
          !sourceFunctions.some(
            (child) => child !== fn && contains(fn, child) && ownsDeclaration(child, item),
          ),
      )
    if (candidates.length !== 1)
      throw new Error(
        `Unmapped/ambiguous function ${fn.name} at ${fn.start.line}:${fn.start.column}`,
      )
    const [id] = candidates[0]
    if (used.has(id)) throw new Error(`Duplicate mapping ${id}`)
    used.add(id)
    if (!Number.isFinite(coverage.f[id]) || coverage.f[id] < 0)
      throw new Error(`Missing function counter ${id}`)
    const branches = Object.entries(coverage.branchMap)
      .filter(([, branch]) => contains(fn, branch.loc))
      .filter(
        ([, branch]) =>
          !sourceFunctions.some(
            (child) => child !== fn && contains(fn, child) && contains(child, branch.loc),
          ),
      )
      .flatMap(([key]) => coverage.b[key])
    const covered = branches.filter((n) => n > 0).length
    const fraction = branches.length ? covered / branches.length : coverage.f[id] > 0 ? 1 : 0
    const score = fn.complexity ** 2 * (1 - fraction) ** 3 + fn.complexity
    return { ...fn, coverage: fraction, branches: branches.length, hits: coverage.f[id], score }
  })
  if (used.size !== Object.keys(coverage.fnMap).length)
    throw new Error('Unmapped coverage functions')
  return measured
}
export function passes(rows) {
  return rows.length > 0 && rows.every((row) => Number.isFinite(row.score) && row.score < 30)
}
