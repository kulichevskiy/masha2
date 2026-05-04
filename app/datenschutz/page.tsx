import type { Metadata } from "next"
import { LegalPage } from "@/app/components/legal-page"
import { fetchLegalDoc, LEGAL_DOC_IDS } from "@/lib/legal-doc"

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
}

export const revalidate = 3600

export default async function DatenschutzPage() {
  const doc = await fetchLegalDoc(LEGAL_DOC_IDS.datenschutz)
  return (
    <LegalPage title="Datenschutzerklärung" doc={doc} fallbackEmail="maria.chevskaya@gmail.com" />
  )
}
