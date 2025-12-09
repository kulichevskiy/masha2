import Link from "next/link"
import { Instagram, Mail } from "lucide-react"

export function TopNav() {
  return (
    <nav className="bg-white/50 backdrop-blur-md w-full">
      <div className="mx-auto max-w-7xl px-4 md:px-6 flex items-center justify-center py-6">
        <div className="flex flex-col items-center w-full gap-4">
          {/* Logo and Title Section */}
          <div className="flex flex-col items-center text-center">
            <Link
              href="/"
              className="text-3xl font-playfair-display font-medium tracking-tight text-black transition-opacity hover:opacity-70"
            >
              Maria Chevskaya
            </Link>
            <p className="text-lg font-roboto-mono font-light text-gray-600 text-center tracking-normal leading-none mt-0">Portrait and Editorial Photographer</p>
            {/* Social Links - third row centered */}
            <div className="flex items-center justify-center gap-6 mt-4">
              <Link
                href="https://www.instagram.com/maria.chevskaya/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 transition-opacity hover:opacity-70"
                aria-label="Instagram"
              >
                <Instagram className="h-6 w-6" strokeWidth={1} />
              </Link>
              <Link
                href="mailto:maria@chevskaya.com"
                className="text-gray-500 transition-opacity hover:opacity-70"
                aria-label="Email"
              >
                <Mail className="h-6 w-6" strokeWidth={1} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

