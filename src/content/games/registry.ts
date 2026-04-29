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
        "Use Space, Arrow keys, WASD, or touch swipes to hop. P pauses and R restarts.",
      items: [
        { label: "Hop", action: "Space, Arrow keys, WASD, or touch swipe" },
        { label: "Pause", action: "P" },
        { label: "Restart", action: "R or Start button" },
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
  {
    slug: "chrome-dino",
    title: "Chrome Dino",
    shortDescription:
      "A monochrome runner with jump, duck, cactus and flyer obstacles, speed ramp, and local high score.",
    description:
      "Chrome Dino is a self-coded browser runner inspired by offline arcade classics: jump over cactus clusters, duck under flyers, survive the speed ramp, and chase a local best score inside the arcade shell.",
    thumbnail: "/games/chrome-dino/thumbnail.png?v=20260428",
    genre: "Arcade",
    tags: ["Canvas", "Runner", "Keyboard", "High Score", "Touch"],
    controls: {
      summary: "Space, W, or Arrow Up jumps. S or Arrow Down ducks. P pauses and R restarts.",
      items: [
        { label: "Jump", action: "Space, W, Arrow Up, tap, or Jump button" },
        { label: "Duck", action: "S, Arrow Down, or Duck button" },
        { label: "Pause", action: "P" },
        { label: "Restart", action: "R or Start" },
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
      "Chrome Dino uses original canvas art and a simple deterministic runner loop with speed scaling and local score persistence.",
    howToPlay: {
      summary: "Stay alive as long as possible while the run keeps getting faster.",
      tips: [
        "Jump over low obstacles.",
        "Duck under flying obstacles once they appear.",
        "Your score climbs automatically while you survive.",
      ],
    },
    libraryOrder: 13,
    relatedSlugs: ["flappy-bird", "doodle-jump"],
  },
  {
    slug: "pacman",
    title: "Pac-Man",
    shortDescription:
      "A classic three-level maze chase with pellets, power pellets, four ghosts, lives, score, and local best.",
    description:
      "Pac-Man is a self-coded arcade maze chase with a faithful 28-by-31 maze structure, three levels, pellets, power pellets, frightened ghosts, tunnels, lives, scoring, restart, and keyboard/touch steering.",
    thumbnail: "/games/pacman/thumbnail.png?v=20260428",
    genre: "Arcade",
    tags: ["Canvas", "Maze", "Chase", "Keyboard", "Score Loop"],
    controls: {
      summary: "Arrow keys or WASD steer. Space or R restarts, and P pauses.",
      items: [
        { label: "Steer", action: "Arrow keys, WASD, or touch direction pad" },
        { label: "Power pellet", action: "Eat large pellets to frighten chasers" },
        { label: "Pause", action: "P" },
        { label: "Restart", action: "Space, R, or Start" },
      ],
    },
    difficulty: "medium",
    sessionLength: "3-8 min",
    releaseDate: "2026-04-29",
    status: "live",
    featured: false,
    published: true,
    supports: ["keyboard", "touch"],
    mobileSupport: "full",
    version: "1.0.0",
    developerNotes:
      "Pac-Man is self-coded with canvas rendering, tile-center movement, arcade-style ghost targeting, frightened mode, and local best-score persistence.",
    howToPlay: {
      summary: "Clear three maze levels while avoiding the chasers.",
      tips: [
        "Small pellets score points and disappear when eaten.",
        "Large pellets temporarily turn chasers vulnerable.",
        "Clear all pellets to advance levels 1-3, then win the run.",
        "Lose all lives and the run ends.",
      ],
    },
    libraryOrder: 14,
    relatedSlugs: ["chrome-dino", "tetris"],
  },
  {
    slug: "tetris",
    title: "Tetris",
    shortDescription:
      "A falling-block puzzle with seven shapes, rotation, hard drop, line clears, levels, and local best score.",
    description:
      "Tetris brings a polished falling-block loop to the arcade with a 10-by-20 board, seven geometric pieces, rotation, hard drop, line clears, levels, scoring, pause, restart, and touch controls.",
    thumbnail: "/games/tetris/thumbnail.png?v=20260428",
    genre: "Puzzle",
    tags: ["Puzzle", "Blocks", "Keyboard", "Score Loop", "Touch"],
    controls: {
      summary: "Arrow keys or WASD move, Up/W rotates, Space hard drops, P pauses, and R restarts.",
      items: [
        { label: "Move", action: "A/D or Arrow Left/Right" },
        { label: "Soft drop", action: "S or Arrow Down" },
        { label: "Rotate", action: "W, X, or Arrow Up" },
        { label: "Hard drop", action: "Space" },
      ],
    },
    difficulty: "medium",
    sessionLength: "3-10 min",
    releaseDate: "2026-04-29",
    status: "live",
    featured: false,
    published: true,
    supports: ["keyboard", "touch"],
    mobileSupport: "full",
    version: "1.0.0",
    developerNotes:
      "Tetris uses original DOM-rendered tiles and a self-contained board reducer for movement, rotation, locking, line clears, and level speed.",
    howToPlay: {
      summary: "Stack falling blocks and clear full rows before the board fills.",
      tips: [
        "Clear more rows at once for more points.",
        "Levels increase as you clear lines.",
        "Use hard drop when a piece is lined up.",
      ],
    },
    libraryOrder: 15,
    relatedSlugs: ["2048", "pacman"],
  },
  {
    slug: "cookie-clicker",
    title: "Cookie Clicker",
    shortDescription:
      "A cozy clicker with a big cookie, automatic upgrades, cookies-per-second, and saved progress.",
    description:
      "Cookie Clicker is a self-coded incremental game: click the cookie, buy upgrades, grow cookies-per-second, save progress locally, and reset when you want a fresh run.",
    thumbnail: "/games/cookie-clicker/thumbnail.png?v=20260428",
    genre: "Arcade",
    tags: ["Clicker", "Incremental", "Mouse", "Touch", "Persistence"],
    controls: {
      summary: "Click, tap, Space, or Enter to bake. Number keys buy upgrades. R resets.",
      items: [
        { label: "Bake", action: "Click, tap, Space, or Enter" },
        { label: "Buy upgrades", action: "Click upgrade cards or press 1, 2, 3" },
        { label: "Reset", action: "R or Reset" },
        { label: "Goal", action: "Grow cookies-per-second and total cookies" },
      ],
    },
    difficulty: "easy",
    sessionLength: "2-15 min",
    releaseDate: "2026-04-29",
    status: "live",
    featured: false,
    published: true,
    supports: ["keyboard", "mouse", "touch"],
    mobileSupport: "full",
    version: "1.0.0",
    developerNotes:
      "Cookie Clicker stores its full local run state and uses a small incremental economy with active clicks and passive CPS.",
    howToPlay: {
      summary: "Bake cookies, spend them on upgrades, and increase passive production.",
      tips: [
        "Upgrades cost more each time you buy them.",
        "Cookies-per-second keeps producing while the game is open.",
        "Reset clears the local run.",
      ],
    },
    libraryOrder: 16,
    relatedSlugs: ["2048", "chrome-dino"],
  },
  {
    slug: "snakes-and-ladders",
    title: "Snakes and Ladders",
    shortDescription:
      "A bright snakes-and-ladders board race with dice rolls, CPU turns, ladders, slides, and best-roll tracking.",
    description:
      "Snakes and Ladders turns the classic snakes-and-ladders loop into a quick cartoony browser board game. Roll the die, climb green ladders, slide down red snakes, race a CPU pawn, and reach square 100 in as few rolls as possible.",
    thumbnail: "/games/snakes-and-ladders/thumbnail.png?v=20260428",
    genre: "Puzzle",
    tags: ["Board", "Dice", "Cartoon", "Keyboard", "Touch"],
    controls: {
      summary: "Press Space, Enter, or Roll to roll the die. R restarts.",
      items: [
        { label: "Roll", action: "Space, Enter, or Roll button" },
        { label: "Restart", action: "R or Restart" },
        { label: "Ladders", action: "Green lines move you upward" },
        { label: "Snakes", action: "Red lines move you downward" },
      ],
    },
    difficulty: "easy",
    sessionLength: "2-6 min",
    releaseDate: "2026-04-29",
    status: "live",
    featured: false,
    published: true,
    supports: ["keyboard", "mouse", "touch"],
    mobileSupport: "full",
    version: "1.0.0",
    developerNotes:
      "Snakes and Ladders is a self-coded, original-art board game inspired by the public-domain snakes-and-ladders ruleset.",
    howToPlay: {
      summary: "Reach square 100 before the CPU.",
      tips: [
        "Ladders jump you forward.",
        "Snakes send you backward.",
        "Your best score is the fewest rolls needed to win.",
      ],
    },
    libraryOrder: 17,
    relatedSlugs: ["sorry", "tic-tac-toe"],
  },
  {
    slug: "sorry",
    title: "Sorry!",
    shortDescription:
      "A cartoony card-and-pawn race with start spaces, home goals, bumps, draw cards, and quick restarts.",
    description:
      "Sorry! is an original card-race board game inspired by classic pawn racers. Draw movement cards, bring blue pawns out of start, bump rival pawns back, and get all four home before the red rivals.",
    thumbnail: "/games/sorry/thumbnail.png?v=20260428",
    genre: "Strategy",
    tags: ["Board", "Cards", "Strategy", "Keyboard", "Touch"],
    controls: {
      summary: "Press Space, Enter, or Draw to draw a movement card. R restarts.",
      items: [
        { label: "Draw card", action: "Space, Enter, or Draw button" },
        { label: "Restart", action: "R or Restart" },
        { label: "Bump", action: "Landing on a rival sends it back to start" },
        { label: "Goal", action: "Get all four blue pawns home" },
      ],
    },
    difficulty: "medium",
    sessionLength: "3-8 min",
    releaseDate: "2026-04-29",
    status: "live",
    featured: false,
    published: true,
    supports: ["keyboard", "mouse", "touch"],
    mobileSupport: "full",
    version: "1.0.0",
    developerNotes:
      "Sorry! uses original board art and a simplified self-coded card movement loop without copying protected board artwork.",
    howToPlay: {
      summary: "Draw cards to move pawns from start to home.",
      tips: [
        "A 1 or 2 can bring a pawn out of start.",
        "Landing on a rival bumps it back.",
        "First side with all four pawns home wins.",
      ],
    },
    libraryOrder: 18,
    relatedSlugs: ["snakes-and-ladders", "tetris"],
  },
  {
    slug: "street-fighter",
    title: "Street Fighter",
    shortDescription:
      "A retro one-round fighter with health bars, timer, movement, jump, punch, kick, CPU pressure, and wins.",
    description:
      "Street Fighter brings a classic fighting-game feel without copied characters: health bars, timer, side-view arena, jump arcs, punch and kick timing, CPU movement, round wins, and instant restart.",
    thumbnail: "/games/street-fighter/thumbnail.png?v=20260428",
    genre: "Arcade",
    tags: ["Canvas", "Fighter", "Action", "Keyboard", "Score Loop"],
    controls: {
      summary: "A/D move, W jumps, J punches, K kicks. Space starts and R restarts.",
      items: [
        { label: "Move", action: "A/D or Arrow Left/Right" },
        { label: "Jump", action: "W or Arrow Up" },
        { label: "Attack", action: "J punch, K kick" },
        { label: "Start / Restart", action: "Space or R" },
      ],
    },
    difficulty: "hard",
    sessionLength: "2-5 min",
    releaseDate: "2026-04-29",
    status: "live",
    featured: false,
    published: true,
    supports: ["keyboard", "touch"],
    mobileSupport: "partial",
    version: "1.0.0",
    developerNotes:
      "Street Fighter uses original canvas-drawn fighters and UI inspired by arcade fighting conventions rather than copied sprites.",
    howToPlay: {
      summary: "Drain the rival's health before the timer ends.",
      tips: [
        "Stay close enough before attacking.",
        "Jump can break spacing.",
        "The higher health bar wins when time expires.",
      ],
    },
    libraryOrder: 19,
    relatedSlugs: ["chrome-dino", "asteroids"],
  },
  {
    slug: "helix-jump",
    title: "Helix Jump",
    shortDescription:
      "A colorful helix-fall arcade game with rotating platforms, gaps, danger slices, score, and high score.",
    description:
      "Helix Jump is an original vertical arcade dropper: rotate the stack, let the ball fall through gaps, bounce on safe slices, avoid black danger slices, and score each level you pass.",
    thumbnail: "/games/helix-jump/thumbnail.png?v=20260428",
    genre: "Arcade",
    tags: ["Canvas", "Reaction", "Physics", "Touch", "High Score"],
    controls: {
      summary: "A/D or Arrow Left/Right rotate the tower. Space starts and R restarts.",
      items: [
        { label: "Rotate", action: "A/D, Arrow Left/Right, or touch buttons" },
        { label: "Start / Restart", action: "Space or R" },
        { label: "Avoid", action: "Black slices end the run" },
        { label: "Goal", action: "Fall through as many gaps as possible" },
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
      "Helix Jump is a self-coded canvas dropper with original visuals, rotating arcs, collision slices, and local score persistence.",
    howToPlay: {
      summary: "Rotate the helix so the ball falls through open gaps.",
      tips: [
        "Safe slices bounce the ball upward.",
        "Gaps score and move you downward.",
        "Black danger slices end the run.",
      ],
    },
    libraryOrder: 20,
    relatedSlugs: ["stack", "flappy-bird"],
  },
  {
    slug: "stack",
    title: "Stack",
    shortDescription:
      "A clean stacking arcade game with moving blocks, overlap trimming, speed ramp, score, and best score.",
    description:
      "Stack is a self-coded timing game inspired by minimalist stacking arcades. Drop each moving block, keep only the overlapping section, build higher, and survive as the platform gets smaller and faster.",
    thumbnail: "/games/stack/thumbnail.png?v=20260428",
    genre: "Arcade",
    tags: ["Canvas", "Timing", "Stacking", "Touch", "High Score"],
    controls: {
      summary: "Press Space, Enter, click, or tap to drop the block. R restarts.",
      items: [
        { label: "Drop", action: "Space, Enter, click, or tap" },
        { label: "Restart", action: "R" },
        { label: "Goal", action: "Keep the overlap and build taller" },
        { label: "Fail", action: "Missing the overlap ends the run" },
      ],
    },
    difficulty: "medium",
    sessionLength: "1-5 min",
    releaseDate: "2026-04-29",
    status: "live",
    featured: false,
    published: true,
    supports: ["keyboard", "mouse", "touch"],
    mobileSupport: "full",
    version: "1.0.0",
    developerNotes:
      "Stack uses original canvas art and a compact overlap-trimming model for crisp timing gameplay.",
    howToPlay: {
      summary: "Drop moving blocks so they overlap the tower below.",
      tips: [
        "Only the overlapping part remains.",
        "The tower gets smaller if your timing is off.",
        "A full miss ends the run.",
      ],
    },
    libraryOrder: 21,
    relatedSlugs: ["helix-jump", "cookie-clicker"],
  },
] satisfies readonly GameCatalogEntry[];

export type GameSlug = (typeof gameCatalog)[number]["slug"];

