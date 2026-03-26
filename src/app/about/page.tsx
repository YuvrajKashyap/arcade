import type { Metadata } from "next";
import { SectionReveal } from "@/components/ui/section-reveal";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn how the arcade.yuvrajkashyap.com platform is structured, how games are added, and how the arcade is intended to grow.",
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
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <SectionReveal>
        <section className="surface-panel rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10">
          <p className="text-sm font-medium uppercase tracking-[0.32em] text-accent">
            About the platform
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            A standalone browser arcade designed as a real product, not a side folder.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-foreground-soft sm:text-lg">
            arcade.yuvrajkashyap.com combines a premium arcade shell with modular game modules,
            typed metadata, and a clean route-based structure. The current version focuses on a
            tight V1: instant play, strong browsing, polished presentation, and clean expansion
            paths for future systems like saves, profiles, and leaderboards.
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

      <SectionReveal delay={0.12}>
        <section className="surface-panel rounded-[2rem] px-6 py-8 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">What ships in V1</h2>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-foreground-soft sm:text-base">
                <li>Registry-driven homepage discovery across featured, new, categories, and full library.</li>
                <li>Metadata-rich game pages with an intentional play surface, controls, and supporting details.</li>
                <li>Three initial games that validate Canvas loops, collision systems, timing systems, and lighter DOM interaction.</li>
                <li>Lightweight shared utilities instead of a rigid engine abstraction.</li>
              </ul>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-foreground">What intentionally waits</h2>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-foreground-soft sm:text-base">
                <li>Accounts, auth, leaderboards, multiplayer, database-backed saves, and custom analytics pipelines.</li>
                <li>Heavy platform gamification without real user data to justify it.</li>
                <li>Overbuilt abstractions that would slow down adding the next game.</li>
              </ul>
            </div>
          </div>
        </section>
      </SectionReveal>
    </div>
  );
}
