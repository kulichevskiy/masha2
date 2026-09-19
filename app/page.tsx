import { Suspense } from "react";
import { TopNav } from "./components/top-nav";
import { Footer } from "./components/footer";
import { HomeStory, HomeStorySkeleton } from "./components/home/home-story";

// The home page (design variant C): hero, people, the session, the work,
// video, behind the camera, workshops, invitation. Title, description and
// OpenGraph come from the root layout. The story carries its own CTAs (hero,
// session, work rows, invitation) and a live workshops section, so the
// floating BOOK cluster and the workshop banner stay off this page — they live
// on the feeds (/portraits, /kids, /editorial, /video). The header is the
// same as everywhere, section row included; the story starts the same
// distance below it that the feeds keep (their grid's py-8).
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopNav />
      <div className="pt-8">
        <Suspense fallback={<HomeStorySkeleton />}>
          <HomeStory />
        </Suspense>
      </div>
      <Footer />
    </div>
  );
}
