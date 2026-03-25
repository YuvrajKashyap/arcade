import { GameCard } from "@/components/cards/game-card";
import { SectionHeading } from "@/components/homepage/section-heading";
import { SectionReveal } from "@/components/ui/section-reveal";
import type { GameCatalogEntry } from "@/types/game";

type GameGridSectionProps = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  games: readonly GameCatalogEntry[];
  emptyState?: string;
};

export function GameGridSection({
  id,
  eyebrow,
  title,
  description,
  games,
  emptyState,
}: GameGridSectionProps) {
  return (
    <section
      id={id}
      className="section-anchor mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10"
    >
      <SectionReveal>
        <SectionHeading eyebrow={eyebrow} title={title} description={description} />
      </SectionReveal>
      {games.length > 0 ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {games.map((game, index) => (
            <SectionReveal key={game.slug} delay={index * 0.06}>
              <GameCard game={game} />
            </SectionReveal>
          ))}
        </div>
      ) : (
        <SectionReveal delay={0.06}>
          <div className="surface-panel mt-8 rounded-[1.75rem] px-6 py-8 text-sm leading-7 text-foreground-soft">
            {emptyState}
          </div>
        </SectionReveal>
      )}
    </section>
  );
}
