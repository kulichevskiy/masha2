import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PhotoLightboxGrid, type LightboxPhoto } from './photo-lightbox'

vi.mock('next/image', () => ({
  default: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // The tests exercise the gallery contract rather than Next.js image loading.
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}))

const PHOTOS: LightboxPhoto[] = [
  { id: 'one', src: '/one.jpg', alt: 'First portrait', width: 800, height: 1200 },
  { id: 'two', src: '/two.jpg', alt: 'Second portrait', width: 1200, height: 800 },
  { id: 'three', src: '/three.jpg', alt: 'Third portrait', width: 900, height: 900 },
]

const MIXED_MEDIA: LightboxPhoto[] = [
  PHOTOS[0],
  {
    id: 'clip',
    kind: 'video',
    src: '/clip-poster.jpg',
    videoSrc: '/clip.mp4',
    alt: 'Portrait clip',
    width: 1080,
    height: 1920,
    durationSeconds: 12.75,
  },
  PHOTOS[2],
]

function renderGallery() {
  return render(<PhotoLightboxGrid photos={PHOTOS} />)
}

function tile(name: string) {
  return screen.getByRole('button', { name: `Open ${name}` })
}

function mockMediaPreferences({
  hover = true,
  reducedMotion = false,
}: {
  hover?: boolean
  reducedMotion?: boolean
} = {}) {
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    matches: query === '(hover: hover)' ? hover : reducedMotion,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

function mockChangingMediaPreferences() {
  const matches = new Map([
    ['(hover: hover)', true],
    ['(prefers-reduced-motion: reduce)', false],
  ])
  const listeners = new Map<string, Set<EventListener>>()

  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    get matches() { return matches.get(query) ?? false },
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: (_type, listener) => {
      const queryListeners = listeners.get(query) ?? new Set<EventListener>()
      queryListeners.add(listener as EventListener)
      listeners.set(query, queryListeners)
    },
    removeEventListener: (_type, listener) => listeners.get(query)?.delete(listener as EventListener),
    dispatchEvent: vi.fn(),
  }))

  return (query: '(hover: hover)' | '(prefers-reduced-motion: reduce)', value: boolean) => {
    matches.set(query, value)
    listeners.get(query)?.forEach((listener) => listener(new Event('change')))
  }
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  window.matchMedia ??= vi.fn()
  mockMediaPreferences()
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('<PhotoLightboxGrid />', () => {
  it('starts a silent looping mosaic preview only after a 200 ms hover', () => {
    vi.useFakeTimers()
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    render(<PhotoLightboxGrid photos={MIXED_MEDIA} />)
    const videoTile = tile('Portrait clip')

    fireEvent.mouseEnter(videoTile)
    act(() => vi.advanceTimersByTime(199))
    expect(document.querySelector('video')).not.toBeInTheDocument()
    expect(play).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(1))
    const preview = document.querySelector('video') as HTMLVideoElement
    expect(preview).toHaveAttribute('src', '/clip.mp4')
    expect(preview).toHaveAttribute('preload', 'none')
    expect(preview).toHaveAttribute('loop')
    expect(preview).toHaveAttribute('playsinline')
    expect(preview).not.toHaveAttribute('controls')
    expect(preview.muted).toBe(true)
    expect(play).toHaveBeenCalledOnce()

    fireEvent.mouseLeave(videoTile)
    expect(document.querySelector('video')).not.toBeInTheDocument()
    expect(screen.getByAltText('Portrait clip')).toBeVisible()
  })

  it('keeps the hover preview source during Strict Mode effect replay', () => {
    vi.useFakeTimers()
    render(
      <StrictMode>
        <PhotoLightboxGrid photos={MIXED_MEDIA} />
      </StrictMode>,
    )

    fireEvent.mouseEnter(tile('Portrait clip'))
    act(() => vi.advanceTimersByTime(200))

    expect(document.querySelector('video')).toHaveAttribute('src', '/clip.mp4')
  })

  it('does not load a quick pass-over and stops the previous preview when another tile arms', () => {
    vi.useFakeTimers()
    const media = [
      MIXED_MEDIA[1],
      { ...MIXED_MEDIA[1], id: 'clip-two', alt: 'Second clip', videoSrc: '/clip-two.mp4' },
    ]
    render(<PhotoLightboxGrid photos={media} />)

    fireEvent.mouseEnter(tile('Portrait clip'))
    act(() => vi.advanceTimersByTime(100))
    fireEvent.mouseLeave(tile('Portrait clip'))
    act(() => vi.advanceTimersByTime(200))
    expect(document.querySelector('video')).not.toBeInTheDocument()

    fireEvent.mouseEnter(tile('Portrait clip'))
    act(() => vi.advanceTimersByTime(200))
    expect(document.querySelector('video')).toHaveAttribute('src', '/clip.mp4')

    fireEvent.mouseEnter(tile('Second clip'))
    expect(document.querySelector('video')).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(200))
    expect(document.querySelectorAll('video')).toHaveLength(1)
    expect(document.querySelector('video')).toHaveAttribute('src', '/clip-two.mp4')
  })

  it.each([
    ['a device without hover', { hover: false, reducedMotion: false }],
    ['reduced motion', { hover: true, reducedMotion: true }],
  ])('keeps the poster on %s', (_label, preferences) => {
    vi.useFakeTimers()
    mockMediaPreferences(preferences)
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    render(<PhotoLightboxGrid photos={MIXED_MEDIA} />)

    fireEvent.mouseEnter(tile('Portrait clip'))
    act(() => vi.advanceTimersByTime(500))

    expect(document.querySelector('video')).not.toBeInTheDocument()
    expect(play).not.toHaveBeenCalled()
    fireEvent.click(tile('Portrait clip'))
    expect(screen.getByRole('dialog', { name: 'Portrait clip' })).toBeInTheDocument()
  })

  it('cancels pending and active previews when media preferences change', () => {
    vi.useFakeTimers()
    const setPreference = mockChangingMediaPreferences()
    render(<PhotoLightboxGrid photos={MIXED_MEDIA} />)
    const videoTile = tile('Portrait clip')

    fireEvent.mouseEnter(videoTile)
    act(() => vi.advanceTimersByTime(100))
    act(() => setPreference('(prefers-reduced-motion: reduce)', true))
    act(() => vi.advanceTimersByTime(100))
    expect(document.querySelector('video')).not.toBeInTheDocument()

    act(() => setPreference('(prefers-reduced-motion: reduce)', false))
    fireEvent.mouseEnter(videoTile)
    act(() => vi.advanceTimersByTime(200))
    expect(document.querySelector('video')).toHaveAttribute('src', '/clip.mp4')

    act(() => setPreference('(hover: hover)', false))
    expect(document.querySelector('video')).not.toBeInTheDocument()
  })

  it('stops a hovering preview and opens the lightbox at 0:00 with sound', () => {
    vi.useFakeTimers()
    render(<PhotoLightboxGrid photos={MIXED_MEDIA} />)
    const videoTile = tile('Portrait clip')
    fireEvent.mouseEnter(videoTile)
    act(() => vi.advanceTimersByTime(200))
    const preview = document.querySelector('video') as HTMLVideoElement
    preview.currentTime = 7

    fireEvent.click(videoTile)

    const videos = document.querySelectorAll('video')
    expect(videos).toHaveLength(1)
    expect(videos[0]).toBe(screen.getByRole('dialog', { name: 'Portrait clip' }).querySelector('video'))
    expect(videos[0].currentTime).toBe(0)
    expect(videos[0].muted).toBe(false)
  })

  it('renders a natural-ratio optimized poster and duration without loading video bytes', () => {
    render(<PhotoLightboxGrid photos={MIXED_MEDIA} />)

    const poster = screen.getByAltText('Portrait clip')
    expect(poster).toHaveAttribute('src', '/clip-poster.jpg')
    expect(poster).toHaveAttribute('width', '1080')
    expect(poster).toHaveAttribute('height', '1920')
    expect(poster).toHaveAttribute('quality', '90')
    expect(poster).toHaveClass('h-auto', 'w-full')
    expect(document.querySelector('video')).not.toBeInTheDocument()

    const duration = screen.getByText('0:13')
    expect(duration).toHaveClass('font-roboto-mono', 'text-xs', 'text-white/70')
    expect(duration).toHaveStyle({ textShadow: '0 1px 3px rgb(0 0 0 / 0.65)' })
  })

  it('opens a video from 0:00 with sound and native controls', () => {
    render(<PhotoLightboxGrid photos={MIXED_MEDIA} />)

    fireEvent.click(tile('Portrait clip'))

    const dialog = screen.getByRole('dialog', { name: 'Portrait clip' })
    const video = dialog.querySelector('video') as HTMLVideoElement
    expect(video).toHaveAttribute('src', '/clip.mp4')
    expect(video).toHaveAttribute('poster', '/clip-poster.jpg')
    expect(video).toHaveAttribute('controls')
    expect(video).toHaveAttribute('autoplay')
    expect(video).toHaveAttribute('preload', 'none')
    expect(video).toHaveAttribute('width', '1080')
    expect(video).toHaveAttribute('height', '1920')
    expect(video).toHaveStyle({ aspectRatio: '1080 / 1920' })
    expect(video.play).toHaveBeenCalled()
    expect(video.currentTime).toBe(0)
    expect(video.muted).toBe(false)
    expect(window.location.search).toBe('?photo=clip')
  })

  it('uses arrow keys for gallery navigation when the video is focused', () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    render(<PhotoLightboxGrid photos={MIXED_MEDIA} />)
    fireEvent.click(tile('Portrait clip'))
    const dialog = screen.getByRole('dialog', { name: 'Portrait clip' })
    const video = dialog.querySelector('video') as HTMLVideoElement
    video.currentTime = 8
    video.focus()

    const handled = fireEvent.keyDown(video, { key: 'ArrowRight' })

    expect(handled).toBe(false)
    expect(screen.getByRole('dialog', { name: 'Third portrait' })).toBeInTheDocument()
    expect(pause).toHaveBeenCalled()
    expect(video.currentTime).toBe(0)
    expect(window.location.search).toBe('?photo=three')
  })

  it('navigates with a horizontal swipe across the video surface', () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    render(<PhotoLightboxGrid photos={MIXED_MEDIA} />)
    fireEvent.click(tile('Portrait clip'))
    const dialog = screen.getByRole('dialog', { name: 'Portrait clip' })
    const video = dialog.querySelector('video') as HTMLVideoElement
    video.currentTime = 8
    vi.spyOn(video, 'getBoundingClientRect').mockReturnValue({
      top: 0, right: 300, bottom: 500, left: 0, width: 300, height: 500, x: 0, y: 0,
      toJSON: () => ({}),
    })

    fireEvent.touchStart(video, { touches: [{ clientX: 250, clientY: 100 }] })
    fireEvent.touchEnd(video, { changedTouches: [{ clientX: 100, clientY: 105 }] })

    expect(screen.getByRole('dialog', { name: 'Third portrait' })).toBeInTheDocument()
    expect(pause).toHaveBeenCalled()
    expect(window.location.search).toBe('?photo=three')
  })

  it('leaves gestures on the native video control strip untouched', () => {
    render(<PhotoLightboxGrid photos={MIXED_MEDIA} />)
    fireEvent.click(tile('Portrait clip'))
    const dialog = screen.getByRole('dialog', { name: 'Portrait clip' })
    const video = dialog.querySelector('video') as HTMLVideoElement
    vi.spyOn(video, 'getBoundingClientRect').mockReturnValue({
      top: 0, right: 300, bottom: 500, left: 0, width: 300, height: 500, x: 0, y: 0,
      toJSON: () => ({}),
    })

    fireEvent.touchStart(video, { touches: [{ clientX: 250, clientY: 475 }] })
    fireEvent.touchEnd(video, { changedTouches: [{ clientX: 100, clientY: 475 }] })

    expect(screen.getByRole('dialog', { name: 'Portrait clip' })).toBeInTheDocument()
    expect(window.location.search).toBe('?photo=clip')
  })

  it('includes native video controls in the dialog focus cycle', () => {
    render(<PhotoLightboxGrid photos={MIXED_MEDIA} />)
    fireEvent.click(tile('Portrait clip'))
    const dialog = screen.getByRole('dialog', { name: 'Portrait clip' })
    const video = dialog.querySelector('video') as HTMLVideoElement
    const next = screen.getByRole('button', { name: 'Next photo' })
    const focus = vi.spyOn(video, 'focus')

    next.focus()
    fireEvent.keyDown(next, { key: 'Tab' })

    expect(focus).toHaveBeenCalled()
  })

  it('stops and resets a video when arrow navigation moves to a photo', () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    render(<PhotoLightboxGrid photos={MIXED_MEDIA} />)
    fireEvent.click(tile('Portrait clip'))
    const video = screen.getByRole('dialog').querySelector('video') as HTMLVideoElement
    video.currentTime = 8

    fireEvent.keyDown(document, { key: 'ArrowRight' })

    expect(screen.getByRole('dialog', { name: 'Third portrait' })).toBeInTheDocument()
    expect(pause).toHaveBeenCalled()
    expect(video.currentTime).toBe(0)
    expect(document.querySelector('video')).not.toBeInTheDocument()
    expect(window.location.search).toBe('?photo=three')
  })

  it('opens a video deep link through the existing photo query parameter', async () => {
    window.history.replaceState(null, '', '/?photo=clip')

    render(<PhotoLightboxGrid photos={MIXED_MEDIA} />)

    const dialog = await screen.findByRole('dialog', { name: 'Portrait clip' })
    expect(dialog.querySelector('video')).toHaveAttribute('src', '/clip.mp4')
  })

  it('opens a labelled modal from a focusable tile and pushes its URL state', () => {
    const pushState = vi.spyOn(window.history, 'pushState')
    renderGallery()

    fireEvent.click(tile('Second portrait'))

    const dialog = screen.getByRole('dialog', { name: 'Second portrait' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(within(dialog).getByAltText('Second portrait')).toHaveClass('object-contain')
    expect(pushState).toHaveBeenCalledWith(null, '', '/?photo=two')
    expect(screen.getByRole('button', { name: 'Close photo' })).toHaveFocus()
  })

  it('normalizes a valid initial photo URL into a base and photo history entry', async () => {
    window.history.replaceState(null, '', '/?lang=en&photo=three')
    const pushState = vi.spyOn(window.history, 'pushState')
    const replaceState = vi.spyOn(window.history, 'replaceState')

    renderGallery()

    expect(await screen.findByRole('dialog', { name: 'Third portrait' })).toBeInTheDocument()
    expect(replaceState).toHaveBeenCalledWith(null, '', '/?lang=en')
    expect(pushState).toHaveBeenCalledWith(null, '', '/?lang=en&photo=three')
  })

  it('removes an unknown photo parameter while preserving other query parameters', () => {
    window.history.replaceState(null, '', '/?lang=en&photo=missing')
    const replaceState = vi.spyOn(window.history, 'replaceState')

    renderGallery()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(window.location.pathname + window.location.search).toBe('/?lang=en')
    expect(replaceState).toHaveBeenCalledWith(null, '', '/?lang=en')
  })

  it('closes a direct-link lightbox with actual browser Back traversal', async () => {
    window.history.replaceState(null, '', '/?lang=en&photo=two')
    renderGallery()

    await screen.findByRole('dialog', { name: 'Second portrait' })
    window.history.back()

    await waitFor(() => {
      expect(window.location.pathname + window.location.search).toBe('/?lang=en')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('navigates in array order with keys, replaces URL state, and clamps at the edges', () => {
    const replaceState = vi.spyOn(window.history, 'replaceState')
    renderGallery()
    fireEvent.click(tile('Second portrait'))

    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(screen.getByRole('dialog', { name: 'Third portrait' })).toBeInTheDocument()
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/?photo=three')

    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(screen.getByRole('dialog', { name: 'Third portrait' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next photo' })).toBeDisabled()

    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    expect(screen.getByRole('dialog', { name: 'Second portrait' })).toBeInTheDocument()
  })

  it('navigates by horizontal swipe and clamps at both ends', () => {
    renderGallery()
    fireEvent.click(tile('First portrait'))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveClass('touch-pan-y')

    fireEvent.touchStart(dialog, { touches: [{ clientX: 250, clientY: 100 }] })
    fireEvent.touchEnd(dialog, { changedTouches: [{ clientX: 100, clientY: 105 }] })
    expect(screen.getByRole('dialog', { name: 'Second portrait' })).toBeInTheDocument()

    fireEvent.touchStart(dialog, { touches: [{ clientX: 100, clientY: 100 }] })
    fireEvent.touchEnd(dialog, { changedTouches: [{ clientX: 260, clientY: 105 }] })
    expect(screen.getByRole('dialog', { name: 'First portrait' })).toBeInTheDocument()

    fireEvent.touchStart(dialog, { touches: [{ clientX: 100, clientY: 100 }] })
    fireEvent.touchEnd(dialog, { changedTouches: [{ clientX: 260, clientY: 105 }] })
    expect(screen.getByRole('dialog', { name: 'First portrait' })).toBeInTheDocument()
  })

  it('does not dismiss on the synthesized backdrop click after a swipe', () => {
    renderGallery()
    fireEvent.click(tile('First portrait'))
    const dialog = screen.getByRole('dialog')

    fireEvent.touchStart(dialog, { touches: [{ clientX: 250, clientY: 100 }] })
    fireEvent.touchEnd(dialog, { changedTouches: [{ clientX: 100, clientY: 105 }] })
    fireEvent.click(dialog)

    expect(screen.getByRole('dialog', { name: 'Second portrait' })).not.toHaveAttribute(
      'data-close-pending'
    )
  })

  it('does not treat a gesture on a navigation control as a swipe', () => {
    renderGallery()
    fireEvent.click(tile('First portrait'))
    const next = screen.getByRole('button', { name: 'Next photo' })

    fireEvent.touchStart(next, { touches: [{ clientX: 250, clientY: 100 }] })
    fireEvent.touchEnd(next, { changedTouches: [{ clientX: 100, clientY: 105 }] })
    fireEvent.click(next)

    expect(screen.getByRole('dialog', { name: 'Second portrait' })).toBeInTheDocument()
  })

  it('reveals quiet desktop chevrons on mouse movement and navigates on click', () => {
    renderGallery()
    fireEvent.click(tile('Second portrait'))
    const dialog = screen.getByRole('dialog')
    const previous = screen.getByRole('button', { name: 'Previous photo' })

    expect(previous).toHaveClass('text-white/50', 'opacity-0')
    fireEvent.mouseMove(dialog)
    expect(previous).toHaveClass('opacity-100')

    fireEvent.click(previous)
    expect(screen.getByRole('dialog', { name: 'First portrait' })).toBeInTheDocument()
  })

  it('does not dismiss when a drag starts on the backdrop', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined)
    renderGallery()
    fireEvent.click(tile('Second portrait'))

    fireEvent.mouseDown(screen.getByRole('dialog'))

    expect(back).not.toHaveBeenCalled()
  })

  it.each([
    ['Escape', () => fireEvent.keyDown(document, { key: 'Escape' })],
    ['the backdrop', (dialog: HTMLElement) => fireEvent.click(dialog)],
    ['the close control', () => fireEvent.click(screen.getByRole('button', { name: 'Close photo' }))],
  ])('closes with %s, goes Back, and restores focus', async (_method, close) => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined)
    renderGallery()
    const opener = tile('Second portrait')
    fireEvent.click(opener)

    close(screen.getByRole('dialog'))

    expect(screen.getByRole('dialog')).toHaveAttribute('data-close-pending', 'true')
    expect(back).toHaveBeenCalledOnce()
    window.history.replaceState(null, '', '/')
    fireEvent.popState(window)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(opener).toHaveFocus())
  })

  it.each([
    ['Escape', () => fireEvent.keyDown(document, { key: 'Escape' })],
    ['the backdrop', (dialog: HTMLElement) => fireEvent.click(dialog)],
    ['the close control', () => fireEvent.click(screen.getByRole('button', { name: 'Close photo' }))],
  ])('uses Back for a direct-link dismissal with %s in Strict Mode', async (_method, close) => {
    window.history.replaceState(null, '', '/?photo=two')
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined)
    render(
      <StrictMode>
        <PhotoLightboxGrid photos={PHOTOS} />
      </StrictMode>
    )

    const dialog = await screen.findByRole('dialog', { name: 'Second portrait' })
    close(dialog)

    expect(back).toHaveBeenCalledOnce()
    expect(dialog).toHaveAttribute('data-close-pending', 'true')
  })

  it('keeps a reopened lightbox when a pending close traversal arrives', () => {
    vi.spyOn(window.history, 'back').mockImplementation(() => undefined)
    renderGallery()
    const opener = tile('Second portrait')
    fireEvent.click(opener)

    fireEvent.click(screen.getByRole('button', { name: 'Close photo' }))
    fireEvent.click(opener)

    window.history.replaceState(null, '', '/')
    fireEvent.popState(window)

    expect(window.location.pathname + window.location.search).toBe('/?photo=two')
    expect(screen.getByRole('dialog', { name: 'Second portrait' })).toBeInTheDocument()
  })

  it('completes one-press Back after navigation in both URL and dialog state', () => {
    vi.spyOn(window.history, 'back').mockImplementation(() => undefined)
    renderGallery()
    fireEvent.click(tile('First portrait'))
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(window.location.search).toBe('?photo=two')

    fireEvent.click(screen.getByRole('button', { name: 'Close photo' }))
    window.history.replaceState(null, '', '/')
    fireEvent.popState(window)

    expect(window.location.pathname + window.location.search).toBe('/')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes when browser Back removes photo state', () => {
    renderGallery()
    fireEvent.click(tile('Second portrait'))

    window.history.replaceState(null, '', '/')
    fireEvent.popState(window)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('traps Tab focus inside the open dialog', () => {
    const { container } = renderGallery()
    const opener = tile('Second portrait')
    fireEvent.click(opener)
    const close = screen.getByRole('button', { name: 'Close photo' })
    const next = screen.getByRole('button', { name: 'Next photo' })

    expect(container).toHaveAttribute('inert')
    expect(container).toHaveAttribute('aria-hidden', 'true')
    next.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(close).toHaveFocus()

    close.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(next).toHaveFocus()
  })

  it('isolates and restores every application sibling behind the portal', () => {
    const navigation = document.createElement('nav')
    const footer = document.createElement('footer')
    navigation.setAttribute('aria-hidden', 'false')
    document.body.append(navigation, footer)
    renderGallery()

    fireEvent.click(tile('First portrait'))
    expect(navigation).toHaveAttribute('inert')
    expect(navigation).toHaveAttribute('aria-hidden', 'true')
    expect(footer).toHaveAttribute('inert')
    expect(footer).toHaveAttribute('aria-hidden', 'true')

    window.history.replaceState(null, '', '/')
    fireEvent.popState(window)
    expect(navigation).not.toHaveAttribute('inert')
    expect(navigation).toHaveAttribute('aria-hidden', 'false')
    expect(footer).not.toHaveAttribute('aria-hidden')
    navigation.remove()
    footer.remove()
  })

  it('isolates body content mounted after the lightbox opens and restores it', async () => {
    renderGallery()
    fireEvent.click(tile('First portrait'))
    const latePortal = document.createElement('aside')

    document.body.append(latePortal)

    await waitFor(() => {
      expect(latePortal).toHaveAttribute('inert')
      expect(latePortal).toHaveAttribute('aria-hidden', 'true')
    })
    window.history.replaceState(null, '', '/')
    fireEvent.popState(window)
    expect(latePortal).not.toHaveAttribute('inert')
    expect(latePortal).not.toHaveAttribute('aria-hidden')
    latePortal.remove()
  })

  it('keeps natural forward Tab on the close control inside the dialog on mobile', () => {
    renderGallery()
    fireEvent.click(tile('Second portrait'))
    const close = screen.getByRole('button', { name: 'Close photo' })
    const nativeGetComputedStyle = window.getComputedStyle.bind(window)
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
      const style = nativeGetComputedStyle(element)
      if (element.classList.contains('hidden')) {
        Object.defineProperty(style, 'display', { value: 'none' })
      }
      return style
    })
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })

    close.focus()
    document.dispatchEvent(tab)

    expect(tab.defaultPrevented).toBe(true)
    expect(close).toHaveFocus()
  })
})
