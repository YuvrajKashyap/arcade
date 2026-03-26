# Design System

## Current Direction

The current UI foundation is intentionally restrained. It is not the final visual pass, but it establishes a coherent base for future refinement.

Target feel:

- dark
- minimal
- premium
- purple-accented
- quiet rather than noisy
- product-like rather than dashboard-like

## Theme Foundations

The theme is driven primarily through CSS variables in:

- [src/app/globals.css](../src/app/globals.css)

Current token groups:

- background tiers
- foreground tiers
- border/line tiers
- surface tiers
- accent colors
- shadow treatment

Design work should prefer changing tokens first before rewriting individual component styles.

## Typography

Current fonts:

- `Space Grotesk` for primary UI and headings
- `JetBrains Mono` for technical accents and metadata-like labels

Guidelines:

- keep headings compact and strong
- keep supporting copy readable and subdued
- avoid excessive uppercase label noise

## Layout Principles

- use wide content containers for the shell
- keep sections distinct and breathable
- let the game surface dominate on the game detail page
- keep metadata secondary
- avoid overloading cards with too many badges or stats

## Spacing and Surface Philosophy

- shell surfaces should feel calm and intentional
- borders should be subtle, not loud
- cards should separate content without turning into panels full of dashboard chrome
- whitespace should do more of the work than decorative elements

## Motion

Framer Motion is used for:

- section reveal
- card hover lift

Guideline:

- motion should support structure, not compete with gameplay

## Future Design Iteration Guidance

When doing a later design pass:

- keep the current token system and refine it instead of scattering one-off colors
- preserve the separation between page-view components and catalog logic
- avoid turning metadata back into visual clutter
- treat the shell and the games as separate styling layers

The architecture is intentionally ready for a stronger visual pass without needing a structural rewrite.
