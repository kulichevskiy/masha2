import { Suspense } from "react";
import type { Metadata } from "next";
import { TopNav } from "../components/top-nav";
import { MasonryGrid } from "../components/ui/masonry-grid";
import { Footer } from "../components/footer";
import { FloatingCta } from "../components/floating-cta";
import { WorkshopBanner } from "../components/workshop-banner";

const title = "Kids";
const description =
  "Children's portraiture by Maria Chevskaya — unhurried, natural light, real presence.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title: `${title} | Maria Chevskaya`,
    description,
  },
  twitter: {
    title: `${title} | Maria Chevskaya`,
    description,
  },
};

// Mirrors the home shell (top nav, workshop banner, floating CTA, footer) but
// renders the kids feed instead of portraits. MasonryGrid page="kids" filters
// on photos.pages @> {kids} and carries its own empty state.
export default function KidsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopNav />
      <Suspense fallback={null}>
        <WorkshopBanner />
      </Suspense>
      <div className="mx-auto max-w-7xl w-full px-4 md:px-6 py-8">
        <Suspense fallback={<MasonryGridSkeleton />}>
          <MasonryGrid page="kids" />
        </Suspense>
      </div>
      <Footer floatingCtaSpacer />
      <Suspense fallback={null}>
        <FloatingCta />
      </Suspense>
    </div>
  );
}

function MasonryGridSkeleton() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[200px]">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className={`relative overflow-hidden bg-gray-200 animate-pulse ${
              i % 3 === 2 ? "row-span-3" : "row-span-2"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
