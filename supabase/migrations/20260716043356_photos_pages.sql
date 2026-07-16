-- Migration: Replace photos.is_visible with a pages[] page-targeting model
-- Purpose: Tag each photo with the public sections it appears on (portraits, kids)
--   instead of a single visible/hidden boolean. An empty array means the photo is
--   hidden everywhere. This is the expand/contract for is_visible: add pages,
--   backfill from is_visible, swap the anon read policy, then drop is_visible.
-- Affected: public.photos (new column pages, check constraint, indexes, RLS select
--   policies for anon + authenticated; dropped column is_visible + its index).

-- 1. add the new page-targeting column. default empty = hidden everywhere, so
--    freshly inserted rows are hidden until an admin assigns sections.
alter table public.photos
  add column pages text[] not null default '{}';

comment on column public.photos.pages is 'Public sections this photo appears on (subset of {portraits, kids}); empty = hidden everywhere.';

-- 2. restrict array elements to the known sections. empty array satisfies <@,
--    so hidden photos pass the check.
alter table public.photos
  add constraint photos_pages_valid
  check (pages <@ array['portraits', 'kids']::text[]);

-- 3. backfill from the old boolean: visible photos become portraits-only,
--    hidden photos become the empty array.
update public.photos
  set pages = case when is_visible then array['portraits'] else array[]::text[] end;

-- 4. index for the "<section> = any(pages)" membership filter used by the
--    public feeds. gin is the right access method for array containment.
create index photos_pages_idx on public.photos using gin (pages);

-- 5. swap the anon/authenticated public-read policy: is_visible = true becomes
--    "assigned to at least one section". per project convention we keep separate
--    per-role policies even though the rule is identical. the admins-view-all
--    policy is unaffected and left in place.
drop policy "Anyone can view visible photos" on public.photos;

create policy "Anon can view photos on a page"
on public.photos
for select
to anon
using (array_length(pages, 1) >= 1);

create policy "Authenticated can view photos on a page"
on public.photos
for select
to authenticated
using (array_length(pages, 1) >= 1);

-- 6. drop the now-unused visibility column and its partial index. destructive:
--    the boolean is fully superseded by pages after the backfill above.
drop index if exists public.photos_visible_idx;

alter table public.photos
  drop column is_visible;
