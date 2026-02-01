import Link from "next/link"

export function TopNav() {
  return (
    <nav className="bg-white/50 backdrop-blur-md w-full">
      <div className="mx-auto max-w-7xl px-4 md:px-6 flex items-center justify-center pt-6 md:pt-8">
        <div className="flex flex-col items-center w-full gap-3">
          {/* Logo and Title Section */}
          <div className="flex flex-col items-center text-center">
            <Link
              href="/"
              className="text-3xl md:text-4xl lg:text-5xl font-bebas-neue font-normal tracking-tight text-black transition-opacity hover:opacity-70 uppercase"
            >
              Maria Chevskaya
            </Link>
            <p className="text-s md:text-m font-inter font-normal text-gray-500 text-center tracking-wider md:tracking-widest lowercase mt-0 md:mt-0 leading-relaxed">Portrait and editorial photographer</p>
          </div>
        </div>
      </div>
    </nav>
  )
}

