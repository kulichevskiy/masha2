/**
 * Site-wide section nav — a centered row of links (PORTRAITS · KIDS · WORKSHOPS)
 * that sits under the wordmark/tagline on every public page. Styled to match the
 * design source: Bebas Neue uppercase, wide tracking, no glyph separators. The
 * current section reads full-strength black with a 1px underline (border-bottom)
 * + aria-current; the others are the same near-black dimmed to 0.45 opacity.
 * Routing: Portraits → /, Kids → /kids, Workshops → /workshop.
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
  it('renders the three sections with their routes and uppercase labels', () => {
    const { container } = render(<SectionNav />)

    const portraits = container.querySelector('a[href="/"]')
    const kids = container.querySelector('a[href="/kids"]')
    const workshop = container.querySelector('a[href="/workshop"]')

    expect(portraits?.textContent?.toLowerCase()).toContain('portraits')
    expect(kids?.textContent?.toLowerCase()).toContain('kids')
    expect(workshop?.textContent?.toLowerCase()).toContain('workshops')

    // Bebas Neue + uppercase come from CSS on the row, not literal casing.
    const nav = container.querySelector('nav')
    expect(nav?.className).toContain('font-bebas-neue')
    expect(nav?.className).toContain('uppercase')

    // No glyph separators between items — spacing carries the rhythm.
    expect(container.textContent).not.toContain('·')
  })

  it('marks Portraits active on the home route', () => {
    pathname = '/'
    const { container } = render(<SectionNav />)

    const portraits = container.querySelector('a[href="/"]')
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
    // Home must NOT light up on a non-home route (exact match for "/").
    expect(container.querySelector('a[href="/"]')?.getAttribute('aria-current')).toBeNull()
  })

  it('marks Workshops active on /workshop', () => {
    pathname = '/workshop'
    const { container } = render(<SectionNav />)

    expect(container.querySelector('a[href="/workshop"]')?.getAttribute('aria-current')).toBe('page')
    expect(container.querySelector('a[href="/"]')?.getAttribute('aria-current')).toBeNull()
  })
})
