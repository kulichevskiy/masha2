-- migration: workshop tariffs
-- purpose: add a fixed two-tier pricing band to the single-row workshop record
--   and seed it with the design's two intakes (Short 450 €, Full 600 € featured).
-- affected: public.workshop (new `tariffs` jsonb column + seed UPDATE of the
--   existing row). no rls changes — the existing per-role policies on
--   public.workshop already cover new columns. the hero `price` field is left
--   untouched.

-- new structured column. shape documented in the column comment; ordered
-- `short` then `full`. defaults to an empty array so the not-null constraint
-- holds for any row created before the seed UPDATE below.
alter table public.workshop
  add column tariffs jsonb not null default '[]'::jsonb;

comment on column public.workshop.tariffs is
  'Fixed two pricing tiers, ordered short then full. Each: {key (short|full), name, days, price, summary, desc, days_list[], extras[], note, featured}.';

-- seed the single existing row with the two design tariffs. UPDATE (not insert)
-- because the workshop row already exists from the create migration.
update public.workshop
set tariffs = $j$[
  {
    "key": "short",
    "name": "Short intake",
    "days": "Two days",
    "price": "450 €",
    "summary": "Two days inside the frame — seeing and making.",
    "desc": "The core of the workshop: a day of seeing and a full day of making portraits, with two professional models and group review in the evening.",
    "days_list": ["Day 01 — Seeing", "Day 02 — Making"],
    "extras": ["Studio space + curated locations in Mitte", "Lunch and coffee, both days"],
    "note": "Best if you have shot before and want focused time in the frame.",
    "featured": false
  },
  {
    "key": "full",
    "name": "Full intake",
    "days": "Three days",
    "price": "600 €",
    "summary": "The full arc — from the first frame to the long edit.",
    "desc": "Everything in the short intake plus the third day: the long edit, where a body of work is sequenced and a printed take-home zine is made overnight.",
    "days_list": ["Day 01 — Seeing", "Day 02 — Making", "Day 03 — Editing"],
    "extras": ["Personal portfolio review after the workshop", "Printed take-home zine of the group's work", "Lunch and coffee, all three days"],
    "note": "The complete experience. Six seats only.",
    "featured": true
  }
]$j$::jsonb;
