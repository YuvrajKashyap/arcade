# Arcade

![Arcade dashboard](./public/brand/readme-home.png)

**Arcade** is a production-style browser arcade built as a real web platform, not a folder of isolated demos. The app opens on a single dashboard where users can browse the published catalog, jump into a game, read controls, play inside a focused game theater, and come back for another run.

The portfolio goal is direct: prove that I can ship a polished interactive product, not just static pages.

## Live Site

```txt
https://arcade.yuvrajkashyap.com
```

Local development:

```txt
npm install
npm run dev
```

Then open:

```txt
http://localhost:3000
```

## What Recruiters Should Notice

Arcade is designed to show product engineering depth across a large interactive surface area:

- 21 published games on a single dashboard-driven product experience.
- Self-coded games using Canvas, DOM grids, animation loops, collision logic, board-game state machines, and local persistence.
- A typed game registry that powers cards, metadata, controls, related games, routing, and static generation.
- Client-only game runtimes mounted behind a shared game theater with keyboard capture, restart/fullscreen controls, and How to Play overlays.
- Mobile support added where it makes gameplay better, without compromising desktop-first keyboard play.
- Honest third-party integration for Pinball through vendored Flutter web assets with license and attribution files.
- Production checks: linting, typechecking, static build, SEO metadata, sitemap, app icons, and Vercel deployment.

The games are the content. The engineering signal is the platform around them: typed data, scalable routing, isolated runtimes, input handling, state persistence, and consistent product polish.

## Screenshots

### Dashboard

![Arcade dashboard game catalog](./public/brand/readme-home.png)

### Tetris Runtime

![Tetris game screen](./public/brand/readme-tetris.png)

### Snakes and Ladders Runtime

![Snakes and Ladders game screen](./public/brand/readme-snakes-and-ladders.png)

## Current Product Scope

| Area | Status |
| --- | --- |
| Single dashboard catalog | Live |
| Dynamic `/games/[slug]` routes | Live |
| Lazy client-only game runtimes | Live |
| Shared game theater and keyboard capture | Live |
| Per-game How to Play overlay | Live |
| Local best-score/progress persistence | Live where useful |
| Desktop keyboard controls | Live |
| Touch/mobile controls | Live for supported games |
| Vendored open-source Pinball integration | Live |
| Auth, cloud saves, global leaderboards | Future platform work |

## Game Catalog

The published catalog currently includes:

| Game | Engineering Focus |
| --- | --- |
| Snake | Smooth animated movement over deterministic grid rules, touch controls, best score |
| Pong | Paddle physics, AI opponent, neon rendering, difficulty tuning |
| Reaction Time Test | Timing state machine, early-click handling, average calculation |
| Tic Tac Toe | CPU difficulties, keyboard focus movement, local record |
| Pinball | Vendored Flutter Pinball build embedded through a local iframe wrapper |
| Breakout | Paddle/ball collision, bricks, levels, lives, powerups |
| Asteroids | Momentum, shooting, wrapping, asteroid splitting, waves |
| Minesweeper | Protected first reveal, flags, timer, board sizes, best times |
| 2048 | Merge semantics, slide/merge/spawn animation, keyboard and swipe input |
| Doodle Jump | Camera tracking, platform generation, breakable platforms, score loop |
| Flappy Bird | Gravity/flap physics, pipes, collision, tap input |
| Crossy Roads | Lane traffic, hop movement, camera advancement, collision |
| Chrome Dino | Runner loop, speed ramp, jump/duck, obstacle timing |
| Pac-Man | Maze movement, pellets, power pellets, frightened ghosts, three-level run |
| Tetris | 7-bag queue, hold, ghost piece, SRS wall kicks, lock delay, combos |
| Cookie Clicker | Incremental economy, upgrades, passive production, saved progress |
| Snakes and Ladders | Dice flow, exact finish, CPU pacing, snakes, ladders, mobile roll button |
| Sorry! | Card/pawn rules, legal move generation, safety lanes, slides, bumps, CPU turns |
| Street Fighter | Health, timer, jump, punch/kick, CPU pressure |
| Helix Jump | Rotating stack, danger slices, gap detection, scoring |
| Stack | Timing-based placement, overlap trimming, speed ramp |

The source of truth is [src/content/games/registry.ts](./src/content/games/registry.ts).

## Architecture

```txt
src/
  app/
    page.tsx                Dashboard route
    games/[slug]/page.tsx   Dynamic playable game route
    layout.tsx              App metadata, analytics, shell
  components/
    homepage/               Dashboard sections
    games/                  Game theater, runtime boundary, player wrapper
    layout/                 Site shell
  content/games/
    registry.ts             Typed game metadata
  features/games/
    runtime.tsx             Lazy runtime map
    shared/                 Shared game UI, animation loop, storage helpers
    <game>/                 Self-contained game implementation
  lib/games/
    catalog.ts              Derived catalog selectors
  types/
    game.ts                 Shared metadata contracts
public/
  games/                    Game thumbnails
  vendor/flutter-pinball/   Vendored static Pinball build plus attribution
  brand/                    README and brand screenshots
docs/                       Architecture/design/roadmap notes
```

The key design choice is separation:

- The registry knows metadata, but not runtime code.
- The runtime map lazy-loads playable modules by slug.
- Game pages stay generic and catalog-driven.
- Individual games own their state machines, rendering, and controls.

That keeps the platform maintainable as the catalog grows.

## Technical Highlights

### Registry-Driven Product Model

Every game has typed metadata: slug, title, descriptions, thumbnail, genre, tags, controls, release status, supported inputs, mobile support, related games, and How to Play content. That one contract powers the dashboard, routes, metadata, and player help.

### Runtime Isolation

Games are mounted through [src/features/games/runtime.tsx](./src/features/games/runtime.tsx) and [src/components/games/game-player.tsx](./src/components/games/game-player.tsx). This keeps heavy client-only games out of the dashboard bundle until a user opens them.

### Multiple Interaction Models

The codebase intentionally supports different game architectures:

- Canvas-style loops for arcade/action games.
- DOM grids for board and puzzle games.
- Deterministic state transitions for rules-heavy games.
- Touch-specific controls where phone play needs a different input layer.
- A local iframe wrapper for the open-source Pinball integration.

### Input and Viewport Work

Game routes capture gameplay keys so arrow keys, WASD, Space, and similar controls do not scroll the page. Game pages also use viewport-fit constraints so the play surface, HUD, status, and mobile controls fit inside the arcade theater.

### Attribution and Licensing

Pinball is treated as a third-party integration, not claimed as original work. The vendored build includes attribution and license files under:

```txt
public/vendor/flutter-pinball/
```

The rest of the playable games are self-coded implementations with original rendered art, using familiar public gameplay patterns rather than copied proprietary assets.

## Tech Stack

| Layer | Tools |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Motion | Framer Motion and CSS transitions |
| Analytics | Vercel Analytics |
| Deployment | Vercel |

## Verification

```bash
npm run lint
npm run typecheck
npm run build
```

Or run all checks:

```bash
npm run check
```

## Environment

```bash
NEXT_PUBLIC_SITE_URL=https://arcade.yuvrajkashyap.com
```

This is used for canonical metadata, sitemap URLs, and Open Graph URLs. See [.env.example](./.env.example).

## Adding a Game

The platform is designed so new games follow a repeatable path:

1. Add a feature folder under `src/features/games/<slug>/`.
2. Export the runtime from `src/features/games/<slug>/index.ts`.
3. Add assets under `public/games/<slug>/`.
4. Add metadata in `src/content/games/registry.ts`.
5. Register the lazy runtime in `src/features/games/runtime.tsx`.
6. Run `npm run check`.

Full guide: [docs/adding-a-game.md](./docs/adding-a-game.md)

## Best Files to Review

Start here if you are evaluating the engineering:

- [src/content/games/registry.ts](./src/content/games/registry.ts) - typed product catalog.
- [src/lib/games/catalog.ts](./src/lib/games/catalog.ts) - derived dashboard collections and route data.
- [src/features/games/runtime.tsx](./src/features/games/runtime.tsx) - lazy runtime mapping.
- [src/components/games/game-page-view.tsx](./src/components/games/game-page-view.tsx) - arcade theater, keyboard capture, help overlay.
- [src/features/games/tetris/components/block-drop-game.tsx](./src/features/games/tetris/components/block-drop-game.tsx) - advanced falling-block runtime.
- [src/features/games/pacman/components/pac-maze-game.tsx](./src/features/games/pacman/components/pac-maze-game.tsx) - maze chase runtime.
- [src/features/games/sorry/components/sorry-sprint-game.tsx](./src/features/games/sorry/components/sorry-sprint-game.tsx) - board-game rules and legal move generation.

## Roadmap

The strongest next product upgrades are platform features, not just more games:

- user accounts and cloud saves
- global and per-game leaderboards
- achievements
- sound settings and per-game audio polish
- a credits/licenses screen for third-party integrations
- automated screenshot capture for the catalog
- analytics-informed dashboard ordering
- multiplayer for selected games

## Documentation

- [Architecture](./docs/architecture.md)
- [Adding a Game](./docs/adding-a-game.md)
- [Design System](./docs/design-system.md)
- [Roadmap](./docs/roadmap.md)
- [Contributing](./CONTRIBUTING.md)

## License

No open-source license has been selected for this repository. Until that changes, treat the project code as all rights reserved.

Third-party assets/builds retain their own licenses and attribution, including the vendored Flutter Pinball build under `public/vendor/flutter-pinball/`.
