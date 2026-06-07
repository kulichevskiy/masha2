'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"

// Bottom-right floating CTA cluster. BOOK is the primary solid-black plate;
// GIFT CERTIFICATE is a quieter ghost-on-glass plate to its left, shown only
// when the gift page is visible (`giftVisible`, fetched server-side).
export function FloatingBookButton({ giftVisible = false }: { giftVisible?: boolean }) {
  const pathname = usePathname()
  // The /workshop page has its own Apply CTA — two competing fixed buttons would
  // drown each other. Hide the whole cluster there.
  if (pathname?.startsWith('/workshop')) return null

  // The gift plate is redundant on /gift itself; keep BOOK so visitors can still
  // book from there.
  const showGift = giftVisible && !pathname?.startsWith('/gift')

  return (
    <div className="fixed bottom-4 left-4 right-4 md:bottom-6 z-50 pointer-events-none">
      <div className="max-w-7xl mx-auto md:px-6 flex justify-end gap-3">
        {showGift && (
          <Link
            href="/gift"
            className="pointer-events-auto shrink md:shrink-0 px-4 md:px-10 py-3 font-bebas-neue text-xl tracking-wider uppercase bg-white/10 text-white border border-white/30 transition-all hover:bg-white/20 hover:border-white/60 md:hover:scale-105 shadow-[0_4px_20px_rgba(0,0,0,0.45)] text-center backdrop-blur-sm whitespace-nowrap"
          >
            Gift Certificate
          </Link>
        )}
        <Link
          href="/book"
          className="pointer-events-auto flex-1 md:flex-none md:w-auto bg-black/80 text-white px-12 md:px-20 py-3 font-bebas-neue text-xl tracking-wider uppercase border border-white/30 transition-all hover:bg-black hover:border-white/60 md:hover:scale-105 shadow-[0_4px_20px_rgba(0,0,0,0.45)] text-center backdrop-blur-sm"
        >
          Book
        </Link>
      </div>
    </div>
  )
}
