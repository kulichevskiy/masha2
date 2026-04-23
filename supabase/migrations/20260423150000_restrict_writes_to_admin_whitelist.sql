-- Migration: Restrict photo writes to an explicit admin email whitelist
-- Purpose: Close off generic 'authenticated' CRUD on photos. Only emails listed in
--   public.admin_emails may read hidden photos or write (insert/update/delete) —
--   on both public.photos and the photos storage bucket. Public read of visible
--   photos and the public bucket stays unchanged.
-- Affected: new table public.admin_emails, new function public.is_admin(),
--   RLS on public.photos, RLS on storage.objects for bucket 'photos'.

-- admin allow-list. Populated only by the service_role (e.g. via SQL editor /
-- supabase admin APIs); anon + authenticated are denied by the policies below.
create table public.admin_emails (
  email text primary key,
  added_at timestamptz not null default now()
);

comment on table public.admin_emails is 'Email whitelist of users allowed to manage the gallery.';

alter table public.admin_emails enable row level security;

-- deny-all for anon + authenticated; service_role bypasses RLS, so seeding works.
-- per project convention we write explicit per-role, per-operation policies.
create policy "Deny anon select on admin_emails"
on public.admin_emails for select to anon using (false);

create policy "Deny authenticated select on admin_emails"
on public.admin_emails for select to authenticated using (false);

create policy "Deny anon insert on admin_emails"
on public.admin_emails for insert to anon with check (false);

create policy "Deny authenticated insert on admin_emails"
on public.admin_emails for insert to authenticated with check (false);

create policy "Deny anon update on admin_emails"
on public.admin_emails for update to anon using (false);

create policy "Deny authenticated update on admin_emails"
on public.admin_emails for update to authenticated using (false);

create policy "Deny anon delete on admin_emails"
on public.admin_emails for delete to anon using (false);

create policy "Deny authenticated delete on admin_emails"
on public.admin_emails for delete to authenticated using (false);

-- security-definer check: used both in RLS and called from the app via rpc.
-- runs as the function owner so it can read admin_emails even though callers can't.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_emails
    where email = (select auth.jwt() ->> 'email')
  );
$$;

comment on function public.is_admin is 'True when the caller JWT email is in public.admin_emails.';

-- lock down execute: anon never needs this; authenticated calls it via rpc.
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- swap photos policies: authenticated-anyone → admins-only. public read of
-- visible photos (the anon+authenticated select policy) stays as-is.
drop policy "Authenticated users can view all photos" on public.photos;
drop policy "Authenticated users can insert photos" on public.photos;
drop policy "Authenticated users can update photos" on public.photos;
drop policy "Authenticated users can delete photos" on public.photos;

create policy "Admins can view all photos"
on public.photos
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert photos"
on public.photos
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update photos"
on public.photos
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete photos"
on public.photos
for delete
to authenticated
using (public.is_admin());

-- mirror on storage.objects for the photos bucket. public read stays; writes
-- were any-authenticated — now admin-only.
drop policy "Authenticated users can upload photos" on storage.objects;
drop policy "Users can update own photos" on storage.objects;
drop policy "Users can delete own photos" on storage.objects;

create policy "Admins can upload to photos bucket"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'photos' and public.is_admin());

create policy "Admins can update photos in photos bucket"
on storage.objects
for update
to authenticated
using (bucket_id = 'photos' and public.is_admin())
with check (bucket_id = 'photos' and public.is_admin());

create policy "Admins can delete photos in photos bucket"
on storage.objects
for delete
to authenticated
using (bucket_id = 'photos' and public.is_admin());
