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

    expect(text).toContain('Six seats. One of them is yours?')
    // apply form stub is mounted.
    expect(container.querySelector('[data-testid="apply-form-stub"]')).not.toBeNull()
  })

  it('hides the gallery section when no items', () => {
    const { container } = render(
      <WorkshopContent workshop={SAMPLE} publicUrlFor={() => null} />
    )
    const text = container.textContent ?? ''
    expect(text).not.toContain('the kind of\nwork we make')
  })
})
