// Details of the studio that more than one page has to print.
//
// CONTACT_EMAIL is the address the public site shows — the footer, the booking
// page, the closing invitation on the home story, the legal pages. It is not
// the inbox booking requests are delivered to: that one is
// `app_settings.booking_recipient_email`, which Maria sets in admin.
export const CONTACT_EMAIL = 'maria@chevskaya.com'

// The studio's Google Business listing, where the reviews quoted on the home
// page live in full.
export const GOOGLE_REVIEWS_URL = 'https://www.google.com/maps?cid=2234284246817783539'

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chevskaya.com'

// Absolute URLs bypass Next.js file-based social image localhost fallback in dev.
const SOCIAL_IMAGE = {
  width: 1200,
  height: 630,
  alt: 'Maria Chevskaya - Portrait and Editorial Photographer',
}

export const OPEN_GRAPH_IMAGE = {
  ...SOCIAL_IMAGE,
  url: new URL('/opengraph-image', SITE_URL).href,
}

export const TWITTER_IMAGE = {
  ...SOCIAL_IMAGE,
  url: new URL('/twitter-image', SITE_URL).href,
}
