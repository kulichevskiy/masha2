import { Suspense } from "react";
import { TopNav } from "./components/top-nav";
import { MasonryGrid, MasonryGridSkeleton } from "./components/ui/masonry-grid";
import { Footer } from "./components/footer";
import { FloatingCta } from "./components/floating-cta";
import { WorkshopBanner } from "./components/workshop-banner";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopNav />
      <Suspense fallback={null}>
        <WorkshopBanner />
      </Suspense>
      <div className="mx-auto max-w-7xl w-full px-4 md:px-6 py-8">
        <Suspense fallback={<MasonryGridSkeleton />}>
          <MasonryGrid />
        </Suspense>
      </div>
      <Footer floatingCtaSpacer />
      <Suspense fallback={null}>
        <FloatingCta />
      </Suspense>
    </div>
  );
}
