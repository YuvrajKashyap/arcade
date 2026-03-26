# arcade.yuvrajkashyap.com

A standalone browser arcade platform built as a real software product, not a folder of disconnected demos. The goal is to host a growing catalog of Yuvraj Kashyap's web games inside one cohesive shell with clean routing, strong metadata, modular game integration, and enough architectural discipline to scale without turning into a mess.

## Product Goals

- Provide a central home for the entire game catalog.
- Make adding the next game fast, predictable, and low-friction.
- Showcase frontend, interactive systems, and browser-game engineering skill through a live product.
- Keep V1 lightweight while leaving a clean path for future growth.

## Project Status

Current status: active V1 foundation

- Core platform shell is in place.
- Registry-driven discovery is live.
- Dynamic game routes and lazy runtime mounting are implemented.
- Three initial games are included.
- Documentation and repo setup are ready for public GitHub exposure.

## Screenshots

Current placeholders / lightweight previews:

- Homepage preview: ![Homepage preview](./public/brand/readme-home.svg)
- Game page preview: ![Game page preview](./public/brand/readme-game.svg)

Replace these with real screenshots or GIFs when final design polish is ready.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Framer Motion
- Vercel Analytics

## Architecture Summary

The repo is one standalone Next.js application.

- The platform layer owns routing, layout, metadata, discovery, and shell UI.
- The registry defines all published game metadata in one place.
- The selector layer derives homepage and per-game collections.
- Game runtimes are lazy-loaded separately from metadata to keep catalog logic clean.
- Shared utilities exist for low-level browser/game concerns, but there is no custom in-house engine.

Detailed architecture: [docs/architecture.md](./docs/architecture.md)

## Current Games

| Slug | Game | Role in the architecture |
| --- | --- | --- |
| `snake` | Snake | Grid-based Canvas loop, restart flow, score tracking |
| `pong` | Pong | Continuous Canvas loop, collision logic, AI opponent |
| `reaction-time` | Reaction Time Test | DOM/timing-based interaction without a full Canvas loop |

## Design Direction

The current foundation is intentionally restrained and easy to iterate on:

- dark default shell
- purple-accented theme tokens
- minimal metadata presentation
- premium / luxury-cyber direction
- clear separation between structural styling and game logic

More detail: [docs/design-system.md](./docs/design-system.md)

## Local Development

### Requirements

- Node.js `>=20.9.0`
- npm `11.6.2` or compatible

Node version pin: [`.nvmrc`](./.nvmrc)

### Setup

```bash
npm install
npm run dev
```

Local app URL:

```txt
http://localhost:3000
```

## Environment

Environment variables are intentionally minimal in V1.

See [`.env.example`](./.env.example):

```bash
NEXT_PUBLIC_SITE_URL=https://arcade.yuvrajkashyap.com
```

Used for:

- canonical metadata
- sitemap URLs
- Open Graph URLs

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run check
```

`npm run check` is the full local verification pass.

## Folder Structure

```txt
src/
  app/                  Next.js routes, metadata routes, and app shell entrypoints
  components/           Shared shell, homepage, game-page, and UI components
  content/games/        Typed registry for game metadata
  features/games/
    runtime.tsx         Lazy runtime map for playable games
    shared/             Lightweight shared utilities for browser games
    snake/
    pong/
    reaction-time/
  lib/
    constants/          Site-level constants and theme-adjacent config
    games/              Catalog selectors and derived collection logic
    utils/              Small general helpers
  types/                Shared TypeScript types
public/
  brand/                Brand and README preview assets
  games/                Per-game thumbnails and assets
docs/                   Project documentation
```

## How Games Are Registered

Source of truth:

- [src/content/games/registry.ts](./src/content/games/registry.ts)

Derived collections:

- [src/lib/games/catalog.ts](./src/lib/games/catalog.ts)

Runtime mounting:

- [src/features/games/runtime.tsx](./src/features/games/runtime.tsx)
- [src/components/games/game-player.tsx](./src/components/games/game-player.tsx)

Key metadata rules:

- `published: true` makes a game part of the live library.
- `featured: true` makes it eligible for the Featured section.
- `releaseDate` within the last 14 days makes it appear in New Releases automatically.
- `relatedSlugs` can manually shape related-game ordering when needed.

## How to Add a New Game

1. Create `src/features/games/<slug>/`.
2. Export the runtime from `src/features/games/<slug>/index.ts`.
3. Add assets to `public/games/<slug>/`.
4. Add the metadata entry to [src/content/games/registry.ts](./src/content/games/registry.ts).
5. Add the lazy runtime import entry to [src/features/games/runtime.tsx](./src/features/games/runtime.tsx).
6. Run `npm run check`.

Full guide: [docs/adding-a-game.md](./docs/adding-a-game.md)

## Deployment Notes

Target host:

```txt
arcade.yuvrajkashyap.com
```

Recommended platform:

- Vercel

Deployment notes:

- set `NEXT_PUBLIC_SITE_URL` to the production origin
- verify metadata routes and OG previews
- run `npm run check` before shipping

## Why There Is No Backend in V1

V1 does not need:

- auth
- accounts
- cloud saves
- leaderboards
- multiplayer
- database persistence

Those systems would add complexity without improving the current product goal. The repo is intentionally frontend-first until the catalog and product maturity justify more infrastructure.

## Roadmap

- V1: platform shell, registry-driven discovery, game routes, three initial games
- V1.5: filtering, favorites, richer related games, changelog blocks, sound/settings refinement
- Later: accounts, cloud save data, leaderboards, achievements, multiplayer for selected games

Detailed roadmap: [docs/roadmap.md](./docs/roadmap.md)

## Known Limitations

- No backend or cross-device persistence in V1
- Mobile support varies by game and is intentionally described honestly in metadata
- The current UI foundation is structurally strong but still intended to receive a later visual refinement pass

## Contribution Note

This repo is primarily a solo-built product, but it is documented and structured so outside review or future collaboration remains practical.

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License Note

No open-source license has been selected yet. Until that changes, treat the repository as all rights reserved.
