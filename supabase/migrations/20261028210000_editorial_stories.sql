-- migration: editorial stories
-- purpose: turn /editorial into a feed of stories. A story is a titled set of
--   already uploaded photographs with a subtitle and a credits list; the feed
--   shows one cover per visible story and /editorial/<slug> shows the whole
--   sequence. Admin creates, orders, hides and deletes stories.
-- affected: new tables public.editorial_stories and public.editorial_story_photos.
--   reuses public.handle_updated_at(), public.is_admin() and
--   public.admin_api_bump_version(). photos is untouched: a story only
--   references photos rows, and a photograph stays publicly readable only under
--   the existing photos policies (non-empty pages).

create table public.editorial_stories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text not null default '',
  credits jsonb not null default '[]'::jsonb,
  cover_photo_id uuid references public.photos(id) on delete set null,
  position integer not null default 0,
  visible boolean not null default false,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint editorial_stories_slug_valid
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  constraint editorial_stories_title_present
    check (length(btrim(title)) > 0),
  constraint editorial_stories_credits_array
    check (jsonb_typeof(credits) = 'array')
);

comment on table public.editorial_stories is 'Editorial stories shown on /editorial; each is an ordered set of photos rows with a title, subtitle and credits.';
comment on column public.editorial_stories.credits is 'Ordered list of {role, name} string pairs, e.g. photography / model / styling / hair & make-up. Rendered lowercase in the story header.';
comment on column public.editorial_stories.cover_photo_id is 'The photo shown as the feed tile. Null or not part of the story = the first story photo by position.';
comment on column public.editorial_stories.visible is 'False keeps the story and its page off the public site; admin still sees it.';

create index editorial_stories_position_idx on public.editorial_stories (position, id);

create trigger editorial_stories_updated_at
  before update on public.editorial_stories
  for each row
  execute function public.handle_updated_at();

create trigger admin_api_version
  before update on public.editorial_stories
  for each row
  execute function public.admin_api_bump_version();

create table public.editorial_story_photos (
  story_id uuid not null references public.editorial_stories(id) on delete cascade,
  photo_id uuid not null references public.photos(id) on delete cascade,
  position integer not null default 0,
  primary key (story_id, photo_id)
);

comment on table public.editorial_story_photos is 'Which photos rows belong to an editorial story and in what order.';

create index editorial_story_photos_order_idx on public.editorial_story_photos (story_id, position, photo_id);

alter table public.editorial_stories enable row level security;
alter table public.editorial_story_photos enable row level security;

-- public reads see visible stories only; admins see everything and write.
create policy "Anon can view visible stories"
on public.editorial_stories for select to anon
using (visible);

create policy "Authenticated can view visible stories"
on public.editorial_stories for select to authenticated
using (visible);

create policy "Admins can view all stories"
on public.editorial_stories for select to authenticated
using (public.is_admin());

create policy "Admins can insert stories"
on public.editorial_stories for insert to authenticated
with check (public.is_admin());

create policy "Admins can update stories"
on public.editorial_stories for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete stories"
on public.editorial_stories for delete to authenticated
using (public.is_admin());

create policy "Anon can view photos of visible stories"
on public.editorial_story_photos for select to anon
using (exists (
  select 1 from public.editorial_stories s
  where s.id = story_id and s.visible
));

create policy "Authenticated can view photos of visible stories"
on public.editorial_story_photos for select to authenticated
using (exists (
  select 1 from public.editorial_stories s
  where s.id = story_id and s.visible
));

create policy "Admins can view all story photos"
on public.editorial_story_photos for select to authenticated
using (public.is_admin());

create policy "Admins can insert story photos"
on public.editorial_story_photos for insert to authenticated
with check (public.is_admin());

create policy "Admins can update story photos"
on public.editorial_story_photos for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete story photos"
on public.editorial_story_photos for delete to authenticated
using (public.is_admin());
