import { TopNav } from "./components/top-nav";
import { MasonryGrid } from "./components/ui/masonry-grid";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopNav />
      <div className="mx-auto max-w-7xl w-full px-6 py-8">
        <MasonryGrid />
      </div>
    </div>
  );
}
