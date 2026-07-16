import type { Metadata } from "next";
import { playDesignCatalog } from "@/lib/play-designs/catalog";
import { PlayDesignSelector } from "@/components/play-designs/play-design-selector";

export const metadata: Metadata = {
  title: "Play Design Selector",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PlayDesignSelectorPage() {
  return <PlayDesignSelector designs={playDesignCatalog} />;
}
