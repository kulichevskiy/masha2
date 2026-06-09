// Pure presentational renderer for the workshop page (Workshop C / bold magazine
// layout, mobile-first). Takes a normalised Workshop + a publicUrlFor() resolver
// so it stays free of supabase imports — that's what lets the snapshot test
// pass a synthetic workshop in without standing up a client.

import { RichText } from '@/components/rich-text'
import { TariffsBand } from './tariffs-band'
import { ApplyBand } from './apply-band'
import { IntakeProvider } from './intake-context'
import type { Workshop } from '../data'

type Props = {
  workshop: Workshop
  publicUrlFor: (storagePath: string | null | undefined) => string | null
}

// Chapter sequence used both for the desktop strip and the inline "n — label"
// markers. Gallery is conditional, so we derive numbers from this list rather
// than hardcoding them — otherwise hiding the gallery would leave a gap
// (Questions stuck at 07 with nothing at 06) and the desktop strip would
// diverge from the page body.
type ChapterKey =
  | 'idea'
  | 'program'
  | 'day'
  | 'tariffs'
  | 'gallery'
  | 'questions'
  | 'apply'

function buildChapters(
  hasTariffs: boolean,
  hasGallery: boolean,
  hasFaq: boolean
): { key: ChapterKey; label: string }[] {
  const base: { key: ChapterKey; label: string }[] = [
    { key: 'idea', label: 'The idea' },
    { key: 'program', label: 'Program' },
    { key: 'day', label: 'The three days' },
  ]
  if (hasTariffs) base.push({ key: 'tariffs', label: 'Pricing' })
  if (hasGallery) base.push({ key: 'gallery', label: 'From the practice' })
  if (hasFaq) base.push({ key: 'questions', label: 'Questions' })
  base.push({ key: 'apply', label: 'Apply' })
  return base
}

function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .trim()
}

function ChapterLabel({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-2.5 font-inter text-[10.5px] md:text-[11px] tracking-[0.28em] md:tracking-[0.3em] uppercase text-gray-500 mb-3 md:mb-3">
      <span className="opacity-60">{String(n).padStart(2, '0')}</span>
      <span className="block w-4 md:w-7 h-px bg-current opacity-40" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export function WorkshopContent({ workshop, publicUrlFor }: Props) {
  const heroUrl = publicUrlFor(workshop.hero_photo_path)
  const title = workshop.title ?? ''
  // The hero design splits the title across two lines (e.g. "Portrait /
  // Workshop"). Honour that if the admin uses a literal " / " separator,
  // otherwise let the browser wrap naturally.
  const titleLines = title.includes(' / ')
    ? title.split(' / ')
    : title.split(/\s*·\s*/)

  // Filter empty gallery entries before rendering — admin can persist a row
  // with no photo_path yet (default for new rows / cleared rows). Without this
  // filter the public page would show blank gray placeholder tiles, and the
  // Apply chapter number would jump even when no gallery shows.
  const galleryItems = workshop.gallery.filter(
    (g) => g.photo_path && g.photo_path.trim() !== ''
  )
  const hasGallery = galleryItems.length > 0
  const hasFaq = workshop.faq.length > 0
  const hasTariffs = workshop.tariffs.length > 0
  const chapters = buildChapters(hasTariffs, hasGallery, hasFaq)

  // Hero price: surface both intake prices ("450 € / 600 €") pulled from the
  // short and full/featured tariff rows. Falls back to the single legacy
  // workshop.price when fewer than two tariffs exist.
  const shortTariff = workshop.tariffs.find((t) => t.key === 'short')
  const fullTariff =
    workshop.tariffs.find((t) => t.featured) ??
    workshop.tariffs.find((t) => t.key === 'full')
  const heroPrice =
    shortTariff && fullTariff
      ? `${shortTariff.price} / ${fullTariff.price}`
      : workshop.price
  const chapterN = (key: ChapterKey): number => {
    const i = chapters.findIndex((c) => c.key === key)
    return i + 1 // 1-based; missing keys fall through to 0 → never used
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: workshop.faq.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: htmlToText(f.answer),
      },
    })),
  }

  return (
    <IntakeProvider>
    <div className="bg-white text-gray-700 font-inter">
      {/* ───────── Hero — full-bleed black plate ───────── */}
      <section className="relative bg-black text-white overflow-hidden mt-6 md:mt-10">
        {heroUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover opacity-40 [filter:grayscale(1)_contrast(1.1)]"
          />
        )}
        <div className="relative mx-auto max-w-7xl px-5 md:px-10 pt-8 md:pt-28 pb-10 md:pb-24">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-7 md:mb-10 font-inter text-[10px] md:text-xs tracking-[0.3em] uppercase text-white/70">
            {workshop.workshop_number && <span>{workshop.workshop_number}</span>}
            {workshop.location && (
              <>
                <span className="hidden md:inline-block w-7 h-px bg-white/40" aria-hidden="true" />
                <span className="md:hidden opacity-50">·</span>
                <span>{workshop.location}</span>
              </>
            )}
            {workshop.dates && (
              <>
                <span className="hidden md:inline-block w-7 h-px bg-white/40" aria-hidden="true" />
                <span className="md:hidden opacity-50">·</span>
                <span>{workshop.dates}</span>
              </>
            )}
          </div>

          <h1 className="font-bebas-neue uppercase font-normal text-white m-0 text-[88px] md:text-[140px] lg:text-[200px] leading-[0.88] tracking-[-0.015em] md:tracking-[-0.02em]">
            {titleLines.map((line, i) => (
              <span key={i} className="block">
                {line.trim()}
              </span>
            ))}
          </h1>

          {workshop.tagline && (
            <p className="font-playfair-display italic text-[18px] md:text-[28px] leading-[1.4] md:leading-[1.3] mt-6 md:mt-10 max-w-[560px] text-white/90 m-0">
              &ldquo;{workshop.tagline}&rdquo;
            </p>
          )}

          {/* Mobile-only meta row above the buttons (matches MWorkshopC). */}
          {(workshop.dates || workshop.seats || heroPrice) && (
            <div className="md:hidden mt-7 pt-5 border-t border-white/20 flex flex-wrap gap-3 font-inter text-[11px] tracking-[0.18em] uppercase text-white/70">
              {workshop.dates && <span>{workshop.dates}</span>}
              {workshop.seats && (
                <>
                  <span className="opacity-50">·</span>
                  <span>{workshop.seats}</span>
                </>
              )}
              {heroPrice && (
                <>
                  <span className="opacity-50">·</span>
                  <span>{heroPrice}</span>
                </>
              )}
            </div>
          )}

          <div className="mt-6 md:mt-14 flex gap-3 md:gap-4">
            <a
              href="#apply"
              className="bg-white text-black px-0 md:px-14 py-3.5 md:py-4 font-bebas-neue text-lg md:text-[22px] tracking-[0.12em] uppercase text-center flex-[1.4] md:flex-none md:inline-block hover:bg-white/90 transition-colors"
            >
              Join the workshop →
            </a>
            {(heroPrice || workshop.seats) && (
              <span className="bg-transparent text-white border border-white/50 px-0 md:px-10 py-3.5 md:py-4 font-bebas-neue text-lg md:text-[22px] tracking-[0.12em] uppercase text-center flex-1 md:flex-none md:inline-block">
                <span className="md:hidden">Save</span>
                <span className="hidden md:inline">
                  {[heroPrice, workshop.seats].filter(Boolean).join(' · ')}
                </span>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ───────── Chapter strip (desktop only) ───────── */}
      <section className="hidden md:block border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-10 flex justify-between">
          {chapters.map((c, i) => (
            <div
              key={c.key}
              className="py-5 font-inter text-xs tracking-[0.2em] uppercase text-gray-500 whitespace-nowrap"
            >
              <span className="mr-2 opacity-50">{String(i + 1).padStart(2, '0')}</span>
              {c.label}
            </div>
          ))}
        </div>
      </section>

      {/* ───────── 01 — The idea ───────── */}
      <section className="px-5 md:px-10 pt-14 md:pt-28">
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 md:gap-16">
          <div>
            <ChapterLabel n={chapterN('idea')} label="The idea" />
            <h2 className="font-bebas-neue text-3xl md:text-[56px] leading-none lowercase text-foreground m-0 font-normal tracking-[-0.015em] whitespace-pre-line">
              {workshop.the_idea_heading ?? ''}
            </h2>
          </div>
          <div>
            {workshop.the_idea_quote && (
              <p className="font-playfair-display italic text-[22px] md:text-[32px] leading-[1.4] text-foreground m-0 mb-6 md:mb-8">
                &ldquo;{workshop.the_idea_quote}&rdquo;
              </p>
            )}
            {workshop.intro && (
              <RichText
                html={workshop.intro}
                className="text-[15.5px] md:text-[17px] leading-[1.7] md:leading-[1.75]"
              />
            )}
          </div>
        </div>
      </section>

      {/* ───────── 02 — Program ───────── */}
      <section className="px-5 md:px-10 pt-16 md:pt-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 md:gap-16 mb-8 md:mb-12">
            <div>
              <ChapterLabel n={chapterN('program')} label="Program" />
              <h2 className="font-bebas-neue text-3xl md:text-[56px] leading-none lowercase text-foreground m-0 font-normal tracking-[-0.015em]">
                three days
                <br />
                in rhythm
              </h2>
            </div>
            <div />
          </div>
          <div className="border-t border-gray-200">
            {workshop.program.map((d, i) => {
              const photo = publicUrlFor(d.photo_path)
              const isLast = i === workshop.program.length - 1
              return (
                <div
                  key={`${d.day}-${i}`}
                  className={
                    'grid grid-cols-1 md:grid-cols-[240px_320px_1fr] gap-6 md:gap-16 py-7 md:py-10 items-start ' +
                    (isLast ? 'border-b border-gray-200' : '')
                  }
                >
                  <div className="flex md:block items-baseline gap-4 md:gap-0">
                    <div className="font-bebas-neue text-[64px] md:text-[96px] leading-[0.85] text-foreground tracking-[-0.02em]">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div className="font-inter text-[10.5px] md:text-xs tracking-[0.25em] uppercase text-gray-500 md:mt-3">
                      {d.day}
                    </div>
                  </div>
                  <div className="md:max-w-none">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo}
                        alt=""
                        aria-hidden="true"
                        className="w-full md:aspect-square aspect-[4/3] object-cover bg-gray-200"
                      />
                    ) : (
                      <div
                        className="w-full md:aspect-square aspect-[4/3] bg-gray-200"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bebas-neue text-[30px] md:text-[56px] leading-none lowercase text-foreground m-0 mb-4 md:mb-5 font-normal tracking-[-0.005em] md:tracking-[-0.01em]">
                      {d.title}
                    </h3>
                    {d.body && (
                      <RichText
                        html={d.body}
                        className="text-[15px] md:text-[17px] leading-[1.7]"
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ───────── 03 — The three days (fixed 3-column breakdown) ───────── */}
      {/* Replaces the old schedule · included · bring row. Each column is one
          day: a "DAY N" eyebrow, the session name as the big Bebas heading, an
          optional note line, and a bullet list. The single chapter number lives
          in the desktop strip; columns carry only their day marker.
          Bottom padding only when the beige Tariffs band follows, so the white
          content gets a gutter before the colour change rather than butting
          flush against the beige edge. */}
      <section
        className={
          'px-5 md:px-10 pt-14 md:pt-28' +
          (hasTariffs ? ' pb-14 md:pb-24' : '')
        }
      >
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
          {workshop.days.map((d, i) => (
            <div key={`${d.day}-${i}`}>
              <div className="flex items-center gap-2.5 font-inter text-[10.5px] md:text-[11px] tracking-[0.28em] md:tracking-[0.3em] uppercase text-gray-500 mb-3">
                <span>{d.day}</span>
                <span className="block flex-1 h-px bg-current opacity-40" aria-hidden="true" />
              </div>
              <h3 className="font-bebas-neue text-3xl md:text-[32px] leading-none lowercase text-foreground m-0 font-normal tracking-[-0.005em] whitespace-pre-line">
                {d.title}
              </h3>
              {d.note && (
                <p className="mt-2 font-playfair-display italic text-[14px] md:text-[15px] leading-[1.5] text-gray-500 m-0">
                  {d.note}
                </p>
              )}
              <ul className="mt-6 pl-5 list-disc text-[15px] leading-[1.85] space-y-1">
                {d.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── Tariffs / Intakes band ───────── */}
      {hasTariffs && (
        <TariffsBand n={chapterN('tariffs')} tariffs={workshop.tariffs} />
      )}

      {/* ───────── Gallery ───────── */}
      {hasGallery && (
        <section className="pt-14 md:pt-28">
          <div className="mx-auto max-w-7xl px-5 md:px-10 mb-5 md:mb-8">
            <ChapterLabel n={chapterN('gallery')} label="From the practice" />
            <h3 className="font-bebas-neue text-3xl md:text-5xl leading-none lowercase text-foreground m-0 font-normal tracking-[-0.005em]">
              the kind of
              <br />
              work we make
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-[1fr_1.4fr_1fr_1.2fr] gap-1 px-1">
            {galleryItems.map((g, i) => {
              const url = publicUrlFor(g.photo_path)
              return (
                <div
                  key={`${g.photo_path}-${i}`}
                  className="aspect-[3/4] overflow-hidden bg-gray-200"
                >
                  {url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt=""
                      aria-hidden="true"
                      className="w-full h-full object-cover block"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ───────── 07 — Questions / FAQ ───────── */}
      {workshop.faq.length > 0 && (
        <section className="px-5 md:px-10 pt-14 md:pt-28">
          <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 md:gap-16">
            <div>
              <ChapterLabel n={chapterN('questions')} label="Questions" />
              <h3 className="font-bebas-neue text-3xl md:text-5xl leading-none lowercase text-foreground m-0 font-normal tracking-[-0.005em]">
                before
                <br />
                you ask
              </h3>
            </div>
            <div>
              <div className="border-t border-gray-200">
                {workshop.faq.map((f, i) => (
                  <details
                    key={`${f.question}-${i}`}
                    className="group border-b border-gray-200"
                  >
                    <summary className="list-none [&::-webkit-details-marker]:hidden flex cursor-pointer items-start justify-between gap-4 py-4">
                      <span className="font-bebas-neue text-lg md:text-[22px] uppercase tracking-[0.02em] text-foreground">
                        {f.question}
                      </span>
                      <span
                        aria-hidden="true"
                        className="shrink-0 select-none text-xl leading-none text-gray-400"
                      >
                        <span className="group-open:hidden">+</span>
                        <span className="hidden group-open:inline">−</span>
                      </span>
                    </summary>
                    <div className="pb-5 pr-2 md:pr-8 text-[14px] md:text-[15px] text-gray-700">
                      <RichText html={f.answer} />
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>

          <script
            type="application/ld+json"
            // escape `<` as < so an admin-authored answer containing
            // `</script>` cannot terminate this block and inject markup.
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c'),
            }}
          />
        </section>
      )}

      {/* ───────── Apply — black plate (picker + form + meta) ───────── */}
      <ApplyBand n={chapterN('apply')} workshop={workshop} />

    </div>
    </IntakeProvider>
  )
}
