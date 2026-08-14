'use client'

import Image from 'next/image'
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type TouchEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { PHOTO_IMAGE_QUALITY } from '@/lib/image-config'

type LightboxImage = {
  id: string
  src: string
  alt: string
  width: number
  height: number
  kind?: 'photo'
}

type LightboxVideo = {
  id: string
  kind: 'video'
  src: string
  videoSrc: string
  alt: string
  width: number
  height: number
  durationSeconds: number
}

export type LightboxPhoto = LightboxImage | LightboxVideo

type PhotoLightboxGridProps = {
  photos: LightboxPhoto[]
  columnsClassName?: string
}

const DEFAULT_COLUMNS = 'columns-1 md:columns-2 lg:columns-3 gap-4'
const SWIPE_DISTANCE = 50
const HOVER_PREVIEW_DELAY_MS = 200
const VIDEO_CONTROLS_IDLE_MS = 2000
const TOUCH_PREVIEW_DELAY_MS = 500

function isVideo(item: LightboxPhoto): item is LightboxVideo {
  return item.kind === 'video'
}

function formatDuration(durationSeconds: number) {
  const seconds = Math.max(0, Math.round(durationSeconds))
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

function canPlayHoverPreview() {
  return window.matchMedia('(hover: hover)').matches
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function canPlayTouchPreview() {
  return (navigator.maxTouchPoints > 0 || window.matchMedia('(any-pointer: coarse)').matches)
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function MosaicVideoPreview({ video }: { video: LightboxVideo }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const element = videoRef.current
    if (!element) return

    // Strict Mode replays setup after cleanup, so restore the source that the
    // cleanup removes before starting playback again.
    element.setAttribute('src', video.videoSrc)
    // Keep this assignment next to play() as a second line of defence against
    // audio, even if the JSX attributes are changed later.
    element.muted = true
    element.defaultMuted = true
    element.currentTime = 0
    element.play()?.catch(() => undefined)

    return () => {
      element.pause()
      element.currentTime = 0
      element.removeAttribute('src')
    }
  }, [video.videoSrc])

  return (
    <video
      ref={videoRef}
      src={video.videoSrc}
      poster={video.src}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      tabIndex={-1}
      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
    />
  )
}

function formatPlaybackTime(currentTime: number) {
  const seconds = Math.max(0, Math.floor(currentTime))
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

type LightboxVideoPlayerProps = {
  video: LightboxVideo
  muted: boolean
  onMutedChange: (muted: boolean) => void
  videoRef: React.RefObject<HTMLVideoElement | null>
  togglePlaybackRef: React.RefObject<(() => void) | null>
}

function LightboxVideoPlayer({
  video,
  muted,
  onMutedChange,
  videoRef,
  togglePlaybackRef,
}: LightboxVideoPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null)
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(video.durationSeconds)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const revealControls = useCallback(() => {
    setControlsVisible(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(
      () => setControlsVisible(false),
      VIDEO_CONTROLS_IDLE_MS
    )
  }, [])

  useEffect(() => {
    const element = videoRef.current
    if (!element) return

    element.currentTime = 0
    // Without a user activation (e.g. a ?photo= deep link) browsers reject
    // audible autoplay; leave the poster with our controls up for a manual play.
    element.play()?.catch(() => setIsPlaying(false))

    return () => {
      element.pause()
      element.currentTime = 0
    }
  }, [video.id, videoRef])

  useEffect(() => {
    const element = videoRef.current
    if (element) element.muted = muted
  }, [muted, video.id, videoRef])

  useEffect(() => {
    controlsTimerRef.current = setTimeout(
      () => setControlsVisible(false),
      VIDEO_CONTROLS_IDLE_MS
    )
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    }
  }, [])

  const togglePlayback = useCallback(() => {
    const element = videoRef.current
    if (!element) return

    if (isPlaying) {
      element.pause()
      setIsPlaying(false)
    } else {
      setIsPlaying(true)
      element.play()?.catch(() => setIsPlaying(false))
    }
    revealControls()
  }, [isPlaying, revealControls, videoRef])

  useEffect(() => {
    togglePlaybackRef.current = togglePlayback
    return () => {
      togglePlaybackRef.current = null
    }
  }, [togglePlayback, togglePlaybackRef])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === playerRef.current)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const syncDuration = () => {
    const mediaDuration = videoRef.current?.duration
    setDuration(
      mediaDuration && Number.isFinite(mediaDuration) ? mediaDuration : video.durationSeconds
    )
  }

  const seek = (nextTime: number) => {
    const element = videoRef.current
    if (!element) return
    element.currentTime = nextTime
    setCurrentTime(nextTime)
  }

  const toggleMuted = () => {
    const nextMuted = !muted
    if (videoRef.current) videoRef.current.muted = nextMuted
    onMutedChange(nextMuted)
    revealControls()
  }

  const toggleFullscreen = () => {
    const player = playerRef.current
    const element = videoRef.current
    if (!player || !element) return
    const enterIosFullscreen = () => {
      // iPhone Safari hands fullscreen video off to the system player.
      const iosVideo = element as HTMLVideoElement & { webkitEnterFullscreen?: () => void }
      iosVideo.webkitEnterFullscreen?.()
    }

    if (document.fullscreenElement === player) {
      document.exitFullscreen?.().catch(() => undefined)
    } else if (player.requestFullscreen) {
      player.requestFullscreen().catch(enterIosFullscreen)
    } else {
      enterIosFullscreen()
    }
    revealControls()
  }

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0

  return (
    <div
      ref={playerRef}
      onMouseMove={revealControls}
      onTouchStart={revealControls}
      className="relative flex max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] items-center justify-center"
    >
      <video
        ref={videoRef}
        src={video.videoSrc}
        poster={video.src}
        autoPlay
        playsInline
        preload="none"
        width={video.width}
        height={video.height}
        muted={muted}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={syncDuration}
        onDurationChange={syncDuration}
        style={{ aspectRatio: `${video.width} / ${video.height}` }}
        className="block h-auto max-h-[calc(100dvh-2rem)] w-auto max-w-[calc(100vw-2rem)] object-contain"
      />

      <div
        role="toolbar"
        aria-label="Video controls"
        className={`absolute inset-x-0 bottom-0 flex items-center gap-2 p-3 text-white transition-opacity focus-within:pointer-events-auto focus-within:opacity-100 ${controlsVisible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <button
          type="button"
          aria-label={muted ? 'Unmute video' : 'Mute video'}
          onClick={toggleMuted}
          className="flex size-9 shrink-0 items-center justify-center rounded-none border-0 bg-transparent p-0 text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-white"
        >
          {muted ? (
            <VolumeX aria-hidden="true" strokeWidth={1.5} className="size-5" />
          ) : (
            <Volume2 aria-hidden="true" strokeWidth={1.5} className="size-5" />
          )}
        </button>
        <button
          type="button"
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
          onClick={togglePlayback}
          className="flex size-9 shrink-0 items-center justify-center rounded-none border-0 bg-transparent p-0 text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-white"
        >
          {isPlaying ? (
            <Pause aria-hidden="true" strokeWidth={1.5} className="size-5" />
          ) : (
            <Play aria-hidden="true" strokeWidth={1.5} className="size-5" />
          )}
        </button>
        <div className="relative flex h-6 min-w-12 flex-1 items-center">
          <span aria-hidden="true" className="absolute h-px w-full bg-white/40" />
          <span
            aria-hidden="true"
            className="absolute h-px bg-white"
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            aria-label="Video progress"
            aria-valuetext={`${formatPlaybackTime(currentTime)} of ${formatDuration(duration)}`}
            min="0"
            max={duration || 0}
            step="0.01"
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => seek(Number(event.currentTarget.value))}
            className="lightbox-video-progress absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-none bg-transparent"
          />
        </div>
        <span className="shrink-0 font-roboto-mono text-xs tabular-nums text-white">
          {formatPlaybackTime(currentTime)} / {formatDuration(duration)}
        </span>
        <button
          type="button"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          onClick={toggleFullscreen}
          className="flex size-9 shrink-0 items-center justify-center rounded-none border-0 bg-transparent p-0 text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-white"
        >
          {isFullscreen ? (
            <Minimize aria-hidden="true" strokeWidth={1.5} className="size-5" />
          ) : (
            <Maximize aria-hidden="true" strokeWidth={1.5} className="size-5" />
          )}
        </button>
      </div>
    </div>
  )
}

function photoUrl(id: string | null) {
  const url = new URL(window.location.href)

  if (id) {
    url.searchParams.set('photo', id)
  } else {
    url.searchParams.delete('photo')
  }

  return `${url.pathname}${url.search}${url.hash}`
}

export function PhotoLightboxGrid({
  photos,
  columnsClassName = DEFAULT_COLUMNS,
}: PhotoLightboxGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [controlsVisible, setControlsVisible] = useState(false)
  const [closePending, setClosePending] = useState(false)
  const [videoMuted, setVideoMuted] = useState(false)
  const openerRef = useRef<HTMLButtonElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const openedByPushRef = useRef(false)
  const pendingTraversalRef = useRef(false)
  const reopenedDuringTraversalRef = useRef(false)
  const selectedIndexRef = useRef<number | null>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const consumedSwipeRef = useRef(false)
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const toggleVideoPlaybackRef = useRef<(() => void) | null>(null)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mosaicRef = useRef<HTMLDivElement | null>(null)
  const touchCandidateRef = useRef<string | null>(null)
  const initialUrlSyncedRef = useRef(false)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [hasTouch, setHasTouch] = useState<boolean | null>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean | null>(null)
  const [viewportHeight, setViewportHeight] = useState(0)
  const isOpen = selectedIndex !== null

  const stopPreview = useCallback(() => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current)
      previewTimerRef.current = null
    }
    setPreviewId(null)
  }, [])

  const armPreview = useCallback((
    id: string,
    delay: number,
    canPlay: () => boolean,
  ) => {
    stopPreview()
    if (!canPlay()) return

    previewTimerRef.current = setTimeout(() => {
      previewTimerRef.current = null
      if (!canPlay()) return
      setPreviewId(id)
    }, delay)
  }, [stopPreview])

  const armHoverPreview = useCallback((id: string) => {
    armPreview(id, HOVER_PREVIEW_DELAY_MS, canPlayHoverPreview)
  }, [armPreview])

  useEffect(() => {
    const hoverQuery = window.matchMedia('(hover: hover)')
    const touchQuery = window.matchMedia('(any-pointer: coarse)')
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const syncPreviewPreferences = () => {
      touchCandidateRef.current = null
      stopPreview()
      setHasTouch(navigator.maxTouchPoints > 0 || touchQuery.matches)
      setPrefersReducedMotion(reducedMotionQuery.matches)
    }
    const syncViewportHeight = () => setViewportHeight(window.innerHeight)

    syncPreviewPreferences()
    syncViewportHeight()
    hoverQuery.addEventListener('change', syncPreviewPreferences)
    touchQuery.addEventListener('change', syncPreviewPreferences)
    reducedMotionQuery.addEventListener('change', syncPreviewPreferences)
    window.addEventListener('resize', syncViewportHeight)

    return () => {
      hoverQuery.removeEventListener('change', syncPreviewPreferences)
      touchQuery.removeEventListener('change', syncPreviewPreferences)
      reducedMotionQuery.removeEventListener('change', syncPreviewPreferences)
      window.removeEventListener('resize', syncViewportHeight)
    }
  }, [stopPreview])

  useEffect(() => {
    const mosaic = mosaicRef.current
    if (!mosaic || hasTouch !== true || prefersReducedMotion !== false || isOpen || !viewportHeight) return
    if (typeof IntersectionObserver === 'undefined') return

    const centeredVideos = new Set<Element>()
    const reevaluateCandidate = (resetTimer = false) => {
      let nextElement: Element | null = null
      let nextDistance = Number.POSITIVE_INFINITY
      const viewportCenter = window.innerHeight / 2

      for (const element of centeredVideos) {
        const bounds = element.getBoundingClientRect()
        const distance = Math.abs(bounds.top + bounds.height / 2 - viewportCenter)
        if (distance < nextDistance) {
          nextElement = element
          nextDistance = distance
        }
      }

      const nextId = nextElement?.getAttribute('data-mosaic-video-id') ?? null
      if (!resetTimer && nextId === touchCandidateRef.current) return

      touchCandidateRef.current = nextId
      stopPreview()
      if (nextId && canPlayTouchPreview()) {
        armPreview(nextId, TOUCH_PREVIEW_DELAY_MS, canPlayTouchPreview)
      }
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) centeredVideos.add(entry.target)
        else centeredVideos.delete(entry.target)
      }
      reevaluateCandidate()
    }, {
      rootMargin: `${-viewportHeight * 0.45}px 0px ${-viewportHeight * 0.45}px 0px`,
      threshold: 0,
    })

    const videos = mosaic.querySelectorAll('[data-mosaic-video-id]')
    videos.forEach((video) => observer.observe(video))
    const onScroll = () => reevaluateCandidate(true)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      observer.disconnect()
      touchCandidateRef.current = null
      centeredVideos.clear()
      stopPreview()
    }
  }, [armPreview, hasTouch, isOpen, photos, prefersReducedMotion, stopPreview, viewportHeight])

  const indexFromUrl = useCallback(() => {
    const id = new URL(window.location.href).searchParams.get('photo')
    const index = photos.findIndex((photo) => photo.id === id)
    return index >= 0 ? index : null
  }, [photos])

  const open = useCallback((index: number, opener: HTMLButtonElement) => {
    touchCandidateRef.current = null
    stopPreview()
    openerRef.current = opener
    openedByPushRef.current = true
    if (pendingTraversalRef.current) reopenedDuringTraversalRef.current = true
    setClosePending(false)
    selectedIndexRef.current = index
    setSelectedIndex(index)
    window.history.pushState(null, '', photoUrl(photos[index].id))
  }, [photos, stopPreview])

  const close = useCallback(() => {
    if (openedByPushRef.current) {
      if (pendingTraversalRef.current) return
      pendingTraversalRef.current = true
      setClosePending(true)
      window.history.back()
      return
    }

    window.history.replaceState(null, '', photoUrl(null))
    selectedIndexRef.current = null
    setSelectedIndex(null)
  }, [])

  const navigate = useCallback((direction: -1 | 1) => {
    setSelectedIndex((current) => {
      if (current === null) return current

      const next = Math.max(0, Math.min(photos.length - 1, current + direction))
      if (next === current) return current

      window.history.replaceState(null, '', photoUrl(photos[next].id))
      selectedIndexRef.current = next
      return next
    })
  }, [photos])

  useEffect(() => {
    const syncFromUrl = (fromPopState = false) => {
      if (pendingTraversalRef.current) {
        pendingTraversalRef.current = false
        setClosePending(false)

        if (reopenedDuringTraversalRef.current) {
          reopenedDuringTraversalRef.current = false
          const current = selectedIndexRef.current
          if (current !== null) {
            window.history.replaceState(null, '', photoUrl(photos[current].id))
          }
          return
        }
      }

      if (fromPopState) openedByPushRef.current = false
      const index = indexFromUrl()

      if (index === null) {
        const url = new URL(window.location.href)
        if (url.searchParams.has('photo')) {
          window.history.replaceState(window.history.state, '', photoUrl(null))
        }
      } else if (!initialUrlSyncedRef.current) {
        const currentUrl = photoUrl(photos[index].id)
        window.history.replaceState(window.history.state, '', photoUrl(null))
        window.history.pushState(window.history.state, '', currentUrl)
        openedByPushRef.current = true
      }

      initialUrlSyncedRef.current = true
      selectedIndexRef.current = index
      setSelectedIndex(index)
    }

    syncFromUrl()
    const onPopState = () => syncFromUrl(true)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [indexFromUrl, photos])

  useEffect(() => {
    if (!isOpen) return

    const previous = new Map<HTMLElement, { inert: boolean; ariaHidden: string | null }>()
    const isolate = (element: HTMLElement) => {
      if (element.hasAttribute('data-photo-lightbox-root') || previous.has(element)) return
      previous.set(element, {
        inert: element.hasAttribute('inert'),
        ariaHidden: element.getAttribute('aria-hidden'),
      })
      element.setAttribute('inert', '')
      element.setAttribute('aria-hidden', 'true')
    }

    for (const element of document.body.children) {
      if (element instanceof HTMLElement) isolate(element)
    }

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof HTMLElement) isolate(node)
        }
      }
    })
    observer.observe(document.body, { childList: true })

    return () => {
      observer.disconnect()
      for (const [element, { inert, ariaHidden }] of previous) {
        if (!inert) element.removeAttribute('inert')
        if (ariaHidden === null) element.removeAttribute('aria-hidden')
        else element.setAttribute('aria-hidden', ariaHidden)
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      openerRef.current?.focus()
      openerRef.current = null
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }

      const current = selectedIndexRef.current
      const currentItem = current === null ? null : photos[current]
      const activeVideo = currentItem && isVideo(currentItem) ? videoRef.current : null
      if (activeVideo && (event.key === ' ' || event.code === 'Space')) {
        const target = event.target instanceof Element ? event.target : null
        if (target?.closest('[role="toolbar"] button')) return
        event.preventDefault()
        toggleVideoPlaybackRef.current?.()
        return
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        if (activeVideo && currentItem && isVideo(currentItem)) {
          // Video owns keyboard arrows; chevrons and swipes still navigate items.
          const mediaDuration = activeVideo.duration
          const duration = Number.isFinite(mediaDuration)
            ? mediaDuration
            : currentItem.durationSeconds
          const delta = event.key === 'ArrowLeft' ? -5 : 5
          activeVideo.currentTime = Math.max(
            0,
            Math.min(duration, activeVideo.currentTime + delta)
          )
          return
        }
        navigate(event.key === 'ArrowLeft' ? -1 : 1)
        return
      }

      if (event.key !== 'Tab') return

      const dialog = closeButtonRef.current?.closest('[role="dialog"]')
      const focusable = Array.from(
        dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])') ?? []
      ).filter((element) => {
        const style = window.getComputedStyle(element)
        return style.display !== 'none' && style.visibility !== 'hidden'
      })
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      } else if (!dialog?.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [close, isOpen, navigate, photos])

  useEffect(() => () => {
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
  }, [])

  const revealControls = () => {
    setControlsVisible(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 1600)
  }

  const onBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (consumedSwipeRef.current) {
      consumedSwipeRef.current = false
      return
    }
    if (event.target === event.currentTarget) close()
  }

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    consumedSwipeRef.current = false
    const touch = event.touches[0]
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest('[role="toolbar"], button, a, input, select, textarea')) {
      touchStartRef.current = null
      return
    }

    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current
    const touch = event.changedTouches[0]
    touchStartRef.current = null
    if (!start || !touch) return

    const horizontal = touch.clientX - start.x
    const vertical = touch.clientY - start.y
    if (Math.abs(horizontal) < SWIPE_DISTANCE || Math.abs(horizontal) <= Math.abs(vertical)) return

    consumedSwipeRef.current = true
    navigate(horizontal < 0 ? 1 : -1)
  }

  const photo = selectedIndex === null ? null : photos[selectedIndex]

  return (
    <div className="w-full">
      <div ref={mosaicRef} className={columnsClassName} inert={isOpen ? true : undefined}>
        {photos.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-haspopup="dialog"
            aria-label={`Open ${item.alt}`}
            onClick={(event) => open(index, event.currentTarget)}
            onMouseEnter={isVideo(item) ? () => armHoverPreview(item.id) : undefined}
            onMouseLeave={isVideo(item) ? stopPreview : undefined}
            data-mosaic-video-id={isVideo(item) ? item.id : undefined}
            className="group relative mb-4 block w-full cursor-zoom-in break-inside-avoid overflow-hidden border-0 bg-gray-100 p-0 text-left"
          >
            <Image
              src={item.src}
              alt={item.alt}
              width={item.width}
              height={item.height}
              quality={PHOTO_IMAGE_QUALITY}
              className="block h-auto w-full transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            {isVideo(item) && previewId === item.id ? (
              <MosaicVideoPreview video={item} />
            ) : null}
            {isVideo(item) ? (
              <span
                className="pointer-events-none absolute bottom-2 right-2 z-10 font-roboto-mono text-xs text-white/70"
                style={{ textShadow: '0 1px 3px rgb(0 0 0 / 0.65)' }}
              >
                {formatDuration(item.durationSeconds)}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {photo && selectedIndex !== null ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={photo.alt}
          onClick={onBackdropClick}
          onMouseMove={revealControls}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="fixed inset-0 z-[100] flex touch-pan-y items-center justify-center bg-black p-4"
          data-close-pending={closePending || undefined}
          data-photo-lightbox-root=""
        >
          {isVideo(photo) ? (
            <LightboxVideoPlayer
              key={photo.id}
              video={photo}
              muted={videoMuted}
              onMutedChange={setVideoMuted}
              videoRef={videoRef}
              togglePlaybackRef={toggleVideoPlaybackRef}
            />
          ) : (
            <Image
              src={photo.src}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              quality={PHOTO_IMAGE_QUALITY}
              priority
              className="h-auto max-h-[calc(100dvh-2rem)] w-auto max-w-[calc(100vw-2rem)] object-contain"
              sizes="100vw"
            />
          )}

          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close photo"
            onClick={close}
            className="absolute right-4 top-4 flex size-11 items-center justify-center border-0 bg-transparent text-white/70 transition-opacity hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-white"
          >
            <X aria-hidden="true" strokeWidth={1} className="size-8" />
          </button>

          <button
            type="button"
            aria-label="Previous photo"
            disabled={selectedIndex === 0}
            onClick={() => navigate(-1)}
            className={`absolute left-4 hidden size-12 items-center justify-center border-0 bg-transparent text-white/50 transition-opacity md:flex ${controlsVisible ? 'opacity-100' : 'opacity-0'} disabled:pointer-events-none disabled:opacity-0 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-white`}
          >
            <ChevronLeft aria-hidden="true" strokeWidth={1} className="size-10" />
          </button>

          <button
            type="button"
            aria-label="Next photo"
            disabled={selectedIndex === photos.length - 1}
            onClick={() => navigate(1)}
            className={`absolute right-4 hidden size-12 items-center justify-center border-0 bg-transparent text-white/50 transition-opacity md:flex ${controlsVisible ? 'opacity-100' : 'opacity-0'} disabled:pointer-events-none disabled:opacity-0 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-white`}
          >
            <ChevronRight aria-hidden="true" strokeWidth={1} className="size-10" />
          </button>
        </div>,
        document.body
      ) : null}
    </div>
  )
}
