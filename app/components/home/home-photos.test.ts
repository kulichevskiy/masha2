import { describe, it, expect, vi } from 'vitest'
const query = vi.hoisted(() => ({
  result: { data: [] as Record<string, unknown>[], error: null as unknown },
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => {
    const chain = {
      select: () => chain,
      overlaps: () => chain,
      order: () => chain,
      then: (done: (value: unknown) => unknown) => Promise.resolve(query.result).then(done),
    }
    return {
      from: () => chain,
      storage: {
        from: (bucket: string) => ({
          getPublicUrl: (path: string) => ({
            data: { publicUrl: `https://local/${bucket}/${path}` },
          }),
        }),
      },
    }
  },
}))
import { loadHomePhotos } from './home-photos'
describe('home photo reader', () => {
  it('assigns section precedence and omits videos without posters', async () => {
    const base = {
      kind: 'photo',
      width: 640,
      height: 480,
      title: 'Title',
      alt_text: null,
      poster_path: null,
    }
    query.result = {
      data: [
        { ...base, id: 'p', storage_path: 'p.jpg', pages: ['portraits'] },
        { ...base, id: 'k', storage_path: 'k.jpg', pages: ['kids'] },
        {
          ...base,
          id: 'e',
          storage_path: 'e.jpg',
          pages: ['portraits', 'editorial'],
          alt_text: 'Editorial',
        },
        {
          ...base,
          id: 'v',
          kind: 'video',
          storage_path: 'v.mp4',
          poster_path: 'v.jpg',
          pages: ['video'],
          duration_seconds: 12,
        },
        { ...base, id: 'bad', kind: 'video', storage_path: 'bad.mp4', pages: ['video'] },
      ],
      error: null,
    }
    const slots = await loadHomePhotos()
    expect(slots.video?.id).toBe('v')
    expect(slots.work.editorial[0]?.id).toBe('e')
    expect(JSON.stringify(slots)).not.toContain('bad.mp4')
  })
  it('returns empty slots on read failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    query.result = { data: [], error: { message: 'offline' } }
    expect((await loadHomePhotos()).hero).toBeNull()
  })
})
