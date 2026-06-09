-- migration: workshop tariffs intro
-- purpose: make the Tariffs band intro paragraph on /workshop admin-editable.
--   adds a `tariffs_intro` text column (Tiptap HTML, like intro / apply_intro)
--   and seeds the single workshop row with the copy currently hardcoded in
--   tariffs-band.tsx so nothing disappears on deploy.
-- affected: public.workshop — new nullable `tariffs_intro` text column + a seed
--   UPDATE. no rls changes: the existing per-role policies on public.workshop
--   already cover the new column.

-- new column. nullable text holding editor HTML, mirroring `intro` and
-- `apply_intro`. an empty/null value hides the paragraph on the page.
alter table public.workshop
  add column if not exists tariffs_intro text;

comment on column public.workshop.tariffs_intro is
  'Tariffs band intro paragraph, Tiptap HTML. Null/empty hides the paragraph.';

-- seed the single existing row with the previously-hardcoded copy, but only
-- while still null so a re-run never clobbers later admin edits.
update public.workshop
set tariffs_intro = '<p>Same group, same room, same studio. The two-day workshop is the conversation and the shooting; the three-day workshop adds the third day — the long edit, where the work becomes a body of work.</p>'
where tariffs_intro is null;
