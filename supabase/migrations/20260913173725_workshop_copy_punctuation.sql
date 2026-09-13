-- Persist the workshop copy cleanup for existing and rebuilt databases.
-- Touch only workshop copy; preserve image paths, application history, and
-- subscriber preferences. The helper exists only for this database session.
create or replace function pg_temp.workshop_copy_punctuation(value text)
returns text language sql immutable strict as $$
  select regexp_replace(value, '[[:space:]]*(—|&mdash;|&#8212;|&#x2014;)[[:space:]]*', ', ', 'gi');
$$;

update public.workshop set
  workshop_number = pg_temp.workshop_copy_punctuation(workshop_number),
  title = pg_temp.workshop_copy_punctuation(title),
  tagline = pg_temp.workshop_copy_punctuation(tagline),
  location = pg_temp.workshop_copy_punctuation(location),
  price = pg_temp.workshop_copy_punctuation(price),
  seats = pg_temp.workshop_copy_punctuation(seats),
  intro = pg_temp.workshop_copy_punctuation(intro),
  the_idea_heading = pg_temp.workshop_copy_punctuation(the_idea_heading),
  the_idea_quote = pg_temp.workshop_copy_punctuation(the_idea_quote),
  apply_heading = pg_temp.workshop_copy_punctuation(apply_heading),
  apply_intro = pg_temp.workshop_copy_punctuation(apply_intro),
  closed_heading = pg_temp.workshop_copy_punctuation(closed_heading),
  closed_intro = pg_temp.workshop_copy_punctuation(closed_intro),
  tariffs_intro = pg_temp.workshop_copy_punctuation(tariffs_intro),
  dates = regexp_replace(dates, '[[:space:]]*(—|&mdash;|&#8212;|&#x2014;)[[:space:]]*', ' - ', 'gi'),
  days = pg_temp.workshop_copy_punctuation(days::text)::jsonb,
  faq = pg_temp.workshop_copy_punctuation(faq::text)::jsonb,
  tariffs = pg_temp.workshop_copy_punctuation(tariffs::text)::jsonb,
  program = (select coalesce(jsonb_agg(item || jsonb_build_object(
    'day', pg_temp.workshop_copy_punctuation(item->>'day'),
    'title', pg_temp.workshop_copy_punctuation(item->>'title'),
    'body', pg_temp.workshop_copy_punctuation(item->>'body')
  ) order by position), '[]'::jsonb)
    from jsonb_array_elements(program) with ordinality as entries(item, position));
