import { FeedPage, feedMetadata } from "../components/feed-page";

export const metadata = feedMetadata(
  "Editorial",
  "Editorial photography by Maria Chevskaya – stories, model tests and collaborations with magazines, artists and authors."
);

export default function EditorialPage() {
  return <FeedPage page="editorial" />;
}
