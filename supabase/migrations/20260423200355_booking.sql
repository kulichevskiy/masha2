-- migration: booking tiers, booking requests, app settings
-- purpose: back the /book page with admin-managed pricing tiers, persist
--   incoming booking requests, and store a configurable recipient email.
-- affected: new tables public.booking_tiers, public.booking_requests,
--   public.app_settings; all with rls and per-role per-operation policies.

-- tiers shown on the public /book page. anon reads only active rows;
-- only admins (via public.is_admin()) see hidden rows or write.
create table public.booking_tiers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_text text not null,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.booking_tiers is 'Pricing tiers for the public /book page.';
comment on column public.booking_tiers.price_text is 'Free-form price label, e.g. "from 450 €" or "upon request".';
comment on column public.booking_tiers.position is 'Display order (lower = first).';

create index booking_tiers_position_idx on public.booking_tiers (position);
create index booking_tiers_active_idx on public.booking_tiers (is_active) where is_active = true;

-- reuse the shared trigger installed by the photos migration.
create trigger booking_tiers_updated_at
  before update on public.booking_tiers
  for each row
  execute function public.handle_updated_at();

alter table public.booking_tiers enable row level security;

-- public read of active tiers; explicit per-role policies even though the rule is identical.
create policy "Anon can view active tiers"
on public.booking_tiers for select to anon
using (is_active = true);

create policy "Authenticated can view active tiers"
on public.booking_tiers for select to authenticated
using (is_active = true);

-- admins see everything (including disabled tiers) and can write.
create policy "Admins can view all tiers"
on public.booking_tiers for select to authenticated
using (public.is_admin());

create policy "Admins can insert tiers"
on public.booking_tiers for insert to authenticated
with check (public.is_admin());

create policy "Admins can update tiers"
on public.booking_tiers for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete tiers"
on public.booking_tiers for delete to authenticated
using (public.is_admin());

-- seed the two tiers that are hardcoded on /book today so the page keeps working
-- after the page switches to dynamic fetch.
insert into public.booking_tiers (name, description, price_text, position) values
  ('Portrait sessions', 'For personal portraits, moments of transition, inner shifts and quiet confidence.', 'from 450 €', 1),
  ('Editorial / personal projects', 'For magazines, artists, authors and long-term collaborations.', 'upon request', 2);


-- incoming booking requests. anon cannot insert/select directly — the public
-- form writes via the service role inside a server action (which also enforces
-- rate limiting and sends the notification email). admins can read and delete.
create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  tier_id uuid references public.booking_tiers(id) on delete set null,
  message text,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint booking_requests_email_len check (char_length(email) between 3 and 254),
  constraint booking_requests_message_len check (char_length(coalesce(message, '')) <= 2000)
);

comment on table public.booking_requests is 'Booking form submissions from /book. Written by the service role only.';
comment on column public.booking_requests.ip_hash is 'sha256 of submitter IP + salt. Best-effort, may be null.';

create index booking_requests_created_at_idx on public.booking_requests (created_at desc);

alter table public.booking_requests enable row level security;

-- deny-all for anon and authenticated. service_role bypasses rls.
create policy "Deny anon select on booking_requests"
on public.booking_requests for select to anon using (false);

create policy "Deny anon insert on booking_requests"
on public.booking_requests for insert to anon with check (false);

create policy "Deny anon update on booking_requests"
on public.booking_requests for update to anon using (false);

create policy "Deny anon delete on booking_requests"
on public.booking_requests for delete to anon using (false);

create policy "Deny authenticated insert on booking_requests"
on public.booking_requests for insert to authenticated with check (false);

create policy "Deny authenticated update on booking_requests"
on public.booking_requests for update to authenticated using (false);

-- admin overrides: select + delete only (no update — requests are immutable history).
create policy "Admins can view booking requests"
on public.booking_requests for select to authenticated
using (public.is_admin());

create policy "Admins can delete booking requests"
on public.booking_requests for delete to authenticated
using (public.is_admin());


-- generic key/value settings table. today's only key is
-- 'booking_recipient_email'; future keys may follow (e.g. maintenance flags).
create table public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

comment on table public.app_settings is 'Key/value app-level settings. Admin-writable, service-role readable.';

create trigger app_settings_updated_at
  before update on public.app_settings
  for each row
  execute function public.handle_updated_at();

alter table public.app_settings enable row level security;

-- deny-all for anon.
create policy "Deny anon select on app_settings"
on public.app_settings for select to anon using (false);

create policy "Deny anon insert on app_settings"
on public.app_settings for insert to anon with check (false);

create policy "Deny anon update on app_settings"
on public.app_settings for update to anon using (false);

create policy "Deny anon delete on app_settings"
on public.app_settings for delete to anon using (false);

-- admins can read and upsert settings. delete is not exposed — the app never
-- removes known keys, it just updates them.
create policy "Admins can view app_settings"
on public.app_settings for select to authenticated
using (public.is_admin());

create policy "Admins can insert app_settings"
on public.app_settings for insert to authenticated
with check (public.is_admin());

create policy "Admins can update app_settings"
on public.app_settings for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- seed the default recipient so the form works out of the box before any admin
-- edits happen. the value matches the mailto target currently on /book.
insert into public.app_settings (key, value) values
  ('booking_recipient_email', 'maria.chevskaya@gmail.com');
