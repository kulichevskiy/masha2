// Home page — design variant C ("mixed"). Full-bleed frames with white type
// open, punctuate and close the page (hero, video, invitation); between them
// the narrative sections sit on paper: black display type, gray body, bare
// photographs. Eight sections, one story. Desktop values kick in at `md`.
//
// Frames come from the section feeds (see lib/home-story-photos.ts); Maria
// curates the page by reordering those feeds in admin.

import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { PHOTO_IMAGE_QUALITY } from '@/lib/image-config'
import {
  formatVideoDuration,
  type HomeCategory,
  type HomeFrame,
  type HomePhotoSlots,
  type HomeVideoFrame,
} from '@/lib/home-story-photos'
import { getPublicWorkshop } from '../../workshop/data'
import { loadHomePhotos } from './home-photos'

const CONTACT_EMAIL = 'maria.chevskaya@gmail.com'

// ── shared bits ───────────────────────────────────────────────

// A photograph filling its positioned parent. `position` is the CSS
// object-position used to keep faces inside a cover crop.
function Fill({
  frame,
  sizes = '100vw',
  position = 'center',
  priority = false,
  className = '',
}: {
  frame: HomeFrame | null
  sizes?: string
  position?: string
  priority?: boolean
  className?: string
}) {
  if (!frame) return null
  return (
    <Image
      src={frame.src}
      alt={frame.alt}
      fill
      sizes={sizes}
      quality={PHOTO_IMAGE_QUALITY}
      priority={priority}
      className={`object-cover ${className}`}
      style={{ objectPosition: position }}
    />
  )
}

// Underlined Bebas link with a trailing arrow. White on frames, black on paper.
function Arrow({
  href,
  children,
  dark = false,
  className = '',
}: {
  href: string
  children: ReactNode
  dark?: boolean
  className?: string
}) {
  const tone = dark ? 'text-[#252525] border-[#252525]' : 'text-white border-white'
  return (
    <Link
      href={href}
      className={`inline-block font-bebas-neue text-lg tracking-[0.1em] uppercase border-b pb-[3px] transition-opacity hover:opacity-60 ${tone} ${className}`}
    >
      {children} →
    </Link>
  )
}

// The one solid plate on a dark frame: white block, black condensed caps.
function Plate({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-block bg-white text-[#252525] text-center font-bebas-neue text-xl tracking-[0.12em] uppercase transition-colors hover:bg-[#e5e5e5] ${className}`}
    >
      {children}
    </Link>
  )
}

// ── full-bleed frame (B) ──────────────────────────────────────

type Align = 'bl' | 'c'

const ALIGN: Record<Align, string> = {
  bl: 'items-end justify-start',
  c: 'items-center justify-center text-center',
}

function Bleed({
  frame,
  height,
  position,
  align = 'bl',
  scrim = true,
  priority = false,
  overlay,
  children,
}: {
  frame: HomeFrame | null
  height: string
  position?: string
  align?: Align
  scrim?: boolean
  priority?: boolean
  overlay?: ReactNode
  children: ReactNode
}) {
  return (
    <section className={`relative w-full overflow-hidden bg-[#0b0b0b] text-white ${height}`}>
      <Fill frame={frame} position={position} priority={priority} />
      {scrim && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.62)_0%,rgba(0,0,0,0.18)_45%,rgba(0,0,0,0)_70%)]"
        />
      )}
      {overlay}
      <div className={`absolute inset-0 flex px-5 py-7 md:p-16 ${ALIGN[align]}`}>
        <div className="relative max-w-full md:max-w-[720px]">{children}</div>
      </div>
    </section>
  )
}

const bleedLabel = 'font-inter text-[11px] md:text-xs tracking-[0.3em] lowercase text-white/70 mb-3.5 md:mb-5'
const bleedDisplay = 'font-bebas-neue font-normal lowercase leading-[0.92] tracking-[-0.005em] text-white m-0 [text-wrap:pretty]'
const bleedBody = 'font-inter text-base md:text-[19px] leading-[1.65] text-white/90 mt-4 md:mt-6 max-w-[520px] [text-wrap:pretty]'

// ── paper section (A) ─────────────────────────────────────────

function Section({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`mx-auto max-w-[1200px] px-5 py-[72px] md:px-10 md:py-32 ${className}`}>
      {children}
    </section>
  )
}

function Label({ children }: { children: ReactNode }) {
  return (
    <div className="font-inter text-[11px] md:text-xs tracking-[0.3em] lowercase text-gray-500 mb-[18px] md:mb-6">
      {children}
    </div>
  )
}

function Display({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={`font-bebas-neue font-normal lowercase leading-[0.95] tracking-[-0.005em] text-[#252525] m-0 [text-wrap:pretty] text-[44px] md:text-[68px] ${className}`}
    >
      {children}
    </h2>
  )
}

function Body({ children, strong = false, className = '' }: { children: ReactNode; strong?: boolean; className?: string }) {
  return (
    <p
      className={`font-inter text-base md:text-lg leading-[1.7] m-0 max-w-[520px] [text-wrap:pretty] ${strong ? 'text-[#252525]' : 'text-gray-600'} ${className}`}
    >
      {children}
    </p>
  )
}

function Photo({
  frame,
  ratio,
  position,
  sizes,
  className = '',
}: {
  frame: HomeFrame | null
  ratio: string
  position?: string
  sizes: string
  className?: string
}) {
  return (
    <div className={`relative overflow-hidden bg-gray-100 ${ratio} ${className}`}>
      <Fill frame={frame} position={position} sizes={sizes} />
    </div>
  )
}

// ── 1 · introduction ──────────────────────────────────────────

function Intro({ frame }: { frame: HomeFrame | null }) {
  return (
    <Bleed frame={frame} height="h-[640px] md:h-[860px]" position="center 30%" priority>
      <div className={bleedLabel}>Berlin</div>
      <h1 className={`${bleedDisplay} text-[54px] md:text-[104px]`}>portrait and editorial photographer.</h1>
      <p className={bleedBody}>
        I photograph people — their character, presence and the way they connect with each other.
      </p>
      <div className="mt-6 md:mt-9 flex flex-col md:flex-row md:items-center gap-5 md:gap-9">
        <Plate href="/book" className="py-[15px] px-0 md:px-[52px]">
          Book a session
        </Plate>
        <div className="hidden md:block">
          <Arrow href="#work">See the work</Arrow>
        </div>
      </div>
    </Bleed>
  )
}

// ── 2 · people ────────────────────────────────────────────────

function People({ frames }: { frames: (HomeFrame | null)[] }) {
  const [left, middle, right] = frames
  const cellSizes = '(max-width: 768px) 50vw, 400px'
  return (
    <Section>
      <Label>people</Label>
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
      <div className="grid md:grid-cols-2 gap-5 md:gap-20">
        <Display>some people come alone. others bring their children, their partner or an idea.</Display>
        <Body strong>The setting changes. My interest in the person doesn&apos;t.</Body>
      </div>
    </Section>
  )
}

// ── 3 · the experience ────────────────────────────────────────

function Experience({ frame }: { frame: HomeFrame | null }) {
  return (
    <Section>
      <div className="grid md:grid-cols-[5fr_7fr] gap-9 md:gap-24 items-center">
        <div>
          <Label>the experience</Label>
          <Display>you don&apos;t need to know how to pose.</Display>
          <div className="mt-[22px] md:mt-8 grid gap-3.5">
            <Body>I give direction when it&apos;s needed and leave space when it isn&apos;t.</Body>
            <Body>Sessions take place in a studio, at home or on location in Berlin.</Body>
          </div>
        </div>
        <Photo frame={frame} ratio="aspect-[4/5] md:aspect-[3/4]" sizes="(max-width: 768px) 100vw, 660px" />
      </div>
    </Section>
  )
}

// ── 4 · the work ──────────────────────────────────────────────

const CATEGORIES: { key: HomeCategory; title: string; text: string; href: string }[] = [
  {
    key: 'portraits',
    title: 'Portraits',
    text: 'Individual portraits for women and men, actors, models and creatives.',
    href: '/',
  },
  {
    key: 'kids',
    title: 'Kids & Families',
    text: "Family and children's photography, somewhere meaningful to you.",
    href: '/kids',
  },
  {
    key: 'editorial',
    title: 'Editorial',
    text: 'Editorial photography, model tests and creative collaborations.',
    href: '/',
  },
]

function CategoryRow({
  category,
  frames,
  index,
}: {
  category: (typeof CATEGORIES)[number]
  frames: HomeFrame[]
  index: number
}) {
  const flipped = index % 2 === 1
  return (
    <div
      className={`grid gap-5 md:gap-16 items-end ${flipped ? 'md:grid-cols-[8fr_4fr]' : 'md:grid-cols-[4fr_8fr]'}`}
    >
      <div className={flipped ? 'md:order-1' : ''}>
        <h3 className="font-bebas-neue font-normal text-4xl md:text-[44px] leading-none uppercase tracking-[0.02em] text-[#252525] m-0">
          {category.title}
        </h3>
        <Body className="mt-3 md:mb-6 max-w-[360px]">{category.text}</Body>
        <div className="hidden md:block">
          <Arrow href={category.href} dark>
            More
          </Arrow>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {frames.map((frame) => (
          <Link
            key={frame.id}
            href={category.href}
            aria-label={`${category.title}: ${frame.alt || 'open the section'}`}
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
      <div className="md:hidden">
        <Arrow href={category.href} dark>
          More
        </Arrow>
      </div>
    </div>
  )
}

function Work({ work }: { work: HomePhotoSlots['work'] }) {
  return (
    <Section id="work" className="scroll-mt-4">
      <Label>the work</Label>
      <div className="grid gap-16 md:gap-28">
        {CATEGORIES.map((category, index) => (
          <CategoryRow key={category.key} category={category} frames={work[category.key]} index={index} />
        ))}
      </div>
    </Section>
  )
}

// ── 5 · video ─────────────────────────────────────────────────

function Video({ video }: { video: HomeVideoFrame | null }) {
  const label = video ? `video · ${formatVideoDuration(video.durationSeconds)}` : 'video'
  return (
    <Bleed
      frame={video}
      height="h-[640px] md:h-[820px]"
      position="center 30%"
      overlay={
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 md:h-[88px] md:w-[88px] items-center justify-center border border-white/75">
            <div className="ml-[5px] h-0 w-0 border-y-[10px] border-y-transparent border-l-[17px] border-l-white" />
          </div>
        </div>
      }
    >
      <div className={bleedLabel}>{label}</div>
      <h2 className={`${bleedDisplay} text-[44px] md:text-[72px]`}>some things happen between photographs.</h2>
      <p className={bleedBody}>A voice, a gesture, a pause. Video lets me keep what a still image cannot.</p>
      <div className="mt-[22px] md:mt-8">
        <Arrow href="/video">Explore video portraits</Arrow>
      </div>
    </Bleed>
  )
}

// ── 6 · behind the camera ─────────────────────────────────────

function Behind() {
  return (
    <Section>
      <div className="grid md:grid-cols-[4fr_7fr] gap-8 md:gap-24 items-center">
        <div className="relative overflow-hidden bg-gray-100 aspect-[4/5] max-w-[280px] md:max-w-none">
          <Image
            src="/photos/photo_2026-02-01 17.14.58.jpeg"
            alt="Maria Chevskaya"
            fill
            sizes="(max-width: 768px) 280px, 400px"
            quality={PHOTO_IMAGE_QUALITY}
            className="object-cover"
            style={{ objectPosition: 'center 20%' }}
          />
        </div>
        <div>
          <Label>behind the camera</Label>
          <Display>I&apos;m Maria, a Berlin-based photographer.</Display>
          <Body className="mt-[22px] md:mt-8">
            My work moves between portrait, family and editorial photography, personal projects and commercial
            commissions.
          </Body>
        </div>
      </div>
    </Section>
  )
}

// ── 7 · workshops ─────────────────────────────────────────────

type WorkshopNote = { meta: string | null; cta: string } | null

function Workshops({ frame, note }: { frame: HomeFrame | null; note: WorkshopNote }) {
  return (
    <Section>
      <div className="grid md:grid-cols-2 gap-9 md:gap-24 items-center">
        <div>
          <Label>workshops</Label>
          <Display>and sometimes I teach it.</Display>
          <Body className="mt-[22px] md:mt-8">
            Photography workshops in Berlin about seeing people, building a frame and understanding why an image
            works.
          </Body>
          {note?.meta && (
            <p className="font-inter text-xs md:text-sm tracking-[0.1em] uppercase text-[#252525] mt-5 md:mt-6 m-0">
              {note.meta}
            </p>
          )}
          <div className="mt-7 md:mt-10">
            <Arrow href="/workshop" dark>
              {note?.cta ?? 'Explore workshops'}
            </Arrow>
          </div>
        </div>
        <Photo frame={frame} ratio="aspect-[3/2]" position="center 35%" sizes="(max-width: 768px) 100vw, 560px" />
      </div>
    </Section>
  )
}

// ── 8 · invitation ────────────────────────────────────────────

function Invitation({ frame }: { frame: HomeFrame | null }) {
  return (
    <Bleed
      frame={frame}
      height="h-[720px] md:h-[900px]"
      position="center 40%"
      align="c"
      scrim={false}
      overlay={<div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black/[0.42]" />}
    >
      <div className={bleedLabel}>a next step</div>
      <h2 className={`${bleedDisplay} text-[60px] md:text-[120px]`}>let&apos;s make something together.</h2>
      <div className="mt-9 md:mt-14 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10">
        <Plate href="/book" className="w-full min-w-[260px] md:w-auto py-4 md:px-14">
          Book a session
        </Plate>
        <div className="flex gap-6 md:gap-10">
          <Arrow href={`mailto:${CONTACT_EMAIL}`}>Work with me</Arrow>
          <Arrow href="/workshop">Join a workshop</Arrow>
        </div>
      </div>
      <div className="mt-9 md:mt-14 font-inter text-sm tracking-[0.1em] text-white/70">
        {CONTACT_EMAIL} · Berlin
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
  const [slots, workshop] = await Promise.all([loadHomePhotos(), getPublicWorkshop()])

  return (
    <main className="w-full bg-white">
      <Intro frame={slots.hero} />
      <People frames={slots.people} />
      <Experience frame={slots.experience} />
      <Work work={slots.work} />
      <Video video={slots.video} />
      <Behind />
      <Workshops frame={slots.workshops} note={workshopNote(workshop)} />
      <Invitation frame={slots.invitation} />
    </main>
  )
}

// Streaming fallback: reserve the hero so the page doesn't jump when the
// frames arrive.
export function HomeStorySkeleton() {
  return <div aria-hidden="true" className="h-[640px] md:h-[860px] w-full animate-pulse bg-[#0b0b0b]" />
}
