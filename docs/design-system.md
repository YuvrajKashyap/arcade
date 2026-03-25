# Design System

## Product tone

The platform should feel:

- premium
- arcade-inspired
- modern
- energetic
- intentional

It should not feel:

- childish
- gimmicky
- terminal-themed
- generic SaaS

## Visual direction

- Warm editorial base background instead of default white or dark-mode bias
- Deep navy structural surfaces
- Orange, teal, and gold accent signals
- Strong rounded cards with soft glass-like surfaces
- Typography led by `Space Grotesk` with `JetBrains Mono` for technical accents

## Layout rules

- Use wide content containers for the platform shell.
- Keep sections clearly separated and easy to scan.
- Preserve strong visual hierarchy between headings, supporting copy, and cards.
- Game surfaces should feel framed and intentional, not dropped loose into the page.

## Motion rules

- Use Framer Motion for section reveals and card hover lift.
- Keep animation subtle and structural.
- Do not over-animate the gameplay surface.

## Interaction rules

- Keyboard-first experience is primary.
- Visible focus states are required.
- Mobile support should be honest on a per-game basis.
- Controls must always be visible on the game detail page.

## Component patterns

- `surface-panel` for premium shell cards
- `Pill` for compact metadata
- `GameCard` for discovery surfaces
- `GamePlayer` for isolated runtime mounting

## Accessibility baseline

- readable contrast
- keyboard navigation for shell UI
- descriptive route copy
- error and not-found states with recovery paths
