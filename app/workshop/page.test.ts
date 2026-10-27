import { it, expect, vi } from 'vitest'
const mock = vi.hoisted(() => ({ workshop: vi.fn() }))
vi.mock('./data', () => ({
  getPublicWorkshop: mock.workshop,
  workshopPhotoUrl: (_url: string, path: string | null) => (path ? `https://local/${path}` : null),
}))
import { generateMetadata } from './page'
it('uses workshop metadata and falls back when content is missing', async () => {
  mock.workshop.mockResolvedValue(null)
  expect((await generateMetadata()).title).toBe('Workshop')
  mock.workshop.mockResolvedValue({
    title: 'Studio',
    tagline: 'Portrait practice',
    hero_photo_path: 'hero.jpg',
  })
  const metadata = await generateMetadata()
  expect(metadata.title).toBe('Studio')
  expect(JSON.stringify(metadata.openGraph)).toContain('hero.jpg')
  mock.workshop.mockResolvedValue({ title: null, tagline: null, hero_photo_path: null })
  expect((await generateMetadata()).title).toBe('Workshop')
})
