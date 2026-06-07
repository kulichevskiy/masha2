'use client'

// Pricing band for /workshop. Renders the two fixed intakes (short then full)
// as a numbered chapter. Full is the black/featured anchor card. Desktop:
// side-by-side with a hairline divider between the cards; mobile: stacked with
// a top hairline on each card after the first. Section intro + labels are
// hardcoded, consistent with the page's other headings. In this slice the
// Apply buttons are plain `#apply` anchors — shared intake state arrives later.

import type { Tariff } from '../data'

export function TariffsBand({ n, tariffs }: { n: number; tariffs: Tariff[] }) {
  return (
    <section className="px-5 md:px-10 pt-14 md:pt-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 md:gap-16 mb-8 md:mb-12">
          <div>
            <div className="flex items-center gap-2.5 font-inter text-[10.5px] md:text-[11px] tracking-[0.28em] md:tracking-[0.3em] uppercase text-gray-500 mb-3">
              <span className="opacity-60">{String(n).padStart(2, '0')}</span>
              <span className="block w-4 md:w-7 h-px bg-current opacity-40" aria-hidden="true" />
              <span>Intakes</span>
            </div>
            <h2 className="font-bebas-neue text-3xl md:text-[56px] leading-none lowercase text-foreground m-0 font-normal tracking-[-0.015em]">
              two ways
              <br />
              to come
            </h2>
          </div>
          <div className="flex items-end">
            <p className="font-playfair-display italic text-[18px] md:text-[24px] leading-[1.45] text-foreground m-0 max-w-[520px]">
              &ldquo;Come for the two core days, or stay for the third — the long
              edit, where the work becomes a body of work.&rdquo;
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 border-t border-gray-200 md:border-t-0">
          {tariffs.map((t, i) => (
            <TariffCard key={t.key} tariff={t} first={i === 0} />
          ))}
        </div>
      </div>
    </section>
  )
}

function TariffCard({ tariff, first }: { tariff: Tariff; first: boolean }) {
  const featured = tariff.featured
  // Stacked on mobile → top hairline on every card after the first. Side-by-side
  // on desktop → left hairline divider between the two cards (drop the mobile
  // top border there). The black featured plate carries its own edge.
  const divider = first ? '' : 'border-t border-gray-200 md:border-t-0 md:border-l'
  const surface = featured
    ? 'bg-black text-white'
    : 'bg-white text-gray-700'

  return (
    <div className={`${divider} ${surface} px-6 md:px-10 py-10 md:py-14 flex flex-col`}>
      <div
        className={
          'font-inter text-[10.5px] md:text-[11px] tracking-[0.28em] uppercase mb-5 ' +
          (featured ? 'text-white/60' : 'text-gray-500')
        }
      >
        {tariff.days}
        {featured && (
          <span className="ml-3 border border-white/40 px-2 py-0.5 tracking-[0.2em]">
            Full
          </span>
        )}
      </div>

      <h3
        className={
          'font-bebas-neue text-[40px] md:text-[56px] leading-[0.95] lowercase m-0 font-normal tracking-[-0.015em] ' +
          (featured ? 'text-white' : 'text-foreground')
        }
      >
        {tariff.name}
      </h3>

      <div
        className={
          'font-bebas-neue text-[40px] md:text-[52px] leading-none tracking-[0.01em] mt-2 mb-5 ' +
          (featured ? 'text-white' : 'text-foreground')
        }
      >
        {tariff.price}
      </div>

      {tariff.summary && (
        <p
          className={
            'font-playfair-display italic text-[17px] md:text-[20px] leading-[1.4] m-0 mb-5 ' +
            (featured ? 'text-white/90' : 'text-foreground')
          }
        >
          {tariff.summary}
        </p>
      )}

      {tariff.desc && (
        <p
          className={
            'text-[14.5px] md:text-[15.5px] leading-[1.7] m-0 mb-7 ' +
            (featured ? 'text-white/80' : 'text-gray-700')
          }
        >
          {tariff.desc}
        </p>
      )}

      {tariff.days_list.length > 0 && (
        <ul
          className={
            'm-0 mb-6 p-0 list-none flex flex-col gap-1.5 font-inter text-[12px] md:text-[12.5px] tracking-[0.06em] uppercase ' +
            (featured ? 'text-white/70' : 'text-gray-500')
          }
        >
          {tariff.days_list.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}

      {tariff.extras.length > 0 && (
        <ul
          className={
            'm-0 mb-7 pl-5 list-disc text-[14px] md:text-[15px] leading-[1.8] ' +
            (featured ? 'marker:text-white/40 text-white/85' : 'text-gray-700')
          }
        >
          {tariff.extras.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      {tariff.note && (
        <p
          className={
            'font-playfair-display italic text-[14px] md:text-[15px] leading-[1.5] m-0 mb-7 ' +
            (featured ? 'text-white/65' : 'text-gray-500')
          }
        >
          {tariff.note}
        </p>
      )}

      <a
        href="#apply"
        className={
          'mt-auto inline-block text-center px-8 py-3.5 font-bebas-neue text-lg md:text-[22px] tracking-[0.12em] uppercase transition-colors ' +
          (featured
            ? 'bg-white text-black hover:bg-white/90'
            : 'bg-black text-white hover:bg-black/90')
        }
      >
        Apply →
      </a>
    </div>
  )
}
