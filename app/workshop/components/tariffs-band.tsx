'use client'

// Pricing band for /workshop. Renders the two fixed intakes (short then full)
// as a numbered chapter on a single warm-gray (#f2f0ec) surface — no black
// featured plate. Both cards share the gray; the Full card is set apart only by
// a "THE FULL COURSE" label and a solid-black button. Desktop: side-by-side
// with a hairline divider between the cards; mobile: stacked with a top hairline
// on each card after the first. Section intro + labels are hardcoded, consistent
// with the page's other headings. Each card's Apply button selects that intake
// (shared via IntakeProvider) and scrolls to the `#apply` band; the selected
// card shows a slim top bar and reflects its state inline.

import type { Tariff } from '../data'
import { useIntake } from './intake-context'

export function TariffsBand({ n, tariffs }: { n: number; tariffs: Tariff[] }) {
  return (
    <section className="bg-[#f2f0ec] px-5 md:px-10 pt-14 md:pt-28 pb-14 md:pb-24">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 md:gap-16 mb-8 md:mb-12">
          <div>
            <div className="flex items-center gap-2.5 font-inter text-[10.5px] md:text-[11px] tracking-[0.28em] md:tracking-[0.3em] uppercase text-gray-500 mb-3">
              <span className="opacity-60">{String(n).padStart(2, '0')}</span>
              <span className="block w-4 md:w-7 h-px bg-current opacity-40" aria-hidden="true" />
              <span>Pricing</span>
            </div>
            <h2 className="font-bebas-neue text-3xl md:text-[56px] leading-none lowercase text-foreground m-0 font-normal tracking-[-0.015em]">
              tariffs
            </h2>
          </div>
          <div className="flex items-end">
            <p className="font-playfair-display text-[18px] md:text-[24px] leading-[1.45] text-foreground m-0 max-w-[520px]">
              Same group, same room, same studio. The two-day workshop is the
              conversation and the shooting; the three-day workshop adds the
              third day — the long edit, where the work becomes a body of work.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 border-t border-black/10 md:border-t-0">
          {tariffs.map((t, i) => (
            <TariffCard key={t.key} tariff={t} first={i === 0} />
          ))}
        </div>
      </div>
    </section>
  )
}

function TariffCard({ tariff, first }: { tariff: Tariff; first: boolean }) {
  const { intake, setIntake } = useIntake()
  const selected = intake === tariff.key
  const featured = tariff.featured
  // Stacked on mobile → top hairline on every card after the first. Side-by-side
  // on desktop → left hairline divider between the two cards (drop the mobile
  // top border there). Both cards sit on the same gray surface.
  const divider = first ? '' : 'border-t border-black/10 md:border-t-0 md:border-l'
  // days_list + extras read as one "What you get" list.
  const whatYouGet = [...tariff.days_list, ...tariff.extras]

  return (
    <div className={`${divider} px-6 md:px-10 py-10 md:py-14 flex flex-col`}>
      {/* Slim selection bar at the top of the selected card. */}
      {selected && (
        <span
          className="block w-7 h-0.5 bg-foreground mb-5"
          aria-hidden="true"
        />
      )}

      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="font-inter text-[10.5px] md:text-[11px] tracking-[0.28em] uppercase text-gray-500">
          {tariff.name}
        </div>
        {featured && (
          <div className="font-inter text-[10.5px] md:text-[11px] tracking-[0.28em] uppercase text-gray-500 text-right">
            THE FULL COURSE
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-4 mb-5">
        <h3 className="font-bebas-neue text-[40px] md:text-[56px] leading-[0.95] uppercase text-foreground m-0 font-normal tracking-[-0.015em]">
          {tariff.days}
        </h3>
        <div className="font-bebas-neue text-[40px] md:text-[52px] leading-none tracking-[0.01em] text-foreground">
          {tariff.price}
        </div>
      </div>

      {tariff.summary && (
        <p className="font-playfair-display italic text-[17px] md:text-[20px] leading-[1.4] text-foreground m-0 mb-5">
          {tariff.summary}
        </p>
      )}

      {tariff.desc && (
        <p className="text-[14.5px] md:text-[15.5px] leading-[1.7] text-gray-700 m-0 mb-7">
          {tariff.desc}
        </p>
      )}

      {whatYouGet.length > 0 && (
        <div className="mb-7">
          <div className="font-inter text-[10.5px] md:text-[11px] tracking-[0.28em] uppercase text-gray-500 mb-3">
            What you get
          </div>
          <ul className="m-0 p-0 list-none">
            {whatYouGet.map((item, i) => (
              <li
                key={i}
                className={
                  'flex gap-3 py-2.5 text-[14px] md:text-[15px] leading-[1.6] text-gray-700 ' +
                  (i === 0 ? '' : 'border-t border-black/10')
                }
              >
                <span className="text-gray-400" aria-hidden="true">
                  &mdash;
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tariff.note && (
        <p className="font-playfair-display italic text-[14px] md:text-[15px] leading-[1.5] text-gray-500 m-0 mb-7">
          {tariff.note}
        </p>
      )}

      <a
        href="#apply"
        aria-current={selected ? 'true' : undefined}
        onClick={() => setIntake(tariff.key)}
        className={
          'mt-auto inline-block text-center px-8 py-3.5 font-bebas-neue text-lg md:text-[22px] tracking-[0.12em] uppercase transition-colors border border-foreground ' +
          (featured
            ? 'bg-black text-white hover:bg-black/90'
            : 'bg-transparent text-foreground hover:bg-black/5')
        }
      >
        {selected
          ? 'Selected — complete below ↓'
          : `Join the ${tariff.days} workshop`}
      </a>
    </div>
  )
}
