/**
 * createPhotosFromUploads inserts one photos row per uploaded object. The feed
 * dropzone now uploads under a `photos/<uuid>/` prefix so same-named files
 * coexist, so the row's storage_path must keep the full prefixed key (getPublicUrl
 * resolves off it) while alt_text defaults to the *basename without extension*,
 * not the prefixed key. The cookie-backed server client and next/cache are
 * stubbed so the test stays at the boundary (admin gate -> insert -> revalidate).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn(async () => ({ data: { user: { id: 'u1' } } }))
const mockIsAdmin = vi.fn(async () => ({ data: true, error: null }))
const mockMinPosition = vi.fn(async () => ({ data: { position: 0 }, error: null }))
type InsertRow = { storage_path: string; alt_text: string }
const mockInsert = vi.fn(async (_rows: InsertRow[]) => ({ error: null }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    rpc: mockIsAdmin,
    from: () => ({
      select: () => ({
        order: () => ({ limit: () => ({ maybeSingle: mockMinPosition }) }),
      }),
      insert: mockInsert,
    }),
  }),
}))

const mockRevalidatePath = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

async function loadActions() {
  return import('./actions')
}

describe('createPhotosFromUploads', () => {
  beforeEach(() => {
    mockGetUser.mockClear()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockIsAdmin.mockClear()
    mockIsAdmin.mockResolvedValue({ data: true, error: null })
    mockMinPosition.mockClear()
    mockMinPosition.mockResolvedValue({ data: { position: 0 }, error: null })
    mockInsert.mockClear()
    mockRevalidatePath.mockClear()
  })

  it('keeps the full prefixed key as storage_path and defaults alt_text to the basename', async () => {
    const { createPhotosFromUploads } = await loadActions()
    await createPhotosFromUploads([
      { storagePath: 'photos/abc-123/IMG_1234.jpg', width: 800, height: 600 },
    ])

    expect(mockInsert).toHaveBeenCalledTimes(1)
    const rows = mockInsert.mock.calls[0][0]
    expect(rows[0].storage_path).toBe('photos/abc-123/IMG_1234.jpg')
    expect(rows[0].alt_text).toBe('IMG_1234')
  })

  it('still derives alt_text from a bare filename (existing rows have no prefix)', async () => {
    const { createPhotosFromUploads } = await loadActions()
    await createPhotosFromUploads([
      { storagePath: 'IMG_1234.jpg', width: null, height: null },
    ])

    const rows = mockInsert.mock.calls[0][0]
    expect(rows[0].alt_text).toBe('IMG_1234')
  })
})
