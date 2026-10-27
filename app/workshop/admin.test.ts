import { it, expect, vi } from 'vitest'
const mock = vi.hoisted(() => ({ update: vi.fn(), revalidate: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: mock.revalidate }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'admin' } } }) },
    rpc: async () => ({ data: true, error: null }),
    from: () => ({
      select: () => ({
        limit: () => ({ maybeSingle: async () => ({ data: { id: 'w' }, error: null }) }),
      }),
      update: (patch: unknown) => ({
        eq: (key: string, id: string) => mock.update(patch, key, id),
      }),
    }),
  }),
}))
import { updateWorkshop } from './actions'
it('persists workshop edits and invalidates all public consumers', async () => {
  mock.update.mockResolvedValue({ error: null })
  await updateWorkshop({ title: 'Studio' })
  expect(mock.update).toHaveBeenCalledWith({ title: 'Studio' }, 'id', 'w')
  expect(mock.revalidate).toHaveBeenCalledWith('/workshop')
  expect(mock.revalidate).toHaveBeenCalledWith('/portraits')
})
