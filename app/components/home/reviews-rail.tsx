'use client'

// The horizontal rail of short reviews under the large quote, with the hairline
// indicator beneath it: one segment per review, the ones in view drawn black.
// The rail scrolls natively (swipe, trackpad, shift-wheel) — no arrows and no
// autoplay, so the indicator only reports where the reader already is.

import { Children, useEffect, useRef, useState, type ReactNode } from 'react'

// Which reviews are in view, as [first, end). Every item has the same width, so
// the scroll width divided by the count is one item's stride (gap included).
export function visibleRange(
  scrollLeft: number,
  clientWidth: number,
  scrollWidth: number,
  count: number
): [number, number] {
  if (count === 0 || scrollWidth <= 0) return [0, 0]
  const stride = scrollWidth / count
  const shown = Math.max(1, Math.round(clientWidth / stride))
  const first = Math.min(Math.round(scrollLeft / stride), count - shown)
  return [Math.max(0, first), Math.min(count, Math.max(0, first) + shown)]
}

// `footer` sits on the indicator's row: beside it on a desktop, under it on a phone.
export function ReviewsRail({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  const items = Children.toArray(children)
  const count = items.length
  const rail = useRef<HTMLDivElement>(null)
  const [range, setRange] = useState<[number, number]>([0, 1])

  useEffect(() => {
    const node = rail.current
    if (!node) return
    const measure = () => setRange(visibleRange(node.scrollLeft, node.clientWidth, node.scrollWidth, count))
    measure()
    node.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      node.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [count])

  const [first, end] = range
  return (
    <>
      {/* The negative margin gives the hanging quotes room the scroll box would otherwise clip.
          Focusable so a keyboard can scroll it in browsers that do not make scrollers focusable. */}
      <div
        ref={rail}
        tabIndex={0}
        role="region"
        aria-label="Reviews"
        className="focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-black mt-14 md:mt-24 -ml-3 pl-3 grid grid-flow-col auto-cols-[78%] md:auto-cols-[calc((100%-72px)/4)] gap-5 md:gap-6 overflow-x-auto snap-x snap-mandatory scroll-pl-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items}
      </div>
      <div className="mt-7 md:mt-12 flex flex-col items-start gap-7 md:flex-row md:items-center md:justify-between">
        <div aria-hidden="true" className="flex gap-2 md:gap-2.5">
          {items.map((_, index) => (
            <span
              key={index}
              data-active={index >= first && index < end}
              className="h-px w-5 md:w-7 bg-gray-300 data-[active=true]:bg-black"
            />
          ))}
        </div>
        {footer}
      </div>
    </>
  )
}
