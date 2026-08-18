import { Suspense } from "react";
import type { Metadata } from "next";
import { TopNav } from "../components/top-nav";
import { MasonryGrid, MasonryGridSkeleton } from "../components/ui/masonry-grid";
import { Footer } from "../components/footer";
import { FloatingCta } from "../components/floating-cta";
import { WorkshopBanner } from "../components/workshop-banner";

const title = "Video";
const description =
  "Short moving pieces by Maria Chevskaya — presence, rhythm and light in motion.";

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

export default function VideoPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopNav />
      <Suspense fallback={null}>
        <WorkshopBanner />
      </Suspense>
      <div className="mx-auto max-w-7xl w-full px-4 md:px-6 py-8">
        <Suspense fallback={<MasonryGridSkeleton />}>
          <MasonryGrid page="video" />
        </Suspense>
      </div>
      <Footer floatingCtaSpacer />
      <Suspense fallback={null}>
        <FloatingCta />
      </Suspense>
    </div>
  );
}
