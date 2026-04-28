import type { GameCatalogEntry } from "@/types/game";

export const gameCatalog = [
  {
    slug: "snake",
    title: "Snake",
    shortDescription:
      "A smooth animated snake run with arcade lighting, expressive motion, and instant score-chase flow.",
    description:
      "Guide a living neon snake through a polished arcade arena, chain glowing food pickups, and protect your tail as the run accelerates. Snake keeps the classic collision rules underneath while using interpolated Canvas animation, character styling, and pickup effects to feel like a real game.",
    thumbnail: "/games/snake/thumbnail.png",
    genre: "Arcade",
    tags: ["Canvas", "Animation", "High Score", "Keyboard"],
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
      "The rule engine remains grid-based for clean collisions and scoring, while the Canvas renderer interpolates movement and draws the snake as a polished animated character.",
    libraryOrder: 1,
    featurePriority: 1,
    relatedSlugs: ["pong", "reaction-time"],
  },
  {
    slug: "pong",
    title: "Pong",
    shortDescription:
      "A neon paddle duel with glowing impacts, smooth ball trails, responsive control, and an AI opponent.",
    description:
      "Pong turns the classic paddle duel into a premium neon arena with glowing paddles, luminous ball trails, impact sparks, score bursts, and three tuned AI difficulties. The match still proves the platform's continuous Canvas loop, collision response, score handling, and instant restart flow.",
    thumbnail: "/games/pong/thumbnail.png",
    genre: "Arcade",
    tags: ["Canvas", "Neon", "AI", "Score Loop"],
    controls: {
      summary:
        "Pick a difficulty, then use W/S or the arrow keys to move. Space serves and restarts.",
      items: [
        { label: "Difficulty", action: "Easy, Medium, or Difficult" },
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
      "Pong keeps its time-based rule loop separate from the renderer, so visual effects can feel premium without changing match scoring or collision behavior.",
    libraryOrder: 2,
    featurePriority: 2,
    relatedSlugs: ["snake", "reaction-time"],
  },
  {
    slug: "reaction-time",
    title: "Reaction Time Test",
    shortDescription:
      "A timing-focused reflex test with keyboard, mouse, and touch support plus session tracking.",
    description:
      "Reaction Time Test gives the platform a lighter game shape that does not need a continuous Canvas loop. Wait for the signal, react without jumping early, and track your recent attempts and personal best locally in the browser.",
    thumbnail: "/games/reaction-time/thumbnail.png",
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
    relatedSlugs: ["snake", "pong"],
  },
  {
    slug: "tic-tac-toe",
    title: "Tic Tac Toe",
    shortDescription:
      "A clean three-by-three duel against an unbeatable CPU with keyboard, mouse, and touch support.",
    description:
      "Tic Tac Toe adds a turn-based strategy loop to the arcade. Claim the center, fight for corners, and pressure the board before the CPU blocks every fork. It is fast to read, easy to control, and useful for validating the platform's non-canvas interaction patterns.",
    thumbnail: "/games/tic-tac-toe/thumbnail.png",
    genre: "Puzzle",
    tags: ["Strategy", "Board", "AI", "Keyboard", "Touch"],
    controls: {
      summary:
        "Choose easy, medium, hard, or impossible, then click, tap, or press Enter on a focused cell to place X.",
      items: [
        { label: "Place mark", action: "Click, tap, Enter, or Space" },
        { label: "Move focus", action: "Arrow keys or WASD" },
        { label: "Set difficulty", action: "Easy, Medium, Hard, or Impossible" },
        { label: "Restart round", action: "R" },
        { label: "Clear current record", action: "C" },
      ],
    },
    difficulty: "medium",
    sessionLength: "1-3 min",
    releaseDate: "2026-03-25",
    status: "live",
    featured: false,
    published: true,
    supports: ["keyboard", "mouse", "touch"],
    mobileSupport: "full",
    version: "1.0.0",
    developerNotes:
      "The CPU now exposes four difficulty bands, ranging from loose random play to a full ordered minimax search on impossible.",
    libraryOrder: 4,
    relatedSlugs: ["reaction-time", "snake"],
  },
  {
    slug: "pinball",
    title: "Pinball",
    shortDescription:
      "The open-source Flutter Pinball table embedded as a full arcade cabinet experience.",
    description:
      "Pinball now runs the open-source Flutter Pinball game as a local static web embed, bringing a polished table, character selection, responsive controls, audio, scoring, and mobile support into the arcade without relying on external services.",
    thumbnail: "/games/pinball/thumbnail.png",
    genre: "Arcade",
    tags: ["Canvas", "Physics", "Score Loop", "Keyboard", "Touch"],
    controls: {
      summary:
        "Use the Flutter Pinball on-screen prompts. Keyboard and touch controls are handled inside the embedded game.",
      items: [
        { label: "Start", action: "Follow the in-game start flow" },
        { label: "Flippers", action: "Keyboard controls or on-screen mobile controls" },
        { label: "Launch", action: "In-game launcher control" },
        { label: "Restart", action: "Use the arcade Restart button to reload the table" },
      ],
    },
    difficulty: "medium",
    sessionLength: "3-8 min",
    releaseDate: "2026-04-27",
    status: "live",
    featured: true,
    published: true,
    supports: ["keyboard", "touch"],
    mobileSupport: "desktop-best",
    version: "1.0.0",
    developerNotes:
      "Pinball vendors the MIT-licensed Flutter Pinball web build as static assets and embeds it client-side so Vercel does not need Flutter during deployment.",
    libraryOrder: 5,
    featurePriority: 3,
    relatedSlugs: ["breakout", "pong"],
  },
  {
    slug: "breakout",
    title: "Breakout",
    shortDescription:
      "A three-level brick breaker with paddle angles, lives, best score, and a wide-paddle powerup.",
    description:
      "Breakout extends the paddle-and-ball foundation with level progression, durable bricks, score routing, lives, pointer movement, touch controls, and a catchable wide-paddle capsule. It is quick to learn but rewards sharper rebound control.",
    thumbnail: "/games/breakout/thumbnail.png",
    genre: "Arcade",
    tags: ["Canvas", "Collision", "Powerups", "Score Loop"],
    controls: {
      summary:
        "Move with A/D, arrow keys, mouse, or touch. Space starts the serve and P pauses.",
      items: [
        { label: "Move paddle", action: "A/D, Arrow Left/Right, mouse, or touch" },
        { label: "Start / Restart", action: "Space or Start" },
        { label: "Pause", action: "P" },
        { label: "Touch", action: "On-screen left, serve, and right controls" },
      ],
    },
    difficulty: "medium",
    sessionLength: "3-6 min",
    releaseDate: "2026-04-27",
    status: "live",
    featured: true,
    published: true,
    supports: ["keyboard", "mouse", "touch"],
    mobileSupport: "full",
    version: "1.0.0",
    developerNotes:
      "Breakout reuses the shared canvas loop while adding pointer-targeted paddle control and local best-score persistence.",
    libraryOrder: 6,
    featurePriority: 4,
    relatedSlugs: ["pinball", "pong"],
  },
  {
    slug: "asteroids",
    title: "Asteroids",
    shortDescription:
      "Ship inertia, screen wrap, shooting, splitting rocks, waves, lives, and local high-score chasing.",
    description:
      "Asteroids adds momentum-based flight and projectile combat to the arcade. Rotate through drifting rock fields, break large asteroids into smaller threats, survive escalating waves, and protect your remaining ships.",
    thumbnail: "/games/asteroids/thumbnail.png",
    genre: "Arcade",
    tags: ["Canvas", "Inertia", "Shooting", "Waves", "Keyboard"],
    controls: {
      summary:
        "A/D or arrows rotate, W or Arrow Up thrusts, Space fires, and P pauses.",
      items: [
        { label: "Rotate", action: "A/D or Arrow Left/Right" },
        { label: "Thrust", action: "W or Arrow Up" },
        { label: "Fire", action: "Space" },
        { label: "Pause", action: "P" },
        { label: "Touch", action: "On-screen turn, thrust, and fire controls" },
      ],
    },
    difficulty: "hard",
    sessionLength: "4-8 min",
    releaseDate: "2026-04-27",
    status: "live",
    featured: false,
    published: true,
    supports: ["keyboard", "touch"],
    mobileSupport: "partial",
    version: "1.0.0",
    developerNotes:
      "The wave system is intentionally deterministic in shape but still uses varied asteroid entry points and velocities for replayability.",
    libraryOrder: 7,
    relatedSlugs: ["pinball", "breakout"],
  },
  {
    slug: "minesweeper",
    title: "Minesweeper",
    shortDescription:
      "A clean minefield puzzle with three board sizes, protected first reveal, flags, timer, and best times.",
    description:
      "Minesweeper gives the arcade a slower tactical puzzle. Choose a board size, reveal safe regions, flag suspected mines, and race your local best time without leaving the same instant-play game shell.",
    thumbnail: "/games/minesweeper/thumbnail.png",
    genre: "Puzzle",
    tags: ["Puzzle", "Grid", "Timing", "Mouse", "Touch"],
    controls: {
      summary:
        "Click or tap to reveal, right-click or flag mode to mark mines, F flags the focused cell, and R restarts.",
      items: [
        { label: "Reveal", action: "Click, tap, Enter, or Space" },
        { label: "Flag", action: "Right-click, long-press, Flag Mode, or F" },
        { label: "Move focus", action: "Arrow keys or WASD" },
        { label: "Restart", action: "R or Restart" },
      ],
    },
    difficulty: "medium",
    sessionLength: "2-10 min",
    releaseDate: "2026-04-27",
    status: "live",
    featured: false,
    published: true,
    supports: ["keyboard", "mouse", "touch"],
    mobileSupport: "full",
    version: "1.0.0",
    developerNotes:
      "Minesweeper stays DOM-based to support keyboard focus, right-click flagging, long-press flagging, and responsive board layouts.",
    libraryOrder: 8,
    relatedSlugs: ["tic-tac-toe", "reaction-time"],
  },
] satisfies readonly GameCatalogEntry[];

export type GameSlug = (typeof gameCatalog)[number]["slug"];

