import Link from "next/link"
import { Instagram, Mail } from "lucide-react"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-24 border-t border-gray-200 bg-gradient-to-b from-white via-zinc-50 to-white">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr_1fr] lg:items-start">
          {/* Brand Section */}
          <div className="space-y-4">
            <Link
              href="/"
              className="text-3xl font-playfair-display font-semibold tracking-tight text-black transition-opacity hover:opacity-80"
            >
              Maria Chevskaya
            </Link>
            <p className="text-base leading-relaxed text-gray-600">
              Portrait and editorial photographer crafting luminous, cinematic stories for thoughtful brands and people.
            </p>
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-gray-500">
              <span className="inline-block h-px w-8 bg-gray-300" aria-hidden="true" />
              <span>Available for collaborations</span>
            </div>
          </div>

          {/* Contact Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-roboto-mono uppercase tracking-[0.22em] text-gray-500">Contact</h3>
            <p className="text-sm leading-relaxed text-gray-600">
              For bookings, commissions, and creative partnerships, let&apos;s start the conversation.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <Mail className="h-4 w-4" aria-hidden="true" />
              <Link href="mailto:maria@chevskaya.com" className="transition-opacity hover:opacity-80">
                maria@chevskaya.com
              </Link>
            </div>
          </div>

          {/* Social Links */}
          <div className="space-y-4">
            <h3 className="text-xs font-roboto-mono uppercase tracking-[0.22em] text-gray-500">Follow</h3>
            <p className="text-sm leading-relaxed text-gray-600">Glimpses behind the lens and ongoing work.</p>
            <div className="flex items-center gap-3">
              <Link
                href="https://www.instagram.com/maria.chevskaya/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:text-black"
              >
                <Instagram className="h-5 w-5" strokeWidth={1.5} />
              </Link>
              <Link
                href="mailto:maria@chevskaya.com"
                aria-label="Email"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:text-black"
              >
                <Mail className="h-5 w-5" strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col gap-4 border-t border-gray-200 pt-6 text-sm text-gray-500 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.22em]">
            <span className="inline-block h-2 w-2 rounded-full bg-gray-300" aria-hidden="true" />
            <span>Maria Chevskaya</span>
          </div>
          <p className="text-sm text-gray-500">© {currentYear} Maria Chevskaya. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

