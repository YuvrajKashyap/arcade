# Adding a Game

## Goal

Adding a new game should be predictable and low-friction.

For a normal game addition, you should only need to touch:

- a new game folder
- the registry
- the runtime map
- public assets

If a new game requires edits across unrelated parts of the repo, the integration pattern is drifting.

## Step-by-Step

### 1. Create the game folder

Create:

```txt
src/features/games/<slug>/
```

Recommended structure:

```txt
src/features/games/<slug>/
  components/
  config/
  logic/
  hooks/
  types/
  index.ts
```

Only keep the folders you actually need.

### 2. Build the runtime

Create the playable component and export it from:

```txt
src/features/games/<slug>/index.ts
```

The runtime should own:

- initialization
- update loop
- rendering
- input handling
- cleanup

### 3. Add assets

Put thumbnails or other public assets in:

```txt
public/games/<slug>/
```

At minimum, add a thumbnail used by the catalog and game page metadata.

### 4. Register metadata

Add the new entry to:

```txt
src/content/games/registry.ts
```

Required fields:

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

Optional but useful:

- `version`
- `developerNotes`
- `featurePriority`
- `relatedSlugs`

### 5. Register the runtime import

Add the lazy import to:

```txt
src/features/games/runtime.tsx
```

Keep this separate from the metadata registry so catalog logic stays metadata-only.

## How Homepage Sections Are Derived

Homepage sections are driven by metadata rules in:

- [src/lib/games/catalog.ts](../src/lib/games/catalog.ts)

Rules:

- `published: true` puts the game in the live library
- `featured: true` makes it eligible for Featured
- `releaseDate` within the last 14 days makes it appear in New Releases
- `genre` determines category grouping

You should not need to manually wire homepage sections for a normal new game.

## How to Test Before Shipping

Run:

```bash
npm run lint
npm run typecheck
npm run build
```

Then manually verify:

- the route loads at `/games/<slug>`
- the game appears where expected on the homepage
- the thumbnail renders
- controls copy is accurate
- restart/reset behavior is stable
- unmounting and remounting the route does not leave broken listeners or timers behind
- mobile support labeling is honest

## Release Checklist

Before marking a game `published: true`, confirm:

- metadata is complete
- thumbnail exists
- controls are readable
- game over / restart flow works
- keyboard behavior is correct
- runtime errors do not break the full page
- `npm run check` passes
