import { describe, it, expect, vi } from 'vitest'
const mock = vi.hoisted(() => ({ data: null as unknown }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: mock.data }) }) }) }),
  }),
}))
import Page from './page'
import { renderToStaticMarkup } from 'react-dom/server'
describe('booking server page', () => {
  it('renders when optional content is unavailable', async () => {
    mock.data = null
    expect(renderToStaticMarkup(await Page())).toContain('booking')
  })
  it('includes configured tiers and FAQ', async () => {
    mock.data = []
    expect(renderToStaticMarkup(await Page())).toContain('booking')
  })
})
