import { it, expect, vi } from 'vitest'
import { renderToReadableStream } from 'react-dom/server'
import { DEFAULT_CONTENT } from '@/lib/home-story-content'
const mock = vi.hoisted(() => ({ workshop: vi.fn() }))
vi.mock('../../workshop/data', () => ({ getPublicWorkshop: mock.workshop }))
vi.mock('./home-photos', () => ({
  loadHomePhotos: async () => ({
    hero: null,
    people: [null, null, null],
    experience: null,
    work: { portraits: [], kids: [], editorial: [] },
    video: null,
    workshops: null,
    invitation: null,
  }),
}))
vi.mock('./home-content', async (original) => ({
  ...(await original<object>()),
  loadHomeContent: async () => DEFAULT_CONTENT,
}))
import { HomeStory } from './home-story'
it('shows current workshop promotion and switches CTA when sales close', async () => {
  mock.workshop.mockResolvedValue({
    banner_visible: true,
    title: 'Studio practice',
    dates: 'March 2027',
    seats: '6 seats',
    sales_open: true,
  })
  let html = await new Response(await renderToReadableStream(await HomeStory())).text()
  expect(html).toContain('Studio practice')
  expect(html).toContain('Apply')
  mock.workshop.mockResolvedValue({
    banner_visible: true,
    title: 'Studio practice',
    sales_open: false,
  })
  html = await new Response(await renderToReadableStream(await HomeStory())).text()
  expect(html.replaceAll('\u00a0', ' ')).toContain('Join the waitlist')
  mock.workshop.mockResolvedValue(null)
  html = await new Response(await renderToReadableStream(await HomeStory())).text()
  expect(html).not.toContain('Studio practice')
})
