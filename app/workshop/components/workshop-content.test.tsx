/**
 * Smoke test for the workshop content renderer. Asserts the visible-text
 * contract — title, all program day titles, all FAQ questions, and the apply
 * heading must reach the DOM. Protects against accidental section drops.
 */
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import type { Workshop } from '../data'

// The apply form is a client component that pulls in a server action and
// `useTransition`; rendering it in jsdom would drag in the server-action
// import chain. We stub it to a minimal marker since the form's contents
// are tested separately in actions.test.ts.
vi.mock('./workshop-apply-form', () => ({
  WorkshopApplyForm: () => <div data-testid="apply-form-stub">apply form</div>,
}))

import { WorkshopContent } from './workshop-content'
import { TariffsBand } from './tariffs-band'
import { IntakeProvider } from './intake-context'

const SAMPLE: Workshop = {
  id: 'w1',
  is_visible: true,
  workshop_number: 'Workshop №01',
  title: 'Portrait Workshop · Berlin',
  tagline: 'Three days inside a working portrait practice.',
  dates: '21 — 23 March 2026',
  location: 'Mitte, Berlin',
  price: '850 €',
  seats: '6 seats',
  hero_photo_path: null,
  intro: '<p>Test intro paragraph.</p>',
  the_idea_heading: 'presence over poses',
  the_idea_quote: 'People are seen, not just photographed.',
  apply_heading: 'Six seats. One of them is yours?',
  apply_intro: '<p>I read every application.</p>',
  program: [
    { day: 'Day 01', title: 'Seeing', body: '<p>Seeing body.</p>', photo_path: null },
    { day: 'Day 02', title: 'Making', body: '<p>Making body.</p>', photo_path: null },
    { day: 'Day 03', title: 'Editing', body: '<p>Editing body.</p>', photo_path: null },
  ],
  days: [
    {
      day: 'Day 1',
      title: 'Online session',
      note: '',
      bullets: ['Visual language', 'Working with people', 'Atmosphere & presence'],
    },
    {
      day: 'Day 2',
      title: 'Shooting day',
      note: '',
      bullets: ['Live shooting session', 'Direction & observation', 'Group review'],
    },
    {
      day: 'Day 3',
      title: 'Review session',
      note: 'Extended option only',
      bullets: ['Portfolio review', 'Image selection', 'Feedback on edited work'],
    },
  ],
  tariffs: [
    {
      key: 'short',
      name: 'Short intake',
      days: 'Two days',
      price: '450 €',
      summary: 'Two days inside the frame.',
      desc: 'Seeing and making, with two models and evening review.',
      days_list: ['Day 01 — Seeing', 'Day 02 — Making'],
      extras: ['Studio + locations in Mitte', 'Lunch and coffee both days'],
      note: 'Best if you have shot before.',
      featured: false,
    },
    {
      key: 'full',
      name: 'Full intake',
      days: 'Three days',
      price: '600 €',
      summary: 'The full arc, to the long edit.',
      desc: 'Everything in the short intake plus the third day.',
      days_list: ['Day 01 — Seeing', 'Day 02 — Making', 'Day 03 — Editing'],
      extras: ['Personal portfolio review', 'Printed take-home zine'],
      note: 'The complete experience.',
      featured: true,
    },
  ],
  gallery: [],
  faq: [
    { question: 'What language?', answer: '<p>English.</p>' },
    { question: 'Experience level?', answer: '<p>Any.</p>' },
  ],
}

describe('<WorkshopContent />', () => {
  it('renders the title, every program day title, every FAQ question, and the apply heading', () => {
    const { container } = render(
      <WorkshopContent workshop={SAMPLE} publicUrlFor={() => null} />
    )
    const text = container.textContent ?? ''

    expect(text).toContain('Portrait Workshop')
    expect(text).toContain('Three days inside a working portrait practice')
    expect(text).toContain('Mitte, Berlin')
    expect(text).toContain('21 — 23 March 2026')

    for (const day of SAMPLE.program) {
      expect(text.toLowerCase()).toContain(day.title.toLowerCase())
    }

    for (const item of SAMPLE.faq) {
      expect(text).toContain(item.question)
    }

    // Both tariff tiers reach the DOM: name, price and days for each.
    for (const tier of SAMPLE.tariffs) {
      expect(text).toContain(tier.name)
      expect(text).toContain(tier.price)
      expect(text).toContain(tier.days)
    }

    expect(text).toContain('Six seats. One of them is yours?')
    // apply form stub is mounted.
    expect(container.querySelector('[data-testid="apply-form-stub"]')).not.toBeNull()
  })

  it('shows both intake prices in the hero, derived from the tariffs', () => {
    const { container } = render(
      <WorkshopContent workshop={SAMPLE} publicUrlFor={() => null} />
    )
    const text = container.textContent ?? ''
    // Desktop pill: "<short> / <full> · <seats>".
    expect(text).toContain('450 € / 600 € · 6 seats')
    // Mobile meta row carries the dual price without the seats join.
    expect(text).toContain('450 € / 600 €')
    // The single hero price is no longer surfaced verbatim next to seats.
    expect(text).not.toContain('850 € · 6 seats')
  })

  it('falls back to the single workshop.price when fewer than two tariffs exist', () => {
    const workshop: Workshop = { ...SAMPLE, tariffs: [SAMPLE.tariffs[0]] }
    const { container } = render(
      <WorkshopContent workshop={workshop} publicUrlFor={() => null} />
    )
    const text = container.textContent ?? ''
    expect(text).toContain('850 € · 6 seats')
    expect(text).not.toContain('450 € / 600 €')
  })

  it('renders the restyled dark intake picker: header row, radio tiles, and the Full badge', () => {
    const { container } = render(
      <WorkshopContent workshop={SAMPLE} publicUrlFor={() => null} />
    )
    const text = container.textContent ?? ''

    // Header row: Bebas lowercase title on the left + muted "Step one" right.
    expect(text).toContain('choose your workshop')
    expect(text).toContain('Step one')

    // Floating "THE FULL COURSE" badge lives on the featured (Full) tile.
    expect(text).toContain('The full course')

    // The picker keeps its radiogroup wiring with exactly two radio options,
    // and the default intake ('full') leaves precisely one tile checked.
    const group = container.querySelector('[role="radiogroup"]')
    expect(group).not.toBeNull()
    const radios = group!.querySelectorAll('[role="radio"]')
    expect(radios.length).toBe(2)
    const checked = group!.querySelectorAll('[role="radio"][aria-checked="true"]')
    expect(checked.length).toBe(1)

    // Each tile now carries its summary line (absent from the old picker).
    for (const tier of SAMPLE.tariffs) {
      expect(text).toContain(tier.summary)
    }
  })

  it('hides the gallery section when no items', () => {
    const { container } = render(
      <WorkshopContent workshop={SAMPLE} publicUrlFor={() => null} />
    )
    const text = container.textContent ?? ''
    expect(text).not.toContain('the kind of')
  })

  it('hides the gallery section when every entry has an empty photo_path', () => {
    const workshop: Workshop = {
      ...SAMPLE,
      gallery: [{ photo_path: '' }, { photo_path: '   ' }],
    }
    const { container } = render(
      <WorkshopContent workshop={workshop} publicUrlFor={() => null} />
    )
    const text = container.textContent ?? ''
    expect(text).not.toContain('the kind of')
    // Chapters: idea 01, program 02, days 03, tariffs 04, questions 05, apply 06
    // (no gallery here). No gap, no duplicate numbers. ChapterLabel renders the
    // number and label as separate spans, so they come out adjacent in textContent.
    expect(text).toContain('05Questions')
    expect(text).toContain('06 — Apply')
  })

  it('omits the Questions chapter when the FAQ list is empty', () => {
    const workshop: Workshop = { ...SAMPLE, faq: [] }
    const { container } = render(
      <WorkshopContent workshop={workshop} publicUrlFor={() => null} />
    )
    const text = container.textContent ?? ''
    // No questions chapter visible — neither inline label nor strip entry.
    expect(text).not.toMatch(/Questions/i)
    // Chapters: idea 01, program 02, days 03, tariffs 04, apply 05 (no gallery,
    // no faq here).
    expect(text).toContain('05 — Apply')
  })

  it('renders the desktop chapter strip as a uniform single-row table of contents', () => {
    // Gallery path + FAQ + tariffs yields the full set of 7 chapters
    // (idea, program, days, tariffs, gallery, questions, apply).
    const workshop: Workshop = {
      ...SAMPLE,
      gallery: [{ photo_path: 'workshop/p1.jpg' }],
    }
    const { container } = render(
      <WorkshopContent
        workshop={workshop}
        publicUrlFor={(p) => (p ? `https://cdn.example.com/photos/${p}` : null)}
      />
    )

    // The strip is the desktop-only section bordered with gray-200.
    const strip = Array.from(container.querySelectorAll('section')).find((s) =>
      s.className.includes('border-gray-200')
    )
    expect(strip).toBeTruthy()
    expect(strip!.className).toContain('hidden')
    expect(strip!.className).toContain('md:block')

    // The flex row distributes items across the full content width.
    const row = strip!.querySelector('div')!
    expect(row.className).toContain('justify-between')

    const items = Array.from(row.children) as HTMLElement[]
    expect(items.length).toBe(7)
    for (const item of items) {
      // Each label stays on one line, no mid-word wrapping.
      expect(item.className).toContain('whitespace-nowrap')
      // Uniform grey — no active-indicator special case.
      expect(item.className).toContain('text-gray-500')
      expect(item.className).not.toContain('border-foreground')
      // Vertical padding kept, per-item horizontal padding dropped.
      expect(item.className).toContain('py-5')
      expect(item.className).not.toContain('px-6')
      // Font size and tracking unchanged.
      expect(item.className).toContain('text-xs')
      expect(item.className).toContain('tracking-[0.2em]')
    }
  })

  it('shows the gallery section when at least one entry has a path', () => {
    const workshop: Workshop = {
      ...SAMPLE,
      gallery: [{ photo_path: '' }, { photo_path: 'workshop/p1.jpg' }],
    }
    const { container } = render(
      <WorkshopContent
        workshop={workshop}
        publicUrlFor={(p) => (p ? `https://cdn.example.com/photos/${p}` : null)}
      />
    )
    const text = container.textContent ?? ''
    expect(text).toContain('the kind of')
    // Chapters: idea 01, program 02, days 03, tariffs 04, gallery 05,
    // questions 06, apply 07.
    expect(text).toContain('06Questions')
    expect(text).toContain('07 — Apply')
  })
})

describe('<TariffsBand /> gray reference restyle', () => {
  const renderBand = () =>
    render(
      <IntakeProvider>
        <TariffsBand n={6} tariffs={SAMPLE.tariffs} />
      </IntakeProvider>
    )

  it('uses a full-bleed warm-gray section background and no black plate', () => {
    const { container } = renderBand()
    const section = container.querySelector('section')!
    expect(section.className).toContain('bg-[#f2f0ec]')
    // The old black featured card surface is gone (the black is now only the
    // Full card's button, an <a>, not a card plate <div>).
    expect(container.querySelector('div.bg-black')).toBeNull()
  })

  it('renders the lowercase tariffs header, roman intro, and Pricing label', () => {
    const { container } = renderBand()
    const text = container.textContent ?? ''
    expect(text).toContain('tariffs')
    expect(text).toContain('Same group, same room, same studio')
    expect(text).toContain('Pricing')
  })

  it('shows days as the big heading, name as the small label, and the price', () => {
    const { container } = renderBand()
    const text = container.textContent ?? ''
    for (const tier of SAMPLE.tariffs) {
      expect(text).toContain(tier.days)
      expect(text).toContain(tier.name)
      expect(text).toContain(tier.price)
    }
  })

  it('shows the THE FULL COURSE label on the full card', () => {
    const { container } = renderBand()
    expect((container.textContent ?? '')).toContain('THE FULL COURSE')
  })

  it('merges days_list and extras into a single What you get list', () => {
    const { container } = renderBand()
    const text = container.textContent ?? ''
    expect(text).toContain('What you get')
    const full = SAMPLE.tariffs.find((t) => t.key === 'full')!
    for (const item of [...full.days_list, ...full.extras]) {
      expect(text).toContain(item)
    }
  })

  it('renders no per-card selection bar; both buttons read "Join the … workshop"', () => {
    const { container } = renderBand()
    const text = container.textContent ?? ''
    // No slim selection bar in any state — cards top-align across the divider.
    expect(container.querySelector('.w-7.h-0\\.5')).toBeNull()
    expect(text).not.toContain('Selected — complete below ↓')
    for (const tier of SAMPLE.tariffs) {
      expect(text).toContain(`Join the ${tier.days} workshop`)
    }
  })

  it('gives both apply buttons a foreground border; full fills solid black', () => {
    const { container } = renderBand()
    const buttons = Array.from(
      container.querySelectorAll('a[href="#apply"]')
    ) as HTMLElement[]
    expect(buttons.length).toBe(2)
    for (const b of buttons) {
      expect(b.className).toContain('border')
    }
    const full = buttons.find((b) => b.textContent?.includes('Three days'))!
    expect(full.className).toContain('bg-black')
  })
})
