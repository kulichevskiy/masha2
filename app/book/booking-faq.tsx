import { RichText } from "@/components/rich-text"

type FaqEntry = {
  id: string
  question: string
  answer: string
}

// strips HTML tags and collapses whitespace; used only for the schema.org
// JSON-LD payload so search engines see plain answer text. the visible <details>
// blocks still render the rich HTML via <RichText>.
function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .trim()
}

export function BookingFaq({ entries }: { entries: FaqEntry[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((e) => ({
      '@type': 'Question',
      name: e.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: htmlToText(e.answer),
      },
    })),
  }

  return (
    <section className="mt-16">
      <h2 className="text-3xl font-bebas-neue text-black lowercase mb-6">
        questions
      </h2>

      <div className="border-b border-gray-200">
        {entries.map((entry) => (
          <details
            key={entry.id}
            className="group border-t border-gray-200"
          >
            <summary
              className="list-none [&::-webkit-details-marker]:hidden flex cursor-pointer items-start justify-between gap-4 py-4 text-base font-medium text-black"
            >
              <span>{entry.question}</span>
              <span
                aria-hidden="true"
                className="shrink-0 select-none text-xl leading-none text-gray-400"
              >
                <span className="group-open:hidden">+</span>
                <span className="hidden group-open:inline">−</span>
              </span>
            </summary>
            <div className="pb-5 pr-8 text-gray-700">
              <RichText html={entry.answer} />
            </div>
          </details>
        ))}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  )
}
