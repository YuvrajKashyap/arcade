import { ButtonLink } from "@/components/ui/button-link";
import { SectionReveal } from "@/components/ui/section-reveal";
import { siteConfig } from "@/lib/constants/site";
import { formatReleaseDate } from "@/lib/utils/date";
import type { GameCatalogEntry } from "@/types/game";

type HeroSectionProps = {
  featuredGame?: GameCatalogEntry;
};

const heroStats = [
  { label: "Platform posture", value: "Standalone live product" },
  { label: "Input target", value: "Desktop-first / keyboard-first" },
  { label: "Rendering model", value: "Canvas + DOM hybrid" },
] as const;

export function HeroSection({ featuredGame }: HeroSectionProps) {
  return (
    <section className="section-anchor mx-auto w-full max-w-7xl px-4 pt-8 pb-8 sm:px-6 lg:px-8 lg:pt-12 lg:pb-12">
      <SectionReveal>
        <div className="surface-panel overflow-hidden rounded-[2.25rem] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.32em] text-accent">
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

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {heroStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[1.4rem] border border-line bg-white/70 px-4 py-4"
                  >
                    <p className="text-xs font-medium uppercase tracking-[0.24em] text-foreground-soft">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -right-6 -top-6 size-28 rounded-full bg-spark/60 blur-3xl" />
              <div className="absolute -left-4 bottom-4 size-32 rounded-full bg-signal/30 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-line-strong bg-[linear-gradient(160deg,#14213d,#243b68_60%,#ff6b35)] p-6 text-white shadow-[0_28px_80px_rgba(20,33,61,0.22)]">
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/72">
                  Current spotlight
                </p>
                {featuredGame ? (
                  <>
                    <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                      {featuredGame.title}
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-white/82">
                      {featuredGame.shortDescription}
                    </p>
                    <dl className="mt-8 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-[1.25rem] border border-white/16 bg-white/10 px-4 py-4">
                        <dt className="text-xs uppercase tracking-[0.22em] text-white/62">
                          Genre
                        </dt>
                        <dd className="mt-2 text-sm font-semibold">{featuredGame.genre}</dd>
                      </div>
                      <div className="rounded-[1.25rem] border border-white/16 bg-white/10 px-4 py-4">
                        <dt className="text-xs uppercase tracking-[0.22em] text-white/62">
                          Release date
                        </dt>
                        <dd className="mt-2 text-sm font-semibold">
                          {formatReleaseDate(featuredGame.releaseDate)}
                        </dd>
                      </div>
                      <div className="rounded-[1.25rem] border border-white/16 bg-white/10 px-4 py-4">
                        <dt className="text-xs uppercase tracking-[0.22em] text-white/62">
                          Difficulty
                        </dt>
                        <dd className="mt-2 text-sm font-semibold">
                          {featuredGame.difficulty}
                        </dd>
                      </div>
                      <div className="rounded-[1.25rem] border border-white/16 bg-white/10 px-4 py-4">
                        <dt className="text-xs uppercase tracking-[0.22em] text-white/62">
                          Session
                        </dt>
                        <dd className="mt-2 text-sm font-semibold">
                          {featuredGame.sessionLength}
                        </dd>
                      </div>
                    </dl>
                  </>
                ) : (
                  <p className="mt-4 text-sm leading-7 text-white/82">
                    Featured games will surface here automatically as the arcade grows.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </SectionReveal>
    </section>
  );
}
