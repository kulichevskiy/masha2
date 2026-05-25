import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { TopNav } from '../components/top-nav'
import { Footer } from '../components/footer'
import { getPublicWorkshop, workshopPhotoUrl } from './data'
import { WorkshopContent } from './components/workshop-content'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

export async function generateMetadata(): Promise<Metadata> {
  const workshop = await getPublicWorkshop()
  if (!workshop) return { title: 'Workshop' }

  const heroUrl = workshopPhotoUrl(SUPABASE_URL, workshop.hero_photo_path)
  const title = workshop.title ?? 'Workshop'
  const description =
    workshop.tagline ??
    'Three days inside a working portrait practice with Maria Chevskaya.'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(heroUrl ? { images: [{ url: heroUrl }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(heroUrl ? { images: [heroUrl] } : {}),
    },
  }
}

export default async function WorkshopPage() {
  const workshop = await getPublicWorkshop()
  if (!workshop) notFound()

  const publicUrlFor = (path: string | null | undefined) =>
    workshopPhotoUrl(SUPABASE_URL, path)

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopNav />
      <main className="flex-1">
        <WorkshopContent workshop={workshop} publicUrlFor={publicUrlFor} />
      </main>
      <Footer />
    </div>
  )
}
