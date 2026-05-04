import Link from "next/link"
import { TopNav } from "./top-nav"
import { Footer } from "./footer"
import type { LegalDoc } from "@/lib/legal-doc"

const LEGAL_PROSE_CLASSES =
  "font-inter text-[15px] leading-[1.7] text-gray-700 " +
  "[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-medium [&_h2]:text-black " +
  "[&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-black " +
  "[&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:text-[15px] [&_h4]:font-medium [&_h4]:text-black " +
  "[&_p]:my-3 " +
  "[&_ul]:my-3 [&_ul]:pl-6 [&_ul]:list-disc " +
  "[&_ol]:my-3 [&_ol]:pl-6 [&_ol]:list-decimal " +
  "[&_li]:my-1 " +
  "[&_a]:underline [&_a]:underline-offset-2 [&_a]:text-black hover:[&_a]:opacity-70 " +
  "[&_strong]:font-medium [&_strong]:text-black " +
  "[&_hr]:my-8 [&_hr]:border-gray-200"

export function LegalPage({
  title,
  doc,
  fallbackEmail,
}: {
  title: string
  doc: LegalDoc
  fallbackEmail: string
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopNav />
      <main className="mx-auto max-w-3xl w-full px-4 md:px-6 py-12 lg:py-20 flex-1">
        <h1 className="font-inter text-3xl md:text-4xl font-medium text-black mb-10 tracking-tight">
          {title}
        </h1>
        {doc.ok ? (
          <article className={LEGAL_PROSE_CLASSES} dangerouslySetInnerHTML={{ __html: doc.html }} />
        ) : (
          <LegalFallback email={fallbackEmail} />
        )}
      </main>
      <Footer />
    </div>
  )
}

function LegalFallback({ email }: { email: string }) {
  return (
    <div className="font-inter text-[15px] leading-[1.7] text-gray-700 space-y-4">
      <p>Diese Seite wird gerade aktualisiert.</p>
      <p>
        Bei Fragen wenden Sie sich bitte an{" "}
        <Link
          href={`mailto:${email}`}
          className="underline underline-offset-2 text-black hover:opacity-70"
        >
          {email}
        </Link>
        .
      </p>
    </div>
  )
}
