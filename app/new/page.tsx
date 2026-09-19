import { Suspense } from "react";
import type { Metadata } from "next";
import { TopNav } from "../components/top-nav";
import { Footer } from "../components/footer";
import { HomeStory, HomeStorySkeleton } from "../components/home/home-story";

// Preview of the new home page (design variant C): hero, people, the session,
// the work, video, behind the camera, workshops, invitation. Lives at /new
// while the current masonry home stays at "/". Kept out of search indexes until
// it replaces the home page. The story carries its own CTAs (hero, session,
// work rows, invitation) and a live workshops section, so the floating BOOK
// cluster and the workshop banner stay off this page.
export const metadata: Metadata = {
  title: "New home",
  robots: { index: false, follow: false },
};

export default function NewHomePage() {
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
