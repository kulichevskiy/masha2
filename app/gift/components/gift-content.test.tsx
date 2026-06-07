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

// Helper: build a gift certificate with N gallery photos.
function withGallery(paths: string[]): GiftCertificate {
  return { ...SAMPLE, gallery: paths.map((p) => ({ photo_path: p })) }
}

describe('<GiftContent /> gallery', () => {
  it('renders a single gray placeholder and no hero/mosaic when there are 0 photos', () => {
    const { container } = render(
      <GiftContent giftCertificate={withGallery([])} publicUrlFor={(p) => p ?? null} />
    )
    expect(container.querySelector('[data-testid="gift-hero"]')).toBeNull()
    expect(container.querySelector('[data-testid="gift-mosaic"]')).toBeNull()
    const placeholder = container.querySelector('[data-testid="gift-placeholder"]')
    expect(placeholder).not.toBeNull()
    expect(placeholder!.className).toContain('aspect-[3/4]')
  })

  it('renders only the hero (aspect-[3/4]) and no mosaic when there is 1 photo', () => {
    const { container } = render(
      <GiftContent giftCertificate={withGallery(['a.jpg'])} publicUrlFor={(p) => p ?? null} />
    )
    const hero = container.querySelector('[data-testid="gift-hero"]')
    expect(hero).not.toBeNull()
    expect(hero!.className).toContain('aspect-[3/4]')
    expect(hero!.querySelector('img')).not.toBeNull()
    expect(container.querySelector('[data-testid="gift-mosaic"]')).toBeNull()
  })

  it('renders the rest as a 2-col gap-1 mosaic of aspect-square tiles', () => {
    const { container } = render(
      <GiftContent
        giftCertificate={withGallery(['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg'])}
        publicUrlFor={(p) => p ?? null}
      />
    )
    const mosaic = container.querySelector('[data-testid="gift-mosaic"]')
    expect(mosaic).not.toBeNull()
    expect(mosaic!.className).toContain('grid-cols-2')
    expect(mosaic!.className).toContain('gap-1')

    // 5 photos → hero + 4 mosaic tiles, all square (even count, no wide tile).
    const tiles = container.querySelectorAll('[data-testid="gift-mosaic-tile"]')
    expect(tiles.length).toBe(4)
    for (const t of tiles) {
      expect(t.className).toContain('aspect-square')
      expect(t.className).not.toContain('aspect-[3/2]')
    }
  })

  it('spans the final mosaic tile across both columns as a wide aspect-[3/2] tile when the count is odd', () => {
    const { container } = render(
      <GiftContent
        giftCertificate={withGallery(['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg'])}
        publicUrlFor={(p) => p ?? null}
      />
    )
    // 4 photos → hero + 3 mosaic tiles (odd) → last tile is wide.
    const tiles = container.querySelectorAll('[data-testid="gift-mosaic-tile"]')
    expect(tiles.length).toBe(3)

    expect(tiles[0].className).toContain('aspect-square')
    expect(tiles[1].className).toContain('aspect-square')

    const last = tiles[2]
    expect(last.className).toContain('aspect-[3/2]')
    expect(last.className).toContain('col-span-2')
    expect(last.className).not.toContain('aspect-square')
  })

  it('filters out blank/empty photo_path entries before splitting hero/mosaic', () => {
    const { container } = render(
      <GiftContent
        giftCertificate={withGallery(['a.jpg', '', '  ', 'b.jpg'])}
        publicUrlFor={(p) => p ?? null}
      />
    )
    // Only 2 real photos survive → hero + 1 mosaic tile.
    expect(container.querySelector('[data-testid="gift-hero"]')).not.toBeNull()
    const tiles = container.querySelectorAll('[data-testid="gift-mosaic-tile"]')
    expect(tiles.length).toBe(1)
  })
})
