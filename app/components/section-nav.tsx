"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

// Site sections, in header order. Workshops is always shown (the closed-sales
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
      className="mt-2 md:mt-3 flex items-center justify-center gap-7 md:gap-10 font-bebas-neue text-[15px] md:text-[17px] leading-none tracking-[0.1em] uppercase"
    >
      {SECTIONS.map((section) => {
        const active = pathname === section.href
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "border-b border-black pb-1 text-black opacity-100 transition-opacity"
                : "border-b border-transparent pb-1 text-black opacity-[0.45] transition-opacity hover:opacity-100"
            }
          >
            {section.label}
          </Link>
        )
      })}
    </nav>
  )
}
