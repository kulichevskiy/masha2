import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn(async () => ({ data: { user: { id: 'u1' } } }))
const mockIsAdmin = vi.fn(async () => ({ data: true, error: null }))
const mockSingle = vi.fn()
const mockRemove = vi.fn(async () => ({ error: null }))
const mockDeleteEq = vi.fn(async () => ({ error: null }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    rpc: mockIsAdmin,
    storage: { from: (bucket: string) => ({ remove: (paths: string[]) => mockRemove(bucket, paths) }) },
    from: () => ({
      select: () => ({ eq: () => ({ single: mockSingle }) }),
      delete: () => ({ eq: mockDeleteEq }),
    }),
  }),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('deletePhoto', () => {
  beforeEach(() => {
    mockRemove.mockClear()
    mockDeleteEq.mockClear()
  })

  it('removes a photo object from the photos bucket', async () => {
    mockSingle.mockResolvedValue({
      data: { kind: 'photo', storage_path: 'photos/batch/image.jpg', poster_path: null },
      error: null,
    })
    const { deletePhoto } = await import('./actions')

    await deletePhoto('photo-1')

    expect(mockRemove).toHaveBeenCalledWith('photos', ['photos/batch/image.jpg'])
    expect(mockDeleteEq).toHaveBeenCalledWith('id', 'photo-1')
  })

  it('removes both the mp4 and poster from the videos bucket', async () => {
    mockSingle.mockResolvedValue({
      data: {
        kind: 'video',
        storage_path: 'videos/batch/clip.mp4',
        poster_path: 'videos/batch/clip.poster.jpg',
      },
      error: null,
    })
    const { deletePhoto } = await import('./actions')

    await deletePhoto('video-1')

    expect(mockRemove).toHaveBeenCalledWith('videos', [
      'videos/batch/clip.mp4',
      'videos/batch/clip.poster.jpg',
    ])
    expect(mockDeleteEq).toHaveBeenCalledWith('id', 'video-1')
  })

  it('keeps the row when storage removal fails', async () => {
    mockSingle.mockResolvedValue({
      data: { kind: 'video', storage_path: 'videos/batch/clip.mp4', poster_path: 'videos/batch/clip.poster.jpg' },
      error: null,
    })
    mockRemove.mockResolvedValueOnce({ error: { message: 'storage unavailable' } })
    const { deletePhoto } = await import('./actions')

    await expect(deletePhoto('video-1')).rejects.toThrow('Failed to delete stored media')
    expect(mockDeleteEq).not.toHaveBeenCalled()
  })
})
