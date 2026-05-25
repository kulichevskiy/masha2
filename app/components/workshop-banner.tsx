// Home-page banner — Entry E from the design exploration.
// Renders nothing when the workshop is hidden; RLS already gates it but we
// also explicitly guard `is_visible` so the admin reader path can't leak it.

import Link from 'next/link'
import { getPublicWorkshop, workshopPhotoUrl } from '../workshop/data'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

export async function WorkshopBanner() {
  const workshop = await getPublicWorkshop()
  if (!workshop || !workshop.is_visible || !workshop.title) return null

  const heroUrl = workshopPhotoUrl(SUPABASE_URL, workshop.hero_photo_path)

  // Same approach the WorkshopContent hero uses — split a `Title · Location`
  // string at the middle-dot so the headline reads as one big mark.
  const titleMain = workshop.title.split(/\s*·\s*/)[0] ?? workshop.title

  const meta = [workshop.dates, workshop.seats].filter(Boolean).join(' · ')

  return (
    <Link
      href="/workshop"
      className="block relative w-full overflow-hidden bg-black text-white h-[280px] md:h-[320px] mt-6 md:mt-10 group"
      aria-label={`Workshop — ${workshop.title}`}
    >
      {heroUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-55 grayscale [filter:grayscale(1)_contrast(1.05)]"
        />
      )}
      <div className="relative h-full mx-auto max-w-7xl px-5 md:px-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6 py-6 md:py-0">
        <div>
          <div className="font-inter text-[10.5px] md:text-xs tracking-[0.25em] uppercase opacity-75 mb-3 md:mb-3.5">
            New · Workshop in Berlin
          </div>
          <div className="font-bebas-neue text-[44px] md:text-[84px] leading-[0.95] tracking-[-0.01em] uppercase">
            {titleMain}
          </div>
          {meta && (
            <div className="font-inter text-xs md:text-sm tracking-[0.1em] uppercase mt-3 md:mt-3.5 opacity-85">
              {meta}
            </div>
          )}
        </div>
        <span className="self-start md:self-auto bg-white text-black px-6 md:px-12 py-2.5 md:py-3.5 font-bebas-neue text-base md:text-xl tracking-[0.12em] uppercase group-hover:bg-white/90 transition-colors">
          Apply →
        </span>
      </div>
    </Link>
  )
}
