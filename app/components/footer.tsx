import Link from "next/link"

// Phosphor-style sharp icons: square line caps, mitered corners, 1.25 stroke.
// Keeps the footer visually consistent with the zero-radius public surface.
const sharpStroke = {
  stroke: "currentColor",
  fill: "none",
  strokeWidth: 1.25,
  strokeLinecap: "square" as const,
  strokeLinejoin: "miter" as const,
}

function InstagramSharp() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...sharpStroke} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" />
      <circle cx="12" cy="12" r="4.25" />
      <rect x="16.5" y="6" width="1.5" height="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function MailSharp() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...sharpStroke} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" />
      <path d="M3 6 12 13 21 6" />
    </svg>
  )
}

function UserSharp() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...sharpStroke} aria-hidden="true">
      <circle cx="12" cy="9" r="3.5" />
      <path d="M4.5 20.5 C 6.5 16 17.5 16 19.5 20.5" />
    </svg>
  )
}

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-24 border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-12 lg:py-16">
        <div className="space-y-6 text-center flex flex-col items-center">
          <div className="space-y-2">
            <Link
              href="/"
              className="text-2xl font-bebas-neue tracking-tight text-black opacity-50 transition-opacity hover:opacity-100 uppercase"
            >
              Maria Chevskaya
            </Link>
            <p className="text-sm font-inter text-gray-500 tracking-wider lowercase opacity-50">
              Portrait and editorial photographer
            </p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Link
              href="https://www.instagram.com/maria.chevskaya/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-gray-500 opacity-50 transition-opacity hover:opacity-100"
            >
              <InstagramSharp />
            </Link>
            <a
              href="mailto:maria.chevskaya@gmail.com"
              aria-label="Email"
              className="text-gray-500 opacity-50 transition-opacity hover:opacity-100"
            >
              <MailSharp />
            </a>
            <Link
              href="/auth/login"
              aria-label="Login"
              className="text-gray-500 opacity-50 transition-opacity hover:opacity-100"
            >
              <UserSharp />
            </Link>
          </div>

          <p className="text-sm text-gray-500 opacity-50">© {currentYear} Maria Chevskaya. All rights reserved.</p>

          <p className="text-sm font-inter text-gray-500 opacity-50">
            <Link href="/impressum" className="transition-opacity hover:opacity-100">
              Legal Notice
            </Link>
            <span aria-hidden="true" className="mx-2">·</span>
            <Link href="/datenschutz" className="transition-opacity hover:opacity-100">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
