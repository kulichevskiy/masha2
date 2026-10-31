-- migration: a photograph and a one-line summary for every booking tier
-- purpose: the redesigned /book page shows each tier as a row with its own
--   black-and-white frame and a short line of facts ("up to 30 minutes, one
--   look, 20 final images") under the subtitle. Both are optional; a tier
--   without a photograph falls back to the top of the portraits feed.
-- affected: public.booking_tiers (two nullable columns, no policy changes).

alter table public.booking_tiers
  add column photo_path text,
  add column summary text;

comment on column public.booking_tiers.photo_path is
  'Storage path in the photos bucket of the frame shown beside the tier; null falls back to the portraits feed.';
comment on column public.booking_tiers.summary is
  'One lowercase line of facts under the subtitle, e.g. "up to 30 minutes, one look, 20 final images".';
