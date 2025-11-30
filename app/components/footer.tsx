import Link from "next/link"
import { Instagram, Mail } from "lucide-react"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-200 bg-white mt-24">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col items-center gap-6">
          {/* Brand Section */}
          <div className="flex flex-col items-center">
            <Link
              href="/"
              className="text-xl font-serif tracking-tight text-black opacity-50 transition-opacity hover:opacity-70"
            >
              Maria Chevskaya
            </Link>
            <p className="text-sm text-gray-600 mt-1 opacity-50">Portrait and Editorial Photographer</p>
          </div>
          {/* Social Links */}
          <div className="flex items-center gap-6">
            <Link
              href="https://www.instagram.com/maria.chevskaya/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-black opacity-50 transition-opacity hover:opacity-70"
              aria-label="Instagram"
            >
              <Instagram className="h-5 w-5" />
            </Link>
            <Link
              href="mailto:maria@chevskaya.com"
              className="text-black opacity-50 transition-opacity hover:opacity-70"
              aria-label="Email"
            >
              <Mail className="h-5 w-5" />
            </Link>
          </div>
          {/* Copyright */}
          <p className="text-sm text-gray-600 opacity-50">© {currentYear} Maria Chevskaya. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

