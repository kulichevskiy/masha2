import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-e2e/**",
    "e2e/.runtime/**",
    "coverage/**",
    "test-results/**",
    "playwright-report/**",
    ".pnpm-store/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Design system is a reference bundle (HTML prototypes, JSX kits). Not production code.
    "design-system/**",
  ]),
]);

export default eslintConfig;
