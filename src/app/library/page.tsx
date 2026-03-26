import type { Metadata } from "next";
import { HomepageView } from "@/components/homepage/homepage-view";
import { getHomepageCollections } from "@/lib/games/catalog";

export const metadata: Metadata = {
  title: "Library",
  description:
    "Browse the full arcade.yuvrajkashyap.com catalog across featured titles, new releases, categories, and the complete library.",
};

export default function LibraryPage() {
  return <HomepageView collections={getHomepageCollections()} />;
}
