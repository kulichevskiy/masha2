/**
 * The parked video section (hidden from the home page since the video feed
 * went away). It stays tested so it can come back as it was: the label carries
 * the film's length, the square toggles play/pause, and without a film the
 * section is type over a dark frame with no control.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { DEFAULT_CONTENT } from '@/lib/home-story-content'
import { VideoSection } from './video-section'

const video = {
  id: 'film',
  src: '/poster.jpg',
  alt: 'Film',
  width: 1600,
  height: 900,
  videoSrc: '/film.mp4',
  durationSeconds: 75,
}

afterEach(cleanup)

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
})

describe('VideoSection', () => {
  it('labels the film with its length and toggles it from the square', () => {
    const { container, getByRole, getByText } = render(
      <VideoSection content={DEFAULT_CONTENT.video} video={video} />
    )
    expect(getByText(/^video ·/).textContent).toMatch(/1:15/)
    const film = container.querySelector('video')!
    let paused = true
    Object.defineProperty(film, 'paused', { get: () => paused })
    film.play = vi.fn(async () => {
      paused = false
      fireEvent.play(film)
    })
    film.pause = vi.fn(() => {
      paused = true
      fireEvent.pause(film)
    })

    fireEvent.click(getByRole('button', { name: 'Play the video' }))
    expect(film.play).toHaveBeenCalled()
    expect(getByRole('button', { name: 'Pause the video' })).toBeTruthy()

    fireEvent.click(getByRole('button', { name: 'Pause the video' }))
    expect(film.pause).toHaveBeenCalled()
    expect(getByRole('button', { name: 'Play the video' })).toBeTruthy()
  })

  it('renders the copy without a control when there is no film', () => {
    const { queryByRole, getByText } = render(<VideoSection content={DEFAULT_CONTENT.video} video={null} />)
    expect(getByText('video')).toBeTruthy()
    expect(queryByRole('button')).toBeNull()
  })
})
