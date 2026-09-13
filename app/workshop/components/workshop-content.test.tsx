/**
 * Smoke test for the workshop content renderer. Asserts the visible-text
 * contract — title, all program day titles, all FAQ questions, and the apply
 * heading must reach the DOM. Protects against accidental section drops.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import type { Workshop } from '../data'

// The apply form is a client component that pulls in a server action and
// `useTransition`; rendering it in jsdom would drag in the server-action
// import chain. We stub it to a minimal marker since the form's contents
// are tested separately in actions.test.ts.
vi.mock('./workshop-apply-form', () => ({
  WorkshopApplyForm: () => <div data-testid="apply-form-stub">apply form</div>,
}))

// The Subscribe band is a client component that imports the workshop server
// action; stub the action so rendering it in jsdom doesn't drag in the
// server-action import chain. The band itself renders for real.
vi.mock('../actions', () => ({
  submitWorkshopSubscription: vi.fn(async () => ({ ok: true })),
}))

import { WorkshopContent } from './workshop-content'

afterEach(cleanup)

const SAMPLE: Workshop = {
  id: 'w1',
  banner_visible: true,
  sales_open: true,
  workshop_number: 'Workshop №01',
  title: 'Portrait Workshop · Berlin',
  tagline: 'Three days inside a working portrait practice.',
  dates: '21 - 23 March 2026',
  location: 'Mitte, Berlin',
  price: '850 €',
  seats: '6 seats',
  hero_photo_path: null,
  intro: '<p>Test intro paragraph.</p>',
  the_idea_heading: 'presence over poses',
  the_idea_quote: 'People are seen, not just photographed.',
  apply_heading: 'Six seats. One of them is yours?',
  apply_intro: '<p>I read every application.</p>',
  closed_heading: "The next workshop isn't open yet",
  closed_intro: '<p>Leave your email and hear first when the next one opens.</p>',
  tariffs_intro:
    '<p>Same group, same room, same studio. The two-day workshop is the conversation and the shooting; the three-day workshop adds the third day — the long edit, where the work becomes a body of work.</p>',
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
  it('keeps the main headings, program, FAQ and open-sales application', () => {
    const view = render(<WorkshopContent workshop={SAMPLE} publicUrlFor={() => null} />)
    const text = view.container.textContent ?? ''
    expect(view.getByRole('heading', { level: 1 }).textContent).toContain('Portrait Workshop')
    for (const day of SAMPLE.program) expect(text.toLowerCase()).toContain(day.title.toLowerCase())
    for (const faq of SAMPLE.faq) expect(text).toContain(faq.question)
    expect(text).toContain('Six seats. One of them is yours?')
    expect(view.container.querySelector('#apply')).not.toBeNull()
    expect(view.container.querySelector('#subscribe')).toBeNull()
  })

  it.each([true, false])('omits the tariff section and all eyebrows with sales_open=%s', (salesOpen) => {
    const view = render(<WorkshopContent workshop={{ ...SAMPLE, sales_open: salesOpen, gallery: [{ photo_path: 'workshop/photo.jpg' }] }} publicUrlFor={() => null} />)
    const text = view.container.textContent ?? ''
    for (const label of ['Workshop №01', 'Day 01', 'Day 02', 'Day 03', 'Day 1', 'Day 2', 'Day 3', 'Pricing', 'From the practice', 'Step one', 'The full course', 'Short intake', 'Full intake']) {
      expect(text).not.toContain(label)
    }
    expect(text).not.toContain('—')
    expect(view.queryByRole('heading', { name: 'tariffs' })).toBeNull()
    expect(text).not.toContain('What you get')
    expect(text).toContain('the kind of')
  })

  it('shows the waitlist, hides dates and keeps the hero CTA pointing to the form', () => {
    const view = render(<WorkshopContent workshop={{ ...SAMPLE, sales_open: false }} publicUrlFor={() => null} />)
    const text = view.container.textContent ?? ''
    expect(view.container.querySelector('#subscribe')).not.toBeNull()
    expect(view.container.querySelector('#apply')).toBeNull()
    expect(text).not.toContain(SAMPLE.dates)
    expect(text).not.toContain('Notify me')
    expect(text).not.toContain('Mitte, Berlin')
    const ctas = view.getAllByRole('link', { name: /Join the waitlist/ })
    expect(ctas).toHaveLength(1)
    expect(ctas[0].getAttribute('href')).toBe('#subscribe')
    expect(view.getByLabelText('Spring')).toBeTruthy()
    expect(view.getByLabelText('Summer')).toBeTruthy()
    expect(view.queryByLabelText('Winter')).toBeNull()
  })

  it.each([true, false])('keeps the page available with a hidden banner and sales_open=%s', (salesOpen) => {
    const { container } = render(<WorkshopContent workshop={{ ...SAMPLE, banner_visible: false, sales_open: salesOpen }} publicUrlFor={() => null} />)
    expect(container.textContent).toContain('Portrait Workshop')
    expect(container.querySelector(salesOpen ? '#apply' : '#subscribe')).not.toBeNull()
  })

  it('retains intake selection in the application form after removing tariff cards', () => {
    const view = render(<WorkshopContent workshop={SAMPLE} publicUrlFor={() => null} />)
    const radios = view.getAllByRole('radio')
    expect(radios).toHaveLength(2)
    expect(radios[0].textContent).toContain('Two days')
    expect(radios[1].textContent).toContain('Three days')
    expect(radios[1].getAttribute('aria-checked')).toBe('true')
  })

  it('omits empty galleries and FAQ without leaving section labels', () => {
    const view = render(<WorkshopContent workshop={{ ...SAMPLE, gallery: [{ photo_path: '' }, { photo_path: '   ' }], faq: [] }} publicUrlFor={() => null} />)
    expect(view.container.textContent).not.toContain('the kind of')
    expect(view.container.textContent).not.toContain('you ask')
    expect(view.container.querySelector('details')).toBeNull()
  })
})
