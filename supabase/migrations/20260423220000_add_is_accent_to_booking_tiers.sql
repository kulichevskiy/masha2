-- migration: add is_accent flag to booking_tiers
-- purpose: let an admin mark one (or more) tier as the featured/recommended
--   option. on /book the accented tier gets a permanent frame; non-accent
--   tiers stay unframed.
-- affected: public.booking_tiers (new non-null column with default).

alter table public.booking_tiers
  add column is_accent boolean not null default false;

comment on column public.booking_tiers.is_accent is 'When true, the tier is visually highlighted on /book (permanent frame).';
