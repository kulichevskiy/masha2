'use client'

import Image from 'next/image'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
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
const NATIVE_VIDEO_CONTROLS_HEIGHT = 48
const HOVER_PREVIEW_DELAY_MS = 200

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

function MosaicVideoPreview({ video }: { video: LightboxVideo }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const element = videoRef.current
    if (!element) return

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
  }, [])

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

function LightboxVideoPlayer({ video }: { video: LightboxVideo }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const element = videoRef.current
    if (!element) return

    element.currentTime = 0
    element.muted = false
    // Without a user activation (e.g. a ?photo= deep link) browsers reject
    // audible autoplay; leave the poster with controls up for a manual play.
    element.play()?.catch(() => undefined)

    return () => {
      element.pause()
      element.currentTime = 0
    }
  }, [video.id])

  return (
    <video
      ref={videoRef}
      src={video.videoSrc}
      poster={video.src}
      controls
      autoPlay
      playsInline
      preload="none"
      width={video.width}
      height={video.height}
      style={{ aspectRatio: `${video.width} / ${video.height}` }}
      className="h-auto max-h-[calc(100dvh-2rem)] w-auto max-w-[calc(100vw-2rem)] object-contain"
    />
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
  const openerRef = useRef<HTMLButtonElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const openedByPushRef = useRef(false)
  const pendingTraversalRef = useRef(false)
  const reopenedDuringTraversalRef = useRef(false)
  const selectedIndexRef = useRef<number | null>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const consumedSwipeRef = useRef(false)
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoverPreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialUrlSyncedRef = useRef(false)
  const [hoverPreviewId, setHoverPreviewId] = useState<string | null>(null)
  const isOpen = selectedIndex !== null

  const stopHoverPreview = useCallback(() => {
    if (hoverPreviewTimerRef.current) {
      clearTimeout(hoverPreviewTimerRef.current)
      hoverPreviewTimerRef.current = null
    }
    setHoverPreviewId(null)
  }, [])

  const armHoverPreview = useCallback((id: string) => {
    stopHoverPreview()
    if (!canPlayHoverPreview()) return

    hoverPreviewTimerRef.current = setTimeout(() => {
      hoverPreviewTimerRef.current = null
      setHoverPreviewId(id)
    }, HOVER_PREVIEW_DELAY_MS)
  }, [stopHoverPreview])

  const indexFromUrl = useCallback(() => {
    const id = new URL(window.location.href).searchParams.get('photo')
    const index = photos.findIndex((photo) => photo.id === id)
    return index >= 0 ? index : null
  }, [photos])

  const open = useCallback((index: number, opener: HTMLButtonElement) => {
    stopHoverPreview()
    openerRef.current = opener
    openedByPushRef.current = true
    if (pendingTraversalRef.current) reopenedDuringTraversalRef.current = true
    setClosePending(false)
    selectedIndexRef.current = index
    setSelectedIndex(index)
    window.history.pushState(null, '', photoUrl(photos[index].id))
  }, [photos, stopHoverPreview])

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

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        navigate(event.key === 'ArrowLeft' ? -1 : 1)
        return
      }

      if (event.key !== 'Tab') return

      const dialog = closeButtonRef.current?.closest('[role="dialog"]')
      const focusable = Array.from(
        dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), video[controls]') ?? []
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
  }, [close, isOpen, navigate])

  useEffect(() => () => {
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    if (hoverPreviewTimerRef.current) clearTimeout(hoverPreviewTimerRef.current)
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
    if (target?.closest('button, a, input, select, textarea')) {
      touchStartRef.current = null
      return
    }

    const video = target?.closest('video[controls]')
    if (video) {
      const bounds = video.getBoundingClientRect()
      const controlsTop = bounds.bottom - NATIVE_VIDEO_CONTROLS_HEIGHT
      if (touch.clientY >= controlsTop && touch.clientY <= bounds.bottom) {
        touchStartRef.current = null
        return
      }
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
      <div className={columnsClassName} inert={isOpen ? true : undefined}>
        {photos.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-haspopup="dialog"
            aria-label={`Open ${item.alt}`}
            onClick={(event) => open(index, event.currentTarget)}
            onMouseEnter={isVideo(item) ? () => armHoverPreview(item.id) : undefined}
            onMouseLeave={isVideo(item) ? stopHoverPreview : undefined}
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
            {isVideo(item) && hoverPreviewId === item.id ? (
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
            <LightboxVideoPlayer key={photo.id} video={photo} />
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
