import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('<PhotoLightboxGrid />', () => {
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
    expect(video.currentTime).toBe(0)
    expect(video.muted).toBe(false)
    expect(window.location.search).toBe('?photo=clip')
  })

  it('navigates to adjacent media with an arrow key while the video is focused', () => {
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

  it('navigates to adjacent media with a swipe on the video surface', () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    render(<PhotoLightboxGrid photos={MIXED_MEDIA} />)
    fireEvent.click(tile('Portrait clip'))
    const dialog = screen.getByRole('dialog', { name: 'Portrait clip' })
    const video = dialog.querySelector('video') as HTMLVideoElement
    video.currentTime = 8
    vi.spyOn(video, 'getBoundingClientRect').mockReturnValue({ bottom: 600 } as DOMRect)

    fireEvent.touchStart(video, { touches: [{ clientX: 250, clientY: 100 }] })
    fireEvent.touchEnd(video, { changedTouches: [{ clientX: 100, clientY: 105 }] })

    expect(screen.getByRole('dialog', { name: 'Third portrait' })).toBeInTheDocument()
    expect(pause).toHaveBeenCalled()
    expect(video.currentTime).toBe(0)
    expect(window.location.search).toBe('?photo=three')
  })

  it('leaves touches in the native video control strip to the video', () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    render(<PhotoLightboxGrid photos={MIXED_MEDIA} />)
    fireEvent.click(tile('Portrait clip'))
    const dialog = screen.getByRole('dialog', { name: 'Portrait clip' })
    const video = dialog.querySelector('video') as HTMLVideoElement
    vi.spyOn(video, 'getBoundingClientRect').mockReturnValue({ bottom: 600 } as DOMRect)

    fireEvent.touchStart(video, { touches: [{ clientX: 250, clientY: 580 }] })
    fireEvent.touchEnd(video, { changedTouches: [{ clientX: 100, clientY: 585 }] })

    expect(screen.getByRole('dialog', { name: 'Portrait clip' })).toBeInTheDocument()
    expect(pause).not.toHaveBeenCalled()
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
