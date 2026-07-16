# Arcade

**A production-style browser arcade with 30 playable games, one typed platform model, and multiple runtime architectures.**

[![Arcade CI](https://github.com/YuvrajKashyap/arcade/actions/workflows/ci.yml/badge.svg)](https://github.com/YuvrajKashyap/arcade/actions/workflows/ci.yml)
[![Live Site](https://img.shields.io/badge/play-live-22c55e)](https://arcade.yuvrajkashyap.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)

[**Play Arcade**](https://arcade.yuvrajkashyap.com) · [Complete visual showcase](./docs/recruiter-showcase.md) · [Architecture](./docs/architecture.md) · [Adding a game](./docs/adding-a-game.md)

![Arcade dashboard with the playable catalog](./public/brand/readme-home.png)

Arcade is a browser-game platform built as a cohesive product rather than a folder of unrelated demos. A single dashboard, typed catalog, dynamic route model, shared game theater, lazy runtime map, input system, responsive framing, and local persistence support **30 published games** across Canvas, DOM, board, word, timing, physics, and incremental interaction models.

The games provide the content. The engineering signal is the platform around them: scalable routing, isolated runtimes, reusable browser mechanics, deterministic rules, collision and physics systems, CPU opponents, input capture, state persistence, product consistency, and deployment discipline.

## At a glance

| Signal | Current implementation |
| --- | ---: |
| Published games | **30** |
| Live / beta | **29 / 1** |
| Canvas-tagged runtimes | **16** |
| Full mobile support | **24** |
| Partial / desktop-best mobile support | **4 / 2** |
| Keyboard and touch metadata | **30 / 30 games** |
| Public route model | Dashboard, About, and 30 statically generated game pages |
| Verification gate | ESLint, TypeScript, Next.js production build |
| Deployment | Vercel at [arcade.yuvrajkashyap.com](https://arcade.yuvrajkashyap.com) |

These counts are derived from [the typed registry](./src/content/games/registry.ts), the product's source of truth.

## What recruiters should notice

- **Platform design:** one registry powers discovery cards, categories, related games, controls, metadata, routing, static generation, and mobile-support labels.
- **Runtime isolation:** client-only games load lazily behind a shared theater and error boundary instead of inflating every route.
- **Multiple application models:** Canvas loops, DOM grids, deterministic board state, legal-move generation, minimax, timing systems, local persistence, physics, and touch-specific controls coexist under one product.
- **Rules-heavy implementations:** Tetris includes 7-bag generation, hold, ghost pieces, SRS wall kicks, lock delay, and combos; Sorry! generates legal moves across cards, pawns, safety lanes, slides, and bumps.
- **Responsive interaction:** all catalog entries declare keyboard and touch support, with viewport and control strategies tailored to the game.
- **Production presentation:** SEO metadata, sitemap, analytics, app icons, CI, source attribution, documentation, and deployment are part of the repository.
- **Honest ownership:** Flutter Pinball is clearly isolated and attributed as a vendored open-source integration; the other published runtimes are self-coded implementations using familiar gameplay patterns.

## Complete visual evidence

The showcase system captures the real deployed product rather than mockups:

- dashboard and About page at desktop and mobile sizes
- all **30 game routes** at desktop and mobile sizes
- the shared How to Play interaction state
- 65 total recruiter-showcase captures when the full capture run completes

[**Open the complete route-by-route visual catalog →**](./docs/recruiter-showcase.md)

### Platform

![Arcade dashboard game catalog](./public/brand/readme-home.png)

### Representative advanced runtimes

| Tetris | Snakes and Ladders |
| --- | --- |
| ![Tetris runtime](./public/brand/readme-tetris.png) | ![Snakes and Ladders runtime](./public/brand/readme-snakes-and-ladders.png) |

The repository includes an automated [Playwright capture script](./scripts/capture-recruiter-showcase.mjs) and [showcase workflow](./.github/workflows/capture-recruiter-showcase.yml) so the evidence can be refreshed whenever the live interface changes.

## Complete game catalog

| | | | | |
| --- | --- | --- | --- | --- |
| [![Snake](./public/games/snake/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/snake)<br>**Snake** | [![Pong](./public/games/pong/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/pong)<br>**Pong** | [![Reaction Time](./public/games/reaction-time/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/reaction-time)<br>**Reaction Time** | [![Tic Tac Toe](./public/games/tic-tac-toe/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/tic-tac-toe)<br>**Tic Tac Toe** | [![Pinball](./public/games/pinball/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/pinball)<br>**Pinball** |
| [![Breakout](./public/games/breakout/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/breakout)<br>**Breakout** | [![Asteroids](./public/games/asteroids/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/asteroids)<br>**Asteroids** | [![Minesweeper](./public/games/minesweeper/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/minesweeper)<br>**Minesweeper** | [![2048](./public/games/2048/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/2048)<br>**2048** | [![Doodle Jump](./public/games/doodle-jump/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/doodle-jump)<br>**Doodle Jump** |
| [![Flappy Bird](./public/games/flappy-bird/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/flappy-bird)<br>**Flappy Bird** | [![Crossy Roads](./public/games/crossy-roads/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/crossy-roads)<br>**Crossy Roads** | [![Chrome Dino](./public/games/chrome-dino/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/chrome-dino)<br>**Chrome Dino** | [![Pac-Man](./public/games/pacman/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/pacman)<br>**Pac-Man** | [![Tetris](./public/games/tetris/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/tetris)<br>**Tetris** |
| [![Cookie Clicker](./public/games/cookie-clicker/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/cookie-clicker)<br>**Cookie Clicker** | [![Snakes & Ladders](./public/games/snakes-and-ladders/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/snakes-and-ladders)<br>**Snakes & Ladders** | [![Sorry!](./public/games/sorry/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/sorry)<br>**Sorry!** | [![Street Fighter](./public/games/street-fighter/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/street-fighter)<br>**Street Fighter** | [![Helix Jump](./public/games/helix-jump/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/helix-jump)<br>**Helix Jump** |
| [![Stack](./public/games/stack/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/stack)<br>**Stack** | [![Memory Match](./public/games/memory-match/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/memory-match)<br>**Memory Match** | [![Whack-a-Mole](./public/games/whack-a-mole/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/whack-a-mole)<br>**Whack-a-Mole** | [![Connect Four](./public/games/connect-four/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/connect-four)<br>**Connect Four** | [![Hangman](./public/games/hangman/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/hangman)<br>**Hangman** |
| [![Typing Speed](./public/games/typing-speed-test/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/typing-speed-test)<br>**Typing Speed** | [![Bubble Pop](./public/games/bubble-pop/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/bubble-pop)<br>**Bubble Pop** | [![Mini Golf](./public/games/mini-golf/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/mini-golf)<br>**Mini Golf** | [![Dunk Hit](./public/games/dunk-hit/thumbnail.png)](https://arcade.yuvrajkashyap.com/games/dunk-hit)<br>**Dunk Hit** | [![Geometry Dash](./public/games/geometry-dash/thumbnail.svg)](https://arcade.yuvrajkashyap.com/games/geometry-dash)<br>**Geometry Dash** |


## Engineering coverage

| Area | Representative games | Engineering focus |
| --- | --- | --- |
| Continuous Canvas loops | Snake, Pong, Asteroids, Pac-Man | frame timing, movement, collision, particles, camera and score loops |
| Physics and timing | Breakout, Flappy Bird, Mini Golf, Dunk Hit | velocity, gravity, collision response, hazards and input timing |
| Rule-heavy board systems | Tetris, Sorry!, Snakes and Ladders, Connect Four | legal transitions, turn flow, CPU decisions, special rules and win conditions |
| Grid and puzzle state | Minesweeper, 2048, Memory Match, Tic Tac Toe | deterministic board state, protected starts, merge semantics, matching and minimax |
| Incremental and persistent state | Cookie Clicker, Typing Speed, Reaction Time | derived metrics, upgrades, timers, records and browser persistence |
| Mobile-first interactions | Bubble Pop, Helix Jump, Stack, Geometry Dash | tap, swipe, drag, one-button timing and responsive controls |
| Third-party integration | Pinball | isolated static embed, disabled external services, explicit attribution and licensing |

## Architecture

```mermaid
flowchart LR
  Visitor["Visitor"] --> Dashboard["Dashboard"]
  Registry["Typed registry"] --> Dashboard
  Registry --> Route["/games/[slug]"]
  Route --> Theater["Shared game theater"]
  RuntimeMap["Lazy runtime map"] --> Theater
  Theater --> Runtime["Isolated game runtime"]
  Shared["Input, Canvas, storage helpers"] --> Runtime
```

The registry contains metadata but never imports runtime code. Catalog selectors derive platform collections and static slugs. The generic game page renders product context and controls, then the runtime map lazy-loads the selected game behind a shared boundary.

That separation allows the catalog to grow without duplicating page logic or loading every game on the dashboard.

Read the [complete architecture walkthrough](./docs/architecture.md).

## Key technical decisions

### Registry-driven product model

Every game declares its slug, descriptions, genre, tags, controls, How to Play content, release state, supported inputs, mobile behavior, related games, thumbnail, and version in one typed contract. Dashboard sections and routes are derived rather than maintained independently.

### Shared mechanics without pretending to be an engine

Arcade shares low-level browser mechanics—animation scheduling, keyboard state, HiDPI Canvas setup, math, storage, and theater controls. Game rules and rendering stay local. This avoids both copy-paste infrastructure and an oversized custom-engine abstraction.

### Runtime and failure isolation

Game modules are lazy-loaded only after a visitor opens their route. A runtime boundary prevents a game-specific failure from taking down the platform shell or unrelated pages.

### Input and viewport control

The theater captures gameplay keys so Space, arrows, and WASD do not scroll the page during play. Games add touch or mobile-specific controls where the interaction model requires them.

### Local-first V1 scope

High scores, records, progress, and preferences persist locally where useful. Auth, cloud saves, multiplayer, and global leaderboards remain explicitly future work rather than placeholder systems.

## Where to start in the code

| Area | File | Why inspect it |
| --- | --- | --- |
| Product model | [`src/content/games/registry.ts`](./src/content/games/registry.ts) | typed source of truth for all 30 games |
| Catalog derivation | [`src/lib/games/catalog.ts`](./src/lib/games/catalog.ts) | homepage collections, relationships and route data |
| Runtime loading | [`src/features/games/runtime.tsx`](./src/features/games/runtime.tsx) | lazy slug-to-runtime mapping |
| Shared theater | [`src/components/games/game-page-view.tsx`](./src/components/games/game-page-view.tsx) | keyboard capture, controls, help and responsive framing |
| Advanced puzzle runtime | [`src/features/games/tetris/components/block-drop-game.tsx`](./src/features/games/tetris/components/block-drop-game.tsx) | modern falling-block rules and interaction |
| Maze runtime | [`src/features/games/pacman/components/pac-maze-game.tsx`](./src/features/games/pacman/components/pac-maze-game.tsx) | maze movement, pellets, ghosts and level flow |
| Board-game runtime | [`src/features/games/sorry/components/sorry-sprint-game.tsx`](./src/features/games/sorry/components/sorry-sprint-game.tsx) | card/pawn rules and legal-move generation |
| Shared browser utilities | [`src/features/games/shared`](./src/features/games/shared) | animation, Canvas, input, math and persistence helpers |

## Quick start

Requirements: Node.js 20.9 or newer and npm.

```bash
git clone https://github.com/YuvrajKashyap/arcade.git
cd arcade
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No database, account, or private API key is required. The only optional public environment value is:

```bash
NEXT_PUBLIC_SITE_URL=https://arcade.yuvrajkashyap.com
```

See [`.env.example`](./.env.example).

## Verification

Run the complete local gate:

```bash
npm run check
```

That executes:

```bash
npm run lint
npm run typecheck
npm run build
```

The same gate runs in [GitHub Actions](./.github/workflows/ci.yml) for pushes and pull requests.

## Adding a game

A normal addition follows one repeatable path:

1. Create `src/features/games/<slug>/`.
2. Export the runtime from the feature folder.
3. Add its thumbnail under `public/games/<slug>/`.
4. Add one typed registry entry.
5. Register the lazy runtime.
6. Run `npm run check`.

See the [full adding-a-game guide](./docs/adding-a-game.md).

## Attribution and licensing

The Flutter Pinball web build is a third-party integration and is not claimed as original work:

- [Attribution and pinned upstream commit](./public/vendor/flutter-pinball/ATTRIBUTION.txt)
- [Preserved upstream MIT license](./public/vendor/flutter-pinball/LICENSE.original.txt)

No open-source license has been selected for the original Arcade repository code. Unless that changes, treat it as all rights reserved. Third-party code and assets retain their original licenses.

## Current limitations

- Saves and records are browser-local.
- There are no accounts, cloud saves, global leaderboards, or multiplayer systems.
- Mobile support varies by game and is labeled in the registry.
- Reaction Time Test remains marked beta; the other 29 catalog entries are live.
- Pinball is a vendored open-source integration rather than a self-coded runtime.
- Automated screenshots capture default public states; deeper gameplay behavior is best evaluated through the live site.

## Documentation

- [Architecture](./docs/architecture.md)
- [Complete recruiter showcase](./docs/recruiter-showcase.md)
- [Adding a game](./docs/adding-a-game.md)
- [Design system](./docs/design-system.md)
- [Roadmap](./docs/roadmap.md)
- [Contributing](./CONTRIBUTING.md)
