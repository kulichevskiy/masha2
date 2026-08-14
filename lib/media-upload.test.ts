import { afterEach, describe, expect, it, vi } from 'vitest'
import { prepareMediaUpload } from './media-upload'

describe('prepareMediaUpload', () => {
  afterEach(() => vi.restoreAllMocks())

  it('reads mp4 metadata on loadedmetadata and captures the first frame as jpeg', async () => {
    const listeners = new Map<string, () => void>()
    const drawImage = vi.fn()
    const video = {
      duration: 9.25,
      videoWidth: 720,
      videoHeight: 1280,
      readyState: 0,
      preload: '',
      muted: false,
      playsInline: false,
      src: '',
      addEventListener: vi.fn((event: string, listener: () => void) => {
        listeners.set(event, listener)
      }),
      removeEventListener: vi.fn(),
      load: vi.fn(() => {
        listeners.get('loadedmetadata')?.()
        video.readyState = 2
        listeners.get('loadeddata')?.()
      }),
    }
    const poster = new Blob(['jpeg'], { type: 'image/jpeg' })
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage })),
      toBlob: vi.fn((callback: BlobCallback) => callback(poster)),
    }
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'video') return video
      if (tagName === 'canvas') return canvas
      return originalCreateElement(tagName)
    }) as typeof document.createElement)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:clip')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)

    const result = await prepareMediaUpload(
      new File(['mp4'], 'clip.mp4', { type: 'video/mp4' })
    )

    expect(result).toEqual({
      kind: 'video',
      width: 720,
      height: 1280,
      durationSeconds: 9.25,
      poster,
    })
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 720, 1280)
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.9)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:clip')
  })
})
