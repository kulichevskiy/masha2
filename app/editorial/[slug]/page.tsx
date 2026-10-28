import { Suspense, cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TopNav } from '@/app/components/top-nav'
import { Footer } from '@/app/components/footer'
import { FloatingCta } from '@/app/components/floating-cta'
import { createClient } from '@/lib/supabase/server'
import { loadPublicStories } from '@/lib/editorial-stories-data'
import { neighbours } from '@/lib/editorial-stories'
import { toLightboxPhoto } from '@/lib/lightbox-media'
import { StoryPage } from '../story-page'
import { storyMetadata } from '../story-metadata'

type Props = { params: Promise<{ slug: string }> }

// generateMetadata and the page both need the stories; cache() makes them
// share one load per request.
const loadStories = cache(async () => {
  const supabase = await createClient()
  return { supabase, data: await loadPublicStories(supabase) }
})

// One editorial story: /editorial/<slug>. Visibility and readable photos are
// decided by RLS through loadPublicStories; a slug that resolves to nothing
// renderable is a 404 like any other unknown page.
export default async function EditorialStoryPage({ params }: Props) {
  const { slug } = await params
  const { supabase, data } = await loadStories()
  const story = data.stories.find((candidate) => candidate.slug === slug)
  if (!story) notFound()

  const { previous, next } = neighbours(data.stories, slug)
  const photos = story.photoIds.map((id) => toLightboxPhoto(supabase, data.photos.get(id)!))

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopNav />
      <StoryPage
        title={story.title}
        subtitle={story.subtitle}
        credits={story.credits}
        photos={photos}
        previous={previous}
        next={next}
      />
      <Footer floatingCtaSpacer />
      <Suspense fallback={null}>
        <FloatingCta />
      </Suspense>
    </div>
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { data } = await loadStories()
  return storyMetadata(data, slug)
}
