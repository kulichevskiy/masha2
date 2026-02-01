import { Suspense } from "react";
import { TopNav } from "./components/top-nav";
import { MasonryGrid } from "./components/ui/masonry-grid";
import { Footer } from "./components/footer";
import { FloatingBookButton } from "./components/floating-book-button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopNav />
      <div className="mx-auto max-w-7xl w-full px-4 md:px-6 py-8">
        <Suspense fallback={<MasonryGridSkeleton />}>
          <MasonryGrid />
        </Suspense>
      </div>
      <Footer />
      <FloatingBookButton />
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
