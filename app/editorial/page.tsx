import { FeedPage, feedMetadata } from "../components/feed-page";
import { EditorialFeed } from "../components/editorial-feed";
import { EDITORIAL_DESCRIPTION } from "./description";

export const metadata = feedMetadata("editorial", "Editorial", EDITORIAL_DESCRIPTION);

// Editorial is the one section whose feed items can be stories rather than
// single photographs; EditorialFeed decides which it shows today.
export default function EditorialPage() {
  return <FeedPage page="editorial" feed={<EditorialFeed />} />;
}
