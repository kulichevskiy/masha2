# SDLC setup execution

User accepted the implementation plan on 2026-10-27 and authorized dependencies, scripts, CRAP, E2E, necessary tests and behavior-preserving refactors. No commit, push or deploy is authorized. CI and remote branch protection are not required by the accepted policy.

## Accepted outcomes

- O1: all production TS/TSX functions have freshly measured CRAP strictly below 30, using classic cyclomatic complexity and per-function branch coverage. No threshold waiver or baseline grandfathering.
- O2: reproducible local Playwright E2E covers public portfolio/booking, password admin login, non-admin denial, upload/edit/order/visibility/logout, gift requests, workshop applications and closed-sales subscriptions. Writes stay in an isolated Supabase stack.
- O3: one local verification command propagates failures; sources, versions, commands and evidence are documented. Independent review is required before ready.

## Implementation decisions

Coverage adapter v1 uses Istanbul instrumentation on original TS/TSX before Vite lowering, because ordinary Vite coverage remapping shifted JSX callback coordinates. A custom Vitest coverage provider merges original-coordinate counters and includes unexecuted production files with zero counters. ESLint's built-in classic complexity rule supplies complexity; complete node/declaration coordinates match counters to functions and nested branches belong to the innermost function. Missing/ambiguous mappings fail. Source hashes prevent stale reports. Adapter tests cover nesting, TSX, branchless execution and threshold rejection.

Refactoring preserves existing behavior: API validation is separated by value type, API routing separates upload and read handling, lightbox focus trapping is separate from media keyboard controls, form notification formatting/sending is shared, workshop intake validation and hero pricing have focused helpers. Regression tests retain public contracts.

E2E uses Supabase project masha2-e2e on API 55321/database 55322, separate Next build output .next-e2e and application port 3107. The runner validates the exact local API URL before resetting that test database and seeds synthetic users/data. Resend/PostHog credentials are blank in both build and server environments. No production credentials are written to disk. Browser screenshots/traces remain in ignored local output.

## Environment resolution

Docker's 23.5 GB filesystem was full. User authorized deletion of unused build cache only; docker builder prune reclaimed 438.3 MB, preserving other data. A temporary host-backed PostgreSQL volume let PostgreSQL run, but API gateway startup still failed on the full Docker disk. The temporary volume was removed once no longer needed.

The final verified solution uses Supabase CLI 2.122.0 native runtime, with isolated state/cache in e2e/.runtime/supabase and pinned service assets in e2e/supabase/supabase.lock. This avoided any restart or further cleanup of unrelated Docker services. The user separately requested cleanup of loop containers: loop-api-1 and loop-worker-1 were removed, preserving loop_sensor_data and images. No other project's persistent data was deleted.

The runner clears ambient SUPABASE_* overrides, verifies its exact local API address before reset, and stops the dedicated stack in finally, including on bootstrap failures. Port checks after final verification found no listeners on application port 3107 or API port 55321.

## Final verification receipts

On 2026-10-27, `pnpm verify` completed with exit 0 on the uncommitted tree based on d699acfe0252b2359431f376edca744c71932aaf. The full command ran sequentially with no source changes during verification.

| Check | Scope/result | Evidence |
| --- | --- | --- |
| Lint | PASS; five existing warnings, no errors | evidence/setup-verify.log |
| Unit/integration/tooling | PASS; 65 files, 370 tests | evidence/setup-verify.log |
| CRAP | PASS; all 880 functions in 125 production files; maximum 29.179549155302254, strictly below 30 | setup-verification.json; ignored coverage/crap.json and coverage/crap.txt |
| Normal production build | PASS; full Next.js application | evidence/setup-verify.log |
| Isolated E2E production build | PASS; local Supabase environment and .next-e2e output | evidence/setup-verify.log |
| E2E | PASS; all six executions, zero retries/failures, 9.5 seconds | evidence/setup-verify.log; ignored playwright-report/ |
| TypeScript | PASS; pnpm exec tsc --noEmit after both builds | Full verify exit 0 |
| Whitespace | PASS; git diff --check | Full verify exit 0 and final documentation check |
| Independent review | PASS; both intent/spec and correctness/standards | setup-review.md; setup-review-snapshot.json |

Source inventory hashes are retained in setup-verification.json; intended change hashes are retained in setup-review-snapshot.json. Coverage collection detects modified source inputs and scoring rejects stale inputs. Adapter regression tests reject missing coverage, incomplete branch counters, unauthorized ignore pragmas and a score exactly 30 with nonzero exits.

Build output retains baseline warnings about the external workspace lockfile, stale browser mapping data and Node deprecations. E2E explicitly logs that Resend is disabled; no external mail or production mutations occurred. Chromium desktop covers the full scenarios; mobile Chromium covers public navigation/images/booking. Docker runtime and Google OAuth were not claimed as verified.

## Independent review and closure

An independent read-only reviewer checked the pinned code/test snapshot and refreshed its review after fixes. It reported PASS on both axes with no remaining blocking findings. Findings about incomplete branch counters/ignore pragmas, explicit visibility transitions, persisted ordering and workshop errors were addressed with strengthened checks/tests. Final documentation-only status and receipt changes do not alter tested implementation inputs.

Status: ready. No setup gaps remain under the accepted local-enforcement policy. No commit, push, PR, merge, production migration or deployment was performed by this setup task.

## Full-send delivery run — 2026-10-27

User explicitly requested full send after accepting the ready setup. This supersedes the initial local-only delivery restriction for this run and authorizes scoped commit, task-branch push, PR creation, review-trigger comments/replies and squash merge after all gates pass. It does not authorize production mutations or a manual deployment.

Starting point: accepted and independently reviewed setup implementation; pnpm verify exit 0 (370 tests, six E2E, CRAP maximum 29.179549155302254). Snapshot implementation hashes still match. Refreshed origin/main is 2cc8d4539319e5314bbf777a258537553e26f2c8, the squash of the preceding SEO task; its source tree is identical to the previously verified d699acfe0252b2359431f376edca744c71932aaf base. No implementation re-verification is invalidated by that SHA-only change.

Task branch: codex/sdlc-verification. Main has no branch protection or rulesets at inspection; existing external checks and review results still must be inspected. Preserve unrelated .claude/launch.json and supabase/.temp changes. Next action: commit the scoped snapshot, push, create PR, request fresh current-head Codex review, monitor external checks/findings, then merge with expected-head guard and verify the remote target state.
