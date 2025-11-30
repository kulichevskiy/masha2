import Link from "next/link"
import { Instagram, Mail } from "lucide-react"

export function TopNav() {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="flex items-center justify-between">
          {/* Logo and Title Section */}
          <div className="flex flex-col">
            <Link
              href="/"
              className="text-2xl font-serif tracking-tight text-black transition-opacity hover:opacity-70"
            >
              Maria Chevskaya
            </Link>
            <p className="text-sm text-gray-600 mt-1">Portrait and Editorial Photographer</p>
          </div>
          {/* Social Links */}
          <div className="flex items-center gap-4">
            <Link
              href="https://www.instagram.com/maria.chevskaya/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-black transition-opacity hover:opacity-70"
              aria-label="Instagram"
            >
              <Instagram className="h-5 w-5" />
            </Link>
            <Link
              href="mailto:maria@chevskaya.com"
              className="text-black transition-opacity hover:opacity-70"
              aria-label="Email"
            >
              <Mail className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

