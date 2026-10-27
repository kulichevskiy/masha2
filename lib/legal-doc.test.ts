import { afterEach, describe, it, expect, vi } from 'vitest'
import { fetchLegalDoc } from './legal-doc'
afterEach(() => vi.unstubAllGlobals())
describe('published legal document reader', () => {
  it('removes the title, unsafe content and Google tracking redirects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            '<div class="doc-content"><h1>Source title</h1><p>Terms</p><p> </p><a href="https://www.google.com/url?q=https%3A%2F%2Fexample.org">Link</a><a href="/local">Local</a><script>secret()</script></div>',
          ),
      ),
    )
    const result = await fetchLegalDoc('test')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.html).toContain('https://example.org')
      expect(result.html).toContain('Terms')
      expect(result.html).not.toContain('Source title')
      expect(result.html).not.toContain('secret()')
    }
  })
  it.each(['<div>Login</div>', '<div class="doc-content"></div>'])(
    'detects unavailable content: %s',
    async (html) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(html)),
      )
      expect((await fetchLegalDoc('test')).ok).toBe(false)
    },
  )
  it('returns a failure on network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )
    expect(await fetchLegalDoc('test')).toEqual({ ok: false, reason: 'fetch-failed' })
  })
})
