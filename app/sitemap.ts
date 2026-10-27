import type { MetadataRoute } from 'next'
import { PHOTO_PAGE_PATHS } from '@/lib/photo-pages'
import { SITE_URL } from '@/lib/site'

// Generate /sitemap.xml once per build, without request-time dependencies.
export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    '/',
    ...PHOTO_PAGE_PATHS,
    '/book',
    '/gift',
    '/workshop',
    '/legal',
    '/privacy',
  ]

  return paths.map((path) => ({ url: new URL(path, SITE_URL).href }))
}
