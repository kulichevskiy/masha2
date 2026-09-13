-- Banner visibility is independent of sales. Preserve the existing display
-- state at rollout; /workshop remains publicly readable in every state.
alter table public.workshop
  add column banner_visible boolean not null default false;

update public.workshop set banner_visible = sales_open;

comment on column public.workshop.banner_visible is
  'Shows the workshop banner on portfolio pages, independently of sales. Does not restrict access to /workshop.';
comment on column public.workshop.sales_open is
  'When true /workshop accepts applications; when false it collects waitlist preferences and hides dates.';

-- The original seed promised "no list". The form now supplies the approved
-- waitlist explanation; remove only that untouched seed, not custom admin copy.
update public.workshop set closed_intro = null
where closed_intro = '<p>Applications for the next intake aren''t open right now. Leave your email and you''ll be the first to hear when the next workshop is announced — no list, no spam, just one note when a seat opens.</p>';

-- Empty arrays preserve legacy subscribers whose preferences are unknown.
-- New submissions require at least one season and city in the server action.
alter table public.workshop_subscribers
  add column seasons text[] not null default '{}',
  add column cities text[] not null default '{}',
  add constraint workshop_subscribers_seasons_valid
    check (seasons <@ array['winter', 'summer']::text[]),
  add constraint workshop_subscribers_cities_valid
    check (cities <@ array['berlin', 'hamburg', 'paris']::text[]);

comment on column public.workshop_subscribers.seasons is
  'Preferred seasons: winter, summer. Empty for legacy subscriptions.';
comment on column public.workshop_subscribers.cities is
  'Preferred cities: berlin, hamburg, paris. Empty for legacy subscriptions.';
