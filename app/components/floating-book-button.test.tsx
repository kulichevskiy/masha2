/**
 * Contract for the bottom-right floating CTA cluster. BOOK is the primary
 * solid-black plate; GIFT CERTIFICATE is a quieter ghost-on-glass plate to its
 * left, rendered only when the gift page is visible. The whole cluster is hidden
 * on /workshop; the gift plate alone is hidden on /gift.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { FloatingBookButton } from './floating-book-button'

let pathname = '/'
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}))

beforeEach(() => {
  pathname = '/'
})

describe('<FloatingBookButton />', () => {
  it('renders the gift plate (→ /gift) beside BOOK when the gift page is visible', () => {
    const { container } = render(<FloatingBookButton giftVisible />)
    const book = container.querySelector('a[href="/book"]')
    const gift = container.querySelector('a[href="/gift"]')

    expect(book).not.toBeNull()
    expect(gift).not.toBeNull()
    expect((gift?.textContent ?? '').toLowerCase()).toContain('gift')
    expect((gift?.textContent ?? '').toLowerCase()).toContain('certificate')

    // BOOK stays the primary solid-black plate; gift is a quieter ghost plate.
    expect(book?.className).toContain('bg-black')
    expect(gift?.className).not.toContain('bg-black')
  })

  it('omits the gift plate when the gift page is not visible', () => {
    const { container } = render(<FloatingBookButton giftVisible={false} />)
    expect(container.querySelector('a[href="/book"]')).not.toBeNull()
    expect(container.querySelector('a[href="/gift"]')).toBeNull()
  })

  it('hides the whole cluster on /workshop', () => {
    pathname = '/workshop'
    const { container } = render(<FloatingBookButton giftVisible />)
    expect(container.querySelector('a[href="/book"]')).toBeNull()
    expect(container.querySelector('a[href="/gift"]')).toBeNull()
  })

  it('hides the gift plate on /gift but keeps BOOK', () => {
    pathname = '/gift'
    const { container } = render(<FloatingBookButton giftVisible />)
    expect(container.querySelector('a[href="/book"]')).not.toBeNull()
    expect(container.querySelector('a[href="/gift"]')).toBeNull()
  })
})
