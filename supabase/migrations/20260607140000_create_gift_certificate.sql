-- migration: gift_certificate singleton
-- purpose: back the new /gift page with a single admin-editable record. read
--   path only for now — order submission lands in a later slice.
-- affected: new table public.gift_certificate (single-row, jsonb content
--   blocks). reuses public.handle_updated_at() and public.is_admin().

-- single-row table that backs the /gift page. application code enforces
-- "single row" — it always reads .limit(1) — and the singleton unique index
-- below guarantees it at the db level. all content fields are nullable so the
-- admin can edit incrementally.
create table public.gift_certificate (
  id uuid primary key default gen_random_uuid(),
  is_visible boolean not null default false,
  -- rich text (html from the tiptap editor; rendered via <RichText/>)
  body text,
  -- structured content blocks. shapes documented in column comments.
  amounts jsonb not null default '[]'::jsonb,
  gallery jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.gift_certificate is 'Single-row gift-certificate content driving /gift.';
comment on column public.gift_certificate.is_visible is 'When false, /gift 404s.';
comment on column public.gift_certificate.body is 'HTML body copy from the tiptap editor.';
comment on column public.gift_certificate.amounts is 'Array of {id, price} tiles (price is display text, e.g. "450 €").';
comment on column public.gift_certificate.gallery is 'Array of {photo_path} entries (photos live under storage prefix gift/).';

-- reuse the shared trigger installed by the photos migration.
create trigger gift_certificate_updated_at
  before update on public.gift_certificate
  for each row
  execute function public.handle_updated_at();

-- the index key (true) is the same constant for every row, so the unique
-- constraint allows at most one row across the whole table.
create unique index gift_certificate_singleton_idx on public.gift_certificate ((true));

alter table public.gift_certificate enable row level security;

-- public read of the visible row; explicit per-role policies even though the
-- rule is identical.
create policy "Anon can view visible gift_certificate"
on public.gift_certificate for select to anon
using (is_visible = true);

create policy "Authenticated can view visible gift_certificate"
on public.gift_certificate for select to authenticated
using (is_visible = true);

-- admin overrides: view all + full crud.
create policy "Admins can view all gift_certificate"
on public.gift_certificate for select to authenticated
using (public.is_admin());

create policy "Admins can insert gift_certificate"
on public.gift_certificate for insert to authenticated
with check (public.is_admin());

create policy "Admins can update gift_certificate"
on public.gift_certificate for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete gift_certificate"
on public.gift_certificate for delete to authenticated
using (public.is_admin());

-- seed the single gift-certificate row with the design's english copy.
-- is_visible stays false so /gift stays hidden until the admin toggles it on.
insert into public.gift_certificate (
  is_visible,
  body,
  amounts,
  gallery
) values (
  false,
  '<p>A portrait session with Maria Chevskaya, given as a gift. The certificate covers a full sitting — the same calm, attentive process behind every portrait in this studio — and the person you give it to chooses when to come.</p><p>Choose an amount below. We send a printed certificate with a hand-written note, or a digital one you can forward the same day.</p>',
  $j$[
    {"id": "amt_450", "price": "450 €"},
    {"id": "amt_600", "price": "600 €"}
  ]$j$::jsonb,
  '[]'::jsonb
);
