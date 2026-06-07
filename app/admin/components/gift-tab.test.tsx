/**
 * Admin Сертификаты gallery chrome. The public /gift page renders the first
 * gallery photo as a large hero and items 2..N as a mosaic, so the editor marks
 * that ordering intent: a «Большое фото» badge on the first item and a faint
 * «мозаика» divider before the second item (only when 2+ items exist).
 *
 * The upload hook calls createClient() at module load, which needs Supabase env,
 * so the component is imported dynamically after stubbing env.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { render } from '@testing-library/react'
import type { GiftCertificate, GalleryItem } from '@/app/gift/data'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let GiftTab: (props: any) => React.ReactNode

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://localhost:54321'
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY ||= 'test-anon-key'
  ;({ GiftTab } = await import('./gift-tab'))
})

function certWith(gallery: GalleryItem[]): GiftCertificate {
  return {
    id: 'g1',
    is_visible: true,
    body: null,
    amounts: [],
    gallery,
  }
}

const COMMON = { orders: [], supabaseUrl: 'http://localhost:54321' }

describe('<GiftTab /> gallery chrome', () => {
  it('marks the first gallery item as the hero and divides off the mosaic when 2+ items', () => {
    const { container } = render(
      <GiftTab
        giftCertificate={certWith([{ photo_path: 'gift/a.jpg' }, { photo_path: 'gift/b.jpg' }])}
        {...COMMON}
      />
    )

    const badge = container.querySelector('[data-testid="gallery-hero-badge"]')
    expect(badge).not.toBeNull()
    expect(badge?.textContent).toContain('Большое фото')

    const divider = container.querySelector('[data-testid="gallery-mosaic-divider"]')
    expect(divider).not.toBeNull()
    expect(divider?.textContent).toContain('мозаика')
  })

  it('shows the hero badge but no mosaic divider with a single gallery item', () => {
    const { container } = render(
      <GiftTab giftCertificate={certWith([{ photo_path: 'gift/a.jpg' }])} {...COMMON} />
    )

    expect(container.querySelector('[data-testid="gallery-hero-badge"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="gallery-mosaic-divider"]')).toBeNull()
  })

  it('shows no hero badge and no mosaic divider with an empty gallery', () => {
    const { container } = render(
      <GiftTab giftCertificate={certWith([])} {...COMMON} />
    )

    expect(container.querySelector('[data-testid="gallery-hero-badge"]')).toBeNull()
    expect(container.querySelector('[data-testid="gallery-mosaic-divider"]')).toBeNull()
  })
})
