import Image from "next/image"
import { TopNav } from "../components/top-nav"
import { Footer } from "../components/footer"
import { createClient } from "@/lib/supabase/server"
import { BookingForm } from "./booking-form"
import { BookingFaq } from "./booking-faq"
import { RichText } from "@/components/rich-text"

export const metadata = {
  title: "Booking",
  description: "Book a portrait or editorial photography session with Maria Chevskaya.",
}

export default async function BookPage() {
  const supabase = await createClient()
  const [{ data: tiers }, { data: faq }] = await Promise.all([
    supabase
      .from('booking_tiers')
      .select('id, name, subtitle, description, price_text, is_accent')
      .eq('is_active', true)
      .order('position', { ascending: true }),
    supabase
      .from('booking_faq')
      .select('id, question, answer')
      .eq('is_visible', true)
      .order('position', { ascending: true }),
  ])

  const activeTiers = tiers ?? []
  const faqEntries = faq ?? []

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopNav />
      <main className="mx-auto max-w-xl w-full px-4 md:px-6 py-16 md:py-24 font-inter text-gray-700 leading-relaxed">
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

        {activeTiers.length > 0 && (
          <div className="mb-12 space-y-2">
            {activeTiers.map((tier) => (
              <section
                key={tier.id}
                className={
                  '-mx-4 md:-mx-6 p-6 border ' +
                  (tier.is_accent ? 'border-gray-300' : 'border-transparent')
                }
              >
                <h2 className="font-bebas-neue text-black uppercase tracking-wide leading-none text-xl flex flex-wrap items-baseline gap-x-3">
                  <span>{tier.name}</span>
                  <span aria-hidden="true" className="text-gray-400">—</span>
                  <span>{tier.price_text}</span>
                </h2>
                {tier.subtitle && (
                  <p className="mt-3 text-[15px] text-gray-700 leading-snug">
                    {tier.subtitle}
                  </p>
                )}
                {tier.description && (
                  <div className="mt-4">
                    <RichText html={tier.description} />
                  </div>
                )}
              </section>
            ))}
          </div>
        )}

        <div className="mb-8 -mx-4 md:-mx-6 bg-gray-50 p-6 md:p-10">
          <p className="mb-8">
            If this feels like a match, pick a tier, leave your email and a few words.
          </p>
          {activeTiers.length > 0 ? (
            <BookingForm tiers={activeTiers.map(({ id, name, price_text }) => ({ id, name, price_text }))} />
          ) : (
            <a
              href="mailto:maria.chevskaya@gmail.com"
              className="inline-block bg-black text-white px-14 py-3 font-bebas-neue text-xl tracking-wider uppercase hover:bg-gray-800 transition-colors"
            >
              Email me
            </a>
          )}
        </div>

        {faqEntries.length > 0 && <BookingFaq entries={faqEntries} />}
      </main>
      <Footer />
    </div>
  )
}
