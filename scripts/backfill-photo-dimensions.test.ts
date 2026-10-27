// @vitest-environment node
import { afterEach, it, expect, vi } from 'vitest'
const mock = vi.hoisted(() => ({ update: vi.fn(), client: vi.fn() }))
vi.mock('node:fs', () => ({
  readFileSync: () =>
    "# comment\nNEXT_PUBLIC_SUPABASE_URL=http://local.invalid\nSUPABASE_SERVICE_ROLE_KEY='local'\n",
}))
vi.mock('@supabase/supabase-js', () => ({ createClient: mock.client }))
vi.mock('image-size', () => ({ imageSize: () => ({ width: 20, height: 30, orientation: 6 }) }))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})
it('backfills decoded display dimensions without replacing measured rows', async () => {
  const done = vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://local.invalid')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'local')
  mock.update.mockResolvedValue({ error: null })
  mock.client.mockReturnValue({
    from: () => ({
      select: () => ({
        or: () => ({ data: [{ id: 'one', storage_path: 'one.png' }], error: null }),
      }),
      update: (data: unknown) => ({ eq: () => mock.update(data) }),
    }),
    storage: {
      from: () => ({ getPublicUrl: () => ({ data: { publicUrl: 'http://local.invalid/photo' } }) }),
    },
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(new Uint8Array([1, 2]))),
  )
  await import('./backfill-photo-dimensions')
  await vi.waitFor(() => expect(done).toHaveBeenCalledWith('\nDone. Updated 1/1.'))
  expect(mock.update).toHaveBeenCalledWith({ width: 30, height: 20 })
})
