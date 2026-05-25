-- migration: booking faq
-- purpose: back the FAQ section on /book with admin-managed questions and answers.
-- affected: new table public.booking_faq with rls + per-role per-operation policies,
--   reusing the shared public.handle_updated_at trigger. seeds 15 q&a rows that
--   match the brand-approved copy in notion so the section renders immediately.

create table public.booking_faq (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  position integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.booking_faq is 'FAQ entries shown on the public /book page.';
comment on column public.booking_faq.answer is 'HTML produced by the Tiptap editor in admin; rendered via <RichText>.';
comment on column public.booking_faq.position is 'Display order (lower = first).';

create index booking_faq_position_idx on public.booking_faq (position);
create index booking_faq_visible_idx on public.booking_faq (is_visible) where is_visible = true;

-- reuse the shared trigger installed by the photos migration.
create trigger booking_faq_updated_at
  before update on public.booking_faq
  for each row
  execute function public.handle_updated_at();

alter table public.booking_faq enable row level security;

-- public read of visible rows; explicit per-role policies even though the rule is identical.
create policy "Anon can view visible faq"
on public.booking_faq for select to anon
using (is_visible = true);

create policy "Authenticated can view visible faq"
on public.booking_faq for select to authenticated
using (is_visible = true);

-- admins see everything (including hidden rows) and can write.
create policy "Admins can view all faq"
on public.booking_faq for select to authenticated
using (public.is_admin());

create policy "Admins can insert faq"
on public.booking_faq for insert to authenticated
with check (public.is_admin());

create policy "Admins can update faq"
on public.booking_faq for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete faq"
on public.booking_faq for delete to authenticated
using (public.is_admin());

-- seed the 15 brand-approved entries. dollar-quoted strings keep apostrophes
-- readable; on conflict do nothing makes the migration idempotent if a row
-- already exists by question (no unique constraint — we rely on a fresh table).
insert into public.booking_faq (question, answer, position) values
  ($q$How do I book a photoshoot?$q$,
   $a$<p>You can book a session through the booking form on my website, by email, or via Instagram.</p><p>Once we discuss the format and choose a date, I'll send you all the details and a deposit invoice to confirm the booking.</p>$a$,
   1),
  ($q$Do I need modeling experience?$q$,
   $a$<p>Not at all. Most of my clients are not professional models.</p><p>My job is to guide you through the whole process, help with posing and movement, and create a calm atmosphere where you can relax and feel like yourself.</p>$a$,
   2),
  ($q$What should I wear for the shoot?$q$,
   $a$<p>I'm always happy to help with outfit selection before the shoot.</p><p>Simple, timeless clothes usually work best — black, white, denim, neutrals, textures, oversized pieces, or something that genuinely feels like you.</p><p>You can also send me outfit options in advance, and we can choose together.</p>$a$,
   3),
  ($q$Where do photoshoots take place?$q$,
   $a$<p>Most of my sessions take place in Berlin — on the streets, in courtyards, cafés, apartments, studios, or outdoor locations.</p><p>I can also help choose a location depending on the mood and style you want for your photos.</p><p>Selected travel projects outside Berlin are possible as well.</p>$a$,
   4),
  ($q$How long does a session last?$q$,
   $a$<p>The length depends on the package you choose.</p><p>Most sessions last between 30 minutes and 2 hours.</p>$a$,
   5),
  ($q$How many photos will I receive?$q$,
   $a$<p>The number of final images depends on the selected package.</p><p>All photos are carefully curated and retouched by hand. I focus on quality, atmosphere, and storytelling rather than delivering hundreds of random files.</p>$a$,
   6),
  ($q$How long does it take to receive the photos?$q$,
   $a$<p>You'll receive previews shortly after the shoot, and the full edited gallery is usually delivered within a few weeks.</p><p>If you need the photos sooner, feel free to ask about rush delivery options.</p>$a$,
   7),
  ($q$Do you retouch photos?$q$,
   $a$<p>Yes — all final images are professionally retouched.</p><p>My approach to retouching is natural and careful. I preserve skin texture, personality, and real emotions without heavy editing or artificial "perfect" skin.</p>$a$,
   8),
  ($q$Can I use the photos commercially?$q$,
   $a$<p>Personal photoshoots include personal usage rights.</p><p>If you are a brand, company, magazine, or need commercial usage, licensing can be discussed separately depending on the project.</p>$a$,
   9),
  ($q$Do you photograph couples, families, or children?$q$,
   $a$<p>Yes — I work with individuals, couples, families, children, creatives, artists, and brands.</p><p>I especially love photographing human connection, personality, and real moments.</p>$a$,
   10),
  ($q$Do you travel for photoshoots?$q$,
   $a$<p>Yes — I'm available for selected projects outside Berlin.</p><p>Feel free to contact me with your idea or location.</p>$a$,
   11),
  ($q$What happens if I need to cancel or reschedule?$q$,
   $a$<p>A deposit is required to secure your booking date.</p><p>If you need to reschedule, please let me know as early as possible.</p><p>Deposits are generally non-refundable, but in many cases can be transferred to a new date.</p>$a$,
   12),
  ($q$Do you work with contracts?$q$,
   $a$<p>Yes — every photoshoot is booked with a simple contract.</p><p>It protects both the client and the photographer, clarifies expectations, payment terms, and image usage rights, and helps the entire process feel transparent and safe.</p>$a$,
   13),
  ($q$Can I keep my photos private?$q$,
   $a$<p>Of course.</p><p>I always discuss publication separately with every client. Your photos will never be published without your permission.</p>$a$,
   14),
  ($q$What makes your approach different?$q$,
   $a$<p>I'm interested not only in how people look, but in who they are.</p><p>My work is about atmosphere, personality, memory, emotional honesty, and creating images that feel alive years later — not just "pretty photos."</p>$a$,
   15);
