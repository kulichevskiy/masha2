"use client"

import Link from "next/link"
import { Instagram, Mail } from "lucide-react"
import { useState, useEffect } from "react"

export function TopNav() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <>
      <nav className="bg-white/50 backdrop-blur-md sticky top-0 z-10 w-full">
        <div className={`mx-auto max-w-7xl px-6 transition-all duration-300 flex items-center ${isScrolled ? "py-0.5" : "py-6"}`}>
          <div className={`flex flex-col items-center transition-all duration-300 origin-center w-full ${isScrolled ? "scale-[0.7] gap-0" : "scale-100 gap-4"}`}>
            {/* Logo and Title Section */}
            <div className="flex flex-col items-center">
              <Link
                href="/"
                className="text-4xl font-playfair-display font-bold tracking-tight text-black transition-opacity hover:opacity-70"
              >
                Maria Chevskaya
              </Link>
              <p className={`text-xl font-roboto-mono font-light text-gray-600 transition-all duration-300 ${isScrolled ? "mt-0" : "mt-1"}`}>Portrait and Editorial Photographer</p>
            </div>
          </div>
        </div>
      </nav>
      {/* Social Links - Fixed in top right */}
      <div className="fixed top-6 right-6 z-20 flex items-center gap-4">
        <Link
          href="https://www.instagram.com/maria.chevskaya/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-black transition-opacity hover:opacity-70"
          aria-label="Instagram"
        >
          <Instagram className="h-5 w-5" strokeWidth={1.5} />
        </Link>
        <Link
          href="mailto:maria@chevskaya.com"
          className="text-black transition-opacity hover:opacity-70"
          aria-label="Email"
        >
          <Mail className="h-5 w-5" strokeWidth={1.5} />
        </Link>
      </div>
    </>
  )
}

