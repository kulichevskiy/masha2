-- Migration: Add intrinsic pixel dimensions to photos
-- Purpose: The public feed renders each photo at its natural aspect ratio (no
--   cropping), so it needs the real width/height to reserve layout space and
--   avoid shift while images load. Dimensions are captured client-side at upload
--   time and backfilled for existing rows by scripts/backfill-photo-dimensions.ts.
-- Affected: public.photos (new nullable columns width, height).
--
-- Nullable by design: this is the "expand" half of an expand/contract. Rows
-- created before the backfill (or files the backfill cannot measure) stay null,
-- and the renderer falls back to a neutral aspect ratio for them. No RLS change:
-- the columns ride on the existing photos policies.

alter table public.photos
  add column width integer,
  add column height integer;

comment on column public.photos.width is 'Intrinsic image width in pixels; null until captured/backfilled.';
comment on column public.photos.height is 'Intrinsic image height in pixels; null until captured/backfilled.';
