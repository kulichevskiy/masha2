"use client"

import { Fragment } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

// Site sections, in header order. Workshop is always shown (the closed-sales
// state only changes the page's own CTA, not whether the section exists).
const SECTIONS = [
  { href: "/", label: "Portraits" },
  { href: "/kids", label: "Kids" },
  { href: "/workshop", label: "Workshop" },
] as const

export function SectionNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Sections"
      className="flex items-center justify-center gap-4 md:gap-5 font-inter text-xs tracking-widest uppercase"
    >
      {SECTIONS.map((section, i) => {
        const active = pathname === section.href
        return (
          <Fragment key={section.href}>
            {i > 0 && (
              <span aria-hidden className="text-gray-300 select-none">
                ·
              </span>
            )}
            <Link
              href={section.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "text-black underline underline-offset-4"
                  : "text-gray-500 transition-opacity hover:opacity-70"
              }
            >
              {section.label}
            </Link>
          </Fragment>
        )
      })}
    </nav>
  )
}
