-- New subscriptions offer spring and summer. Retain historical winter values
-- without relabelling a preference that a subscriber may already have chosen.
alter table public.workshop_subscribers
  drop constraint workshop_subscribers_seasons_valid,
  add constraint workshop_subscribers_seasons_valid
    check (seasons <@ array['spring', 'summer', 'winter']::text[]);

comment on column public.workshop_subscribers.seasons is
  'Preferred seasons: spring, summer. Winter is retained for historical subscriptions; empty means unspecified.';
