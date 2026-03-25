# Architecture

## Product shape

The repo is a single standalone Next.js application. The platform owns:

- routing
- metadata
- discovery sections
- navigation
- presentation shells
- analytics

Each game owns:

- initialization
- update loop
- rendering
- input handling
- cleanup

## Registry-driven model

The source of truth for the library is [`src/content/games/registry.ts`](../src/content/games/registry.ts).

Each entry defines:

- slug
- title and descriptions
- thumbnail
- discovery metadata
- controls
- difficulty
- release date
- publication and featured state
- device/input support

Catalog helpers in [`src/lib/games/catalog.ts`](../src/lib/games/catalog.ts) derive:

- featured games
- new releases
- genre groups
- related games

## Runtime mounting

The registry stays metadata-only. Actual game components are lazy-loaded from [`src/features/games/runtime.tsx`](../src/features/games/runtime.tsx), which keeps homepage and route-level metadata work from importing every game module eagerly.

The game route mounts a game through:

1. registry lookup
2. metadata rendering
3. `GamePlayer`
4. `GameRuntimeBoundary`
5. lazy runtime import

## Rendering strategy

Platform UI:

- React components
- Tailwind CSS
- Framer Motion for light reveal/hover polish

Gameplay:

- `Snake` and `Pong` use Canvas 2D
- `Reaction Time Test` uses direct DOM/state interaction

This keeps gameplay loops out of React rerender pressure when Canvas is the better fit.

## Shared utilities

Shared game utilities live under [`src/features/games/shared`](../src/features/games/shared).

Current utilities include:

- requestAnimationFrame loop helper
- keyboard state helper
- HiDPI canvas setup
- math helpers
- local storage helpers

This is intentionally not a formal engine.

## Error handling

- Invalid game slugs resolve to the app `not-found` route.
- Game runtime failures are isolated with `GameRuntimeBoundary`.
- Unsupported device expectations are communicated through per-game metadata on the detail page.

## Growth path

The current architecture leaves room for:

- more game modules
- richer discovery
- local save data
- accounts and cloud systems later
- leaderboards and platform progression later

V1 avoids implementing those systems until the product actually needs them.
