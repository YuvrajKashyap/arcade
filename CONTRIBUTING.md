# Contributing

This repo is primarily maintained as a solo-built product, but the codebase is structured so outside review or future collaboration stays straightforward.

## Before opening a change

Read:

- [README.md](./README.md)
- [docs/architecture.md](./docs/architecture.md)
- [docs/adding-a-game.md](./docs/adding-a-game.md)

## Local setup

```bash
npm install
npm run dev
```

## Quality checks

Run these before shipping a change:

```bash
npm run lint
npm run typecheck
npm run build
```

Or run the combined check:

```bash
npm run check
```

## Contribution standards

- Keep the platform shell, catalog logic, and game modules clearly separated.
- Do not add backend, auth, database, or fake product systems to V1.
- Prefer lightweight shared utilities over framework-heavy abstractions.
- Keep new game modules self-contained.
- Update docs when architecture or workflow changes.

## Adding a new game

Follow the exact steps in [docs/adding-a-game.md](./docs/adding-a-game.md). A normal game addition should only require:

- a new game folder
- a registry entry
- a runtime import entry
- public assets

If a new game needs edits all over the repo, stop and simplify the integration pattern first.

## Design changes

This project is intentionally keeping structure ahead of polish. Avoid wide visual rewrites unless the task explicitly calls for them.

## Licensing

No open-source license has been selected yet. Unless that changes, treat the repository as all rights reserved.
