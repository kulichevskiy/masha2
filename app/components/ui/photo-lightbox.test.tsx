import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

function renderGallery() {
  return render(<PhotoLightboxGrid photos={PHOTOS} />)
}

function tile(name: string) {
  return screen.getByRole('button', { name: `Open ${name}` })
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('<PhotoLightboxGrid />', () => {
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

  it('opens a valid photo from the initial URL without pushing another entry', async () => {
    window.history.replaceState(null, '', '/?photo=three')
    const pushState = vi.spyOn(window.history, 'pushState')

    renderGallery()

    expect(await screen.findByRole('dialog', { name: 'Third portrait' })).toBeInTheDocument()
    expect(pushState).not.toHaveBeenCalled()
  })

  it('removes a direct-link photo parameter when the close control is used', async () => {
    window.history.replaceState(null, '', '/?lang=en&photo=two')
    const back = vi.spyOn(window.history, 'back')
    renderGallery()

    await screen.findByRole('dialog', { name: 'Second portrait' })
    fireEvent.click(screen.getByRole('button', { name: 'Close photo' }))

    expect(window.location.pathname + window.location.search).toBe('/?lang=en')
    expect(back).not.toHaveBeenCalled()
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

  it.each([
    ['Escape', () => fireEvent.keyDown(document, { key: 'Escape' })],
    ['the backdrop', (dialog: HTMLElement) => fireEvent.mouseDown(dialog)],
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
