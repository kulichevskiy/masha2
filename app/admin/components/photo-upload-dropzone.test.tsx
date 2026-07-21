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
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    storage: {
      from: () => ({ upload: (...args: unknown[]) => mockUpload(...args) }),
    },
  }),
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

function makeFile(name: string) {
  return new File(['x'], name, { type: 'image/png' })
}

async function dropAndUpload(container: HTMLElement, file: File) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
  const button = await screen.findByRole('button', { name: /Загрузить фотографии/ })
  fireEvent.click(button)
}

describe('<PhotoUploadDropzone /> multi-batch uploads', () => {
  beforeEach(() => {
    mockUpload.mockClear()
    mockRefresh.mockClear()
    mockCreatePhotosFromUploads.mockClear()
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
})
