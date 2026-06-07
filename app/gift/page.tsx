import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { TopNav } from '../components/top-nav'
import { Footer } from '../components/footer'
import { getPublicGiftCertificate, giftPhotoUrl } from './data'
import { GiftContent } from './components/gift-content'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

export const metadata: Metadata = {
  title: 'Gift Certificate',
  description:
    'A portrait session with Maria Chevskaya, given as a gift.',
}

export default async function GiftPage() {
  const giftCertificate = await getPublicGiftCertificate()
  if (!giftCertificate) notFound()

  const publicUrlFor = (path: string | null | undefined) =>
    giftPhotoUrl(SUPABASE_URL, path)

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopNav />
      <main className="flex-1">
        <GiftContent giftCertificate={giftCertificate} publicUrlFor={publicUrlFor} />
      </main>
      <Footer />
    </div>
  )
}
