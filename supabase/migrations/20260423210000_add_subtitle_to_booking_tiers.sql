-- migration: add subtitle to booking_tiers
-- purpose: give each tier a short lede that sits right under the heading on
--   /book (separate from the rich-text description).
-- affected: public.booking_tiers (new nullable column).

alter table public.booking_tiers
  add column subtitle text;

comment on column public.booking_tiers.subtitle is 'Short kicker/lede rendered directly under the tier name on /book. Plain text.';
