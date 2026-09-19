import { FeedPage, feedMetadata } from "../components/feed-page";

export const metadata = feedMetadata(
  "Video",
  "Short moving pieces by Maria Chevskaya – presence, rhythm and light in motion."
);

export default function VideoPage() {
  return <FeedPage page="video" />;
}
