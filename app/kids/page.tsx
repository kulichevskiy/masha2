import { FeedPage, feedMetadata } from "../components/feed-page";

export const metadata = feedMetadata(
  "Kids",
  "Children's portraiture by Maria Chevskaya – unhurried, natural light, real presence."
);

export default function KidsPage() {
  return <FeedPage page="kids" />;
}
