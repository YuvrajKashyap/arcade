import Link from "next/link";
import { SectionHeading } from "@/components/homepage/section-heading";
import { SectionReveal } from "@/components/ui/section-reveal";
import { Pill } from "@/components/ui/pill";
import type { GameCatalogEntry } from "@/types/game";

type Category = {
  genre: string;
  description: string;
  games: readonly GameCatalogEntry[];
};

type CategorySectionProps = {
  categories: readonly Category[];
};

export function CategorySection({ categories }: CategorySectionProps) {
  return (
    <section
      id="categories"
      className="section-anchor mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10"
    >
      <SectionReveal>
        <SectionHeading
          eyebrow="Categories"
          title="Browse by game style"
          description="Genres make discovery faster and help the platform feel like a growing library instead of a single launch page."
        />
      </SectionReveal>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {categories.map((category, index) => (
          <SectionReveal key={category.genre} delay={index * 0.07}>
            <article className="surface-panel rounded-[1.75rem] px-6 py-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                    {category.genre}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-foreground-soft">
                    {category.description}
                  </p>
                </div>
                <Pill tone="accent">{category.games.length} games</Pill>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {category.games.map((game) => (
                  <Link
                    key={game.slug}
                    href={`/games/${game.slug}`}
                    className="rounded-full border border-line bg-white/80 px-3 py-2 text-sm font-medium text-foreground hover:-translate-y-0.5 hover:border-line-strong hover:bg-white"
                  >
                    {game.title}
                  </Link>
                ))}
              </div>
            </article>
          </SectionReveal>
        ))}
      </div>
    </section>
  );
}
