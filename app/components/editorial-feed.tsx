import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { loadPublicStories } from '@/lib/editorial-stories-data'
import { pickCover } from '@/lib/editorial-stories'
import { toLightboxPhoto } from '@/lib/lightbox-media'
import { PHOTO_IMAGE_QUALITY } from '@/lib/image-config'
import { MasonryGrid } from './ui/masonry-grid'

// The body of /editorial. When Maria has published stories, the feed is one
// cover per story in the usual masonry, captioned with the title, subtitle and
// photo count, and a tile opens the story page instead of the lightbox. Until then the
// section stays the flat editorial photo feed it always was, so publishing
// the first story is what switches the page over.
export async function EditorialFeed() {
  const supabase = await createClient()
  const { stories, photos } = await loadPublicStories(supabase)

  if (stories.length === 0) return <MasonryGrid page="editorial" />

  const tiles = stories.map((story) => {
    const cover = photos.get(pickCover(story)!)!
    const media = toLightboxPhoto(supabase, cover)
    return { slug: story.slug, title: story.title, subtitle: story.subtitle, photoCount: story.photoIds.length, src: media.src, alt: media.alt, width: media.width, height: media.height }
  })

  return <StoryTiles tiles={tiles} />
}

export type StoryTile = {
  slug: string
  title: string
  subtitle: string
  photoCount: number
  src: string
  alt: string
  width: number
  height: number
}

// Same column flow, plate and hover as the photo feed. Under the cover sits a
// short caption: the story title in Bebas, the subtitle, and the photo count
// in the mono used for story metadata.
export function StoryTiles({ tiles }: { tiles: StoryTile[] }) {
  return (
    <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
      {tiles.map((tile) => (
        <Link
          key={tile.slug}
          href={`/editorial/${tile.slug}`}
          className="group mb-8 block w-full break-inside-avoid text-black"
        >
          <div className="overflow-hidden bg-gray-100">
            <Image
              src={tile.src}
              alt={tile.alt}
              width={tile.width}
              height={tile.height}
              quality={PHOTO_IMAGE_QUALITY}
              className="block h-auto w-full transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
          <span className="mt-3 block font-bebas-neue text-[26px] leading-none tracking-[-0.005em] lowercase">{tile.title}</span>
          {tile.subtitle ? (
            <span className="mt-1.5 block text-sm leading-[1.5] text-gray-600">{tile.subtitle}</span>
          ) : null}
          <span className="mt-1.5 block font-roboto-mono text-[11px] leading-[1.4] tracking-[0.02em] lowercase text-gray-400">
            {photoCountLabel(tile.photoCount)}
          </span>
        </Link>
      ))}
    </div>
  )
}

export function photoCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'photo' : 'photos'}`
}
