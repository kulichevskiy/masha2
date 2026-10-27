import { productionFiles } from './coverage-scope.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import { createHash } from 'node:crypto'
import { functions, measure, passes } from './crap.mjs'

const root = process.cwd()
const files = productionFiles()
const hashes = JSON.parse(readFileSync('coverage/source-hashes.json', 'utf8'))
if (JSON.stringify(Object.keys(hashes)) !== JSON.stringify(files))
  throw new Error('Coverage file inventory is stale')
const coverage = JSON.parse(readFileSync('coverage/coverage-final.json', 'utf8'))
const rows = []
const inventory = []
for (const file of files) {
  const source = readFileSync(file, 'utf8')
  if (hashes[file] !== createHash('sha256').update(source).digest('hex'))
    throw new Error(`Stale coverage: ${file}`)
  inventory.push({ file, sha256: createHash('sha256').update(source).digest('hex') })
  const fns = functions(source, file)
  if (!fns.length) continue
  const data = coverage[resolve(file)]
  if (!data) throw new Error(`Missing coverage: ${file}`)
  try {
    rows.push(...measure(fns, data).map((row) => ({ file: relative(root, resolve(file)), ...row })))
  } catch (error) {
    throw new Error(file, { cause: error })
  }
}
const report = { adapter: 1, createdAt: new Date().toISOString(), inventory, functions: rows }
writeFileSync('coverage/crap.json', JSON.stringify(report, null, 2))
const failed = rows.filter((row) => row.score >= 30)
writeFileSync(
  'coverage/crap.txt',
  rows
    .map(
      (row) =>
        `${row.score.toFixed(3)}\tC=${row.complexity}\tB=${(row.coverage * 100).toFixed(1)}%\t${row.file}:${row.start.line} ${row.name}`,
    )
    .join('\n'),
)
console.log(`CRAP: ${rows.length} functions in ${files.length} files; ${failed.length} failures`)
for (const row of failed)
  console.error(
    `${row.file}:${row.start.line} ${row.name}: C=${row.complexity}, B=${row.coverage.toFixed(3)}, CRAP=${row.score.toFixed(3)}`,
  )
if (!passes(rows)) process.exitCode = 1
