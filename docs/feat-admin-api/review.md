# SDLC review

Sources: accepted intent/spec/plan revision 1; project `CLAUDE.md`, design-system README and SDLC profile. Base: `d34a9f95a965ee4e369db248055e3172cc5f3794`. Reviewed head is the uncommitted implementation recorded in `review-snapshot.json`; reviewers checked every recorded file hash. No remote head exists for this local-only task.

## Intent and Spec — PASS

Independent read-only reviewer covered I1–I6 and S1–S7: complete current admin resource/field coverage, PAT lifecycle and UI-only management, client upload preparation and recovery, immediate application and concurrency preconditions, journal, public docs, validation and persistence isolation. No remaining blocking findings after re-review.

## Standards and correctness — PASS

Read-only reviewer covered authentication, revocation/membership checks, input schemas and HTML sanitization, safe errors/auditing, public routes/docs, PAT masking and hashing, CLI secret/redirect/subprocess handling and SQL integration. All new tables enable RLS, migration filename uses UTC format, and changes follow pnpm/repository conventions.

Independence disclosure: the correctness reviewer originally authored SQL/types/database tests; the separate intent/spec reviewer independently inspected SQL and found the locking/order issues below. Coordinator's subsequent SQL fixes were inspected by both reviewers. Neither reviewer merely treated a worker completion message as approval.

## Resolved blocking findings

| Finding and trigger | Consequence / requirement | Resolution and evidence |
| --- | --- | --- |
| Upload-session start used direct insert after authentication | Revocation race and non-atomic success journal / S1,S5 | Sign destinations first, then `begin-upload` RPC locks/checks access and commits session plus journal; HTTP/SQL regression tests |
| Completion OpenAPI alternatives lacked required discriminators | Every result matched both `oneOf` alternatives / I6,S4 | Required media columns and strict bucket/path page result; schema regression |
| Reorder acquired table lock before row, ordinary update did reverse | Concurrent operations could deadlock / S3 | Uniform table-before-row locking; independent SQL re-review |
| Existing equal positions were reused unchanged | A successful reorder could fail to honor requested visual order / S3 | Deterministic rank normalization under lock, preserving omitted visual slots; whole-order and stale-version regression |
| Read schemas inherited stricter PATCH constraints | Existing UI placeholders/legacy content violated published response schema / I1,I6 | Separate output shapes; empty-gallery and legacy-day response fixtures, retained strict write validation |

Nonblocking nullable `audit-log.token_id` schema mismatch was also fixed. UI asynchronous tests now wait for controls/alerts to finish transitioning while retaining original assertions.

## Evidence and limits

Coordinator full result: 35 files / 256 tests passed; typecheck, build, lint and whitespace checks passed (baseline warnings documented). Local HTTP and documentation browser smoke passed. Detailed receipts are in `execution.md`.

Review verdict covers local implementation, not deployment verification. No live Supabase/storage mutations were executed. PGlite tests validate SQL behavior but not real multi-connection PostgreSQL stress; locking changes were reviewed statically. No outstanding local implementation blocker remains.

## External PR review follow-up

The independent local verdict above covered initial snapshot `414e4b72ec0cb3d02d99eaf75ae717e9fd8ae63a2df58d3c8c12082ef89f1ad1`. Remote Codex review of `5dde918` subsequently found the conditional-update revocation race in `lib/admin-api/auth.ts`. Its regression failed before the change and passes after requiring a matched active token row. The current `review-snapshot.json` contains the corrected implementation. Full suite now passes 257 tests; fresh remote review is required for the fix commit. Final current-head outcome is recorded by GitHub and in the task delivery message.
