# Roadmap

## Current Release

The shipped platform includes:

- standalone Next.js platform shell
- dashboard and Library discovery surfaces
- typed game registry and catalog selectors
- 30 statically generated game pages
- lazy runtime mounting
- shared keyboard, touch, Canvas, storage, and viewport mechanics
- lightweight analytics
- automated lint, typecheck, production build, and visual capture workflows
- complete desktop and mobile recruiter showcase
- explicit third-party attribution for the vendored Flutter Pinball integration

The current release intentionally does not include:

- auth
- accounts
- backend APIs
- database persistence
- leaderboards
- achievements
- multiplayer

## Near-Term Ideas

Pragmatic near-term additions after the foundation is stable:

- sorting and filtering for the library
- richer related-game logic
- local favorites
- changelog blocks for selected games
- sound/settings refinement
- accessibility regression checks for the shared platform shell
- targeted gameplay-state screenshots for the most technically complex runtimes

## Later Expansion Path

Once the platform justifies more infrastructure:

- accounts
- cloud save data
- leaderboards
- achievements
- cross-device profiles
- richer analytics
- multiplayer for selected games
- more advanced rendering paths for specific future games

## Guardrails

- do not add backend systems before the product requires them
- do not build a custom engine too early
- do not force every game into React DOM
- do not add fake social or popularity systems without real data
