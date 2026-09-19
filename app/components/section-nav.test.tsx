/**
 * Site-wide section nav — a centered row of links (PORTRAITS · KIDS · EDITORIAL · VIDEO)
 * that sits under the wordmark/tagline on every public page. Styled to match the
 * design source: Bebas Neue uppercase, wide tracking, no glyph separators. The
 * current section reads full-strength black with a 1px underline (border-bottom)
 * + aria-current; the others are the same near-black dimmed to 0.45 opacity.
 * Routing: Portraits → /portraits, Kids → /kids, Editorial → /editorial, Video →
 * /video; the home page itself is the story and lights nothing. Workshop is deliberately
 * not linked from the header — /workshop stays reachable by direct link only.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { SectionNav } from './section-nav'

let pathname = '/'
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}))

beforeEach(() => {
  pathname = '/'
})

describe('<SectionNav />', () => {
  it('renders the four sections in order with their routes and uppercase labels', () => {
    const { container } = render(<SectionNav />)

    const links = Array.from(container.querySelectorAll('a'))

    expect(links.map((link) => [link.getAttribute('href'), link.textContent])).toEqual([
      ['/portraits', 'Portraits'],
      ['/kids', 'Kids'],
      ['/editorial', 'Editorial'],
      ['/video', 'Video'],
    ])

    // Bebas Neue + uppercase come from CSS on the row, not literal casing.
    const nav = container.querySelector('nav')
    expect(nav?.className).toContain('font-bebas-neue')
    expect(nav?.className).toContain('uppercase')

    // No glyph separators between items — spacing carries the rhythm.
    expect(container.textContent).not.toContain('·')
  })

  it('marks Portraits active on /portraits', () => {
    pathname = '/portraits'
    const { container } = render(<SectionNav />)

    const portraits = container.querySelector('a[href="/portraits"]')
    const kids = container.querySelector('a[href="/kids"]')

    // Active: full opacity + underline via border-bottom; inactive: dimmed.
    expect(portraits?.getAttribute('aria-current')).toBe('page')
    expect(portraits?.className).toContain('border-black')
    expect(portraits?.className).toContain('opacity-100')
    expect(kids?.getAttribute('aria-current')).toBeNull()
    expect(kids?.className).toContain('opacity-[0.45]')
    expect(kids?.className).toContain('border-transparent')
  })

  it('marks Kids active on /kids', () => {
    pathname = '/kids'
    const { container } = render(<SectionNav />)

    expect(container.querySelector('a[href="/kids"]')?.getAttribute('aria-current')).toBe('page')
    expect(container.querySelector('a[href="/portraits"]')?.getAttribute('aria-current')).toBeNull()
  })

  it('marks Editorial active only on /editorial', () => {
    pathname = '/editorial'
    const { container } = render(<SectionNav />)

    expect(container.querySelector('a[href="/editorial"]')?.getAttribute('aria-current')).toBe('page')
    expect(container.querySelector('a[href="/portraits"]')?.getAttribute('aria-current')).toBeNull()
  })

  it('lights nothing on the home page — the story is not a section', () => {
    pathname = '/'
    const { container } = render(<SectionNav />)

    expect(container.querySelector('[aria-current="page"]')).toBeNull()
  })

  it('marks Video active only on /video', () => {
    pathname = '/video'
    const { container } = render(<SectionNav />)

    expect(container.querySelector('a[href="/video"]')?.getAttribute('aria-current')).toBe('page')
    expect(container.querySelector('a[href="/portraits"]')?.getAttribute('aria-current')).toBeNull()
    expect(container.querySelector('a[href="/kids"]')?.getAttribute('aria-current')).toBeNull()
  })

  it('does not link to Workshop, even while on /workshop', () => {
    pathname = '/workshop'
    const { container } = render(<SectionNav />)

    expect(container.querySelector('a[href="/workshop"]')).toBeNull()
    expect(container.textContent).not.toContain('Workshop')
    // No section lights up on a route the nav does not cover.
    expect(container.querySelector('a[aria-current="page"]')).toBeNull()
  })
})
