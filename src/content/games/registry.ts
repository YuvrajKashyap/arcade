import type { GameCatalogEntry } from "@/types/game";

export const gameCatalog = [
  {
    slug: "snake",
    title: "Snake",
    shortDescription:
      "Classic grid pressure with crisp controls, score chase tension, and instant restart flow.",
    description:
      "Guide a growing snake across a tight grid, chain food pickups, and protect your line as the board closes in. Snake validates the platform's Canvas loop, grid logic, collision rules, and restart flow while still feeling polished enough to stand on its own.",
    thumbnail: "/games/snake/thumbnail.svg",
    genre: "Arcade",
    tags: ["Canvas", "Grid", "High Score", "Keyboard"],
    controls: {
      summary: "Arrow keys or WASD move. Space starts or restarts the run.",
      items: [
        { label: "Move", action: "Arrow keys or WASD" },
        { label: "Start / Restart", action: "Space" },
        { label: "Pause", action: "P" },
        { label: "Touch", action: "On-screen direction pad" },
      ],
    },
    difficulty: "easy",
    sessionLength: "2-5 min",
    releaseDate: "2026-03-18",
    status: "live",
    featured: true,
    published: true,
    supports: ["keyboard", "touch"],
    mobileSupport: "partial",
    version: "1.0.0",
    developerNotes:
      "The game loop is intentionally lightweight: local state, Canvas rendering, and shared utility hooks instead of a heavyweight engine layer.",
    libraryOrder: 1,
    featurePriority: 1,
  },
  {
    slug: "pong",
    title: "Pong",
    shortDescription:
      "A single-player paddle duel with tuned ball speed, responsive control, and an AI opponent.",
    description:
      "Pong pushes the shared utility layer harder with continuous movement, collision response, score handling, and a simple AI paddle. It is keyboard-first, playable instantly, and representative of the sort of arcade loops the platform should be able to host cleanly.",
    thumbnail: "/games/pong/thumbnail.svg",
    genre: "Arcade",
    tags: ["Canvas", "Collision", "AI", "Score Loop"],
    controls: {
      summary: "W and S or the arrow keys move your paddle. Space serves and restarts.",
      items: [
        { label: "Move paddle", action: "W / S or Arrow Up / Arrow Down" },
        { label: "Start / Restart", action: "Space" },
        { label: "Pause", action: "P" },
        { label: "Touch", action: "Hold on-screen up or down controls" },
      ],
    },
    difficulty: "medium",
    sessionLength: "3-6 min",
    releaseDate: "2026-03-22",
    status: "live",
    featured: true,
    published: true,
    supports: ["keyboard", "touch"],
    mobileSupport: "desktop-best",
    version: "1.0.0",
    developerNotes:
      "Pong uses the same animation and canvas helpers as Snake, but its update loop is fully time-based instead of tick-based.",
    libraryOrder: 2,
    featurePriority: 2,
  },
  {
    slug: "reaction-time",
    title: "Reaction Time Test",
    shortDescription:
      "A timing-focused reflex test with keyboard, mouse, and touch support plus session tracking.",
    description:
      "Reaction Time Test gives the platform a lighter game shape that does not need a continuous Canvas loop. Wait for the signal, react without jumping early, and track your recent attempts and personal best locally in the browser.",
    thumbnail: "/games/reaction-time/thumbnail.svg",
    genre: "Reaction",
    tags: ["DOM", "Timing", "Input", "Session Stats"],
    controls: {
      summary: "Press space, enter, click, or tap when the card flashes ready.",
      items: [
        { label: "Start", action: "Space, Enter, click, or tap" },
        { label: "React", action: "Space, Enter, click, or tap once ready" },
        { label: "Reset", action: "R" },
      ],
    },
    difficulty: "easy",
    sessionLength: "30 sec",
    releaseDate: "2026-02-28",
    status: "beta",
    featured: false,
    published: true,
    supports: ["keyboard", "mouse", "touch"],
    mobileSupport: "full",
    version: "0.9.0",
    developerNotes:
      "This module intentionally uses direct DOM interaction and stateful timing logic to keep the overall architecture flexible.",
    libraryOrder: 3,
  },
] satisfies readonly GameCatalogEntry[];

export type GameSlug = (typeof gameCatalog)[number]["slug"];
