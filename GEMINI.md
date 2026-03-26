# Workspace Mandates

## Project Overview
This project is a modern, web-based retro arcade platform. It hosts mini-games (like Pong, Snake, Reaction Time) built with React and HTML5 Canvas. The aesthetic should always lean towards polished, arcade, retro, or highly interactive visual styles.

## Architectural Guidelines
- **Framework:** Next.js (App Router). All pages must use the `src/app` directory structure.
- **Language:** TypeScript. Maintain strict typing for all components, game logic, and state.
- **Styling:** Vanilla CSS (via CSS Modules or global CSS) or existing styling solutions in the project. Maintain the arcade aesthetic.
- **Game Logic:** Keep game logic separate from UI components. Game loop, state updates, and rendering should be cleanly decoupled, preferably using custom hooks (like `useAnimationFrameLoop`).

## Conventions
- **Components:** Functional components with React Hooks.
- **Organization:** 
  - `src/features/games/`: Contains the specific implementation, logic, and components for individual games.
  - `src/components/`: Reusable UI components.
  - `src/lib/`: Utility functions and constants.
- **Testing:** Ensure any changes to game logic or critical UI paths are robust and do not introduce regressions to the game loops.

## AI Agent Instructions
- Proactively suggest visual polish and interactive elements (animations, transitions, sound effects if applicable) that fit the arcade theme.
- When adding new games, follow the existing pattern in `src/features/games/` and register them in `src/lib/games/catalog.ts`.
- Prioritize performance, especially within the game canvas rendering loop.