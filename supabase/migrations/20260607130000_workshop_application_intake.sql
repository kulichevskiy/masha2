-- migration: workshop application intake
-- purpose: capture which intake (short|full) a workshop applicant chose, stored
--   as a readable server-resolved label snapshot (e.g. "Full intake — 600 €").
-- affected: public.workshop_applications (new nullable `intake` text column +
--   length check). no rls changes — the existing per-role policies already
--   cover new columns. nullable because intake is optional: an invalid/missing
--   posted key resolves to null and the application is still accepted.

-- new nullable column holding the resolved label snapshot. the value is built
-- server-side from the chosen intake key against the workshop's current tariffs,
-- never from client-provided free text. length check guards against junk; the
-- snapshot is short ("<name> — <price>"), so 200 chars is ample headroom.
alter table public.workshop_applications
  add column intake text;

alter table public.workshop_applications
  add constraint workshop_applications_intake_length
  check (intake is null or char_length(intake) <= 200);

comment on column public.workshop_applications.intake is
  'Server-resolved label snapshot of the chosen intake (e.g. "Full intake — 600 €"), built from the short|full key against the workshop tariffs at submit time. Null when no valid intake was posted.';
