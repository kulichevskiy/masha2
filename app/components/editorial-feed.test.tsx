/**
 * Story tiles on /editorial: one link per story carrying only the cover image
 * (no visible text), the story title as the accessible name, and the same
 * masonry column flow as the photo feeds. Expectations are the spec's R2.
 */
import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { StoryTiles, type StoryTile } from './editorial-feed'

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, width, height, className } = props
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={String(src)} alt={String(alt)} width={Number(width)} height={Number(height)} className={String(className)} />
  },
}))

const tiles: StoryTile[] = [
  { slug: 'soft-structure', title: 'soft structure', src: 'https://cdn/eva.jpg', alt: 'Eva', width: 933, height: 1400 },
  { slug: 'city-interlude', title: 'city interlude', src: 'https://cdn/sofia.jpg', alt: 'Sofia', width: 933, height: 1400 },
]

describe('<StoryTiles />', () => {
  it('links each cover to its story page and names the link after the story', () => {
    const { container } = render(<StoryTiles tiles={tiles} />)
    const links = Array.from(container.querySelectorAll('a'))
    expect(links.map((a) => [a.getAttribute('href'), a.getAttribute('aria-label')])).toEqual([
      ['/editorial/soft-structure', 'soft structure'],
      ['/editorial/city-interlude', 'city interlude'],
    ])
  })

  it('shows the cover alone — no title, count or caption text on the tile', () => {
    const { container } = render(<StoryTiles tiles={tiles} />)
    expect(container.textContent).toBe('')
    const images = Array.from(container.querySelectorAll('img'))
    expect(images.map((img) => [img.getAttribute('src'), img.getAttribute('width'), img.getAttribute('height')])).toEqual([
      ['https://cdn/eva.jpg', '933', '1400'],
      ['https://cdn/sofia.jpg', '933', '1400'],
    ])
  })

  it('keeps the feed grammar: three CSS columns, hard rectangles, hover zoom', () => {
    const { container } = render(<StoryTiles tiles={tiles} />)
    const columns = container.firstElementChild
    expect(columns?.className).toContain('lg:columns-3')
    const link = container.querySelector('a')
    expect(link?.className).toContain('break-inside-avoid')
    expect(link?.className).toContain('overflow-hidden')
    expect(link?.className).not.toContain('rounded')
    expect(container.querySelector('img')?.className).toContain('group-hover:scale-105')
  })
})
