# Project SDLC profile

Status: ready
Policy acceptance: User accepted this profile and the concrete implementation plan on 2026-10-27: Strict without mutation, all-production CRAP scope, all E2E scenarios below, PR delivery policy, and mandatory local checks plus independent review without mandatory CI. Implementation, dependencies, tests and necessary refactoring were authorized for initial setup. Subsequent per-run delivery authorization is recorded in setup-execution.md.
Verification profile: Strict; explicit override: mutation testing not required.
Artifact root: docs/
Change-directory pattern: feat-{slug}
Slug: proposed by capture-intent
Task source of truth: Git files
Delivery: one codex/* integration branch and PR per change, targeting main when publishing is authorized.
Delegation: sequential implementation by default; independent read-only review for acceptance. Coordinator self-review does not count as independent approval.

## Standards sources

- [Repository instructions](../../CLAUDE.md): always use pnpm; migrations use UTC `YYYYMMDDHHmmss_short_description.sql`; every new table enables RLS.
- [Adopted UI guidelines](../../design-system/README.md).
- Existing strict TypeScript, ESLint Next.js presets and Vitest tests are retained. No additional architecture convention is adopted implicitly.
- Separate baseline warnings from new failures; unavailable checks never pass. Required thresholds cannot be relaxed or exclusions widened to make a change pass.

## Verification

| Gate | Requirement | Command | Scope and pass condition | Evidence | Enforcement |
| --- | --- | --- | --- | --- | --- |
| Lint | Required | `pnpm lint` | Repository ESLint scope; exit 0, baseline warnings distinguished | [PASS, 2026-10-27](setup-verification.json) | Local delivery gate |
| Typecheck | Required | `pnpm exec tsc --noEmit` | tsconfig, including generated application types; exit 0 | [PASS, 2026-10-27](setup-verification.json) | Local delivery gate |
| Unit/integration | Required | `pnpm test` (included in coverage gate during verify) | All Vitest tests, including components, SQL contracts and tooling; all pass | [PASS, 2026-10-27](setup-verification.json) | Local delivery gate |
| Production build | Required | `pnpm build` | Full Next.js application, normal production configuration; exit 0 | [PASS, 2026-10-27](setup-verification.json) | Local delivery gate |
| Whitespace | Required | `git diff --check` | Entire intended diff; exit 0 | [PASS, 2026-10-27](setup-verification.json) | Local delivery gate |
| E2E | Required | `pnpm test:e2e` | All six browser scenarios below; no retries, skips or failures | [PASS, 2026-10-27](setup-verification.json) | Local delivery gate |
| CRAP | Required | `pnpm check:crap` | Every production TS/TSX function strictly <30; fresh complete mappings/counters | [PASS, 2026-10-27](setup-verification.json) | Local delivery gate |
| Mutation | Explicitly not required | None | User-selected override | Deliberately disabled | Not required |
| Independent review | Required | Separate read-only reviewer | Intent/outcomes and correctness/standards; explicit no-blockers verdict on current snapshot | [PASS, independent review](setup-review.md) | Local review gate |

Fast feedback: targeted Vitest files, TypeScript and lint; `pnpm test:e2e --project desktop --grep '<scenario>'` is available for diagnosis, but does not replace the complete E2E gate.
Full pre-merge verification: `pnpm verify` runs lint → full tests with fresh coverage/CRAP → normal production build → E2E (including its separate production build) → typecheck → whitespace. Every failure propagates as a nonzero exit.

### CRAP method, scope and artifacts

Adapter version: 1 (`scripts/crap.mjs`, `scripts/coverage-provider.mjs`, `scripts/coverage-plugin.mjs`, `scripts/coverage-scope.mjs`, `scripts/check-crap.mjs`). New adapter dependencies use exact package.json versions; existing tool versions are resolved by pnpm-lock.yaml (install with `pnpm install --frozen-lockfile`): Vitest 4.1.7, ESLint 9.39.1, @typescript-eslint/parser 8.72.1, istanbul-lib-instrument 6.0.3, istanbul-lib-coverage 3.2.2. Runtime observed during setup: Node 26.9.0 and pnpm 11.17.0; these observations do not silently establish new runtime pins.

Complexity C uses ESLint's built-in classic cyclomatic code-path rule, including its handling of logical operators, defaults, optional chaining and nested functions. Coverage B is the fraction of executed Istanbul branch alternatives owned by each function, in [0,1]. Branches belong to the innermost enclosing function. For a function with no branch alternatives, B is 1 only when its function counter is positive, otherwise 0. Formula: `C^2 * (1 - B)^3 + C`; compare the unrounded score strictly against 30.

The custom Vitest provider instruments original TS/TSX before Vite lowering, merges original-coordinate Istanbul counters and adds zero counters for unexecuted files. This avoids the JSX coordinate shifts observed with post-transform coverage. Match each source function to exactly one original declaration coordinate; account for methods and nested returned functions. Missing, duplicate or ambiguous mappings, extra unmapped coverage functions, missing/invalid counters and an empty function inventory fail. Coverage ignore pragmas are forbidden; any intentional exclusion requires a separately accepted policy revision.

The shared file inventory recursively includes production `.ts`/`.tsx`, including operational scripts and root instrumentation. Exclude tests (`*.test.*`, `*.spec.*`), declarations (`*.d.ts`), generated output, dependencies, reference design-system assets, E2E infrastructure and tooling configuration files (next/vitest/playwright/postcss.config). No application directory is grandfathered. ESLint additionally ignores generated E2E/runtime/report files; application lint scope remains intact.

`pnpm check:crap` cleans previous coverage and runs the entire test suite. Source inventory and SHA-256 hashes are captured before tests and checked after collection and before scoring. Changed inputs require recollection. Outputs: `coverage/coverage-final.json`, `coverage/source-hashes.json`, `coverage/crap.json` (inventory and per-function evidence), `coverage/crap.txt` (readable scores). All are ignored local artifacts. Setup baseline violations were fixed without grandfathering or threshold waivers.

### E2E scenarios and isolated environment

Pinned Playwright 1.64.1; Chromium installed with `pnpm exec playwright install chromium`. Run desktop Chromium for all scenarios; mobile Chromium with iPhone 13 viewport for the public scenario. Desktop and mobile public navigation count as separate executions:

1. Public home and all four portfolio sections, actual image loading, navigation to booking (desktop and mobile).
2. Password admin login; real upload to Storage and photo row creation; metadata editing; pointer drag ordering; persisted order after reload; visible → hidden → visible with public presence/absence; logout and protected-route redirect.
3. Signed-in non-admin denial.
4. Gift email validation and persistence of the selected amount.
5. Workshop application validation and persistence; closed-sales subscription rejects missing preferences without writing, then persists a valid choice.

Use the pinned Supabase CLI 2.122.0 and service resolutions in `e2e/supabase/supabase.lock`. The dedicated configuration is `e2e/supabase/config.toml`; its migrations symlink refers to the canonical application migrations. The native runtime is experimental and version-pinned; it runs services as local processes on supported macOS Apple silicon/Linux hosts. `E2E_SUPABASE_RUNTIME=docker` is an explicit alternative requiring a healthy Docker engine and sufficient disk; that alternative was not verified during setup. [Supabase runtime documentation](https://supabase.com/docs/guides/local-development/docker-and-native-runtimes).

Local state and downloaded service artifacts stay in ignored `e2e/.runtime/supabase` through an explicit SUPABASE_HOME. The runner removes ambient SUPABASE_* overrides, starts only its dedicated project, verifies API_URL is exactly `http://127.0.0.1:55321`, then runs `db reset --local --workdir e2e`. Database port is 55322. It seeds synthetic users, admin membership, content, settings and image objects. No production credentials are persisted. Test application origin is `http://localhost:3107`; its production output is `.next-e2e`, separate from normal `.next`. Next image access to loopback is enabled only under SDLC_E2E=1.

Resend and PostHog credentials are blank during both E2E build and runtime. Existing unit tests verify notification payloads through mocked server-side Resend calls; E2E verifies real database submissions without sending external mail. The runner stops its dedicated stack in finally. Traces and screenshots are retained on failures under ignored test-results/; the HTML report is under playwright-report/.

Prerequisites: installed pnpm lockfile dependencies, Chromium, working pinned CLI, enough host disk for native service downloads/data, free local ports 3107/55321/55322/55324, and network access for initial service downloads and Google Fonts during builds. Do not reuse production services for browser writes. Missing infrastructure is a failure, never not-applicable.

Not-applicable policy: no required gate is currently not-applicable. Mutation is explicitly not required.

## PR and delivery gates

Remote repository: https://github.com/kulichevskiy/masha2
Target branch: main
Mandatory CI checks / branch protection: not required by accepted policy. Preserve existing remote checks/protections; no bypass or weakening is authorized. Current remote configuration was not verified and is not a setup gap under this policy.
Reviewer: independent Codex reviewer, with explicit approval/no-blockers verdict covering the current implementation. For local-only setup, record an uncommitted snapshot; for published changes, match verification/review inputs to the current remote PR head.
Blocking findings: no open P0–P2 findings or unresolved blocking discussions.
Merge method: squash.
Commit, push, external review-trigger communication, merge and deployment permissions: explicit per run, recorded in execution.md. The initial setup run was local-only; subsequent delivery grants are recorded in setup-execution.md.

## Setup gaps

None. Full `pnpm verify` exited 0 and independent review passed on both axes. See [verification receipt](setup-verification.json), [review](setup-review.md), [snapshot](setup-review-snapshot.json) and [execution](setup-execution.md). Original task to resume: None; setup was invoked directly.
