import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const mock = vi.hoisted(() => ({ tiers: null as unknown, faq: null as unknown }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          order: async () => ({ data: table === 'booking_tiers' ? mock.tiers : mock.faq }),
        }),
      }),
    }),
  }),
}))

vi.mock('./tier-photos', () => ({
  loadTierFrames: async (tiers: { id: string }[]) =>
    Object.fromEntries(
      tiers.map((tier, index) => [
        tier.id,
        index === 0 ? { id: 'p1', src: '/p1.jpg', alt: 'One', width: 800, height: 1000 } : null,
      ])
    ),
}))

import Page from './page'

describe('booking server page', () => {
  it('falls back to the email plate when nothing is configured', async () => {
    mock.tiers = null
    mock.faq = null
    const html = renderToStaticMarkup(await Page())
    expect(html).toContain('with maria')
    expect(html).toContain('Email me')
    expect(html).not.toContain('questions')
  })

  it('renders every tier as a row and the questions after them', async () => {
    mock.tiers = [
      {
        id: 't1',
        name: 'Mini',
        subtitle: 'A little time, something to keep.',
        summary: 'up to 30 minutes, one look, 20 final images',
        description: '<p>— 20 final images</p>',
        price_text: '300 €',
        photo_path: null,
      },
      {
        id: 't2',
        name: 'Brand & Commercial',
        subtitle: null,
        summary: null,
        description: null,
        price_text: 'upon request',
        photo_path: null,
      },
    ]
    mock.faq = [{ id: 'q1', question: 'Where?', answer: '<p>Berlin.</p>' }]
    const html = renderToStaticMarkup(await Page())
    expect(html).toContain('Mini')
    expect(html).toContain('300 €')
    expect(html).toContain('what’s included')
    expect(html).toContain('book Mini')
    expect(html).toContain('write to me')
    expect(html).toContain('alt="One"')
    expect(html).toContain('questions')
    expect(html).toContain('Where?')
    expect(html).not.toContain('Email me')
  })
})
