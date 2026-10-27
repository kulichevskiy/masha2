import { it, expect, vi } from 'vitest'
const mock = vi.hoisted(() => ({ updates: vi.fn(), read: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'admin' } } }) },
    rpc: async () => ({ data: true, error: null }),
    from: () => ({
      select: () => ({ in: mock.read }),
      update: (patch: unknown) => ({
        eq: (column: string, id: string) => mock.updates(patch, column, id),
      }),
    }),
  }),
}))
import { reorderPhotos } from './actions'
it('reassigns only selected photo slots in requested order', async () => {
  mock.read.mockResolvedValue({
    data: [
      { id: 'a', position: 2 },
      { id: 'b', position: 9 },
    ],
    error: null,
  })
  mock.updates.mockResolvedValue({ error: null })
  await reorderPhotos(['b', 'a'])
  expect(mock.updates.mock.calls).toEqual([
    [{ position: 2 }, 'id', 'b'],
    [{ position: 9 }, 'id', 'a'],
  ])
})
it('propagates position lookup errors', async () => {
  mock.read.mockResolvedValue({ data: null, error: { message: 'offline' } })
  await expect(reorderPhotos(['a'])).rejects.toThrow('Failed to read positions')
})
