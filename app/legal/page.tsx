import type { Metadata } from "next"
import { LegalPage } from "@/app/components/legal-page"
import { fetchLegalDoc, LEGAL_DOC_IDS } from "@/lib/legal-doc"

export const metadata: Metadata = {
  title: "Legal Notice",
}

export const revalidate = 3600

export default async function ImpressumPage() {
  const doc = await fetchLegalDoc(LEGAL_DOC_IDS.impressum)
  return <LegalPage title="Legal Notice" doc={doc} fallbackEmail="maria.chevskaya@gmail.com" />
}
