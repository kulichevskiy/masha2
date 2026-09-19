'use client'

import { useEffect, useRef, useState } from 'react'
import { Arrow, Bleed, Display, Label, Lines, Paragraphs } from './story-ui'
import { formatVideoDuration, type HomeVideoFrame } from '@/lib/home-story-photos'
import type { StorySection } from '@/lib/home-story-content'

// ── 5 · video ─────────────────────────────────────────────────
// The film plays where it sits: press the frame in the middle and it starts,
// muted and looping, behind the type; press it again and it holds. No native
// controls, no chrome — the square is the whole interface. The file is only
// fetched on the first play (`preload="none"`), so the poster carries the
// section until someone asks for the video.
//
// On a phone there is nothing to press for — the film runs by itself while the
// section crosses the middle of the window and holds as soon as it leaves.

function PlayIcon() {
  return <span className="ml-[5px] block h-0 w-0 border-y-[10px] border-y-transparent border-l-[17px] border-l-white" />
}

function PauseIcon() {
  return (
    <span className="flex gap-1.5 md:gap-2">
      <span className="block h-5 w-[5px] md:h-7 md:w-[6px] bg-white" />
      <span className="block h-5 w-[5px] md:h-7 md:w-[6px] bg-white" />
    </span>
  )
}

export function VideoSection({ content, video }: { content: StorySection; video: HomeVideoFrame | null }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  // Once the film has started, the paused frame stays on screen instead of
  // snapping back to the poster.
  const [started, setStarted] = useState(false)
  // A press while the section is centred beats the scroll — the film stays as
  // the reader left it until the section scrolls away again.
  const pressed = useRef(false)
  const [scrollDriven, setScrollDriven] = useState(false)

  function toggle() {
    const element = ref.current
    if (!element) return
    pressed.current = true
    if (element.paused) {
      setStarted(true)
      void element.play()
    } else {
      element.pause()
    }
  }

  // Phones only, and only for readers who accept motion.
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px) and (prefers-reduced-motion: no-preference)')
    const update = () => setScrollDriven(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const element = ref.current
    if (!element || !scrollDriven) return

    // Shrinking the root to the middle line of the window makes "intersecting"
    // mean "this section covers the centre of the screen".
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (pressed.current) return
          setStarted(true)
          void element.play()
        } else {
          pressed.current = false
          element.pause()
        }
      },
      { rootMargin: '-50% 0px -50% 0px' }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [scrollDriven])

  return (
    <Bleed
      frame={video}
      height="h-[640px] md:h-[820px]"
      position="center 30%"
      media={
        video && (
          <video
            ref={ref}
            src={video.videoSrc}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
            tabIndex={-1}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
              started ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )
      }
      controls={
        video && (
          // On a phone the scroll drives the film, so the square would only
          // sit in the middle of the headline for nothing.
          <div className="absolute inset-0 hidden md:flex items-center justify-center">
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? 'Pause the video' : 'Play the video'}
              className="pointer-events-auto flex h-16 w-16 md:h-[88px] md:w-[88px] items-center justify-center border border-white/75 transition-opacity hover:opacity-70"
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
          </div>
        )
      }
    >
      {/* The label is the film's own length, so it stays out of the admin. */}
      <Label tone="frame">{video ? `video · ${formatVideoDuration(video.durationSeconds)}` : 'video'}</Label>
      <Display tone="frame" size="bleed">
        <Lines text={content.heading} />
      </Display>
      <Paragraphs text={content.body} tone="frame" className="mt-5 md:mt-6" />
      <div className="mt-7 md:mt-8">
        <Arrow href="/video">{content.link}</Arrow>
      </div>
    </Bleed>
  )
}
