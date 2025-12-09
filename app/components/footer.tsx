import Link from "next/link"
import { Instagram, Mail, User } from "lucide-react"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-24 border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-12 lg:py-16">
        <div className="space-y-6">
          {/* Brand Section */}
          <div className="space-y-4">
            <Link
              href="/"
              className="text-2xl font-playfair-display font-normal tracking-tight text-black opacity-50 transition-opacity hover:opacity-100"
            >
              Maria Chevskaya
            </Link>
            <p className="text-base leading-relaxed text-gray-600 opacity-50">
              Portrait and editorial photographer crafting luminous, cinematic stories for thoughtful brands and people.
            </p>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-3">
            <Link
              href="https://www.instagram.com/maria.chevskaya/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-gray-500 opacity-50 transition-opacity hover:opacity-100"
            >
              <Instagram className="h-6 w-6" strokeWidth={1} />
            </Link>
            <Link
              href="mailto:maria@chevskaya.com"
              aria-label="Email"
              className="text-gray-500 opacity-50 transition-opacity hover:opacity-100"
            >
              <Mail className="h-6 w-6" strokeWidth={1} />
            </Link>
            <Link
              href="/auth/login"
              aria-label="Login"
              className="text-gray-500 opacity-50 transition-opacity hover:opacity-100"
            >
              <User className="h-6 w-6" strokeWidth={1} />
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-sm text-gray-500 opacity-50">© {currentYear} Maria Chevskaya. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

