import Link from "next/link"
import Image from "next/image"
import { TopNav } from "../components/top-nav"
import { Footer } from "../components/footer"

export const metadata = {
  title: "Booking",
  description: "Book a portrait or editorial photography session with Maria Chevskaya.",
}

export default function BookPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopNav />
      <main className="mx-auto max-w-xl w-full px-4 md:px-6 py-16 md:py-24 font-inter text-gray-600 leading-relaxed">
        <div className="mb-10">
          <Image
            src="/photos/photo_2026-02-01 17.14.58.jpeg"
            alt="Maria Chevskaya"
            width={800}
            height={600}
            className="w-full"
          />
        </div>

        <h1 className="text-3xl font-bebas-neue text-black lowercase mb-8">
          booking
        </h1>


        <p className="mb-8">
          People I work with are seen, not just photographed. Each session is built around presence, character and rhythm, not poses or time slots.
          It is a collaborative process, calm and attentive, with space to arrive into yourself.
        </p>

        <p className="text-black">Portrait sessions — from 450 €</p>
        <p className="mb-8">
          For personal portraits, moments of transition, inner shifts and quiet confidence.
        </p>

        <p className="text-black">Editorial / personal projects — upon request</p>
        <p className="mb-8">
          For magazines, artists, authors and long-term collaborations.
        </p>

        <div className="mb-8">
          <p className="mb-8">
            If this feels like a match, write to me and tell a few words about yourself or your idea.
          </p>
          <Link
            href="mailto:maria.chevskaya@gmail.com"
            className="inline-block bg-black text-white px-14 py-3 hover:bg-gray-800 transition-colors"
          >
            Email me
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
