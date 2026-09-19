// The shared surface of the home story: the two tones, the type scale, the
// links, the photo frames and the two containers every section is built from.
// Kept free of data loading so both the server sections in home-story.tsx and
// the client-side video section can import it.

import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { PHOTO_IMAGE_QUALITY } from '@/lib/image-config'
import type { HomeFrame } from '@/lib/home-story-photos'
import { paragraphs } from '@/lib/home-story-content'
import { typeset } from '@/lib/typography'

// ── type ──────────────────────────────────────────────────────
// Two tones carry the whole page: `paper` (black type on a white section) and
// `frame` (white type over a photograph). Every label, headline and paragraph
// goes through these three components, so the scale lives in one place.

type Tone = 'paper' | 'frame'

const LABEL_TONE: Record<Tone, string> = {
  paper: 'text-gray-500',
  frame: 'text-white/70',
}

export function Label({ children, tone = 'paper' }: { children: ReactNode; tone?: Tone }) {
  return (
    <p className={`font-inter text-[11px] md:text-xs tracking-[0.3em] lowercase m-0 mb-4 md:mb-6 ${LABEL_TONE[tone]}`}>
      {typeof children === 'string' ? typeset(children) : children}
    </p>
  )
}

// Named display sizes — the four beats of the page, largest at the open and
// the close. Leading travels with the size so the two never disagree.
const DISPLAY_SIZE = {
  hero: 'text-[54px] md:text-[104px] leading-[0.92]',
  section: 'text-[44px] md:text-[68px] leading-[0.95]',
  bleed: 'text-[44px] md:text-[72px] leading-[0.92]',
  closing: 'text-[56px] md:text-[112px] leading-[0.92]',
} as const

const DISPLAY_TONE: Record<Tone, string> = {
  paper: 'text-black',
  frame: 'text-white',
}

export function Display({
  children,
  tone = 'paper',
  size = 'section',
  as: Tag = 'h2',
}: {
  children: ReactNode
  tone?: Tone
  size?: keyof typeof DISPLAY_SIZE
  as?: 'h1' | 'h2'
}) {
  return (
    <Tag
      className={`font-bebas-neue font-normal lowercase tracking-[-0.005em] m-0 [text-wrap:pretty] ${DISPLAY_SIZE[size]} ${DISPLAY_TONE[tone]}`}
    >
      {children}
    </Tag>
  )
}

const BODY_TONE: Record<Tone, string> = {
  paper: 'text-gray-600',
  frame: 'text-white/90',
}

export function Body({
  children,
  tone = 'paper',
  strong = false,
  className = '',
}: {
  children: ReactNode
  tone?: Tone
  strong?: boolean
  className?: string
}) {
  const color = strong ? 'text-black' : BODY_TONE[tone]
  return (
    <p className={`font-inter text-base md:text-lg leading-[1.7] m-0 max-w-[520px] [text-wrap:pretty] ${color} ${className}`}>
      {typeof children === 'string' ? typeset(children) : children}
    </p>
  )
}

// ── links ─────────────────────────────────────────────────────

// Underlined Bebas link with a trailing arrow. White on frames, black on paper.
export function Arrow({
  href,
  children,
  tone = 'frame',
}: {
  href: string
  children: ReactNode
  tone?: Tone
}) {
  const color = tone === 'paper' ? 'text-black border-black' : 'text-white border-white'
  return (
    <Link
      href={href}
      className={`inline-block font-bebas-neue text-lg tracking-[0.1em] uppercase border-b pb-1 transition-opacity hover:opacity-60 ${color}`}
    >
      {typeof children === 'string' ? typeset(children) : children}
      {'\u00A0→'}
    </Link>
  )
}

// The one solid plate on a dark frame: white block, black condensed caps.
// Full width on mobile where it is the only thing to press.
export function Plate({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="block w-full md:inline-block md:w-auto bg-white text-black text-center font-bebas-neue text-xl tracking-[0.12em] uppercase px-10 md:px-14 py-4 transition-colors hover:bg-gray-200"
    >
      {typeof children === 'string' ? typeset(children) : children}
    </Link>
  )
}

// ── images ────────────────────────────────────────────────────

// A photograph filling its positioned parent. `position` is the CSS
// object-position used to keep faces inside a cover crop.
export function Fill({
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

// A bare photograph on paper: fixed ratio, gray plate while it loads.
export function Photo({
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

// ── containers ────────────────────────────────────────────────

// Paper section — same column as the rest of the site (nav, footer, workshop).
export function Section({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <section id={id} className="mx-auto max-w-7xl px-5 md:px-10 py-20 md:py-32">
      {children}
    </section>
  )
}

type Align = 'bottom-left' | 'center'

const ALIGN: Record<Align, string> = {
  'bottom-left': 'items-end justify-start',
  center: 'items-center justify-center text-center',
}

// Full-bleed frame — a photograph the width of the window, type laid over it.
// The scrim is a bottom-up gradient for `bottom-left` copy; `center` copy sits
// on a flat wash instead, since it has no edge to hide behind.
export function Bleed({
  frame,
  height,
  position,
  align = 'bottom-left',
  priority = false,
  media,
  controls,
  children,
}: {
  frame: HomeFrame | null
  height: string
  position?: string
  align?: Align
  priority?: boolean
  // Painted over the photograph but under the scrim, so the type stays
  // readable on top of it (the video section puts its film here).
  media?: ReactNode
  // Painted last, above the copy. The wrapper lets clicks through; whatever
  // goes inside takes them back with `pointer-events-auto`.
  controls?: ReactNode
  children: ReactNode
}) {
  const scrim =
    align === 'center'
      ? 'bg-black/[0.42]'
      : 'bg-[linear-gradient(to_top,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.26)_45%,rgba(0,0,0,0)_75%)]'
  return (
    <section className={`relative w-full overflow-hidden bg-[#0b0b0b] text-white ${height}`}>
      <Fill frame={frame} position={position} priority={priority} />
      {media}
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${scrim}`} />
      <div className={`absolute inset-0 flex px-5 py-10 md:p-16 ${ALIGN[align]}`}>
        <div className="relative w-full md:max-w-[720px]">{children}</div>
      </div>
      {controls && <div className="pointer-events-none absolute inset-0">{controls}</div>}
    </section>
  )
}

// ── editable copy ─────────────────────────────────────────────

// A heading straight from the admin: every newline is a line break, so the
// author decides where "and editorial" sits. Within a line the typesetter
// keeps short words and dashes from hanging.
export function Lines({ text }: { text: string }) {
  const rows = typeset(text).split('\n')
  return (
    <>
      {rows.map((row, index) => (
        <span key={index}>
          {row}
          {index < rows.length - 1 && <br />}
        </span>
      ))}
    </>
  )
}

// A body straight from the admin: a blank line starts a new paragraph.
export function Paragraphs({
  text,
  tone = 'paper',
  className = '',
  gap = 'gap-4',
}: {
  text: string
  tone?: Tone
  className?: string
  gap?: string
}) {
  const parts = paragraphs(text).map(typeset)
  if (parts.length === 0) return null
  if (parts.length === 1) {
    return (
      <Body tone={tone} className={className}>
        {parts[0]}
      </Body>
    )
  }
  return (
    <div className={`grid ${gap} ${className}`}>
      {parts.map((part, index) => (
        <Body key={index} tone={tone}>
          {part}
        </Body>
      ))}
    </div>
  )
}
