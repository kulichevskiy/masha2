// Pure presentational renderer for the workshop page (Workshop C / bold magazine
// layout, mobile-first). Takes a normalised Workshop + a publicUrlFor() resolver
// so it stays free of supabase imports — that's what lets the snapshot test
// pass a synthetic workshop in without standing up a client.

import { RichText } from '@/components/rich-text'
import { ApplyBand } from './apply-band'
import { SubscribeBand } from './subscribe-band'
import { IntakeProvider } from './intake-context'
import type { Workshop } from '../data'

type Props = {
  workshop: Workshop
  publicUrlFor: (storagePath: string | null | undefined) => string | null
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

export function WorkshopContent({ workshop, publicUrlFor }: Props) {
  const heroUrl = publicUrlFor(workshop.hero_photo_path)
  const title = workshop.title ?? ''
  // The hero design splits the title across two lines (e.g. "Portrait /
  // Workshop"). Honour that if the admin uses a literal " / " separator,
  // otherwise let the browser wrap naturally.
  const titleLines = title.includes(' / ')
    ? title.split(' / ')
    : title.split(/\s*·\s*/)

  // Empty gallery entries must not create blank tiles.
  const galleryItems = workshop.gallery.filter(
    (g) => g.photo_path && g.photo_path.trim() !== ''
  )
  const hasGallery = galleryItems.length > 0
  const salesOpen = workshop.sales_open
  const dates = salesOpen ? workshop.dates : null

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
          {salesOpen && (dates || workshop.seats || heroPrice) && (
            <div className="md:hidden mt-7 pt-5 border-t border-white/20 flex flex-wrap gap-3 font-inter text-[11px] tracking-[0.18em] uppercase text-white/70">
              {dates && <span>{dates}</span>}
              {workshop.seats && (
                <>
                  {dates && <span className="opacity-50">·</span>}
                  <span>{workshop.seats}</span>
                </>
              )}
              {heroPrice && (
                <>
                  {(dates || workshop.seats) && <span className="opacity-50">·</span>}
                  <span>{heroPrice}</span>
                </>
              )}
            </div>
          )}

          <div className="mt-6 md:mt-14 flex gap-3 md:gap-4">
            <a
              href={salesOpen ? '#apply' : '#subscribe'}
              className="bg-white text-black px-0 md:px-14 py-3.5 md:py-4 font-bebas-neue text-lg md:text-[22px] tracking-[0.12em] uppercase text-center flex-[1.4] md:flex-none md:inline-block hover:bg-white/90 transition-colors"
            >
              {salesOpen ? 'Join the workshop →' : 'Join the waitlist →'}
            </a>
            {/* Secondary price/seats pill only when sales are open — with the
                Apply band gone there's nothing to "save" toward. */}
            {salesOpen && (heroPrice || workshop.seats) && (
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

      {/* ───────── 01 — The idea ───────── */}
      <section className="px-5 md:px-10 pt-14 md:pt-28">
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 md:gap-16">
          <div>
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
                listMarker="disc"
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
                    'grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 md:gap-16 py-7 md:py-10 items-start ' +
                    (isLast ? 'border-b border-gray-200' : '')
                  }
                >
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
                        listMarker="disc"
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

      {/* Session breakdown */}
      <section className="px-5 md:px-10 pt-14 md:pt-28">
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
          {workshop.days.map((d, i) => (
            <div key={`${d.day}-${i}`}>
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

      {/* ───────── Gallery ───────── */}
      {hasGallery && (
        <section className="pt-14 md:pt-28">
          <div className="mx-auto max-w-7xl px-5 md:px-10 mb-5 md:mb-8">
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
                      <RichText html={f.answer} listMarker="disc" />
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

      {/* ───────── Closing band — Apply when sales are open, Subscribe when
          closed. Both are the black plate that closes the page. ───────── */}
      {salesOpen ? (
        <ApplyBand workshop={workshop} />
      ) : (
        <SubscribeBand workshop={workshop} />
      )}

    </div>
    </IntakeProvider>
  )
}
