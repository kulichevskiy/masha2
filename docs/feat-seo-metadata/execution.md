# SEO metadata delivery

## Scope and authorization

Task source: the user's requests in this chat on 2026-10-27:

- Generate `/sitemap.xml` automatically during the site build.
- Give every page its own canonical link.
- Fix social preview image URLs pointing at localhost.
- Create a PR, babysit it, and merge after verification and review.

This is a standalone change. Separate intent/spec/plan/tickets were not created;
requirements are recovered directly from the explicit user requests. Verification
policy: `docs/sdlc/project.md`; standards: `CLAUDE.md`.

Base: `058619fe28ec2fed3623bf5157c3eb33d02dd3da` (`origin/main`).
Branch: `codex/seo-sitemap-canonicals`.
Excluded unrelated files: `.claude/launch.json`, `supabase/.temp/*`.

## Implementation

- A force-static Next.js sitemap route produces ten public URLs at build time;
  portfolio section URLs reuse `PHOTO_PAGE_PATHS`.
- All 17 page routes have their own canonical path, resolved using `metadataBase`.
  Authentication/admin pages retain their existing noindex settings.
- `SITE_URL` uses `NEXT_PUBLIC_SITE_URL`, defaulting to `https://chevskaya.com`.
- Open Graph and Twitter image URLs are explicit absolute URLs. PNG generation
  uses explicit static route handlers at the original image paths and a shared
  renderer. This avoids Next.js 16.0.7's file-based metadata overriding the URLs
  with localhost during development. Workshop hero previews remain supported.

## Verification receipts

Checked input: the final app/lib/README implementation tree reviewed in
`review.md`. Documentation receipts do not change application inputs.
Environment: Next.js 16.0.7, Vitest 4.1.7, pnpm commands.

| Check | Command / scope | Result |
| --- | --- | --- |
| Unit suite | `pnpm test` | PASS: 40 files, 303 tests |
| TypeScript | `pnpm exec tsc --noEmit` | PASS |
| Full lint | `pnpm lint` | PASS: zero errors, five warnings in unchanged files |
| Production build | `pnpm build` | PASS, including static sitemap and both PNG routes |
| Whitespace | `git diff --check` | PASS |
| Canonicals | Parse generated HTML for legal/privacy, API docs, login, forgot/update password | PASS: one matching absolute canonical per page |
| Sitemap output | Inspect `.next/server/app/sitemap.xml.body` | PASS: ten expected absolute public URLs |
| Social metadata regression | Python HTTP/HTML parser against `next dev` on 127.0.0.1:3018, all ten public routes | PASS: exactly one og:image and twitter:image per page, HTTPS URLs without localhost |
| Image response regression | HTTP GET `/opengraph-image` and `/twitter-image`, assert image/png and PNG signature | PASS: both 200 with PNG bytes |
| Independent review | SDLC read-only reviewer, separate intent/spec and correctness passes | PASS: no blocking findings; see review.md |

Regression evidence: the initial HTTP check on `/` failed with
`http://localhost:3018/opengraph-image?...` and the corresponding Twitter URL.
After moving image generation out of file-based metadata routes, the same HTTP
check passed for all ten pages. The temporary dev server was stopped afterward.

Existing tool warnings: stale baseline-browser-mapping data, workspace-root
inference due to an external lockfile, and Node runtime deprecation/localStorage
warnings. Full lint warnings are in unchanged gift/workshop admin components,
photo-row, dropzone, and use-supabase-upload. No thresholds were weakened.

## Remote gates and next action

Remote inspection: main is unprotected; squash merge is enabled. Recent PR #58
used Vercel checks and automatic Codex review on PR creation. This change will
wait for current-head checks, review disposition, no blocking review threads,
and clean mergeability, then squash-merge with an expected-head guard.

Next: complete independent review, commit scoped files, push, create and attach
PR, inspect current remote review/check state, and merge only after gates pass.
Deployment verification is outside the user's requested endpoint.
