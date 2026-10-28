---
revision: 1
status: accepted
accepted_revision: 1
intent: intent.md@1
---

# Editorial stories — specification

Acceptance: accepted under the user's full-send delegation on 2026-10-28 (agent acceptance; the user accepted the visual design on the canvas, not this document). Product behaviour follows the accepted boards; data and code shapes below are implementation choices within that scope.

## Requirements

**R1 Data (O1–O3).** Two new tables with RLS, created by one migration `supabase/migrations/20261028210000_editorial_stories.sql`:

- `public.editorial_stories`: `id uuid pk default gen_random_uuid()`, `slug text not null unique` (check `^[a-z0-9]+(-[a-z0-9]+)*$`, 1–80 chars), `title text not null` (check `length(btrim(title)) > 0`), `subtitle text not null default ''`, `credits jsonb not null default '[]'` (array of `{role, name}` strings; check `jsonb_typeof(credits) = 'array'`), `cover_photo_id uuid null references public.photos(id) on delete set null`, `position integer not null default 0`, `visible boolean not null default false`, `version integer not null default 1 check (version > 0)` with the existing `public.admin_api_bump_version()` trigger, `created_at`/`updated_at` with `public.handle_updated_at()`.
- `public.editorial_story_photos`: `story_id uuid references editorial_stories(id) on delete cascade`, `photo_id uuid references photos(id) on delete cascade`, `position integer not null default 0`, primary key `(story_id, photo_id)`, index on `(story_id, position)`.
- Policies, per role and operation like `home_story`: anon/authenticated select stories `using (visible)` and story photos `using (exists visible parent)`; admins (`public.is_admin()`) select all, insert, update, delete both tables. No service-role-only objects. `admin_api_mutate` is not extended (out of scope).
- Story photographs are rows of `photos`; a photograph is readable publicly only under the existing `photos` policies (non-empty `pages`). The admin picker therefore offers only photographs tagged `editorial`; a photo later untagged silently drops out of its story page.

**R2 Feed (O1).** `GET /editorial` renders `FeedPage` chrome (TopNav, WorkshopBanner, Footer with spacer, FloatingCta). Its body is:

- the **story feed** when at least one visible story has at least one publicly readable photograph: one `<a href="/editorial/<slug>" aria-label="<title>">` per such story, ordered by `position, id`, containing only the cover image at its stored width/height in the shared masonry columns (`columns-1 md:columns-2 lg:columns-3 gap-4`, `mb-4 break-inside-avoid`, `overflow-hidden bg-gray-100`, 500 ms 5% hover zoom, `quality` from `lib/image-config.ts`). The cover is `cover_photo_id` when it is one of the story's readable photos, otherwise the first readable photo by `position, photo_id`. No text on the tile.
- the **flat photo feed** (`MasonryGrid page="editorial"`, exactly today's behaviour) otherwise.

**R3 Story page (O2, O5).** `GET /editorial/[slug]`:

- 404 (`notFound()`) when no visible story has that slug, or when it has no readable photographs.
- Header inside `max-w-7xl px-4 md:px-6`, `grid grid-cols-1 lg:grid-cols-3 gap-x-4`: back link `← Editorial` (`/editorial`, Bebas 15px, tracking 0.1em, uppercase, 45% opacity) across all columns; `<h1>` title in Bebas lowercase (56px phone / 120px desktop, line-height 0.85) across all columns; subtitle in columns 1–2 (`text-[15px] lg:text-lg leading-[1.7] text-gray-600 max-w-[560px]`); credits in column 3 as `<dl>` with `grid-cols-[max-content_1fr]`, Roboto Mono 11/12px, role `text-gray-400`, name `text-black`, lowercase; rows are the stored credits in order, then a final row `photos` / count. An empty subtitle renders no paragraph; empty credits render only the `photos` row.
- Body: the story's readable photographs ordered by `position, photo_id` through the existing `PhotoLightboxGrid` (same columns), each opening the lightbox.
- Footer navigation `<nav aria-label="Stories">` on the same three columns above a `border-t border-gray-200`: previous story (column 1: eyebrow `previous`, title `←&nbsp;<title>` Bebas 30px lowercase), `All stories` (column 2, centred, muted nav style, `/editorial`), next story (column 3, right-aligned, `next`, `<title>&nbsp;→`). Previous/next walk the visible-and-renderable stories in feed order and wrap around; with a single story both links point to it.
- Then `Footer floatingCtaSpacer` and `FloatingCta`.
- `generateMetadata`: `title` = story title, `description` = subtitle or the editorial section description, `alternates.canonical` = `/editorial/<slug>`, OpenGraph/Twitter like `feedMetadata`. Unknown slug metadata falls back to the section's.
- `SectionNav` marks Editorial active for any pathname starting with `/editorial/`.

**R4 Admin (O3).** New admin tab `stories` labelled «Истории» (`VALID_TABS`, `TABS`), server component loading all stories (admin policy) with their photo rows and the editorial-tagged photo catalogue, rendering a client `StoriesTable`:

- Create: title input + «Добавить» → server action `createStory({title})` derives a unique slug (`slugify` lowercase ASCII, Cyrillic transliterated, fallback `story`, suffix `-2`, `-3`… on collision), `position` = min position − 1 (prepend, like photos), `visible=false`.
- Each row (sortable with dnd-kit pointer+keyboard like `photos-table.tsx`): drag handle, cover thumbnail or placeholder, title, slug, `N фото`, visibility `Switch` (`setStoryVisible`), «Редактировать», «Удалить» (confirm; `deleteStory` removes the row; photos stay).
- Reorder calls `reorderStories(items)` reusing existing position slots, same algorithm as `reassignSlots`.
- Editor (expanded row): inputs for title, slug, subtitle (textarea), credits rows (role + name inputs, «+ роль», remove, move up/down; new stories pre-fill roles `photography` (name `maria chevskaya`), `model`, `styling`, `hair & make-up` with empty names), «Сохранить» → `updateStory({id, title, slug, subtitle, credits})` validating: title non-blank, slug pattern, unique slug, credits entries with non-blank role; blank-name rows are dropped. Story photos: sortable thumbnails with «Обложка» (star) and remove; «Добавить фото» opens the catalogue of editorial-tagged photos not yet in the story (thumbnail grid, click adds). Photo changes save immediately via `setStoryPhotos({storyId, photoIds, coverPhotoId})`, which replaces the join rows (positions 0..n−1) and the cover in one request (sequential statements; failures return a Russian error string and the UI keeps its previous state).
- Every action calls `requireAdmin`, returns `{error}` strings in Russian on failure, and revalidates `/admin`, `/editorial` and `/editorial/<slug>` (old and new slug on rename).

**R5 Gift plate (O4).** `FloatingBookButton` gift plate classes become `bg-white/70 text-black border border-gray-300 hover:bg-white/90 hover:border-gray-400`; everything else unchanged.

**R6 Types and docs.** `lib/supabase/database.types.ts` gains both tables (Row/Insert/Update/Relationships). `design-system/README.md` records the editorial story feed/page rules and the gift plate change. `e2e/run.ts` wipes the new tables and seeds one visible story (`seed-story`, title `Seed story`) holding the seed photo, so public E2E exercises the story feed and page.

## Failure cases and examples

- Story `soft-structure` visible with 12 editorial photos, cover unset → feed tile shows photo at position 0; page lists 12 photos, credits `photography maria chevskaya / model eva / photos 12` (blank `styling`/`hair & make-up` names were dropped on save).
- Story visible but all its photos lost the `editorial` tag → absent from feed and 404 on its page.
- No visible story → `/editorial` shows the flat editorial feed (as today).
- Slug `Soft Structure!` typed by admin → rejected «Слаг: только строчные латинские буквы, цифры и дефисы».
- Deleting a photo in the photos tab removes it from stories by cascade; deleting a story leaves photos.

## Verification strategy

- **SQL contract (PGlite)** `lib/editorial-stories-migration.test.ts`: migration applies on a minimal current schema (photos + stubs for `is_admin`, `handle_updated_at`, `admin_api_bump_version`); constraints (slug pattern, blank title, credits type, unique slug); cascade on photo delete; `on delete set null` for cover; version bump on update; RLS policies exist for both tables (`pg_policies` names and roles). The full-chain `lib/admin-api/database.test.ts` must keep passing.
- **Unit** `lib/editorial-stories.ts(.test.ts)`: `slugify`, `uniqueSlug`, `pickCover`, `neighbours` (prev/next with wrap), `normalizeCredits`, `storyFeedPhotos` ordering — expectations from the examples above.
- **Server actions** `app/admin/story-actions.test.ts`: mocked Supabase client like `actions.test.ts`; admin check, validation errors, slug collision, revalidated paths, `setStoryPhotos` replacement order.
- **Components** (`@testing-library/react`): `app/editorial/story-page.test.tsx` renders header/credits/nav from fixture props (no DB); `app/components/editorial-feed.test.tsx` tile hrefs/aria-labels/no text; `app/admin/components/stories-table.test.tsx` create, edit validation message, cover/remove/add photo calls, visibility switch; `section-nav.test.tsx` gains the `/editorial/<slug>` case; `floating-book-button.test.tsx` asserts the gift plate reads on paper (`text-black`, not `text-white`).
- **E2E**: scenario 1 additionally asserts `/editorial` shows a tile linking to `/editorial/seed-story`, the story page shows `Seed story`, a loaded image and the `Book` link. A new admin scenario (`admin.spec.ts`) creates a story, adds the seed photo, saves subtitle/credits, toggles visible, checks the public page, then deletes it. The project profile's scenario list is extended, never reduced.
- **Gates**: `pnpm verify` (lint, CRAP < 30 for every function, build, E2E, typecheck, whitespace) and the independent review.

## Alternatives considered

- Story-specific photo uploads or a `story_id` column on `photos`: rejected; the join table keeps one photo in many places and reuses the existing upload/visibility model.
- Request-time sitemap with story URLs: rejected, see intent O5.
- Extending `admin_api_mutate`/OpenAPI: deferred (intent out of scope).

## Risks

- CRAP threshold on a large client editor: keep handlers small and covered by component tests.
- Native Supabase E2E stack must start locally; failures there are verification failures to fix, not reasons to skip.
