import { Suspense } from "react";
import type { Metadata } from "next";
import { TopNav } from "./top-nav";
import { MasonryGrid, MasonryGridSkeleton } from "./ui/masonry-grid";
import { Footer } from "./footer";
import { FloatingCta } from "./floating-cta";
import { WorkshopBanner } from "./workshop-banner";
import type { PhotoPage } from "@/lib/photo-pages";

// One section of the portfolio — /portraits, /kids, /editorial, /video: the
// header with the section row, the workshop banner, the masonry feed for
// `page`, the footer and the floating BOOK button. The home page is the story
// and carries none of this chrome.
export function FeedPage({ page }: { page: PhotoPage }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopNav />
      <Suspense fallback={null}>
        <WorkshopBanner />
      </Suspense>
      <div className="mx-auto max-w-7xl w-full px-4 md:px-6 py-8">
        <Suspense fallback={<MasonryGridSkeleton />}>
          <MasonryGrid page={page} />
        </Suspense>
      </div>
      <Footer floatingCtaSpacer />
      <Suspense fallback={null}>
        <FloatingCta />
      </Suspense>
    </div>
  );
}

// Title + description, repeated into the OpenGraph and Twitter cards the way
// every section page does it.
export function feedMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    openGraph: { title: `${title} | Maria Chevskaya`, description },
    twitter: { title: `${title} | Maria Chevskaya`, description },
  };
}
