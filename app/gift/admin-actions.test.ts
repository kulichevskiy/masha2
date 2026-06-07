/**
 * Admin half of the gift actions: updateGiftCertificate (content editor save)
 * and deleteGiftCertificateRequest (orders list delete). The cookie-backed
 * server client and next/cache are stubbed so the test stays at the boundary
 * (admin gate -> supabase write -> revalidate).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn(async () => ({ data: { user: { id: 'u1' } } }))
const mockIsAdmin = vi.fn(async () => ({ data: true, error: null }))
const mockSingleId = vi.fn(async () => ({ data: { id: 'gift-1' }, error: null }))
const mockUpdateEq = vi.fn(async () => ({ error: null }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
const mockDeleteEq = vi.fn(async () => ({ error: null }))
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    rpc: mockIsAdmin,
    from: (table: string) => {
      if (table === 'gift_certificate') {
        return {
          select: () => ({ limit: () => ({ maybeSingle: mockSingleId }) }),
          update: mockUpdate,
        }
      }
      // gift_certificate_requests
      return { delete: mockDelete }
    },
  }),
}))

const mockRevalidatePath = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

async function loadActions() {
  const mod = await import('./actions')
  return mod
}

describe('gift admin actions', () => {
  beforeEach(() => {
    mockGetUser.mockClear()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockIsAdmin.mockClear()
    mockIsAdmin.mockResolvedValue({ data: true, error: null })
    mockSingleId.mockClear()
    mockSingleId.mockResolvedValue({ data: { id: 'gift-1' }, error: null })
    mockUpdate.mockClear()
    mockUpdateEq.mockClear()
    mockDelete.mockClear()
    mockDeleteEq.mockClear()
    mockRevalidatePath.mockClear()
  })

  describe('updateGiftCertificate', () => {
    it('writes the patch to the singleton and revalidates /gift', async () => {
      const { updateGiftCertificate } = await loadActions()
      await updateGiftCertificate({
        is_visible: true,
        body: '<p>hi</p>',
        amounts: [{ id: 'amt_450', price: '450 €' }],
        gallery: [{ photo_path: 'gift/x/a.jpg' }],
      })
      expect(mockUpdate).toHaveBeenCalledTimes(1)
      expect(mockUpdate.mock.calls[0][0]).toMatchObject({
        is_visible: true,
        body: '<p>hi</p>',
      })
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 'gift-1')
      const revalidated = mockRevalidatePath.mock.calls.map((c) => c[0])
      expect(revalidated).toContain('/gift')
      expect(revalidated).toContain('/admin')
    })

    it('throws when the caller is not an admin', async () => {
      mockIsAdmin.mockResolvedValueOnce({ data: false, error: null })
      const { updateGiftCertificate } = await loadActions()
      await expect(updateGiftCertificate({ is_visible: true })).rejects.toThrow()
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('deleteGiftCertificateRequest', () => {
    it('deletes the request by id when admin and revalidates /admin', async () => {
      const { deleteGiftCertificateRequest } = await loadActions()
      await deleteGiftCertificateRequest('req-1')
      expect(mockDelete).toHaveBeenCalledTimes(1)
      expect(mockDeleteEq).toHaveBeenCalledWith('id', 'req-1')
      expect(mockRevalidatePath.mock.calls.map((c) => c[0])).toContain('/admin')
    })

    it('throws when the caller is not an admin', async () => {
      mockIsAdmin.mockResolvedValueOnce({ data: false, error: null })
      const { deleteGiftCertificateRequest } = await loadActions()
      await expect(deleteGiftCertificateRequest('req-1')).rejects.toThrow()
      expect(mockDelete).not.toHaveBeenCalled()
    })
  })
})
