import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToReadableStream } from 'react-dom/server'
const mock = vi.hoisted(() => ({
  claims: vi.fn(),
  rpc: vi.fn(),
  query: vi.fn(),
  workshop: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => {
    const query = {
      select: () => query,
      order: () => query,
      limit: () => query,
      then: (done: (v: unknown) => unknown) => mock.query().then(done),
    }
    return { auth: { getClaims: mock.claims }, rpc: mock.rpc, from: () => query }
  },
}))
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }))
vi.mock('@/app/workshop/data', () => ({ getAdminWorkshop: mock.workshop }))
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`)
  },
  useRouter: () => ({}),
  usePathname: () => '/admin',
}))
vi.mock('./components/photo-upload-dropzone', () => ({ PhotoUploadDropzone: () => null }))
vi.mock('@/components/posthog-identify', () => ({ PostHogIdentify: () => null }))
vi.mock('./components/workshop-tab', () => ({ WorkshopTab: () => <p>Workshop editor</p> }))
import Page from './page'
beforeEach(() => {
  mock.claims.mockResolvedValue({
    data: { claims: { sub: 'admin', email: 'admin@test.invalid' } },
    error: null,
  })
  mock.rpc.mockResolvedValue({ data: true })
  mock.query.mockResolvedValue({ data: [], error: null })
  mock.workshop.mockResolvedValue({ id: 'workshop' })
})
async function html(tab?: string) {
  return new Response(
    await renderToReadableStream(await Page({ searchParams: Promise.resolve({ tab }) })),
  ).text()
}
describe('admin server page', () => {
  it('renders default portfolio management for admins and handles unknown tabs', async () => {
    expect(await html()).toContain('Личный кабинет фотографа')
    expect(await html('unknown')).toContain('Личный кабинет фотографа')
  })
  it('loads workshop intake lists for its editor and reports missing configuration', async () => {
    expect(await html('workshop')).toContain('Workshop editor')
    mock.workshop.mockResolvedValue(null)
    expect(await html('workshop')).toContain('Не найдена запись воркшопа')
  })
  it('rejects unauthenticated and nonadmin requests before rendering', async () => {
    mock.claims.mockResolvedValue({ data: { claims: null }, error: null })
    await expect(html()).rejects.toThrow('redirect:/auth/login')
    mock.claims.mockResolvedValue({ data: { claims: { sub: 'visitor' } }, error: null })
    mock.rpc.mockResolvedValue({ data: false })
    await expect(html()).rejects.toThrow('redirect:/')
  })
})
