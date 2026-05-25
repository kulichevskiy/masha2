-- migration: enforce single-row workshop at the db level
-- purpose: the previous workshop migration documented the table as single-row
--   and the app reads via `.limit(1).maybeSingle()`, but nothing in the schema
--   prevented a second row from being inserted. If that ever happened, public
--   reads would become nondeterministic and admin saves would fail with
--   "Workshop row not found". Add a singleton unique index and drop the admin
--   delete policy so the seeded row is the only one that can ever exist.
-- affected: public.workshop (new unique index on `(true)`, dropped delete policy).

-- the index key `(true)` is the same constant for every row, so the unique
-- constraint allows at most one row across the whole table.
create unique index workshop_singleton_idx on public.workshop ((true));

-- removing delete prevents the admin UI (or a stray sql) from emptying the
-- table — once empty, admin saves can't proceed because the action looks up
-- the row by `.maybeSingle()` before updating. Insert stays available for
-- disaster recovery via the supabase studio; the singleton index keeps it
-- safe.
drop policy if exists "Admins can delete workshop" on public.workshop;
