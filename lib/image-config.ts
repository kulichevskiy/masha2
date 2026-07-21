// Single source of truth for the `next/image` encoding quality used on the
// photo surfaces (feed + booking portrait). It is deliberately shared with
// `next.config.ts`'s `images.qualities` allow-list: Next 16 throws at request
// time if a component renders a `quality` value that isn't allow-listed, so
// binding both to this constant makes the two impossible to desync.
export const PHOTO_IMAGE_QUALITY = 90
