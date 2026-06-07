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

// Dark two-tile picker. Tiles mirror the tariff cards' identity (name, days,
// price); the Full intake stays visually featured. Selecting a tile updates
// the shared intake state, so the tariff-card Apply buttons reflect it too.
function IntakePicker({ tariffs }: { tariffs: Workshop['tariffs'] }) {
  const { intake, setIntake } = useIntake()

  return (
    <div className="mb-10 md:mb-12 max-w-[880px]">
      <div className="font-inter text-[10.5px] md:text-[11px] tracking-[0.3em] uppercase text-white/55 mb-4">
        Choose your intake
      </div>
      <div
        role="radiogroup"
        aria-label="Choose your intake"
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4"
      >
        {tariffs.map((t) => {
          const selected = intake === t.key
          return (
            <button
              key={t.key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setIntake(t.key)}
              className={
                'text-left px-5 py-4 md:px-6 md:py-5 border transition-colors cursor-pointer ' +
                (selected
                  ? 'border-white bg-white/10'
                  : 'border-white/25 hover:border-white/55')
              }
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-inter text-[10px] md:text-[10.5px] tracking-[0.25em] uppercase text-white/55">
                  {t.days}
                </span>
                {t.featured && (
                  <span className="border border-white/40 px-2 py-0.5 font-inter text-[9.5px] tracking-[0.2em] uppercase text-white/70">
                    Full
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-3">
                <span className="font-bebas-neue text-[26px] md:text-[32px] leading-none lowercase text-white tracking-[-0.01em]">
                  {t.name}
                </span>
                <span className="font-bebas-neue text-[22px] md:text-[26px] leading-none text-white tracking-[0.01em]">
                  {t.price}
                </span>
              </div>
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
