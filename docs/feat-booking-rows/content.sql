-- Content for the redesigned /book page (run once against the production
-- project after the 20261031150121 migration). Names drop the word
-- "session", prices get a space before the euro sign, subtitles shrink to the
-- opening sentence or two, the rest of each subtitle moves into the
-- description that the page folds under "what's included", and every tier
-- gets its one-line summary. Nothing is deleted: every sentence survives.

begin;

update public.booking_tiers set
  name = 'Mini',
  price_text = '300 €',
  subtitle = 'A little time, something to keep. A short, relaxed session for a fresh set of portraits, a moment with someone close, or your first experience in front of my camera.',
  summary = 'up to 30 minutes, one look, 20 final images',
  description = '<p>We keep it simple: one look, one location and gentle guidance throughout. You don’t need to know how to pose or arrive with an idea — we’ll find our rhythm together.</p>' || coalesce(description, '')
where name = 'Mini Session';

update public.booking_tiers set
  name = 'Signature',
  price_text = '500 €',
  subtitle = 'Time to feel at ease, room for your story. A full session for yourself, the two of you, or your family — at home, outdoors or in a studio.',
  summary = 'up to 1.5 hours, 1–2 looks, 45 final images',
  description = '<p>There’s time to get comfortable before the photographs begin to matter, to move between quiet portraits and playful moments, and to let children follow their own rhythm. We can photograph you together and individually, creating a varied series connected by the way you are with each other and yourself. Before we meet, I’ll help you choose what to wear and find a setting that feels right. During the session, I’ll guide you whenever you need it and leave space for things to happen naturally.</p>' || coalesce(description, '')
where name = 'Signature Session';

update public.booking_tiers set
  name = 'Extended',
  price_text = '700 €',
  subtitle = 'A story we imagine together. Our most collaborative session, with a visual direction created around you.',
  summary = 'up to 2 hours, 2–3 looks, 70 final images, a short film',
  description = '<p>Perhaps there’s a side of yourself you’d like to explore, an atmosphere you keep returning to, or an occasion you want to mark with something personal. You can bring a fully formed idea or just the beginning of one. Before the shoot, we develop it together through a moodboard, clothing and a setting chosen to bring everything into the same world. During the session, there’s room to build on that idea, move between looks and try something unexpected. Portraits, gestures, movement and details come together in a cohesive series with the feeling of a personal editorial. Your series also includes a short film of up to one minute, capturing the movement, details and atmosphere of our session.</p>' || coalesce(description, '')
where name = 'Extended Session';

update public.booking_tiers set
  subtitle = 'Images that give your brand a character of its own. Custom photography for campaigns, launches, and ongoing brand content, shaped around your identity and the people you want to reach.',
  summary = 'campaigns, launches, ongoing content',
  description = '<p>Tell me what you’re creating, where the images will appear, and what you have in mind — I’ll put together a proposal for your project.</p>'
where name = 'Brand & Commercial';

commit;
