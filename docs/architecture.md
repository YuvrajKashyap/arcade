# Architecture

## High-Level Structure

The application is a single Next.js App Router project with three main layers:

1. Platform shell
2. Catalog/registry logic
3. Game runtimes

That split is deliberate. The shell should stay stable even as the game catalog grows, and individual games should stay mostly self-contained.

## Top-Level App Structure

```txt
src/
  app/                  Route files and app-level metadata
  components/           Shared UI and page-view components
  content/games/        Typed registry source of truth
  features/games/       Playable game modules and shared game helpers
  lib/games/            Derived catalog selectors
  lib/constants/        Site-wide constants
  types/                Shared contracts
```

## Platform Shell

The platform shell is responsible for:

- global layout
- navigation
- metadata
- homepage discovery sections
- game detail page framing
- analytics

Core shell files:

- [src/app/layout.tsx](../src/app/layout.tsx)
- [src/components/layout/site-shell.tsx](../src/components/layout/site-shell.tsx)
- [src/components/layout/site-header.tsx](../src/components/layout/site-header.tsx)
- [src/components/layout/site-footer.tsx](../src/components/layout/site-footer.tsx)

## Registry and Catalog Flow

The source of truth for all published games is:

- [src/content/games/registry.ts](../src/content/games/registry.ts)

The registry is metadata-only. It does not import runtime components.

Selectors in:

- [src/lib/games/catalog.ts](../src/lib/games/catalog.ts)

derive all platform-facing collections, including:

- homepage collections
- featured games
- new releases
- category groups
- related games
- static slugs for route generation

This keeps collection logic centralized and prevents homepage/game-route code from duplicating rules.

## Route Model

Primary routes:

- `/`
- `/games/[slug]`
- `/about`

Supporting routes:

- `not-found`
- `loading`
- `error`
- `robots`
- `sitemap`

The route files stay intentionally thin. Most rendering lives in page-view components:

- [src/components/homepage/homepage-view.tsx](../src/components/homepage/homepage-view.tsx)
- [src/components/games/game-page-view.tsx](../src/components/games/game-page-view.tsx)

## Runtime Mounting Pattern

Game metadata and game runtime loading are separated.

Runtime path:

1. route resolves slug
2. selector returns validated page data
3. `GamePlayer` chooses the runtime component
4. `GameRuntimeBoundary` isolates game-specific failures
5. the runtime component is lazy-loaded from `src/features/games/runtime.tsx`

This keeps non-game routes from eagerly importing all game bundles and makes runtime failures easier to isolate.

## Shared Utilities Philosophy

Shared utilities live under:

- [src/features/games/shared](../src/features/games/shared)

They are intentionally small and low-level:

- requestAnimationFrame loop helper
- keyboard state helper
- HiDPI canvas helper
- local storage helpers
- math helpers

This is not a custom engine.

Rule of thumb:

- share browser-level mechanics when repeated
- keep gameplay rules, state, rendering, and feel local to each game

## Rendering Strategy

Use React/DOM for:

- shell layout
- metadata
- discovery cards
- controls copy
- page structure

Use Canvas when the game needs a continuous frame loop:

- Snake
- Pong

Use DOM/state directly when Canvas is unnecessary:

- Reaction Time Test

This keeps gameplay responsive without forcing every game into the same rendering pattern.

## Why V1 Has No Backend

V1 intentionally excludes:

- auth
- accounts
- database
- cloud saves
- leaderboards
- multiplayer

The product is still valuable without those systems, and the current architecture stays cleaner by not pretending they already exist.
