// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { beginUpload, verifyUpload } from './uploads'
import type { AdminDb } from './auth'
const token = { id: 'token', owner_id: 'owner', name: 'Test' }
const input = {
  purpose: 'media',
  kind: 'photo',
  filename: 'photo.png',
  content_type: 'image/png',
  size: 10,
  width: 16,
  height: 16,
}
function database(upload: Record<string, unknown> = {}) {
  const list = vi.fn(async () => ({
    data: [{ id: 'file', name: 'source.png', metadata: { size: 10, mimetype: 'image/png' } }],
    error: null,
  }))
  const sign = vi.fn(async () => ({ data: { signedUrl: 'http://local/upload' }, error: null }))
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({
      data: {
        completed_at: null,
        expires_at: new Date(Date.now() + 60000).toISOString(),
        bucket: 'photos',
        storage_path: 'batch/source.png',
        poster_path: null,
        metadata: input,
        ...upload,
      },
      error: null,
    }),
  }
  return {
    db: {
      from: () => chain,
      storage: { from: () => ({ createSignedUploadUrl: sign, list }) },
      rpc: vi.fn(async () => ({ data: {}, error: null })),
    } as unknown as AdminDb,
    list,
    sign,
  }
}
describe('API upload storage contract', () => {
  it('signs photo and video destinations only after validating metadata', async () => {
    const { db, sign } = database()
    expect((await beginUpload(db, token, input, 'audit')).poster).toBeNull()
    const video = await beginUpload(
      db,
      token,
      { ...input, kind: 'video', content_type: 'video/mp4', duration_seconds: 12 },
      'audit',
    )
    expect(video.poster?.headers['Content-Type']).toBe('image/jpeg')
    expect(sign).toHaveBeenCalledTimes(3)
    await expect(
      beginUpload(db, token, { ...input, kind: 'video', content_type: 'video/mp4' }, 'audit'),
    ).rejects.toThrow('Invalid media')
    await expect(
      beginUpload(db, token, { ...input, size: 11 * 1024 * 1024 }, 'audit'),
    ).rejects.toThrow('Invalid media')
  })
  it('accepts matching stored bytes and rejects mismatched metadata or missing objects', async () => {
    const { db, list } = database()
    expect(await verifyUpload(db, token, 'id')).toMatchObject({ storage_path: 'batch/source.png' })
    list.mockResolvedValueOnce({ data: [], error: null })
    await expect(verifyUpload(db, token, 'id')).rejects.toThrow('Upload source')
    list.mockResolvedValueOnce({
      data: [{ id: 'file', name: 'source.png', metadata: { size: 11, mimetype: 'image/png' } }],
      error: null,
    })
    await expect(verifyUpload(db, token, 'id')).rejects.toThrow('does not match')
  })
  it('rejects expired sessions and allows already completed sessions', async () => {
    await expect(
      verifyUpload(database({ expires_at: '2020-01-01' }).db, token, 'id'),
    ).rejects.toThrow('Start a new')
    expect(
      await verifyUpload(database({ completed_at: '2026-01-01' }).db, token, 'id'),
    ).toMatchObject({ completed_at: '2026-01-01' })
  })
})
