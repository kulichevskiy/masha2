import { afterEach, describe, expect, it, vi } from 'vitest'
import { isMp4File, prepareMediaUpload } from './media-upload'

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

  it('classifies mp4 files by normalized MIME or extension', () => {
    expect(isMp4File(new File([], 'clip.bin', { type: 'VIDEO/MP4' }))).toBe(true)
    expect(isMp4File(new File([], 'clip.MP4', { type: 'application/octet-stream' }))).toBe(true)
    expect(isMp4File(new File([], 'photo.jpg', { type: 'image/jpeg' }))).toBe(false)
  })

  it('rejects and cleans up when video decoding never emits an event', async () => {
    vi.useFakeTimers()
    const video = {
      preload: '', muted: false, playsInline: false, src: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      load: vi.fn(),
    }
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) =>
      tagName === 'video' ? video : originalCreateElement(tagName)
    ) as typeof document.createElement)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:stuck')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)

    const result = prepareMediaUpload(new File(['mp4'], 'clip.mp4', { type: 'video/mp4' }))
    const rejection = expect(result).rejects.toThrow('Не удалось прочитать видео')
    await vi.advanceTimersByTimeAsync(10_000)

    await rejection
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:stuck')
    expect(video.removeEventListener).toHaveBeenCalledTimes(3)
    vi.useRealTimers()
  })
})
