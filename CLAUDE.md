# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager: **pnpm** (lockfile is `pnpm-lock.yaml`).

- `pnpm dev` — Next.js dev server on :3000
- `pnpm build` / `pnpm start` — production build + serve
- `pnpm lint` — ESLint (flat config in `eslint.config.mjs`, extends `next/core-web-vitals` + `next/typescript`)

No test runner is configured.

A Supabase MCP server is wired up in `.mcp.json` (project ref `utwahhztklnhvxiqhvhn`). Prefer the `mcp__supabase__*` tools (e.g. `apply_migration`, `execute_sql`, `list_tables`, `get_advisors`) over the Supabase CLI for schema/data work against this project.

## Architecture

Photography portfolio: a public masonry gallery fed by Supabase, plus an authenticated `/admin` page for CRUD + drag-to-reorder.

### Request path / auth

- `proxy.ts` (not the conventional `middleware.ts` — Next reads it via the `proxy` export) runs `updateSession` from `lib/supabase/middleware.ts` on every non-static request. It refreshes the Supabase session cookies and redirects unauthenticated traffic off `/admin` → `/auth/login`. Public pages stay accessible when logged out.
- Supabase client factories are split by runtime and must not be mixed:
  - `lib/supabase/server.ts` — RSC / Server Actions / Route Handlers (reads cookies via `next/headers`).
  - `lib/supabase/client.ts` — browser / Client Components.
  - `lib/supabase/middleware.ts` — proxy only. Per the comments in the file, do not insert code between `createServerClient(...)` and `supabase.auth.getClaims()`, and always return the `supabaseResponse` object untouched aside from cookies — breaking this causes random logouts.
- `lib/supabase/database.types.ts` is the generated types source of truth for the Supabase client; regenerate via `mcp__supabase__generate_typescript_types` after migrations.

### Data model

- `public.photos` (migration `supabase/migrations/20251209130000_create_photos_table.sql`) — RLS: `anon` can only `select` where `is_visible = true`; admins (`public.is_admin()`, from the whitelist migration `20260423150000_restrict_writes_to_admin_whitelist.sql`) have full CRUD. `position` int drives order (lower = earlier); new uploads go to `min(position) - 1` so newest appears first; reordering rewrites positions 1..N. `updated_at` is maintained by trigger `photos_updated_at` → `public.handle_updated_at()`.
- `public.booking_tiers` (migration `supabase/migrations/20260423200355_booking.sql`) — pricing tiers for `/book`. Anon sees rows where `is_active = true`; admins have full CRUD. Same `position`-based ordering as photos.
- `public.booking_requests` (same migration) — booking form submissions. **No anon RLS policy** — the public form writes via the service role inside `app/book/actions.ts` (which also enforces rate limiting). Admins can SELECT + DELETE; no UPDATE (requests are immutable history).
- `public.app_settings` (same migration) — key/value settings. Today the only key is `booking_recipient_email`. Read by the service role for public-form notifications; writable by admins.

Storage: bucket `photos` (migration `20251209120000_create_photos_bucket.sql`). Public URLs come from `supabase.storage.from('photos').getPublicUrl(...)`. `next.config.ts` whitelists `*.supabase.co/storage/v1/object/public/**` for `next/image`.

### Gallery + admin flow

- `app/page.tsx` → `app/components/ui/masonry-grid.tsx` is a Server Component that queries visible photos ordered by `position`, generates public URLs, and renders a CSS-grid masonry with a fixed `ROW_SPAN_PATTERNS` cycle.
- Admin mutations live in `app/admin/actions.ts` as Server Actions. Every action re-checks `supabase.auth.getUser()` + `supabase.rpc('is_admin')` (the proxy guard is not sufficient) and calls `revalidatePath('/admin')` after writing. `deletePhoto` removes the storage object first, then the DB row — storage errors are logged but don't block the DB delete.
- Upload flow: browser uploads via `hooks/use-supabase-upload.ts` (Supabase UI dropzone hook) directly to the `photos` bucket, then calls `createPhotosFromUploads(storagePaths)` to create DB rows (`is_visible = false` by default — photos must be explicitly published).
- Reorder uses `@dnd-kit` in `app/admin/components/photos-table.tsx`; on drop it calls `reorderPhotos(orderedIds)` which batches per-row `update` calls.
- `/admin` has four tabs driven by `?tab=photos|tiers|requests|settings` (default `photos`) — see `app/admin/components/admin-tabs.tsx`. Each tab fetches only its own slice.

### Booking flow

- `/book` is an async RSC ([app/book/page.tsx](app/book/page.tsx)) that renders active `booking_tiers` and the `BookingForm` client component. Fallback mailto if no tiers exist.
- Form submissions go through `submitBookingRequest` in [app/book/actions.ts](app/book/actions.ts). The action: validates email + honeypot, rate-limits per-IP (in-memory Map, 3 req / 10 min), persists to `booking_requests` and sends a Resend notification to the admin-configured recipient. Uses `lib/supabase/admin.ts` (service role) because anon has no INSERT/SELECT on `booking_requests` or `app_settings`.
- `lib/supabase/admin.ts` must never be imported from client components — it reads `SUPABASE_SERVICE_ROLE_KEY` and bypasses RLS.

### UI conventions

- shadcn/ui **new-york** style, neutral base, Lucide icons (`components.json`). Primitives go in `components/ui/` and are imported via the `@/components/ui/*` alias. `@supabase` registry is configured for `npx shadcn@latest add @supabase/...`.
- Path aliases (`tsconfig.json` + `components.json`): `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks`.
- Tailwind v4 via `@tailwindcss/postcss`; tokens live in `app/globals.css` (no `tailwind.config.*`). `tw-animate-css` is available.
- App-specific layout components (`top-nav`, `footer`, `floating-book-button`, `masonry-grid`) live under `app/components/`; auth form primitives and the generic dropzone live under the root `components/`.

### Environment

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY` (note the non-standard name — it's referenced everywhere in `lib/supabase/*`, don't rename to `ANON_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; read by `lib/supabase/admin.ts` for the public booking form path (service-role client bypasses RLS to read `app_settings` and insert into `booking_requests`).
- `RESEND_API_KEY` — Resend API key used by `app/book/actions.ts` to send booking notifications. Without it, requests are still persisted to `booking_requests` but no email is sent.

Optional:
- `BOOKING_FROM_ADDRESS` — sender address (no display name) for booking notifications. Defaults to `onboarding@resend.dev`. Use a verified domain in production for deliverability. The display-name is built at send time as `"<applicant email> via booking"` so Maria's inbox shows who sent it at a glance; `Reply-To` is set to the applicant email so hitting Reply goes straight to them.
- `BOOKING_IP_SALT` — salt used when hashing submitter IPs in `booking_requests.ip_hash`. Optional; empty string by default.

## Design system

The canonical design system for this site lives in [design-system/](design-system/). Treat it as the source of truth for any visual work — colors, typography, spacing, radii, iconography, voice, and component treatments. It was exported from Claude Design (claude.ai/design) and documents Maria Chevskaya's brand in depth.

- [design-system/README.md](design-system/README.md) — foundations: voice, color, typography, imagery, spacing, radii, shadows, motion, hover states, layout rules.
- [design-system/colors_and_type.css](design-system/colors_and_type.css) — all design tokens as CSS variables (`--mc-*`, `--font-*`, `--text-*`, `--tracking-*`, `--space-*`, `--radius-*`, `--shadow-*`) plus semantic type/component presets (`.mc-wordmark`, `.mc-tagline`, `.mc-cta`, etc).
- [design-system/preview/](design-system/preview/) — reference HTML specimens for each element (type, color swatches, buttons, form-admin, footer, iconography, etc). When unsure how a piece should look, open the matching preview file.
- [design-system/ui_kits/portfolio/](design-system/ui_kits/portfolio/) — JSX recreations of the public surfaces (TopNav, MasonryGrid, Footer, FloatingBookButton, BookPage, LoginCard, AdminShell).
- [design-system/chat-transcript.md](design-system/chat-transcript.md) — iteration history; useful for understanding *why* a decision was made.

**Hard rules from the brand** (read the README for the full list — these trip people up most):
- **Radius 0 on the public site.** The hard rectangle is the brand. Rounded corners appear only in admin chrome.
- **Public CTAs are solid-black plates**, Bebas Neue uppercase (`BOOK`, `EMAIL ME`). Never outlined/ghost/stroked.
- **Login/admin form CTA is different** — Inter 13px regular, lowercase (`войти`), hard-rectangle black plate. Not Bebas. The card itself is `border-radius: 0`, no shadow. See [design-system/preview/form-admin.html](design-system/preview/form-admin.html).
- **Google login is a quiet ghost link**, not a framed button — lowercase Inter, muted gray, Google "G" mark inline, hairline underline on hover.
- **Icons are Phosphor-style sharp**: `stroke-linecap: square`, `stroke-linejoin: miter`, stroke ~1.25. No rounded `lucide-react` defaults on public surfaces (nav / footer / iconography).
- **Cyrillic display type uses Oswald**, not Bebas Neue (Bebas has no Cyrillic glyphs). Token: `--font-bebas-neue-cyrillic`.
- **No emoji, no exclamation marks, no gradients, no shadcn-ish rounded cards on public pages.**

When adding or changing any UI, cross-check [design-system/README.md](design-system/README.md) and the matching `design-system/preview/*.html` before implementing.

## Database migrations

Follow `.cursor/rules/create-migration.mdc` and the sibling Postgres/RLS guides — they are the project's authoritative conventions:
- Filename: `YYYYMMDDHHmmss_short_description.sql` in UTC.
- All SQL lowercase, with a header comment (purpose, affected objects) and per-step comments; extra commentary on any destructive statement.
- Every new table **must** enable RLS — even public-read tables — and define granular per-operation, per-role policies (separate policies for `anon` vs `authenticated`, even when the rule is identical). See the photos migration for the expected shape.
