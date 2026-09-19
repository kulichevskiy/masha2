// Home page — design variant C ("mixed"). Full-bleed frames with white type
// open, punctuate and close the page (hero, video, invitation); between them
// the narrative sections sit on paper: black display type, gray body, bare
// photographs. Eight sections, one story. Desktop values kick in at `md`.
//
// Two things feed it, both editable without touching this file:
//   copy    — the `home_story` row (lib/home-story-content.ts), which falls
//             back to the shipped wording field by field.
//   frames  — a photograph pinned to the slot in admin, or, when nothing is
//             pinned, the top of the matching feed (lib/home-story-photos.ts).

import Link from 'next/link'
import { type HomeCategory, type HomeFrame, type HomePhotoSlots } from '@/lib/home-story-photos'
import type { HomeStoryContent, StorySection } from '@/lib/home-story-content'
import { getPublicWorkshop } from '../../workshop/data'
import { loadHomePhotos } from './home-photos'
import { loadHomeContent, resolveFrame } from './home-content'
import { CONTACT_EMAIL } from '@/lib/site'
import { VideoSection } from './video-section'
import {
  Arrow,
  Bleed,
  Body,
  Display,
  Fill,
  Label,
  Lines,
  Paragraphs,
  Photo,
  Plate,
  Section,
} from './story-ui'

// The portrait of Maria belongs to no feed, so the "behind the camera" slot
// falls back to the same file the booking page uses until she pins another.
const MARIA_PORTRAIT: HomeFrame = {
  id: 'maria-portrait',
  src: '/photos/photo_2026-02-01 17.14.58.jpeg',
  alt: 'Maria Chevskaya',
  width: 1600,
  height: 2000,
}

// Where each category row points. The wording is editable; the routes are not,
// because they are the site's own sections. Editorial has no feed of its own:
// its frames come from the portraits feed and its link lands on the main
// gallery, where the editorial work lives too.
const CATEGORY_HREF: Record<HomeCategory, string> = {
  portraits: '/',
  kids: '/kids',
  editorial: '/',
}

// ── 1 · introduction ──────────────────────────────────────────

function Intro({ content, frame }: { content: StorySection; frame: HomeFrame | null }) {
  return (
    <Bleed frame={frame} height="h-[640px] md:h-[860px]" position="center 30%" priority>
      <Label tone="frame">{content.label}</Label>
      <Display as="h1" tone="frame" size="hero">
        <Lines text={content.heading} />
      </Display>
      <Paragraphs text={content.body} tone="frame" className="mt-5 md:mt-6" />
      <div className="mt-8 md:mt-10 flex flex-col md:flex-row md:items-center gap-5 md:gap-10">
        <Plate href="/book">{content.cta}</Plate>
        <div className="hidden md:block">
          <Arrow href="#work">{content.link}</Arrow>
        </div>
      </div>
    </Bleed>
  )
}

// ── 2 · people ────────────────────────────────────────────────

function People({ content, frames }: { content: StorySection; frames: (HomeFrame | null)[] }) {
  const [left, middle, right] = frames
  const cellSizes = '(max-width: 768px) 50vw, 400px'
  return (
    <Section>
      <Label>{content.label}</Label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-4 mb-10 md:mb-16">
        <Photo frame={left} ratio="aspect-[4/5]" position="center 20%" sizes={cellSizes} />
        <Photo frame={middle} ratio="aspect-[4/5]" position="center 30%" sizes={cellSizes} />
        <Photo
          frame={right}
          ratio="aspect-[3/2] md:aspect-[4/5]"
          sizes="(max-width: 768px) 100vw, 400px"
          className="col-span-full md:col-span-1"
        />
      </div>
      <div className="grid md:grid-cols-2 gap-5 md:gap-20 items-end">
        <Display>
          <Lines text={content.heading} />
        </Display>
        <Paragraphs text={content.body} />
      </div>
    </Section>
  )
}

// ── 3 · the session ───────────────────────────────────────────

function Session({ content, frame }: { content: StorySection; frame: HomeFrame | null }) {
  return (
    <Section>
      <div className="grid md:grid-cols-[5fr_7fr] gap-9 md:gap-24 items-center">
        <div>
          <Label>{content.label}</Label>
          <Display>
            <Lines text={content.heading} />
          </Display>
          <Paragraphs text={content.body} className="mt-6 md:mt-8" />
          <div className="mt-7 md:mt-10">
            <Arrow href="/book" tone="paper">
              {content.link}
            </Arrow>
          </div>
        </div>
        <Photo frame={frame} ratio="aspect-[4/5] md:aspect-[3/4]" sizes="(max-width: 768px) 100vw, 660px" />
      </div>
    </Section>
  )
}

// ── 4 · the work ──────────────────────────────────────────────

function CategoryRow({
  category,
  href,
  frames,
  flipped,
}: {
  category: HomeStoryContent['work']['categories'][number]
  href: string
  frames: HomeFrame[]
  flipped: boolean
}) {
  return (
    <div className={`grid gap-6 md:gap-16 items-end ${flipped ? 'md:grid-cols-[8fr_4fr]' : 'md:grid-cols-[4fr_8fr]'}`}>
      <div className={flipped ? 'md:order-1' : ''}>
        <h3 className="font-bebas-neue font-normal text-4xl md:text-[44px] leading-none uppercase tracking-[0.02em] text-black m-0">
          {category.title}
        </h3>
        <Body className="mt-3 mb-6 max-w-[360px]">{category.text}</Body>
        <Arrow href={href} tone="paper">
          {category.cta}
        </Arrow>
      </div>
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {frames.map((frame) => (
          <Link
            key={frame.id}
            href={href}
            aria-label={frame.alt || `${category.title} — open the gallery`}
            className="group relative block overflow-hidden bg-gray-100 aspect-[4/5]"
          >
            <Fill
              frame={frame}
              sizes="(max-width: 768px) 33vw, 260px"
              className="transition-transform duration-500 group-hover:scale-105"
            />
          </Link>
        ))}
      </div>
    </div>
  )
}

const CATEGORY_KEYS: HomeCategory[] = ['portraits', 'kids', 'editorial']

function Work({ content, work }: { content: HomeStoryContent['work']; work: HomePhotoSlots['work'] }) {
  return (
    <Section id="work">
      <Label>{content.label}</Label>
      <div className="grid gap-16 md:gap-28">
        {content.categories.map((category, index) => {
          const key = CATEGORY_KEYS[index]
          return (
            <CategoryRow
              key={key}
              category={category}
              href={CATEGORY_HREF[key]}
              frames={work[key]}
              flipped={index % 2 === 1}
            />
          )
        })}
      </div>
    </Section>
  )
}

// ── 6 · behind the camera ─────────────────────────────────────

function Behind({ content, frame }: { content: StorySection; frame: HomeFrame | null }) {
  return (
    <Section>
      <div className="grid md:grid-cols-[4fr_7fr] gap-8 md:gap-24 items-center">
        <Photo
          frame={frame}
          ratio="aspect-[4/5]"
          position="center 20%"
          sizes="(max-width: 768px) 280px, 400px"
          className="max-w-[280px] md:max-w-none"
        />
        <div>
          <Label>{content.label}</Label>
          <Display>
            <Lines text={content.heading} />
          </Display>
          <Paragraphs text={content.body} className="mt-6 md:mt-8" />
        </div>
      </div>
    </Section>
  )
}

// ── 7 · workshops ─────────────────────────────────────────────

type WorkshopNote = { meta: string | null; cta: string } | null

function Workshops({
  content,
  frame,
  note,
}: {
  content: StorySection
  frame: HomeFrame | null
  note: WorkshopNote
}) {
  return (
    <Section>
      <div className="grid md:grid-cols-2 gap-9 md:gap-24 items-center">
        <div>
          {content.label && <Label>{content.label}</Label>}
          <Display>
            <Lines text={content.heading} />
          </Display>
          <Paragraphs text={content.body} className="mt-6 md:mt-8" />
          {note?.meta && (
            <p className="font-inter text-xs md:text-sm tracking-[0.1em] uppercase text-black mt-5 md:mt-6 m-0">
              {note.meta}
            </p>
          )}
          <div className="mt-7 md:mt-10">
            <Arrow href="/workshop" tone="paper">
              {note?.cta ?? content.link}
            </Arrow>
          </div>
        </div>
        <Photo frame={frame} ratio="aspect-[3/2]" position="center 35%" sizes="(max-width: 768px) 100vw, 560px" />
      </div>
    </Section>
  )
}

// ── 8 · invitation ────────────────────────────────────────────

function Invitation({ content, frame }: { content: StorySection; frame: HomeFrame | null }) {
  return (
    <Bleed frame={frame} height="h-[680px] md:h-[880px]" position="center 40%" align="center">
      <Label tone="frame">{content.label}</Label>
      <Display tone="frame" size="closing">
        <Lines text={content.heading} />
      </Display>
      <div className="mt-10 md:mt-14 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10">
        <Plate href="/book">{content.cta}</Plate>
        <Arrow href={`mailto:${CONTACT_EMAIL}`}>{content.link}</Arrow>
      </div>
    </Bleed>
  )
}

// ── page ──────────────────────────────────────────────────────

// While the workshop is being promoted (banner_visible), the workshops section
// carries its live dates/seats and the same CTA wording as the banner it
// replaces on this page. Otherwise it stays evergreen.
function workshopNote(workshop: Awaited<ReturnType<typeof getPublicWorkshop>>): WorkshopNote {
  if (!workshop || !workshop.banner_visible || !workshop.title) return null
  const meta = [workshop.title, workshop.sales_open ? workshop.dates : null, workshop.seats]
    .filter(Boolean)
    .join(' · ')
  return { meta: meta || null, cta: workshop.sales_open ? 'Apply' : 'Join the waitlist' }
}

export async function HomeStory() {
  const [slots, workshop, content] = await Promise.all([
    loadHomePhotos(),
    getPublicWorkshop(),
    loadHomeContent(),
  ])

  const people = content.people.photos.map((photo, index) => resolveFrame(photo, slots.people[index] ?? null))

  return (
    <main className="w-full bg-white">
      <Intro content={content.hero} frame={resolveFrame(content.hero.photos[0], slots.hero)} />
      <People content={content.people} frames={people} />
      <Session content={content.session} frame={resolveFrame(content.session.photos[0], slots.experience)} />
      <Work content={content.work} work={slots.work} />
      <VideoSection content={content.video} video={slots.video} />
      <Behind content={content.behind} frame={resolveFrame(content.behind.photos[0], MARIA_PORTRAIT)} />
      <Workshops
        content={content.workshops}
        frame={resolveFrame(content.workshops.photos[0], slots.workshops)}
        note={workshopNote(workshop)}
      />
      <Invitation content={content.invitation} frame={resolveFrame(content.invitation.photos[0], slots.invitation)} />
    </main>
  )
}

// Streaming fallback: reserve the hero so the page doesn't jump when the
// frames arrive.
export function HomeStorySkeleton() {
  return <div aria-hidden="true" className="h-[640px] md:h-[860px] w-full animate-pulse bg-[#0b0b0b]" />
}
