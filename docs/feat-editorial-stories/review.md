# SDLC review — editorial stories

Sources: intent/spec/plan revision 1 (agent-accepted under full-send delegation), tickets T01–T04, `CLAUDE.md`, `design-system/README.md`, `docs/sdlc/project.md`. Base `562aae3e85d9e2e295c760f056d236b4cf78dd11`; reviewed head: the uncommitted working tree on `codex/editorial-stories` (final snapshot is the implementation commit named in `execution.md`).

Reviewer: an independent read-only subagent, separate from the implementing session; it ran focused Vitest files, the full migration chain test, `git diff --check` and ESLint on the new files. The coordinator did not review its own work for approval. Remote Codex review follows on the PR.

## Pass 1 — Intent and Spec: PASS with suggestions (all addressed)

O1–O5 / R1–R6 judged met with code and test evidence (cover-only tiles with `aria-label`, feed order and photo-less stories dropped, header/credits/nav from fixtures, 404 via `notFound()`, admin lifecycle with validation and slot reuse, gift plate classes, metadata, section nav, types, README, E2E seed).

| Finding | Severity | Disposition |
| --- | --- | --- |
| `loadPublicStories` relied on RLS alone, so a signed-in admin saw hidden stories on the public pages | P1 | Fixed: `.eq('visible', true)` plus a loader test asserting the filter |
| The E2E "hidden story is a 404" used the admin's cookies and passed only because the story had no photos | P1 | Fixed: the check runs after a photo is added, through the cookie-less `request` fixture (page 404, feed without the tile) and also for the signed-in owner; PGlite test now switches to `anon` and asserts only visible stories and their join rows are readable, writes refused |
| Flat-feed fallback untested | P2 | Fixed: `editorial-feed.server.test.tsx` covers fallback and tile selection |
| Action tests assert op sequences | P2 | Accepted as is: outcomes are asserted alongside; sequences matter for the ordering guarantee below |
| Scope note: shared `toLightboxPhoto` rewires all feeds; `requireAdmin` duplicated | P2 | Mapper kept (behaviour-preserving, covered by `masonry-grid.test.tsx`); duplication removed — `actions.ts` now imports the shared `requireAdmin` |

## Pass 2 — Standards and correctness: PASS with suggestions (all addressed)

Documented rules satisfied: UTC migration name, RLS on both new tables with per-role policies, `pnpm`, feed grammar (no captions, radius 0, plate, 500 ms hover). Security: anon reads visible rows only, photos stay behind the existing `pages` policy, slugs matched in memory, every action gated by `requireAdmin` and backed by RLS. Next.js usage (awaited params, `notFound()`, `generateMetadata`) and admin accessibility judged good.

| Finding | Severity | Disposition |
| --- | --- | --- |
| `'use server'` module exported string constants (build failure) | P0 (earlier snapshot) | Fixed before the review completed: constants moved to `story-messages.ts` |
| `setStoryPhotos` deleted all join rows before inserting | P2 | Fixed: upsert the new sequence first, then delete rows not in it; a failing upsert leaves the story intact (tests updated) |
| Stories loaded twice per request (`generateMetadata` + page) | P2 | Fixed: React `cache()` wrapper in the route module |
| Circular import between `stories-table` and `story-row`/`story-editor` | P2 | Fixed: `story-types.ts` holds the shared types and `thumbnailUrl` |
| README typography/borders rows contradicted the new stories bullet | P2 | Fixed: Roboto Mono row and the borders rule updated |

## Evidence and limits

Verification receipts are in `execution.md` (final `pnpm verify` log under `evidence/verify.log`). The review covers the local implementation; applying the migration to the production database and the owner's content entry are release steps outside this change. No remaining P0–P2 finding is open on the final snapshot; the fixes were re-checked by the same independent reviewer (see `execution.md`).
