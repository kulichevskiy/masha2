/**
 * PhotoUploadDropzone drives two sequential batches through the *real*
 * useSupabaseUpload hook (only the Supabase client's storage.upload call is
 * stubbed). This exercises the multi-batch wiring the reviewer flagged: the
 * hook's `successes` state used to accumulate across batches because the
 * dropzone only swapped the `path` option in place instead of remounting the
 * hook, so dropping a second batch fired the DB-creation effect against the
 * first batch's stale `successes` before the second file ever uploaded. A
 * fresh `UploadSession` instance per batch (`key={prefix}`) fixes that.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, fireEvent, waitFor, screen } from '@testing-library/react'

const mockUpload = vi.fn(async () => ({ error: null }))
const mockRemove = vi.fn(async () => ({ error: null }))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 'token' } } }) },
    storage: {
      from: (bucket: string) => ({
        upload: (...args: unknown[]) => mockUpload(bucket, ...args),
        remove: (paths: string[]) => mockRemove(bucket, paths),
      }),
    },
  }),
}))

vi.mock('@/lib/media-upload', () => ({
  prepareMediaUpload: async (file: File) =>
    file.type === 'video/mp4'
      ? {
          kind: 'video',
          width: 720,
          height: 1280,
          durationSeconds: 12.75,
          poster: new Blob(['poster'], { type: 'image/jpeg' }),
        }
      : { kind: 'photo', width: 800, height: 600 },
}))

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }))

const mockCreatePhotosFromUploads = vi.fn(async () => undefined)
vi.mock('../actions', () => ({
  createPhotosFromUploads: (...args: unknown[]) => mockCreatePhotosFromUploads(...args),
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let PhotoUploadDropzone: (props: any) => React.ReactNode

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://localhost:54321'
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY ||= 'test-anon-key'
  ;({ PhotoUploadDropzone } = await import('./photo-upload-dropzone'))
})

function makeFile(name: string, type = 'image/png') {
  return new File(['x'], name, { type })
}

async function dropAndUpload(container: HTMLElement, file: File) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
  const button = await screen.findByRole('button', { name: /Загрузить/ })
  fireEvent.click(button)
}

describe('<PhotoUploadDropzone /> multi-batch uploads', () => {
  beforeEach(() => {
    mockUpload.mockClear()
    mockRemove.mockClear()
    mockRefresh.mockClear()
    mockCreatePhotosFromUploads.mockClear()
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 200 })))
  })

  it('creates exactly one correct row per batch, with no phantom row from a stale prior batch', async () => {
    const { container } = render(<PhotoUploadDropzone />)

    await dropAndUpload(container, makeFile('A.jpg'))

    await waitFor(() => expect(mockCreatePhotosFromUploads).toHaveBeenCalledTimes(1))
    const firstUploads = mockCreatePhotosFromUploads.mock.calls[0][0] as { storagePath: string }[]
    expect(firstUploads).toHaveLength(1)
    expect(firstUploads[0].storagePath).toMatch(/^photos\/[^/]+\/A\.jpg$/)

    // Wait for the batch-complete remount (fresh prefix, fresh dropzone) before
    // dropping the next batch.
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByText(/Успешно загружено/)).toBeNull())

    await dropAndUpload(container, makeFile('B.jpg'))

    await waitFor(() => expect(mockCreatePhotosFromUploads).toHaveBeenCalledTimes(2))
    const secondUploads = mockCreatePhotosFromUploads.mock.calls[1][0] as { storagePath: string }[]

    // Only the real, freshly-uploaded B.jpg should be recorded — not a
    // phantom row carried over from the first batch's A.jpg.
    expect(secondUploads).toHaveLength(1)
    expect(secondUploads[0].storagePath).toMatch(/^photos\/[^/]+\/B\.jpg$/)
    expect(secondUploads[0].storagePath).not.toContain('A.jpg')

    // The two batches must use distinct prefixes.
    expect(firstUploads[0].storagePath.split('/')[1]).not.toBe(
      secondUploads[0].storagePath.split('/')[1]
    )
  })

  it('uploads an mp4 and generated poster to videos with immutable caching, then creates video metadata', async () => {
    const { container } = render(<PhotoUploadDropzone />)

    await dropAndUpload(container, makeFile('clip.mp4', 'video/mp4'))

    await waitFor(() => expect(mockCreatePhotosFromUploads).toHaveBeenCalledTimes(1))
    const uploads = mockCreatePhotosFromUploads.mock.calls[0][0]
    expect(uploads).toEqual([
      expect.objectContaining({
        kind: 'video',
        storagePath: expect.stringMatching(/^videos\/[^/]+\/clip\.mp4$/),
        posterPath: expect.stringMatching(/^videos\/[^/]+\/clip\.poster\.jpg$/),
        durationSeconds: 12.75,
        width: 720,
        height: 1280,
      }),
    ])

    const fetchCalls = vi.mocked(fetch).mock.calls
    expect(fetchCalls).toHaveLength(2)
    for (const [, init] of fetchCalls) {
      expect(new Headers(init?.headers).get('Cache-Control')).toBe(
        'public, max-age=31536000, immutable'
      )
    }
  })

  it('cleans up source and poster objects and allows retry when row insertion fails', async () => {
    mockCreatePhotosFromUploads
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockResolvedValueOnce(undefined)
    const { container } = render(<PhotoUploadDropzone />)

    await dropAndUpload(container, makeFile('clip.mp4', 'video/mp4'))

    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith(
      'videos',
      expect.arrayContaining([
        expect.stringMatching(/clip\.mp4$/),
        expect.stringMatching(/clip\.poster\.jpg$/),
      ])
    ))
    expect(await screen.findByText(/database unavailable/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Загрузить/ }))
    await waitFor(() => expect(mockCreatePhotosFromUploads).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1))
  })

  it('rejects an mp4 larger than 25 MB with a clear message', async () => {
    const { container } = render(<PhotoUploadDropzone />)
    const file = makeFile('too-large.mp4', 'video/mp4')
    Object.defineProperty(file, 'size', { value: 25 * 1024 * 1024 + 1 })

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText(/Файл больше чем 25 МБ/)).toBeTruthy()
    expect((screen.getByRole('button', { name: /Загрузить/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('keeps the existing 10 MB limit for photos', async () => {
    const { container } = render(<PhotoUploadDropzone />)
    const file = makeFile('too-large.jpg', 'image/jpeg')
    Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 + 1 })

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText(/Фотография больше чем 10 МБ/)).toBeTruthy()
  })
})
