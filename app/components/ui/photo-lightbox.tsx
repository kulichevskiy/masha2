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
import { PHOTO_IMAGE_QUALITY } from '@/lib/image-config'

export type LightboxPhoto = {
  id: string
  src: string
  alt: string
  width: number
  height: number
}

type PhotoLightboxGridProps = {
  photos: LightboxPhoto[]
  columnsClassName?: string
}

const DEFAULT_COLUMNS = 'columns-1 md:columns-2 lg:columns-3 gap-4'
const SWIPE_DISTANCE = 50

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
  const openerRef = useRef<HTMLButtonElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const openedByPushRef = useRef(false)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isOpen = selectedIndex !== null

  const indexFromUrl = useCallback(() => {
    const id = new URL(window.location.href).searchParams.get('photo')
    const index = photos.findIndex((photo) => photo.id === id)
    return index >= 0 ? index : null
  }, [photos])

  const open = useCallback((index: number, opener: HTMLButtonElement) => {
    openerRef.current = opener
    openedByPushRef.current = true
    setSelectedIndex(index)
    window.history.pushState(null, '', photoUrl(photos[index].id))
  }, [photos])

  const close = useCallback(() => {
    setSelectedIndex(null)

    if (openedByPushRef.current) {
      openedByPushRef.current = false
      window.history.back()
      return
    }

    window.history.replaceState(null, '', photoUrl(null))
  }, [])

  const navigate = useCallback((direction: -1 | 1) => {
    setSelectedIndex((current) => {
      if (current === null) return current

      const next = Math.max(0, Math.min(photos.length - 1, current + direction))
      if (next === current) return current

      window.history.replaceState(null, '', photoUrl(photos[next].id))
      return next
    })
  }, [photos])

  useEffect(() => {
    const syncFromUrl = () => {
      openedByPushRef.current = false
      setSelectedIndex(indexFromUrl())
    }

    syncFromUrl()
    window.addEventListener('popstate', syncFromUrl)
    return () => window.removeEventListener('popstate', syncFromUrl)
  }, [indexFromUrl])

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
        dialog?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? []
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
  }, [])

  const revealControls = () => {
    setControlsVisible(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 1600)
  }

  const onBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) close()
  }

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (
      event.target instanceof Element &&
      event.target.closest('button, a, input, select, textarea')
    ) {
      touchStartRef.current = null
      return
    }

    const touch = event.touches[0]
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
          </button>
        ))}
      </div>

      {photo && selectedIndex !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={photo.alt}
          onMouseDown={onBackdropMouseDown}
          onMouseMove={revealControls}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4"
        >
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
        </div>
      ) : null}
    </div>
  )
}
