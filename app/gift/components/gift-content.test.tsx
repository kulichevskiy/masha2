/**
 * Smoke test for the gift-certificate content renderer. Asserts the visible-text
 * contract — the fixed two-line "gift / certificate" heading, the rich-text body,
 * every amount, and the order button must reach the DOM — plus the interactive
 * contract: the first amount tile is selected by default (solid-black plate) and
 * the others are not.
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import type { GiftCertificate } from '../data'
import { GiftContent } from './gift-content'

const SAMPLE: GiftCertificate = {
  id: 'g1',
  is_visible: true,
  body: '<p>A gift of a portrait session with Maria Chevskaya.</p>',
  amounts: [
    { id: 'amt_450', price: '450 €' },
    { id: 'amt_600', price: '600 €' },
  ],
  gallery: [],
}

describe('<GiftContent />', () => {
  it('renders the two-line heading, the body, every amount, and the order button', () => {
    const { container } = render(
      <GiftContent giftCertificate={SAMPLE} publicUrlFor={() => null} />
    )
    const text = container.textContent ?? ''

    // Fixed two-line lowercase heading.
    expect(text).toContain('gift')
    expect(text).toContain('certificate')
    // Rich-text body reaches the DOM.
    expect(text).toContain('A gift of a portrait session with Maria Chevskaya')
    // Every amount tile renders its price.
    for (const a of SAMPLE.amounts) {
      expect(text).toContain(a.price)
    }
    // Order button is present (submission wired in a later slice).
    expect(text.toLowerCase()).toContain('order')
  })

  it('selects the first amount tile by default (solid-black plate) and not the rest', () => {
    const { container } = render(
      <GiftContent giftCertificate={SAMPLE} publicUrlFor={() => null} />
    )
    const tiles = container.querySelectorAll('[data-testid="amount-tile"]')
    expect(tiles.length).toBe(SAMPLE.amounts.length)

    // First tile is the selected solid-black plate.
    expect(tiles[0].getAttribute('data-selected')).toBe('true')
    expect(tiles[0].className).toContain('bg-black')

    // Subsequent tiles are unselected (hairline, no black plate).
    expect(tiles[1].getAttribute('data-selected')).toBe('false')
    expect(tiles[1].className).not.toContain('bg-black')
  })
})
