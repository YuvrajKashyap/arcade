import { playDesignCatalog } from "@/lib/play-designs/catalog";
import { PlayDesignSelector } from "@/components/play-designs/play-design-selector";

export const metadata = {
  title: "Play Design Selector",
};

export default function PlayDesignSelectorPage() {
  return <PlayDesignSelector designs={playDesignCatalog} />;
}
