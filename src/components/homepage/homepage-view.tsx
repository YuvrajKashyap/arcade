import { CategorySection } from "@/components/homepage/category-section";
import { GameGridSection } from "@/components/homepage/game-grid-section";
import { HeroSection } from "@/components/homepage/hero-section";
import type { HomepageCollections } from "@/types/game";

type HomepageViewProps = {
  collections: HomepageCollections;
};

export function HomepageView({ collections }: HomepageViewProps) {
  return (
    <>
      <HeroSection
        featuredGame={collections.heroGame}
        totalGames={collections.allGames.length}
        newReleaseCount={collections.newReleaseGames.length}
      />
      <GameGridSection
        id="featured"
        title="Featured Games"
        eyebrow="Curated spotlight"
        description="Manually selected games that best represent the platform right now."
        games={collections.featuredGames}
      />
      <GameGridSection
        id="new-releases"
        title="New Releases"
        eyebrow="Last 14 days"
        description="Fresh launches land here automatically for two weeks before folding into the full library."
        games={collections.newReleaseGames}
        emptyState="No releases have landed in the last 14 days. The next launch will appear here automatically."
      />
      <CategorySection categories={collections.categoryGroups} />
      <GameGridSection
        id="all-games"
        title="All Games"
        eyebrow="Complete library"
        description="The full published arcade catalog, ordered intentionally and ready for instant play."
        games={collections.allGames}
      />
    </>
  );
}
