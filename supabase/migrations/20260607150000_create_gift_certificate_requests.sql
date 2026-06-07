-- migration: gift_certificate_requests
-- purpose: persist orders submitted from the public /gift order form. mirrors
--   booking_requests / workshop_applications — the public form writes via the
--   service role inside the server action (rate-limited there); anon cannot
--   read or write directly; admins read + delete only (immutable history).
-- affected: new table public.gift_certificate_requests (deny-all for anon,
--   admin select+delete only).

create table public.gift_certificate_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  -- chosen amount as display text (e.g. "450 €"), resolved server-side from the
  -- gift_certificate singleton's amounts. null when no/unknown amount was posted.
  amount text,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint gift_certificate_requests_email_len check (char_length(email) between 3 and 254),
  constraint gift_certificate_requests_amount_len check (char_length(coalesce(amount, '')) <= 200)
);

comment on table public.gift_certificate_requests is 'Gift-certificate order submissions from /gift. Written by the service role only.';
comment on column public.gift_certificate_requests.amount is 'Chosen amount display text, resolved server-side. May be null.';
comment on column public.gift_certificate_requests.ip_hash is 'sha256 of submitter IP + salt. Best-effort, may be null.';

create index gift_certificate_requests_created_at_idx on public.gift_certificate_requests (created_at desc);

alter table public.gift_certificate_requests enable row level security;

-- deny-all for anon and authenticated. service_role bypasses rls.
create policy "Deny anon select on gift_certificate_requests"
on public.gift_certificate_requests for select to anon using (false);

create policy "Deny anon insert on gift_certificate_requests"
on public.gift_certificate_requests for insert to anon with check (false);

create policy "Deny anon update on gift_certificate_requests"
on public.gift_certificate_requests for update to anon using (false);

create policy "Deny anon delete on gift_certificate_requests"
on public.gift_certificate_requests for delete to anon using (false);

create policy "Deny authenticated insert on gift_certificate_requests"
on public.gift_certificate_requests for insert to authenticated with check (false);

create policy "Deny authenticated update on gift_certificate_requests"
on public.gift_certificate_requests for update to authenticated using (false);

-- admin overrides: select + delete only (no update — requests are immutable history).
create policy "Admins can view gift_certificate_requests"
on public.gift_certificate_requests for select to authenticated
using (public.is_admin());

create policy "Admins can delete gift_certificate_requests"
on public.gift_certificate_requests for delete to authenticated
using (public.is_admin());
