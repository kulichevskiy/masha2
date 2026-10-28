import Link from 'next/link'
import type { StoryCredit } from '@/lib/editorial-stories'
import { PhotoLightboxGrid, type LightboxPhoto } from '@/app/components/ui/photo-lightbox'

export type StoryNeighbour = { slug: string; title: string }

export type StoryPageProps = {
  title: string
  subtitle: string
  credits: StoryCredit[]
  photos: LightboxPhoto[]
  previous: StoryNeighbour | null
  next: StoryNeighbour | null
}

// Everything in the header and the footer navigation sits on the same three
// columns as the photo grid (16px gutters inside the 1280 container), so each
// left edge lands on a photo edge — the one layout decision that keeps the
// page tidy. Phone stacks the blocks in a single column.
const GRID = 'mx-auto w-full max-w-7xl px-4 md:px-6 grid grid-cols-1 lg:grid-cols-3 gap-x-4'
const MUTED_NAV = 'inline-block font-bebas-neue text-[15px] leading-none tracking-[0.1em] uppercase text-black opacity-[0.45] transition-opacity hover:opacity-100'
const EYEBROW = 'block text-xs tracking-[0.3em] lowercase text-gray-500'
const NAV_TITLE = 'mt-2.5 block font-bebas-neue text-[30px] leading-none tracking-[-0.005em] lowercase text-black'

export function StoryPage({ title, subtitle, credits, photos, previous, next }: StoryPageProps) {
  return (
    <>
      <header className={`${GRID} items-start pt-10 lg:pt-14 pb-2`}>
        <Link href="/editorial" className={`${MUTED_NAV} justify-self-start lg:col-span-3`}>
          ← Editorial
        </Link>
        <h1 className="mt-5 lg:mt-8 lg:col-span-3 font-bebas-neue font-normal text-[56px] lg:text-[120px] leading-[0.9] lg:leading-[0.85] tracking-[-0.01em] lowercase text-black">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-4 lg:mt-10 lg:col-span-2 max-w-[560px] text-[15px] lg:text-lg leading-[1.7] text-gray-600">{subtitle}</p>
        ) : null}
        <dl className="mt-4 lg:mt-10 lg:col-start-3 lg:pt-1.5 grid grid-cols-[max-content_1fr] gap-x-4 lg:gap-x-6 gap-y-1 lg:gap-y-1.5 font-roboto-mono text-[11px] lg:text-xs leading-[1.4] tracking-[0.02em] lowercase">
          {credits.map((credit, index) => (
            <CreditRow key={`${credit.role}-${index}`} role={credit.role} name={credit.name} />
          ))}
          <CreditRow role="photos" name={String(photos.length)} />
        </dl>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 md:px-6 pt-8 lg:pt-12">
        <PhotoLightboxGrid photos={photos} />
      </div>

      <nav aria-label="Stories" className={`${GRID} mt-6 lg:mt-12 items-end border-t border-gray-200 pt-8 gap-y-6`}>
        {previous ? (
          <Link href={`/editorial/${previous.slug}`} className="block text-black">
            <span className={EYEBROW}>previous</span>
            <span className={NAV_TITLE}>←&nbsp;{previous.title}</span>
          </Link>
        ) : <span />}
        <Link href="/editorial" className={`${MUTED_NAV} justify-self-start lg:justify-self-center self-end pb-1.5`}>
          All stories
        </Link>
        {next ? (
          <Link href={`/editorial/${next.slug}`} className="block text-black lg:text-right">
            <span className={EYEBROW}>next</span>
            <span className={NAV_TITLE}>{next.title}&nbsp;→</span>
          </Link>
        ) : <span />}
      </nav>
    </>
  )
}

function CreditRow({ role, name }: { role: string; name: string }) {
  return (
    <>
      <dt className="text-gray-400">{role}</dt>
      <dd className="m-0 text-black">{name}</dd>
    </>
  )
}
