import { SocialPreviewImage } from '@/lib/social-preview'

// Explicit routes avoid file-based metadata overriding the public image URLs.
export const dynamic = 'force-static'

export function GET() {
  return SocialPreviewImage()
}
