// Pure presentational renderer for the /gift page. Desktop is a two-column
// layout (gallery left, content right); mobile stacks gallery above content.
// Takes a normalised GiftCertificate + a publicUrlFor() resolver so it stays
// free of supabase imports — that's what lets the smoke test pass a synthetic
// record without standing up a client. The amount picker + order form live in
// the GiftOrder client island.

import { RichText } from '@/components/rich-text'
import { GiftOrder } from './gift-order'
import type { GiftCertificate } from '../data'

type Props = {
  giftCertificate: GiftCertificate
  publicUrlFor: (storagePath: string | null | undefined) => string | null
}

export function GiftContent({ giftCertificate, publicUrlFor }: Props) {
  // Drop empty gallery entries — the admin can persist a row with cleared
  // photo_paths, and we don't want blank gray tiles on the public page.
  const galleryItems = giftCertificate.gallery.filter(
    (g) => g.photo_path && g.photo_path.trim() !== ''
  )

  // First photo is the hero; the rest fill a 2-col square mosaic below it.
  const [hero, ...mosaic] = galleryItems
  // Odd leftover: with an odd mosaic count, the last tile spans both columns
  // as a wide tile so there's no empty gap at the end of the grid.
  const lastMosaicIndex = mosaic.length - 1
  const hasWideTile = mosaic.length % 2 === 1

  return (
    <div className="bg-white text-gray-700 font-inter">
      <section className="px-5 md:px-10 pt-10 md:pt-20 pb-16 md:pb-28">
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 lg:gap-24 items-start">
          {/* ───────── Gallery (left on desktop, top on mobile) ───────── */}
          <div className="grid grid-cols-1 gap-1">
            {hero ? (
              <>
                {/* Hero = gallery[0], full column width. */}
                <GalleryTile
                  testid="gift-hero"
                  url={publicUrlFor(hero.photo_path)}
                  className="aspect-[3/4]"
                />

                {/* Mosaic = gallery[1..], 2-col square grid. */}
                {mosaic.length > 0 && (
                  <div data-testid="gift-mosaic" className="grid grid-cols-2 gap-1">
                    {mosaic.map((g, i) => {
                      const wide = hasWideTile && i === lastMosaicIndex
                      return (
                        <GalleryTile
                          key={`${g.photo_path}-${i}`}
                          testid="gift-mosaic-tile"
                          url={publicUrlFor(g.photo_path)}
                          className={
                            wide ? 'col-span-2 aspect-[3/2]' : 'aspect-square'
                          }
                        />
                      )
                    })}
                  </div>
                )}
              </>
            ) : (
              <div
                data-testid="gift-placeholder"
                className="aspect-[3/4] bg-gray-200"
                aria-hidden="true"
              />
            )}
          </div>

          {/* ───────── Content (right on desktop, below on mobile) ───────── */}
          <div className="md:pt-6">
            <h1 className="font-bebas-neue lowercase font-normal text-foreground m-0 text-[68px] md:text-[96px] lg:text-[120px] leading-[0.85] tracking-[-0.02em]">
              <span className="block">gift</span>
              <span className="block">certificate</span>
            </h1>

            {giftCertificate.body && (
              <RichText
                html={giftCertificate.body}
                className="mt-8 md:mt-10 max-w-[520px] text-[15.5px] md:text-[17px] leading-[1.7] md:leading-[1.75]"
              />
            )}

            <GiftOrder amounts={giftCertificate.amounts} />
          </div>
        </div>
      </section>
    </div>
  )
}

// One decorative gallery tile. `className` carries the aspect ratio (and any
// column span); the wrapper stays a hard rectangle with object-cover inside.
function GalleryTile({
  testid,
  url,
  className,
}: {
  testid: string
  url: string | null
  className: string
}) {
  return (
    <div
      data-testid={testid}
      className={`${className} overflow-hidden bg-gray-200`}
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover block"
        />
      )}
    </div>
  )
}
