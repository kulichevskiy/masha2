---
revision: 1
status: accepted
accepted_revision: 1
---

# Editorial stories

Slug: `editorial-stories` (`docs/feat-editorial-stories/`).

Acceptance: the user designed this section interactively on 2026-10-28 (Design canvas https://claude.ai/artifact/UdgvZ2iw4dggFeZUVi6qhE, row "Editorial"; Design System https://claude.ai/artifact/Xj9SfAXnx7FegDqWjkQwEZ, components ProjectTile and StoryHeader), accepted the resulting boards step by step, and then invoked `/sdlc:implement full send`. The user's own words for the implementation scope: "реализуй раздел editorial в приложении: таблица проектов в Supabase, страницы /editorial и /editorial/[slug], админка для проектов". The intent below is recovered from that conversation; details marked *agent decision* were chosen under full-send delegation and were not reviewed by the user.

## Problem

`/editorial` today is the same flat photo feed as the other portfolio sections: every editorial photograph is a single tile that opens the lightbox. Editorial work is produced as stories (a shoot of 9–14 frames with a title and credits), and the section cannot show them as stories. Maria (site owner, admin) has a first selection of nine stories and 95 web-size photographs waiting for this (readme in `~/Downloads/editorial_review`); titles and credits are still proposals.

## Outcomes

- **O1 Story feed.** `/editorial` shows one tile per visible story: the story's cover photograph alone, at its natural ratio, in the same three-column masonry as the other feeds (no title, count or caption on the tile). Clicking a tile opens that story's page instead of the lightbox. Feed order is the admin-set story order.
- **O2 Story page.** `/editorial/[slug]` shows the story: a header on the same three columns as the photo grid (back link "← Editorial", lowercase display title, one-line subtitle in columns 1–2, a role/name credits list in column 3), the story's photographs in sequence as the usual masonry opening the lightbox, and a bottom navigation with previous story (column 1), "All stories" (column 2, centred) and next story (column 3), wrapping around. Footer and the floating GIFT / BOOK cluster stay as on every feed page. Phone layout stacks header blocks and uses the feed's single column.
- **O3 Admin.** In the Russian admin the owner can create, edit, reorder, hide and delete stories without touching code: title, slug, subtitle, credits (ordered role/name pairs, e.g. photography, model, styling, hair & make-up), cover, the story's photographs and their order (chosen from the already uploaded editorial photographs), and visibility. Hidden stories are not served publicly.
- **O4 Readable floating gift plate.** The floating GIFT CERTIFICATE plate stays readable where the fixed cluster reaches the white page bottom: paper at 70% with ink text and a hairline border, as fixed in the design system (`glass-ghost`).
- **O5 Section plumbing.** Story pages carry page metadata consistent with the other public pages (title, description, canonical), the section nav highlights Editorial on a story page, and admin changes reach the public pages immediately. The sitemap stays the build-time static list accepted in `docs/feat-seo-metadata` (*agent decision*: a request-time sitemap would reverse that accepted decision; story pages are reachable from `/editorial`).

## Success criteria

- A visible story with photographs renders at `/editorial/<slug>` with title, subtitle, credits and all its photos in admin order; a hidden or unknown slug returns 404.
- `/editorial` lists only visible stories, in order, each tile linking to its page; when no visible story exists the section still shows the editorial photographs as today (*agent decision*, so merging never blanks the live section).
- An admin can perform every O3 operation in the browser against the isolated E2E Supabase, and the public pages reflect the change.
- All configured gates in `docs/sdlc/project.md` pass (lint, typecheck, unit/SQL, build, whitespace, E2E, CRAP) and the independent review has no blockers.

## Constraints

- Content lives in Supabase; stories are a new table with RLS; migrations use the UTC `YYYYMMDDHHmmss_short_description.sql` name; `pnpm` only; UI follows `design-system/README.md` and the accepted ProjectTile / StoryHeader decisions.
- Public photographs stay in the existing `photos` table and Storage bucket; a story references existing photos rather than duplicating files.
- No production data is written by this task: the nine draft stories, their photographs and the `tbc` credits are **not** uploaded or seeded; the owner enters them through admin after confirming names and publication rights.

## Out of scope

- Exposing stories through the `/api/v1` admin API and its OpenAPI document (*agent decision*: follow-up; the UI is the required path here).
- Changing the other sections, the lightbox, the home page, or the booking/gift/workshop flows.
- Per-story SEO copy beyond title/subtitle, and social images per story.
- Migrating the existing editorial photographs into stories automatically.

## Open questions

None blocking. Credits roles are free text per story; the admin pre-fills photography / model / styling / hair & make-up as suggestions.
