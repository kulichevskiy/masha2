-- Make video a regular public section and assign all existing videos to it.

alter table public.photos
  drop constraint photos_pages_valid;

alter table public.photos
  add constraint photos_pages_valid
  check (pages <@ array['portraits', 'kids', 'video']::text[]);

update public.photos
  set pages = array_append(pages, 'video')
  where kind = 'video'
    and not ('video' = any(pages));

comment on column public.photos.pages is 'Public sections this photo appears on (subset of {portraits, kids, video}); empty = hidden everywhere.';
