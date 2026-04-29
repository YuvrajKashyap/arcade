import type { GameCatalogEntry } from "@/types/game";

export const gameCatalog = [
  {
    slug: "snake",
    title: "Snake",
    shortDescription:
      "A smooth animated snake run with arcade lighting, expressive motion, and instant score-chase flow.",
    description:
      "Guide a living neon snake through a polished arcade arena, chain glowing food pickups, and protect your tail as the run accelerates. Snake keeps the classic collision rules underneath while using interpolated Canvas animation, character styling, and pickup effects to feel like a real game.",
    thumbnail: "/games/snake/thumbnail.png?v=20260428",
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
    thumbnail: "/games/pong/thumbnail.png?v=20260428",
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
      "A color-driven reflex test: wait for green, click fast, and track your 3-run average.",
    description:
      "Reaction Time Test is a polished reflex drill built around clear visual states: wait through the amber hold, click when the panel turns green, and get a red fail state if you jump early. It tracks recent attempts, personal best, and a highlighted 3-run average locally in the browser.",
    thumbnail: "/games/reaction-time/thumbnail.png?v=20260428",
    genre: "Reaction",
    tags: ["DOM", "Timing", "Color Cue", "Session Stats"],
    controls: {
      summary: "Wait for green, then press space, enter, click, or tap.",
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
      "A bright toy-board duel with blue Xs, green Os, CPU difficulties, and fast local records.",
    description:
      "Tic Tac Toe turns the classic three-by-three duel into a playful board game with glossy marks, colorful feedback, keyboard focus, touch controls, and four CPU difficulty levels. Claim the center, fight for corners, and build a line before the CPU blocks the board.",
    thumbnail: "/games/tic-tac-toe/thumbnail.png?v=20260428",
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
    thumbnail: "/games/pinball/thumbnail.png?v=20260428",
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
    thumbnail: "/games/breakout/thumbnail.png?v=20260428",
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
      "A cartoon space shooter with a real ship, laser fire, chunky asteroids, waves, and local high scores.",
    description:
      "Asteroids turns momentum-based flight into a colorful cartoon space run. Pilot a hand-drawn ship through layered stars, fire glowing lasers, crack chunky asteroids into smaller threats, survive escalating waves, and protect your remaining ships.",
    thumbnail: "/games/asteroids/thumbnail.png?v=20260428",
    genre: "Arcade",
    tags: ["Canvas", "Cartoon", "Shooting", "Waves", "Keyboard"],
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
    thumbnail: "/games/minesweeper/thumbnail.png?v=20260428",
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
    howToPlay: {
      summary:
        "Reveal safe spaces and flag the mines. The first click is protected, so start anywhere.",
      tips: [
        "Numbers tell you how many mines touch that square.",
        "Use flags when you are pretty sure a covered square is a mine.",
        "Win by revealing every safe square, not by clicking the mines.",
      ],
    },
    libraryOrder: 8,
    relatedSlugs: ["tic-tac-toe", "reaction-time"],
  },
  {
    slug: "2048",
    title: "2048",
    shortDescription:
      "A warm cartoon take on 2048 with chunky tiles, swipe controls, local best score, and classic merges.",
    description:
      "2048 brings the classic sliding-number puzzle into the arcade with a warm toy-board look, playful tile pops, keyboard and swipe controls, local best-score persistence, and the standard chase to merge up to the 2048 tile.",
    thumbnail: "/games/2048/thumbnail.png?v=20260428",
    genre: "Puzzle",
    tags: ["Puzzle", "Board", "Swipe", "Keyboard", "High Score"],
    controls: {
      summary:
        "Use arrow keys, WASD, or touch swipes to slide the board. R starts a new game.",
      items: [
        { label: "Slide", action: "Arrow keys, WASD, or touch swipe" },
        { label: "Restart", action: "R or New Game" },
        { label: "Goal", action: "Merge matching tiles up to 2048" },
      ],
    },
    difficulty: "medium",
    sessionLength: "2-8 min",
    releaseDate: "2026-04-28",
    status: "live",
    featured: false,
    published: true,
    supports: ["keyboard", "mouse", "touch"],
    mobileSupport: "full",
    version: "1.0.0",
    developerNotes:
      "2048 is implemented as a DOM grid with deterministic merge semantics and local best-score persistence.",
    libraryOrder: 9,
    relatedSlugs: ["minesweeper", "tic-tac-toe"],
  },
  {
    slug: "doodle-jump",
    title: "Doodle Jump",
    shortDescription:
      "A paper-doodle platform climber with visible score, cracked platforms, bouncy motion, and local high scores.",
    description:
      "Doodle Jump adds a vertical platformer loop to the arcade: steer a cute jumper across a paper-like playfield, wrap around the sides, bounce from platform to platform, dodge cracked breakable platforms, climb for score, and restart instantly when you fall.",
    thumbnail: "/games/doodle-jump/thumbnail.png?v=20260428",
    genre: "Platformer",
    tags: ["Canvas", "Platformer", "Cartoon", "High Score", "Touch"],
    controls: {
      summary:
        "Use A/D or Arrow Left/Right to steer. Space starts or restarts, and P pauses.",
      items: [
        { label: "Steer", action: "A/D or Arrow Left/Right" },
        { label: "Start / Restart", action: "Space or Start" },
        { label: "Pause", action: "P" },
        { label: "Touch", action: "On-screen left and right controls" },
      ],
    },
    difficulty: "medium",
    sessionLength: "3-8 min",
    releaseDate: "2026-04-28",
    status: "live",
    featured: false,
    published: true,
    supports: ["keyboard", "touch"],
    mobileSupport: "full",
    version: "1.0.0",
    developerNotes:
      "Doodle Jump is a self-coded canvas platformer inspired by the genre, with keyboard and touch controls instead of mobile tilt.",
    libraryOrder: 10,
    relatedSlugs: ["snake", "asteroids"],
  },
  {
    slug: "flappy-bird",
    title: "Flappy Bird",
    shortDescription:
      "A bright cartoon pipe dodger with tap-to-flap physics, chunky pipes, in-canvas score, and best-score chase.",
    description:
      "Flappy Bird brings a quick reflex loop into the arcade with self-coded gravity and flap physics, scrolling green pipes, a bright cartoon sky, tap/click/keyboard controls, collision, score on pipe pass, pause, restart, and local best-score persistence.",
    thumbnail: "/games/flappy-bird/thumbnail.png?v=20260428",
    genre: "Arcade",
    tags: ["Canvas", "Cartoon", "Physics", "Tap", "High Score"],
    controls: {
      summary:
        "Press Space, Arrow Up, W, click, or tap to flap. P pauses and R restarts.",
      items: [
        { label: "Flap", action: "Space, Arrow Up, W, click, or tap" },
        { label: "Pause", action: "P" },
        { label: "Restart", action: "R or Start" },
        { label: "Goal", action: "Fly through pipe gaps and score on each pass" },
      ],
    },
    difficulty: "medium",
    sessionLength: "1-4 min",
    releaseDate: "2026-04-29",
    status: "live",
    featured: false,
    published: true,
    supports: ["keyboard", "mouse", "touch"],
    mobileSupport: "full",
    version: "1.0.0",
    developerNotes:
      "Flappy Bird is a self-coded Canvas arcade loop inspired by the genre, with original cartoon drawing code and local score persistence.",
    howToPlay: {
      summary: "Keep the bird in the air and slip through each pipe gap.",
      tips: [
        "Short taps give cleaner control than holding the flap key.",
        "You score after the bird fully passes a pipe pair.",
        "Touching a pipe, the ceiling, or the ground ends the run.",
      ],
    },
    libraryOrder: 11,
    relatedSlugs: ["doodle-jump", "crossy-roads"],
  },
  {
    slug: "crossy-roads",
    title: "Crossy Roads",
    shortDescription:
      "A colorful hop-and-dodge road game with chunky traffic, swipe controls, camera advance, and local best score.",
    description:
      "Crossy Roads turns one-tile hops into a fast cartoon traffic challenge. Move lane by lane, dodge cars and trucks, advance the camera upward, score by your highest lane, and restart instantly after a collision.",
    thumbnail: "/games/crossy-roads/thumbnail.png?v=20260428",
    genre: "Arcade",
    tags: ["Canvas", "Cartoon", "Grid", "Traffic", "Touch"],
    controls: {
      summary:
        "Use Arrow keys, WASD, or touch swipes to hop. P pauses and R restarts.",
      items: [
        { label: "Hop", action: "Arrow keys, WASD, or touch swipe" },
        { label: "Pause", action: "P" },
        { label: "Restart", action: "R or Start" },
        { label: "Goal", action: "Reach higher lanes without getting hit" },
      ],
    },
    difficulty: "medium",
    sessionLength: "2-6 min",
    releaseDate: "2026-04-29",
    status: "live",
    featured: false,
    published: true,
    supports: ["keyboard", "touch"],
    mobileSupport: "full",
    version: "1.0.0",
    developerNotes:
      "Crossy Roads is a self-coded Canvas lane game with deterministic lane generation, moving traffic, hop animation, camera advancement, and local best-score persistence.",
    howToPlay: {
      summary: "Hop across lanes, time traffic gaps, and keep moving upward.",
      tips: [
        "Grass lanes are safe; road lanes have moving vehicles.",
        "Your score is the highest lane you reach in the run.",
        "A vehicle collision ends the run immediately.",
      ],
    },
    libraryOrder: 12,
    relatedSlugs: ["flappy-bird", "doodle-jump"],
  },
] satisfies readonly GameCatalogEntry[];

export type GameSlug = (typeof gameCatalog)[number]["slug"];

