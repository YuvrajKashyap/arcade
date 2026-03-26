# Roadmap

## V1 Scope

Current V1 includes:

- standalone Next.js platform shell
- homepage with Hero, Featured, New Releases, Categories, and All Games
- typed game registry and catalog selectors
- dynamic game routes
- lazy runtime mounting
- three initial games
- lightweight analytics
- documentation and public-repo setup

V1 intentionally does not include:

- auth
- accounts
- backend APIs
- database persistence
- leaderboards
- achievements
- multiplayer

## V1.5 Ideas

Pragmatic near-term additions after the foundation is stable:

- sorting and filtering for the library
- richer related-game logic
- local favorites
- changelog blocks for selected games
- sound/settings refinement
- more polished media assets and screenshots

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
