import { Suspense } from "react";
import { TopNav } from "./components/top-nav";
import { Footer } from "./components/footer";
import { HomeStory, HomeStorySkeleton } from "./components/home/home-story";

// The home page (design variant C): hero, people, the session, the work,
// video, behind the camera, workshops, invitation. Title, description and
// OpenGraph come from the root layout. The story carries its own CTAs (hero,
// session, work rows, invitation) and a live workshops section, so the
// floating BOOK cluster and the workshop banner stay off this page — they live
// on the feeds (/portraits, /kids, /editorial, /video). The header shows the
// wordmark alone: the story links to every section from inside the page.
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopNav sections={false} />
      <Suspense fallback={<HomeStorySkeleton />}>
        <HomeStory />
      </Suspense>
      <Footer />
    </div>
  );
}
