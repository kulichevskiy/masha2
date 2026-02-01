import Link from "next/link"

export function FloatingBookButton() {
  return (
    <div className="fixed bottom-4 left-4 right-4 md:bottom-6 z-50 pointer-events-none">
      <div className="max-w-7xl mx-auto md:px-6 flex justify-end">
        <Link
          href="/book"
          className="pointer-events-auto w-full md:w-auto bg-black/80 text-white px-12 md:px-20 py-3 font-bebas-neue text-xl tracking-wider uppercase transition-all hover:bg-black md:hover:scale-105 shadow-[0_4px_20px_rgba(0,0,0,0.3)] text-center backdrop-blur-sm"
        >
          Book
        </Link>
      </div>
    </div>
  )
}
