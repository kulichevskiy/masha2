'use client'

// The Apply band — the black plate that closes the workshop page and turns it
// into a buy moment. Client component because it carries the dark "choose your
// intake" picker, which is kept in sync with the tariff cards through the
// shared IntakeProvider. Layout (chapter label + heading/intro + picker + form
// + meta grid) mirrors the former inline section in workshop-content.tsx.

import { RichText } from '@/components/rich-text'
import { WorkshopApplyForm } from './workshop-apply-form'
import { useIntake } from './intake-context'
import type { Workshop } from '../data'

export function ApplyBand({ n, workshop }: { n: number; workshop: Workshop }) {
  return (
    <section id="apply" className="px-0 md:px-10 pt-16 md:pt-28 scroll-mt-12">
      <div className="mx-auto max-w-7xl">
        <div className="bg-black text-white px-6 md:px-16 py-12 md:py-20 relative overflow-hidden">
          <div className="font-inter text-[10.5px] md:text-[11px] tracking-[0.3em] uppercase text-white/60 mb-3">
            {String(n).padStart(2, '0')} — Apply
          </div>
          {workshop.apply_heading && (
            <h3 className="font-bebas-neue text-[52px] md:text-[80px] leading-[0.95] uppercase text-white m-0 mb-5 md:mb-6 font-normal tracking-[-0.015em] md:tracking-[-0.01em]">
              {workshop.apply_heading}
            </h3>
          )}
          {workshop.apply_intro && (
            <RichText
              html={workshop.apply_intro}
              className="text-[14.5px] md:text-[17px] leading-[1.7] max-w-[560px] text-white/85 mb-8 md:mb-12 [&_p]:text-white/85"
            />
          )}

          {workshop.tariffs.length > 0 && (
            <IntakePicker tariffs={workshop.tariffs} />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 md:max-w-[880px]">
            <WorkshopApplyForm tariffs={workshop.tariffs} />
            <div className="md:order-none order-first md:mt-0 mt-2 md:pt-0 pt-6 md:border-0 border-t border-white/15">
              <ApplyMetaGrid workshop={workshop} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Dark two-tile picker, restyled to match the reference IntakePickerDark.
// Radio tiles are butted together with a -2px join (no gap) so their 2px
// borders share an edge; the active tile inverts to a solid-white plate and
// rises above the join via z-index. Each tile carries a left radio bullet
// (filled when active), big uppercase days, an italic price, and the italic
// Playfair summary. The featured (Full) intake floats a white badge that
// fades out once it becomes the active tile. Selecting a tile updates the
// shared intake state, so the tariff-card Apply buttons reflect it too.
function IntakePicker({ tariffs }: { tariffs: Workshop['tariffs'] }) {
  const { intake, setIntake } = useIntake()

  return (
    <div className="mb-10 md:mb-12 max-w-[880px]">
      <div className="flex items-baseline justify-between gap-4 mb-4 md:mb-5">
        <span className="font-bebas-neue text-[26px] md:text-[32px] leading-none lowercase text-white tracking-[-0.01em]">
          choose your workshop
        </span>
        <span className="font-inter text-[10px] md:text-[11px] tracking-[0.3em] uppercase text-white/45">
          Step one
        </span>
      </div>
      <div
        role="radiogroup"
        aria-label="Choose your workshop"
        className="flex flex-col sm:flex-row"
      >
        {tariffs.map((t, i) => {
          const selected = intake === t.key
          return (
            <button
              key={t.key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setIntake(t.key)}
              className={
                'relative flex-1 text-left flex items-start gap-3.5 md:gap-4 px-5 py-5 md:px-7 md:py-6 border-2 transition-colors cursor-pointer ' +
                // Butt the tiles together: pull each one after the first over the
                // shared border by 2px (vertical on mobile, horizontal on desktop).
                (i > 0 ? '-mt-0.5 sm:mt-0 sm:-ml-0.5 ' : '') +
                (selected
                  ? 'z-10 bg-white border-white text-black '
                  : 'bg-transparent border-white/25 text-white hover:border-white/55 ')
              }
            >
              <span
                aria-hidden="true"
                className={
                  'mt-1 shrink-0 inline-flex items-center justify-center rounded-full border-2 w-[18px] h-[18px] md:w-[22px] md:h-[22px] ' +
                  (selected ? 'border-black' : 'border-white/45')
                }
              >
                {selected && (
                  <span className="rounded-full bg-black w-[7px] h-[7px] md:w-[9px] md:h-[9px]" />
                )}
              </span>

              <span className="flex-1 min-w-0">
                <span className="flex items-baseline gap-3 flex-wrap">
                  <span
                    className={
                      'font-bebas-neue text-[28px] md:text-[34px] leading-none uppercase tracking-[0.01em] ' +
                      (selected ? 'text-black' : 'text-white')
                    }
                  >
                    {t.days}
                  </span>
                  <span
                    className={
                      'font-playfair-display italic text-[15px] md:text-[17px] leading-none ' +
                      (selected ? 'text-black/70' : 'text-white/70')
                    }
                  >
                    {t.price}
                  </span>
                </span>
                {t.summary && (
                  <span
                    className={
                      'block mt-1.5 font-playfair-display italic text-[14px] md:text-[16px] leading-[1.4] ' +
                      (selected ? 'text-black/75' : 'text-white/75')
                    }
                  >
                    {t.summary}
                  </span>
                )}
              </span>

              {t.featured && (
                <span
                  aria-hidden="true"
                  className={
                    'absolute -top-2.5 right-4 bg-white text-black px-2.5 py-1 font-inter text-[9px] tracking-[0.2em] uppercase shadow-sm transition-opacity ' +
                    (selected ? 'opacity-0' : 'opacity-100')
                  }
                >
                  The full course
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ApplyMetaGrid({ workshop }: { workshop: Workshop }) {
  // Mobile: 2-col tight grid (matches MWorkshopC). Desktop: stacked rows.
  const items: { label: string; value: string }[] = []
  if (workshop.dates) items.push({ label: 'When', value: workshop.dates })
  if (workshop.location) items.push({ label: 'Where', value: workshop.location })
  if (workshop.seats) items.push({ label: 'Group', value: workshop.seats })
  if (workshop.price) items.push({ label: 'Price', value: workshop.price })

  return (
    <dl className="grid grid-cols-2 md:grid-cols-1 gap-x-4 gap-y-5 md:gap-y-0">
      {items.map((it, i) => (
        <div
          key={it.label}
          className={
            'md:pb-5 md:mb-5 ' +
            (i < items.length - 1 ? 'md:border-b md:border-white/15' : '')
          }
        >
          <dt className="font-inter text-[10px] md:text-[11px] tracking-[0.25em] uppercase text-white/55 mb-1.5">
            {it.label}
          </dt>
          <dd className="font-bebas-neue text-[22px] md:text-[28px] text-white tracking-[0.02em]">
            {it.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
