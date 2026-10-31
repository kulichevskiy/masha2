// The booking page: the heading and one paragraph, then every tier as a row on
// hairlines — its photograph on the left, name and price on one line, the
// subtitle, a lowercase line of facts, the included list folded away, and the
// link that opens the booking dialog with that tier chosen. Questions close
// the page on the same two columns.

import { TopNav } from "../components/top-nav"
import { Footer } from "../components/footer"
import { Photo } from "../components/home/story-ui"
import { createClient } from "@/lib/supabase/server"
import { BookingDialogProvider, BookTierLink } from "./booking-dialog"
import { BookingFaq } from "./booking-faq"
import { isPricedTier } from "./tier-frames"
import { loadTierFrames } from "./tier-photos"
import { RichText } from "@/components/rich-text"
import { CONTACT_EMAIL } from "@/lib/site"
import { typeset } from "@/lib/typography"

export const metadata = {
  alternates: { canonical: "/book" },
  title: "Booking",
  description: "Book a portrait or editorial photography session with Maria Chevskaya.",
}

const DISPLAY = 'font-bebas-neue font-normal lowercase tracking-[-0.005em] text-black m-0 [text-wrap:pretty]'

export default async function BookPage() {
  const supabase = await createClient()
  const [{ data: tiers }, { data: faq }] = await Promise.all([
    supabase
      .from('booking_tiers')
      .select('id, name, subtitle, summary, description, price_text, photo_path')
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
  const frames = activeTiers.length > 0 ? await loadTierFrames(activeTiers) : {}

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopNav />
      <BookingDialogProvider>
        <main className="mx-auto max-w-7xl w-full px-5 md:px-10 pt-16 md:pt-28 font-inter text-gray-700">
          <div className="grid md:grid-cols-2 gap-6 md:gap-20 items-end">
            <h1 className={`${DISPLAY} text-[54px] md:text-[104px] leading-[0.92]`}>
              a session
              <br />
              with maria
            </h1>
            <p className="font-inter text-base md:text-lg leading-[1.7] text-gray-600 m-0 max-w-[520px] [text-wrap:pretty]">
              {typeset(
                "People I work with are seen, not just photographed. Each session is built around presence, character and rhythm, not poses or time slots. " +
                  "It is a collaborative process, calm and attentive, with space to arrive into yourself."
              )}
            </p>
          </div>

          {activeTiers.length > 0 ? (
            <div className="mt-16 md:mt-24 border-t border-gray-200">
              {activeTiers.map((tier) => {
                const priced = isPricedTier(tier.price_text)
                return (
                  <section
                    key={tier.id}
                    className="grid md:grid-cols-[5fr_7fr] gap-6 md:gap-20 items-center py-8 md:py-12 border-b border-gray-200"
                  >
                    <Photo
                      frame={frames[tier.id] ?? null}
                      ratio="aspect-[4/5]"
                      sizes="(max-width: 768px) 100vw, 520px"
                    />
                    <div>
                      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1">
                        <h2 className={`${DISPLAY} text-[44px] md:text-[68px] leading-none`}>
                          {typeset(tier.name)}
                        </h2>
                        <span
                          className={
                            priced
                              ? 'font-bebas-neue text-black text-[44px] md:text-[68px] leading-none whitespace-nowrap'
                              : 'font-bebas-neue text-gray-500 lowercase text-[26px] md:text-[32px] leading-none whitespace-nowrap'
                          }
                        >
                          {typeset(tier.price_text)}
                        </span>
                      </div>
                      {tier.subtitle && (
                        <p className="mt-4 md:mt-6 text-[17px] md:text-xl leading-[1.5] text-black max-w-[520px] [text-wrap:pretty]">
                          {typeset(tier.subtitle)}
                        </p>
                      )}
                      {tier.summary && (
                        <p className="mt-3 font-roboto-mono text-xs md:text-[13px] lowercase text-gray-500">
                          {tier.summary}
                        </p>
                      )}
                      {tier.description && (
                        <details className="group mt-5">
                          <summary className="list-none [&::-webkit-details-marker]:hidden inline-block cursor-pointer font-roboto-mono text-xs lowercase text-gray-500 border-b border-gray-300 pb-0.5 hover:text-black hover:border-black transition-colors">
                            what’s included <span className="group-open:hidden">+</span><span className="hidden group-open:inline">−</span>
                          </summary>
                          <div className="mt-4 max-w-[520px] text-[15px] text-gray-600">
                            <RichText html={tier.description} />
                          </div>
                        </details>
                      )}
                      <div className="mt-8 md:mt-10">
                        <BookTierLink
                          tier={{ id: tier.id, name: tier.name, price_text: tier.price_text }}
                          label={priced ? `book ${tier.name}` : 'write to me'}
                        />
                      </div>
                    </div>
                  </section>
                )
              })}
            </div>
          ) : (
            <div className="mt-16 md:mt-24">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-block bg-black text-white px-14 py-4 font-bebas-neue text-xl tracking-[0.12em] uppercase hover:bg-gray-800 transition-colors"
              >
                Email me
              </a>
            </div>
          )}

          {faqEntries.length > 0 && <BookingFaq entries={faqEntries} />}
        </main>
      </BookingDialogProvider>
      <Footer />
    </div>
  )
}
