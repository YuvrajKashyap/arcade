import type { Metadata } from "next";
import { SectionReveal } from "@/components/ui/section-reveal";
import { getPublishedGames } from "@/lib/games/catalog";

export const metadata: Metadata = {
  title: "About",
  description:
    "See how Yuvraj Kashyap built a 30-game browser arcade around a typed catalog, isolated runtimes, shared interaction systems, and production-grade delivery.",
  alternates: {
    canonical: "/about",
  },
};

const pillars = [
  {
    title: "Platform first",
    description:
      "The site is built as a central arcade product with shared navigation, metadata, and discovery rather than a folder of unrelated demos.",
  },
  {
    title: "Game freedom",
    description:
      "Each game owns its own lifecycle, rendering model, and interaction details while the platform keeps a coherent shell and presentation layer.",
  },
  {
    title: "Scalable structure",
    description:
      "New games drop into the registry with minimal wiring, which keeps the codebase clean as the library expands.",
  },
];

export default function AboutPage() {
  const games = getPublishedGames();
  const liveGames = games.filter((game) => game.status === "live").length;
  const canvasGames = games.filter((game) => game.tags.includes("Canvas")).length;
  const fullMobileGames = games.filter((game) => game.mobileSupport === "full").length;

  const platformSignals = [
    { value: games.length, label: "Published games" },
    { value: liveGames, label: "Live releases" },
    { value: canvasGames, label: "Canvas-tagged runtimes" },
    { value: fullMobileGames, label: "Full mobile support" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <SectionReveal>
        <section className="surface-panel rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10">
          <p className="text-sm font-medium uppercase tracking-[0.32em] text-accent">
            About the platform
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Thirty games, one cohesive browser platform.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-foreground-soft sm:text-lg">
            Yuvraj Kashyap built arcade.yuvrajkashyap.com as a production-style game platform,
            not a folder of disconnected demos. A typed catalog, static route generation, lazy
            runtime loading, shared controls, responsive framing, and local persistence keep a
            wide range of game architectures consistent without flattening their individual rules.
          </p>
        </section>
      </SectionReveal>

      <SectionReveal delay={0.08}>
        <section className="grid gap-5 lg:grid-cols-3">
          {pillars.map((pillar) => (
            <article
              key={pillar.title}
              className="surface-panel rounded-[1.75rem] px-6 py-6"
            >
              <h2 className="text-xl font-semibold text-foreground">{pillar.title}</h2>
              <p className="mt-3 text-sm leading-7 text-foreground-soft">
                {pillar.description}
              </p>
            </article>
          ))}
        </section>
      </SectionReveal>

      <SectionReveal delay={0.1}>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {platformSignals.map((signal) => (
            <article
              key={signal.label}
              className="surface-panel rounded-[1.5rem] px-6 py-6"
            >
              <p className="text-4xl font-semibold tracking-tight text-foreground">
                {signal.value}
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground-soft">{signal.label}</p>
            </article>
          ))}
        </section>
      </SectionReveal>

      <SectionReveal delay={0.12}>
        <section className="surface-panel rounded-[2rem] px-6 py-8 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">What ships today</h2>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-foreground-soft sm:text-base">
                <li>Thirty published game pages derived from one typed source of truth.</li>
                <li>Canvas, DOM, board, word, timing, physics, and incremental interaction models.</li>
                <li>Keyboard and touch metadata for every game, with honest mobile-support labels.</li>
                <li>CI, analytics, SEO metadata, a sitemap, source attribution, and automated visual evidence.</li>
              </ul>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Intentional boundaries</h2>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-foreground-soft sm:text-base">
                <li>Records and progress stay local; there is no account or cloud-save backend yet.</li>
                <li>Multiplayer and global leaderboards wait until real product demand justifies them.</li>
                <li>Shared browser mechanics remain lightweight instead of becoming a premature custom engine.</li>
              </ul>
            </div>
          </div>
        </section>
      </SectionReveal>
    </div>
  );
}
