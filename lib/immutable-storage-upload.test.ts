import { afterEach, describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { uploadImmutableObject } from './immutable-storage-upload'
afterEach(() => vi.unstubAllGlobals())
describe('immutable object upload', () => {
  const client = (session: unknown) =>
    ({ auth: { getSession: async () => ({ data: { session } }) } }) as SupabaseClient
  it('uses encoded paths, immutable headers and the user credential', async () => {
    const fetcher = vi.fn(async (...args: [string, RequestInit]) => {
      expect(args[1].headers).toMatchObject({
        Authorization: 'Bearer session',
        'x-upsert': 'false',
      })
      return new Response('{}')
    })
    vi.stubGlobal('fetch', fetcher)
    expect(
      await uploadImmutableObject(
        client({ access_token: 'session' }),
        'photos',
        'a b/photo.png',
        new Blob(['png'], { type: 'image/png' }),
      ),
    ).toEqual({ error: null })
    expect(fetcher.mock.calls[0]?.[0]).toContain('a%20b/photo.png')
  })
  it.each(['{"message":"denied"}', '{"error":"denied"}', 'invalid'])(
    'returns storage errors without requiring JSON: %s',
    async (body) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(body, { status: 403 })),
      )
      expect(
        (await uploadImmutableObject(client(null), 'photos', 'x', new Blob())).error?.message,
      ).toMatch(/denied|403/)
    },
  )
})
