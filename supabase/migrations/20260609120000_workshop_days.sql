-- migration: workshop days breakdown
-- purpose: replace the "a day / included / bring" trio on /workshop with a single
--   fixed three-column day breakdown. adds the `days` jsonb column (Day 1/2/3,
--   each {day, title, note, bullets[]}), seeds the single workshop row, and drops
--   the now-unused schedule/includes/bring columns.
-- affected: public.workshop — new `days` jsonb column, a seed UPDATE, and three
--   dropped columns (schedule, includes, bring). no rls changes: the existing
--   per-role policies on public.workshop already cover the new column.
-- note: this schema change was first applied out-of-band against the linked
--   project; this file records it in version control so a fresh database matches.
--   every statement is written to be safe to re-run.

-- new structured column. shape documented in the column comment. defaults to an
-- empty array so the not-null constraint holds for any row created before seed.
alter table public.workshop
  add column if not exists days jsonb not null default '[]'::jsonb;

comment on column public.workshop.days is
  'Fixed three-column day breakdown, ordered Day 1..3. Each: {day, title, note, bullets[]}.';

-- seed the single existing row, but only while still empty so a re-run never
-- clobbers later admin edits.
update public.workshop
set days = $j$[
  {
    "day": "Day 1",
    "title": "Online session",
    "note": "",
    "bullets": ["Visual language", "Working with people", "Atmosphere & presence", "Open discussion"]
  },
  {
    "day": "Day 2",
    "title": "Shooting day",
    "note": "",
    "bullets": ["Live shooting session", "Direction & observation", "Individual feedback", "Group review"]
  },
  {
    "day": "Day 3",
    "title": "Review session",
    "note": "Extended option only",
    "bullets": ["Portfolio review", "Image selection", "Feedback on edited work", "Personal recommendations"]
  }
]$j$::jsonb
where days = '[]'::jsonb;

-- drop the superseded columns. destructive: the old schedule/included/bring
-- content is intentionally discarded — it is replaced by the day breakdown above.
alter table public.workshop drop column if exists schedule;
alter table public.workshop drop column if exists includes;
alter table public.workshop drop column if exists bring;
