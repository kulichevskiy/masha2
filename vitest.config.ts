import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { sourceCoverage } from './scripts/coverage-plugin.mjs'

export default defineConfig({
  plugins: [sourceCoverage()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['{app,lib,components,hooks,scripts}/**/*.{test,spec}.{ts,tsx,mjs}'],
    coverage: {
      provider: 'custom',
      customProviderModule: './scripts/coverage-provider.mjs',
      reporter: ['json', 'text-summary'],
      include: ['**/*.{ts,tsx}'],
      exclude: [
        '**/*.{test,spec}.{ts,tsx}',
        '**/*.d.ts',
        '**/node_modules/**',
        '**/.next*/**',
        '**/design-system/**',
        '**/e2e/**',
        '**/coverage/**',
        '**/*config.*',
        '**/test-results/**',
        '**/playwright-report/**',
      ],
      clean: true,
    },
  },
})
