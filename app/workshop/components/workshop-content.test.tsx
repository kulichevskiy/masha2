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
  schedule: [
    ['10:00', 'Arrival'],
    ['19:00', 'Wrap'],
  ],
  includes: ['Three days', 'Two models'],
  bring: ['A camera'],
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
    // Tariffs sits at 06 (after Bring), so Questions slides to 07 and Apply to
    // 08 — no gap, no duplicate numbers. ChapterLabel renders the number and
    // label as separate spans, so they come out adjacent in textContent.
    expect(text).toContain('07Questions')
    expect(text).toContain('08 — Apply')
  })

  it('omits the Questions chapter when the FAQ list is empty', () => {
    const workshop: Workshop = { ...SAMPLE, faq: [] }
    const { container } = render(
      <WorkshopContent workshop={workshop} publicUrlFor={() => null} />
    )
    const text = container.textContent ?? ''
    // No questions chapter visible — neither inline label nor strip entry.
    expect(text).not.toMatch(/Questions/i)
    // Apply slides up to 07 (Tariffs at 06) since gallery is also absent here.
    expect(text).toContain('07 — Apply')
  })

  it('renders the desktop chapter strip as a uniform single-row table of contents', () => {
    // Gallery path + FAQ + tariffs yields the full set of 9 chapters.
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
    expect(items.length).toBe(9)
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
    // Tariffs at 06, gallery at 07, so Questions is 08 and Apply bumps to 09.
    expect(text).toContain('08Questions')
    expect(text).toContain('09 — Apply')
  })
})
