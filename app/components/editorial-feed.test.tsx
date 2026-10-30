/**
 * Story tiles on /editorial: one link per story with the cover image and a
 * caption under it — title, subtitle and photo count — in the same masonry
 * column flow as the photo feeds.
 */
import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { photoCountLabel, StoryTiles, type StoryTile } from './editorial-feed'

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, width, height, className } = props
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={String(src)} alt={String(alt)} width={Number(width)} height={Number(height)} className={String(className)} />
  },
}))

const tiles: StoryTile[] = [
  { slug: 'soft-structure', title: 'soft structure', subtitle: 'linen and late light', photoCount: 12, src: 'https://cdn/eva.jpg', alt: 'Eva', width: 933, height: 1400 },
  { slug: 'city-interlude', title: 'city interlude', subtitle: '', photoCount: 1, src: 'https://cdn/sofia.jpg', alt: 'Sofia', width: 933, height: 1400 },
]

describe('<StoryTiles />', () => {
  it('links each cover to its story page and names the link after the story', () => {
    const { container } = render(<StoryTiles tiles={tiles} />)
    const links = Array.from(container.querySelectorAll('a'))
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/editorial/soft-structure', '/editorial/city-interlude'])
  })

  it('captions each cover with the title, the subtitle when set, and the photo count', () => {
    const { container } = render(<StoryTiles tiles={tiles} />)
    const links = Array.from(container.querySelectorAll('a'))
    expect(links.map((a) => Array.from(a.querySelectorAll('span')).map((span) => span.textContent))).toEqual([
      ['soft structure', 'linen and late light', '12 photos'],
      ['city interlude', '1 photo'],
    ])
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
    const plate = container.querySelector('a > div')
    expect(plate?.className).toContain('overflow-hidden')
    expect(plate?.className).not.toContain('rounded')
    expect(container.querySelector('img')?.className).toContain('group-hover:scale-105')
  })
})

describe('photoCountLabel', () => {
  it('pluralises the count', () => {
    expect(photoCountLabel(1)).toBe('1 photo')
    expect(photoCountLabel(0)).toBe('0 photos')
    expect(photoCountLabel(7)).toBe('7 photos')
  })
})
