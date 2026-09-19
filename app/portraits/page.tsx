import { FeedPage, feedMetadata } from "../components/feed-page";

export const metadata = feedMetadata(
  "Portraits",
  "Portrait photography by Maria Chevskaya in Berlin – presence, character and rhythm, not poses."
);

export default function PortraitsPage() {
  return <FeedPage page="portraits" />;
}
