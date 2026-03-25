# Adding a Game

## Goal

Adding a game should feel like adding one self-contained module plus one registry entry, not editing random files across the repo.

## Steps

1. Create a new folder at `src/features/games/<slug>/`.
2. Add your game component and export it from `src/features/games/<slug>/index.ts`.
3. Put thumbnail or supporting assets in `public/games/<slug>/`.
4. Add the metadata entry to `src/content/games/registry.ts`.
5. Add the lazy runtime import to `src/features/games/runtime.tsx`.

## Minimum metadata checklist

- `slug`
- `title`
- `shortDescription`
- `description`
- `thumbnail`
- `genre`
- `tags`
- `controls`
- `difficulty`
- `sessionLength`
- `releaseDate`
- `status`
- `featured`
- `published`
- `supports`
- `mobileSupport`

## Publication logic

- `published: true` makes the game show up in the library and become routable in production.
- `featured: true` makes it eligible for the Featured section.
- a `releaseDate` within the last 14 days makes it appear automatically in New Releases.

## Runtime logic

The metadata registry does not import the game component directly. Keep the actual component mapping in `src/features/games/runtime.tsx` so game bundles stay lazy.

## Recommended module shape

```txt
src/features/games/<slug>/
├── components/
├── config/
├── logic/
├── hooks/
├── types/
└── index.ts
```

## Practical rule

If you find yourself editing more than:

- the game folder
- the registry
- the runtime map
- the asset folder

for a normal game addition, the integration pattern is probably drifting.
