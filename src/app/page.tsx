import { HomepageView } from "@/components/homepage/homepage-view";
import { getHomepageCollections } from "@/lib/games/catalog";

export default function Home() {
  return <HomepageView collections={getHomepageCollections()} />;
}
