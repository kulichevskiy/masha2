-- migration: workshop + workshop applications
-- purpose: back the new /workshop page and the home banner with a single
--   admin-editable record; persist incoming applications submitted from the
--   public form.
-- affected: new tables public.workshop (single-row, jsonb content blocks) and
--   public.workshop_applications (deny-all for anon, admin select+delete only).
--   reuses public.handle_updated_at() and public.is_admin().

-- single-row table that backs both the home banner and the /workshop page.
-- application code enforces "single row" — it always reads .limit(1). all
-- text/jsonb fields are nullable so the admin can edit incrementally.
create table public.workshop (
  id uuid primary key default gen_random_uuid(),
  is_visible boolean not null default false,
  -- hero meta (plain text)
  workshop_number text,
  title text,
  tagline text,
  dates text,
  location text,
  price text,
  seats text,
  hero_photo_path text,
  -- rich text (html from the tiptap editor; rendered via <RichText/>)
  intro text,
  the_idea_heading text,
  the_idea_quote text,
  apply_heading text,
  apply_intro text,
  -- structured content blocks. shapes documented in column comments.
  program jsonb not null default '[]'::jsonb,
  schedule jsonb not null default '[]'::jsonb,
  includes jsonb not null default '[]'::jsonb,
  bring jsonb not null default '[]'::jsonb,
  gallery jsonb not null default '[]'::jsonb,
  faq jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.workshop is 'Single-row workshop content driving /workshop and the home banner.';
comment on column public.workshop.is_visible is 'When false, banner is hidden and /workshop 404s.';
comment on column public.workshop.program is 'Array of {day, title, body, photo_path}. body is HTML.';
comment on column public.workshop.schedule is 'Array of [time, what] tuples (string pairs).';
comment on column public.workshop.includes is 'Array of strings.';
comment on column public.workshop.bring is 'Array of strings.';
comment on column public.workshop.gallery is 'Array of {photo_path} entries (photos live under storage prefix workshop/).';
comment on column public.workshop.faq is 'Array of {question, answer} where answer is HTML.';

-- reuse the shared trigger installed by the photos migration.
create trigger workshop_updated_at
  before update on public.workshop
  for each row
  execute function public.handle_updated_at();

alter table public.workshop enable row level security;

-- public read of visible row; explicit per-role policies even though the rule is identical.
create policy "Anon can view visible workshop"
on public.workshop for select to anon
using (is_visible = true);

create policy "Authenticated can view visible workshop"
on public.workshop for select to authenticated
using (is_visible = true);

-- admin overrides: view all + full crud.
create policy "Admins can view all workshop"
on public.workshop for select to authenticated
using (public.is_admin());

create policy "Admins can insert workshop"
on public.workshop for insert to authenticated
with check (public.is_admin());

create policy "Admins can update workshop"
on public.workshop for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete workshop"
on public.workshop for delete to authenticated
using (public.is_admin());


-- incoming applications. mirrors booking_requests: anon cannot read/write
-- directly; the public form writes via the service role inside the server
-- action (rate-limited there). admins read + delete only — applications are
-- immutable history.
create table public.workshop_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  instagram text,
  message text,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint workshop_applications_name_len check (char_length(name) between 1 and 200),
  constraint workshop_applications_email_len check (char_length(email) between 3 and 254),
  constraint workshop_applications_instagram_len check (char_length(coalesce(instagram, '')) <= 200),
  constraint workshop_applications_message_len check (char_length(coalesce(message, '')) <= 2000)
);

comment on table public.workshop_applications is 'Workshop application submissions from /workshop. Written by the service role only.';
comment on column public.workshop_applications.ip_hash is 'sha256 of submitter IP + salt. Best-effort, may be null.';

create index workshop_applications_created_at_idx on public.workshop_applications (created_at desc);

alter table public.workshop_applications enable row level security;

-- deny-all for anon and authenticated. service_role bypasses rls.
create policy "Deny anon select on workshop_applications"
on public.workshop_applications for select to anon using (false);

create policy "Deny anon insert on workshop_applications"
on public.workshop_applications for insert to anon with check (false);

create policy "Deny anon update on workshop_applications"
on public.workshop_applications for update to anon using (false);

create policy "Deny anon delete on workshop_applications"
on public.workshop_applications for delete to anon using (false);

create policy "Deny authenticated insert on workshop_applications"
on public.workshop_applications for insert to authenticated with check (false);

create policy "Deny authenticated update on workshop_applications"
on public.workshop_applications for update to authenticated using (false);

-- admin overrides: select + delete only (no update — applications are immutable history).
create policy "Admins can view workshop applications"
on public.workshop_applications for select to authenticated
using (public.is_admin());

create policy "Admins can delete workshop applications"
on public.workshop_applications for delete to authenticated
using (public.is_admin());


-- seed the single workshop row with the design defaults (taken from the
-- claude.ai/design bundle's WORKSHOP_DEFAULTS / WORKSHOP_PROGRAM / etc.).
-- is_visible stays false so the banner and page stay hidden until the admin
-- toggles them on after uploading photos.
insert into public.workshop (
  is_visible,
  workshop_number, title, tagline, dates, location, price, seats,
  hero_photo_path,
  intro,
  the_idea_heading, the_idea_quote,
  apply_heading, apply_intro,
  program, schedule, includes, bring, gallery, faq
) values (
  false,
  'Workshop №01',
  'Portrait Workshop · Berlin',
  'Three days inside a working portrait practice.',
  '21 — 23 March 2026',
  'Mitte, Berlin',
  '850 €',
  '6 seats',
  null,
  '<p>This is a three-day workshop on photographing people — not as subjects, but as presences. We spend the days together in Berlin, working slowly, looking carefully, and making portraits the way I make them in my own practice. Small group, mixed experience, a lot of time inside the frame.</p>',
  'presence over poses',
  'People I work with are seen, not just photographed.',
  'Six seats. One of them is yours?',
  '<p>I read every application personally. Tell me a few words about yourself, the work you make, and why you want to come. There is no portfolio bar.</p>',
  $j$[
    {"day": "Day 01", "title": "Seeing", "body": "<p>We open with conversation, not cameras. Reading light in a room. Looking at our own work the way an editor would. By afternoon, one extended block with a single subject — long enough that the first interesting moment is the third interesting moment.</p>", "photo_path": null},
    {"day": "Day 02", "title": "Making", "body": "<p>Two full sessions, each with a person you have not photographed before. We work between the studio and three walking locations in Mitte. Group review in the evening, contact sheets up on the wall, honest reading.</p>", "photo_path": null},
    {"day": "Day 03", "title": "Editing", "body": "<p>The long edit. How a single frame survives a thousand frames. Sequencing a body of work, sequencing one person. We close with a printed take-home zine of the group's work, made overnight at the studio.</p>", "photo_path": null}
  ]$j$::jsonb,
  $j$[
    ["10:00", "Arrival, coffee, slow start"],
    ["10:30", "Morning — reading, looking, theory"],
    ["12:30", "Lunch together (provided)"],
    ["13:30", "Shoot block — studio or location"],
    ["17:30", "Group review with the day's frames"],
    ["19:00", "Wrap"]
  ]$j$::jsonb,
  $j$[
    "Three days of teaching with Maria",
    "Two professional models for the portrait sessions",
    "Studio space + curated locations in Mitte",
    "Lunch and coffee, all three days",
    "Personal portfolio review after the workshop",
    "Printed take-home zine of the group's work"
  ]$j$::jsonb,
  $j$[
    "A camera you know well — digital or film, any format",
    "Two spare batteries or a fresh roll",
    "10–15 frames of your existing work for the opening conversation",
    "Shoes you can walk in"
  ]$j$::jsonb,
  '[]'::jsonb,
  $j$[
    {"question": "What language is it in?", "answer": "<p>Conducted in English. Russian is fine in conversation — Maria speaks both. Some written materials are available in both languages.</p>"},
    {"question": "I'm not a professional photographer.", "answer": "<p>Welcome. The group is mixed by experience on purpose — what matters is how you look, not how long you have been looking. There is no portfolio bar.</p>"},
    {"question": "Can two of us share a seat?", "answer": "<p>No. Each seat is one person — the group is small enough that each chair matters.</p>"},
    {"question": "What if I have to cancel?", "answer": "<p>Full refund up to 30 days before the workshop. After that, the seat moves to the next intake and you keep your place there.</p>"},
    {"question": "Will we shoot on film?", "answer": "<p>Bring whatever you already work with. The teaching is about seeing, not gear.</p>"}
  ]$j$::jsonb
);
