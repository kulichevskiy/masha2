-- migration: home story content
-- purpose: make the copy and the frames of the home story page (/new) editable
--   from the admin instead of living in the component.
-- affected: new single-row table public.home_story. reuses
--   public.handle_updated_at() and public.is_admin().

-- single-row table, same convention as public.workshop: the application always
-- reads .limit(1) and never inserts from the UI. the whole page lives in one
-- jsonb blob whose shape is documented in lib/home-story-content.ts; every key
-- is optional and falls back to the copy shipped in the code, so a partial or
-- empty blob still renders a complete page.
create table public.home_story (
  id uuid primary key default gen_random_uuid(),
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.home_story is 'Single-row editable copy and frame overrides for the home story page.';
comment on column public.home_story.content is
  'Sections keyed hero/people/session/work/video/behind/workshops/invitation. Each has {label, heading, body, cta, link, photos[{path, alt}]}; work also has categories[{title, text, cta}]. Missing or blank values fall back to lib/home-story-content.ts DEFAULT_CONTENT. heading newlines are line breaks, body blank lines start a paragraph, an empty photo path means "use the feed frame".';

create trigger home_story_updated_at
  before update on public.home_story
  for each row
  execute function public.handle_updated_at();

alter table public.home_story enable row level security;

-- the page is public, so the row is world-readable; only admins write it.
create policy "Anon can view home story"
on public.home_story for select to anon
using (true);

create policy "Authenticated can view home story"
on public.home_story for select to authenticated
using (true);

create policy "Admins can insert home story"
on public.home_story for insert to authenticated
with check (public.is_admin());

create policy "Admins can update home story"
on public.home_story for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete home story"
on public.home_story for delete to authenticated
using (public.is_admin());

-- the one row the admin edits.
insert into public.home_story (content) values ('{}'::jsonb);
