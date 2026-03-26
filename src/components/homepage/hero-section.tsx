import { ButtonLink } from "@/components/ui/button-link";
import { SectionReveal } from "@/components/ui/section-reveal";
import { siteConfig } from "@/lib/constants/site";
import { formatReleaseDate } from "@/lib/utils/date";
import type { GameCatalogEntry } from "@/types/game";
import Link from "next/link";

type HeroSectionProps = {
  featuredGame?: GameCatalogEntry;
  totalGames: number;
  newReleaseCount: number;
};

export function HeroSection({
  featuredGame,
  totalGames,
  newReleaseCount,
}: HeroSectionProps) {
  return (
    <section className="section-anchor mx-auto w-full max-w-7xl px-4 pt-8 pb-8 sm:px-6 lg:px-8 lg:pt-12 lg:pb-12">
      <SectionReveal>
        <div className="surface-panel overflow-hidden rounded-[2.25rem] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-accent">
                Play instantly
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                {siteConfig.heroTitle}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-foreground-soft sm:text-lg">
                {siteConfig.heroDescription}
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <ButtonLink href={featuredGame ? `/games/${featuredGame.slug}` : "/#featured"}>
                  Play Featured Game
                </ButtonLink>
                <ButtonLink href="/#all-games" variant="secondary">
                  Browse All Games
                </ButtonLink>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-foreground-soft">
                <span>{totalGames} published games</span>
                <span>{newReleaseCount} new in the last 14 days</span>
                <span>Desktop-first / keyboard-first</span>
              </div>
            </div>

            {featuredGame ? (
              <Link
                href={`/games/${featuredGame.slug}`}
                className="group rounded-[2rem] border border-line bg-surface px-6 py-6 hover:border-line-strong hover:bg-surface-strong"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-accent">
                  Featured now
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
                  {featuredGame.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-foreground-soft">
                  {featuredGame.shortDescription}
                </p>
                <div className="mt-8 border-t border-line pt-4 text-sm text-foreground-soft">
                  {featuredGame.genre} • {formatReleaseDate(featuredGame.releaseDate)} •{" "}
                  {featuredGame.sessionLength}
                </div>
              </Link>
            ) : null}
          </div>
        </div>
      </SectionReveal>
    </section>
  );
}
