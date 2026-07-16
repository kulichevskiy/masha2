-- migration: workshop sales_open axis + subscribers
-- purpose: give the workshop a single `sales_open` axis in place of the old
--   `is_visible` hidden axis, so /workshop is ALWAYS a live public page. When
--   sales are closed the page swaps its Apply band for a Subscribe band that
--   collects announcement emails; when open it behaves exactly as before.
-- affected:
--   * public.workshop — new `sales_open` bool + `closed_heading`/`closed_intro`
--     text columns; the `is_visible` column and its hidden-axis RLS are retired
--     (select opens to everyone, since the page never hides now).
--   * public.workshop_subscribers — new table for closed-band email captures,
--     mirroring the gift_certificate_requests RLS shape (service-role writes;
--     admin select+delete; anon/authenticated denied).

-- 1. New columns ------------------------------------------------------------

-- sales_open drives everything the hidden axis used to: the home/kids banner,
-- the Apply-vs-Subscribe swap, and the server-side application gate. Default
-- false so a freshly-seeded workshop starts closed (collecting subscribers).
alter table public.workshop
  add column if not exists sales_open boolean not null default false;

-- Closed-band copy shown when sales_open = false. closed_intro is Tiptap HTML
-- like intro / apply_intro; null/empty hides the paragraph.
alter table public.workshop
  add column if not exists closed_heading text;
alter table public.workshop
  add column if not exists closed_intro text;

comment on column public.workshop.sales_open is
  'When true the page shows the Apply band and the banner appears; when false it shows the Subscribe band and the banner is hidden.';
comment on column public.workshop.closed_heading is
  'Heading for the closed-sales Subscribe band. Plain text.';
comment on column public.workshop.closed_intro is
  'Subscribe band intro paragraph, Tiptap HTML. Null/empty hides the paragraph.';

-- 2. Backfill + seed --------------------------------------------------------

-- Preserve current behaviour: a currently-visible workshop keeps sales open,
-- a hidden one becomes a live-but-closed page. Runs before is_visible is dropped.
update public.workshop
set sales_open = is_visible;

-- Seed the English default copy for the closed band, only while still null so a
-- re-run never clobbers later admin edits.
update public.workshop
set closed_heading = 'The next workshop isn''t open yet'
where closed_heading is null;

update public.workshop
set closed_intro = '<p>Applications for the next intake aren''t open right now. Leave your email and you''ll be the first to hear when the next workshop is announced — no list, no spam, just one note when a seat opens.</p>'
where closed_intro is null;

-- 3. Retire the hidden axis -------------------------------------------------

-- The page is always live now, so anon + authenticated may always read the
-- singleton row. Drop the visibility-gated select policies (and the redundant
-- admin all-rows select) and replace with unconditional select policies.
drop policy if exists "Anon can view visible workshop" on public.workshop;
drop policy if exists "Authenticated can view visible workshop" on public.workshop;
drop policy if exists "Admins can view all workshop" on public.workshop;

create policy "Anon can view workshop"
on public.workshop for select to anon
using (true);

create policy "Authenticated can view workshop"
on public.workshop for select to authenticated
using (true);

-- Now that reads no longer depend on it, drop the retired column.
alter table public.workshop
  drop column is_visible;

-- 4. Subscribers table ------------------------------------------------------

-- Closed-band email captures from /workshop. Mirrors gift_certificate_requests:
-- the public form writes via the service role inside the server action
-- (rate-limited there); anon cannot read or write directly; admins read +
-- delete only (immutable history).
create table public.workshop_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint workshop_subscribers_email_len check (char_length(email) between 3 and 254)
);

comment on table public.workshop_subscribers is 'Announcement-list email captures from the /workshop closed-sales band. Written by the service role only.';
comment on column public.workshop_subscribers.ip_hash is 'sha256 of submitter IP + salt. Best-effort, may be null.';

create index workshop_subscribers_created_at_idx on public.workshop_subscribers (created_at desc);

alter table public.workshop_subscribers enable row level security;

-- deny-all for anon and authenticated. service_role bypasses rls.
create policy "Deny anon select on workshop_subscribers"
on public.workshop_subscribers for select to anon using (false);

create policy "Deny anon insert on workshop_subscribers"
on public.workshop_subscribers for insert to anon with check (false);

create policy "Deny anon update on workshop_subscribers"
on public.workshop_subscribers for update to anon using (false);

create policy "Deny anon delete on workshop_subscribers"
on public.workshop_subscribers for delete to anon using (false);

create policy "Deny authenticated insert on workshop_subscribers"
on public.workshop_subscribers for insert to authenticated with check (false);

create policy "Deny authenticated update on workshop_subscribers"
on public.workshop_subscribers for update to authenticated using (false);

-- admin overrides: select + delete only (no update — subscribers are immutable history).
create policy "Admins can view workshop_subscribers"
on public.workshop_subscribers for select to authenticated
using (public.is_admin());

create policy "Admins can delete workshop_subscribers"
on public.workshop_subscribers for delete to authenticated
using (public.is_admin());
