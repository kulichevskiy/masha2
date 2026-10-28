/**
 * The story page body (spec R3): header with back link, lowercase title,
 * optional subtitle and the credits list ending in the photo count; the
 * photographs in sequence; previous / all stories / next navigation that
 * wraps around. Rendered from fixture props — no database.
 */
import { describe, expect, it, vi } from 'vitest'
import { render, within } from '@testing-library/react'
import { StoryPage } from './story-page'
import type { LightboxPhoto } from '@/app/components/ui/photo-lightbox'

// The lightbox grid owns matchMedia/portal behaviour covered by its own tests;
// here it is reduced to the images it would list, in order.
vi.mock('@/app/components/ui/photo-lightbox', () => ({
  PhotoLightboxGrid: ({ photos }: { photos: LightboxPhoto[] }) => (
    <div>
      {photos.map((photo) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={photo.id} src={photo.src} alt={photo.alt} />
      ))}
    </div>
  ),
}))

const photos: LightboxPhoto[] = [
  { id: 'p1', src: 'https://cdn/1.jpg', alt: 'Eva one', width: 933, height: 1400 },
  { id: 'p2', src: 'https://cdn/2.jpg', alt: 'Eva two', width: 1400, height: 933 },
  { id: 'p3', src: 'https://cdn/3.jpg', alt: 'Eva three', width: 933, height: 1400 },
]

const base = {
  title: 'soft structure',
  subtitle: 'Soft fabric against the hard lines of the city: volume, gesture and a direct gaze.',
  credits: [
    { role: 'photography', name: 'maria chevskaya' },
    { role: 'model', name: 'eva' },
  ],
  photos,
  previous: { slug: 'in-hard-light', title: 'in hard light' },
  next: { slug: 'city-interlude', title: 'city interlude' },
}

describe('<StoryPage />', () => {
  it('renders the header: back link, title, subtitle and credits ending with the photo count', () => {
    const { container } = render(<StoryPage {...base} />)
    const header = container.querySelector('header')!

    expect(within(header).getByRole('link', { name: /editorial/i }).getAttribute('href')).toBe('/editorial')
    const h1 = header.querySelector('h1')!
    expect(h1.textContent).toBe('soft structure')
    expect(h1.className).toContain('lowercase')
    expect(header.querySelector('p')?.textContent).toBe(base.subtitle)

    const terms = Array.from(header.querySelectorAll('dt')).map((dt) => dt.textContent)
    const names = Array.from(header.querySelectorAll('dd')).map((dd) => dd.textContent)
    expect(terms).toEqual(['photography', 'model', 'photos'])
    expect(names).toEqual(['maria chevskaya', 'eva', '3'])
  })

  it('omits the subtitle paragraph when empty and still shows the photo count', () => {
    const { container } = render(<StoryPage {...base} subtitle="" credits={[]} />)
    const header = container.querySelector('header')!
    expect(header.querySelector('p')).toBeNull()
    expect(Array.from(header.querySelectorAll('dt')).map((dt) => dt.textContent)).toEqual(['photos'])
    expect(header.querySelector('dd')?.textContent).toBe('3')
  })

  it('shows every photograph of the sequence in order', () => {
    const { container } = render(<StoryPage {...base} />)
    const alts = Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('alt'))
    expect(alts).toEqual(['Eva one', 'Eva two', 'Eva three'])
  })

  it('navigates to the previous and next stories and back to the feed', () => {
    const { container } = render(<StoryPage {...base} />)
    const nav = container.querySelector('nav[aria-label="Stories"]')!
    const links = Array.from(nav.querySelectorAll('a')).map((a) => [a.getAttribute('href'), a.textContent?.replace(/\s+/g, ' ').trim()])
    expect(links).toEqual([
      ['/editorial/in-hard-light', 'previous← in hard light'],
      ['/editorial', 'All stories'],
      ['/editorial/city-interlude', 'nextcity interlude →'],
    ])
  })

  it('keeps only the feed link when a story has no neighbours', () => {
    const { container } = render(<StoryPage {...base} previous={null} next={null} />)
    const nav = container.querySelector('nav[aria-label="Stories"]')!
    expect(Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual(['/editorial'])
  })
})
