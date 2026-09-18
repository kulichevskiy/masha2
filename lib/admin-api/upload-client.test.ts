// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApiClient, main, parseArgs, prepareFile, safeResult, validateUrl } from '../../scripts/api-upload.mjs'

const TOKEN = 'mcp_' + 'a'.repeat(64)
const ID = '11111111-1111-4111-8111-111111111111'
const DESTINATION = { url: 'https://storage.example/object?token=signed-secret', method: 'PUT', headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public', Authorization: `Bearer ${TOKEN}`, Cookie: 'private' } }
const json = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200, headers: { 'content-type': 'application/json' } })
let directory: string
beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), 'masha-client-test-')) })
afterEach(async () => { await rm(directory, { recursive: true, force: true }) })

const probe = vi.fn(async (command: string, args: string[]) => {
  if (command === 'ffprobe') return { stdout: JSON.stringify({ streams: [{ width: 1920, height: 1080 }], format: { duration: '3.5' } }) }
  await writeFile(args.at(-1)!, Buffer.from('jpeg poster'))
  return { stdout: '' }
})

describe('upload client', () => {
  it('parses files, rejects insecure/credentialed origins and accepts local development', () => {
    expect(parseArgs(['--url', 'https://site.example', '--purpose', 'gift', 'a.jpg', 'b.jpg'])).toMatchObject({ purpose: 'gift', files: ['a.jpg', 'b.jpg'] })
    for (const url of ['http://site.example', 'https://user:secret@site.example', 'https://site.example/api/v1', 'https://site.example?token=secret', 'file:///tmp/a']) expect(() => validateUrl(url, true)).toThrow()
    expect(validateUrl('http://localhost:3000', true).origin).toBe('http://localhost:3000')
    expect(() => parseArgs(['--url', 'https://site.example', '--token', TOKEN, 'a.jpg'])).toThrow()
    expect(() => parseArgs(['--url', 'https://site.example', '--recover', '../other'])).toThrow()
  })

  it('sends PAT only to the API origin and uses fresh allowlisted storage headers without redirects', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({}))
    const client = createApiClient('https://site.example', TOKEN, fetchMock)
    await client.request('uploads', 'POST', { purpose: 'media' })
    await client.put(DESTINATION, Buffer.from('bytes'))
    expect(fetchMock.mock.calls[0][0]).toBe('https://site.example/api/v1/uploads')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ headers: { Authorization: `Bearer ${TOKEN}` }, redirect: 'error' })
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public' }, redirect: 'error', credentials: 'omit' })
    expect(JSON.stringify(fetchMock.mock.calls[1][1])).not.toContain(TOKEN)
    expect(fetchMock.mock.calls[1][1].headers.Cookie).toBeUndefined()
    await expect(client.request('https://evil.example')).rejects.toThrow('Invalid API path')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('never exposes signed URL, PAT, or response body in network errors', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error(`${DESTINATION.url} ${TOKEN}`))
    const client = createApiClient('https://site.example', TOKEN, fetchMock)
    for (const attempt of [client.request('uploads'), client.put(DESTINATION, Buffer.from('bytes'))]) {
      await expect(attempt).rejects.not.toThrow(TOKEN)
      await expect(attempt).rejects.not.toThrow('signed-secret')
    }
    fetchMock.mockResolvedValue(new Response(TOKEN, { status: 403 }))
    await expect(client.request('uploads')).rejects.toThrow('HTTP 403')
    await expect(client.request('uploads')).rejects.not.toThrow(TOKEN)
  })

  it('prepares dimensions, video duration and a first-frame poster, then removes only its own temp directory', async () => {
    const source = join(directory, 'clip with spaces.mp4')
    await writeFile(source, 'mp4 data')
    const remove = vi.fn(rm)
    const run = vi.fn(probe)
    const prepared = await prepareFile(source, 'media', { runProcess: run, rm: remove })
    expect(prepared.metadata).toMatchObject({ kind: 'video', content_type: 'video/mp4', width: 1920, height: 1080, duration_seconds: 3.5, size: 8 })
    expect(prepared.poster?.toString()).toBe('jpeg poster')
    expect(run.mock.calls[1][1]).toEqual(expect.arrayContaining(['-frames:v', '1', source]))
    await prepared.cleanup()
    expect(remove).toHaveBeenCalledTimes(1)
    expect(remove.mock.calls[0][0]).not.toBe(directory)
    expect(String(remove.mock.calls[0][0])).toContain('masha-api-upload-')
    expect((await readFile(source)).toString()).toBe('mp4 data')
  })

  it('cleans up a poster directory when ffmpeg fails', async () => {
    const source = join(directory, 'clip.mp4')
    await writeFile(source, 'mp4')
    const remove = vi.fn(rm)
    const run = vi.fn().mockResolvedValueOnce({ stdout: JSON.stringify({ streams: [{ width: 20, height: 30 }], format: { duration: 1 } }) }).mockRejectedValueOnce(new Error('ffmpeg stderr'))
    await expect(prepareFile(source, 'media', { runProcess: run, rm: remove })).rejects.toThrow('Could not prepare')
    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('records recovery id before file PUT, finalizes with an empty body and cleans up after transfer failure', async () => {
    const source = join(directory, 'clip.mp4')
    await writeFile(source, 'mp4')
    const events: string[] = []
    const out = vi.fn()
    const remove = vi.fn(rm)
    const fetchMock = vi.fn(async (_url: unknown, options: { method?: string; body?: unknown }) => {
      events.push(options.method ?? '')
      if (options.method === 'PUT') throw new Error('Signed URL failed')
      return json({ id: ID, source: DESTINATION, poster: DESTINATION })
    })
    await expect(main(['--url', 'https://site.example', source], { env: { MASHA_API_TOKEN: TOKEN }, fetch: fetchMock, stdout: out, stderr: (line: string) => events.push(line), runProcess: probe, rm: remove })).rejects.toThrow('File transfer failed')
    expect(events).toEqual(['POST', `Upload ID: ${ID}`, 'PUT'])
    expect(remove).toHaveBeenCalledTimes(1)
    expect(out).not.toHaveBeenCalled()
  })

  it('completes a photo, emits safe results and recovers already-completed sessions without duplicate POST', async () => {
    const photo = join(directory, 'portrait.jpg')
    await writeFile(photo, 'jpeg')
    const final = { id: ID, version: 1, storage_path: 'photos/api/id/source.jpg', signed_url: DESTINATION.url, secret: TOKEN }
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ id: ID, source: DESTINATION })).mockResolvedValueOnce(new Response('', { status: 200 })).mockResolvedValueOnce(json(final))
    const out = vi.fn(), err = vi.fn()
    await main(['--url', 'https://site.example', '--purpose', 'media', photo], { env: { MASHA_API_TOKEN: TOKEN }, fetch: fetchMock, stdout: out, stderr: err, runProcess: probe })
    expect(fetchMock.mock.calls[2][1].body).toBeUndefined()
    expect(out).toHaveBeenCalledWith(JSON.stringify({ id: ID, version: 1, storage_path: final.storage_path }))
    expect(JSON.stringify(out.mock.calls)).not.toContain(TOKEN)
    expect(JSON.stringify(out.mock.calls)).not.toContain('signed-secret')
    fetchMock.mockReset().mockResolvedValue(json({ id: ID, completed_at: '2026-09-18T00:00:00Z', result: final }))
    await main(['--url', 'https://site.example', '--recover', ID], { env: { MASHA_API_TOKEN: TOKEN }, fetch: fetchMock, stdout: out })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][1].method).toBe('GET')
  })

  it('retries finalization for a pending recovery without trying to re-upload bytes', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ completed_at: null })).mockResolvedValueOnce(json({ storage_path: 'workshop/api/id/source.jpg' }))
    const out = vi.fn()
    await main(['--url', 'https://site.example', '--recover', ID], { env: { MASHA_API_TOKEN: TOKEN }, fetch: fetchMock, stdout: out })
    expect(fetchMock.mock.calls.map((call) => call[1].method)).toEqual(['GET', 'POST'])
    expect(out).toHaveBeenCalledWith('{"storage_path":"workshop/api/id/source.jpg"}')
  })

  it('rejects unsupported purpose/format combinations before network activity and filters arbitrary result secrets', async () => {
    await expect(prepareFile('clip.mp4', 'gift')).rejects.toThrow('only for purpose media')
    await expect(prepareFile('clip.mov', 'media')).rejects.toThrow('Unsupported')
    expect(safeResult({ storage_path: TOKEN, poster_path: DESTINATION.url, id: TOKEN, version: '1' })).toEqual({})
  })
})
