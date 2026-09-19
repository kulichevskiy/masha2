-- migration: editorial page
-- purpose: give editorial work a section of its own (/editorial), alongside
--   portraits, kids and video. Until now the home page faked an editorial row
--   out of the portraits feed.
-- affected: public.photos — the photos_pages_valid check constraint gains the
--   value 'editorial'. No rows change: Maria tags photographs onto the new
--   section herself from the admin.

alter table public.photos
  drop constraint photos_pages_valid;

alter table public.photos
  add constraint photos_pages_valid
  check (pages <@ array['portraits', 'kids', 'video', 'editorial']::text[]);

comment on column public.photos.pages is 'Public sections this photo appears on (subset of {portraits, kids, video, editorial}); empty = hidden everywhere.';
