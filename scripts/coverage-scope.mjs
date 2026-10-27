import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
const excluded =
  /(?:^|\/)(?:node_modules|\.git|\.next[^/]*|\.pnpm-store|coverage|design-system|e2e|test-results|playwright-report)(?:\/|$)|\.(?:test|spec|d)\.tsx?$/
export function productionFiles(dir = '.') {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const path = `${dir}/${item.name}`
    if (excluded.test(path)) return []
    if (item.isDirectory()) return productionFiles(path)
    return /\.tsx?$/.test(path) &&
      !/(?:^|\/)(?:next|vitest|playwright|postcss)\.config\./.test(path)
      ? [resolve(path)]
      : []
  })
}
