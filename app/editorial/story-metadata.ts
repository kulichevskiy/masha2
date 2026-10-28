import type { Metadata } from 'next'
import type { PublicStories } from '@/lib/editorial-stories-data'
import { OPEN_GRAPH_IMAGE, TWITTER_IMAGE } from '@/lib/site'
import { EDITORIAL_DESCRIPTION } from './description'

// Title and description of a story page, built like feedMetadata; the
// section's own copy when the slug is unknown, so a 404 still carries
// sensible metadata.
export function storyMetadata(data: PublicStories, slug: string): Metadata {
  const story = data.stories.find((candidate) => candidate.slug === slug)
  const title = story?.title ?? 'Editorial'
  const description = story?.subtitle || EDITORIAL_DESCRIPTION
  return {
    title,
    description,
    alternates: { canonical: story ? `/editorial/${story.slug}` : '/editorial' },
    openGraph: { title: `${title} | Maria Chevskaya`, description, images: [OPEN_GRAPH_IMAGE] },
    twitter: { title: `${title} | Maria Chevskaya`, description, images: [TWITTER_IMAGE] },
  }
}
