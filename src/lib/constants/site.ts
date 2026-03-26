import type { GameGenre, MobileSupport } from "@/types/game";

export const siteConfig = {
  name: "arcade.yuvrajkashyap.com",
  creator: "Yuvraj Kashyap",
  description:
    "A premium browser arcade platform built to host Yuvraj Kashyap's growing catalog of playable web games.",
  domain: "arcade.yuvrajkashyap.com",
  heroTitle: "A polished browser arcade built as a real standalone product.",
  heroDescription:
    "Browse a growing catalog of keyboard-first web games, jump into play instantly, and explore a portfolio designed as a scalable arcade platform instead of a loose collection of demos.",
} as const;

export const navigationLinks = [
  { label: "Home", href: "/" },
  { label: "Library", href: "/library" },
  { label: "About", href: "/about" },
] as const;

export const genreOrder: GameGenre[] = [
  "Arcade",
  "Puzzle",
  "Reaction",
  "Strategy",
  "Platformer",
  "Experimental",
];

export const categoryDescriptions: Record<GameGenre, string> = {
  Arcade: "Fast, replayable games built around clean movement, collision, and score pressure.",
  Puzzle: "Short-form systems that lean on memory, pattern recognition, or constrained decision making.",
  Reaction: "Tighter timing loops designed around focus, rhythm, and instant feedback.",
  Strategy: "Games that slow the action down and reward deliberate planning over twitch input.",
  Platformer: "Movement-led experiments with momentum, jumps, routes, and hand-tuned feel.",
  Experimental: "Format-breaking ideas that stretch the platform without needing a separate product shell.",
};

export const mobileSupportCopy: Record<MobileSupport, string> = {
  full: "Playable with keyboard, pointer, and touch input.",
  partial: "Playable on touch devices, but keyboard remains the strongest control mode.",
  "desktop-best":
    "Best experienced on desktop with keyboard. Touch support exists, but it is secondary.",
};

export function resolveSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://arcade.yuvrajkashyap.com";
}
