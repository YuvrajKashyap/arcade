"use client";

import dynamic from "next/dynamic";
import type { GameSlug } from "@/content/games/registry";
import { GameLoadingState } from "@/components/games/game-loading-state";

const SnakeGame = dynamic(() => import("@/features/games/snake"), {
  ssr: false,
  loading: GameLoadingState,
});

const PongGame = dynamic(() => import("@/features/games/pong"), {
  ssr: false,
  loading: GameLoadingState,
});

const ReactionTimeGame = dynamic(() => import("@/features/games/reaction-time"), {
  ssr: false,
  loading: GameLoadingState,
});

const TicTacToeGame = dynamic(() => import("@/features/games/tic-tac-toe"), {
  ssr: false,
  loading: GameLoadingState,
});

const PinballGame = dynamic(() => import("@/features/games/pinball"), {
  ssr: false,
  loading: GameLoadingState,
});

const BreakoutGame = dynamic(() => import("@/features/games/breakout"), {
  ssr: false,
  loading: GameLoadingState,
});

const AsteroidsGame = dynamic(() => import("@/features/games/asteroids"), {
  ssr: false,
  loading: GameLoadingState,
});

const MinesweeperGame = dynamic(() => import("@/features/games/minesweeper"), {
  ssr: false,
  loading: GameLoadingState,
});

const TwentyFortyEightGame = dynamic(() => import("@/features/games/2048"), {
  ssr: false,
  loading: GameLoadingState,
});

const DoodleJumpGame = dynamic(() => import("@/features/games/doodle-jump"), {
  ssr: false,
  loading: GameLoadingState,
});

const FlappyBirdGame = dynamic(() => import("@/features/games/flappy-bird"), {
  ssr: false,
  loading: GameLoadingState,
});

const CrossyRoadsGame = dynamic(() => import("@/features/games/crossy-roads"), {
  ssr: false,
  loading: GameLoadingState,
});

const DinoRunGame = dynamic(() => import("@/features/games/dino-run"), {
  ssr: false,
  loading: GameLoadingState,
});

const PacMazeGame = dynamic(() => import("@/features/games/pac-maze"), {
  ssr: false,
  loading: GameLoadingState,
});

const BlockDropGame = dynamic(() => import("@/features/games/block-drop"), {
  ssr: false,
  loading: GameLoadingState,
});

const CookieCrafterGame = dynamic(() => import("@/features/games/cookie-crafter"), {
  ssr: false,
  loading: GameLoadingState,
});

export const gameComponentMap: Record<GameSlug, React.ComponentType> = {
  snake: SnakeGame,
  pong: PongGame,
  "reaction-time": ReactionTimeGame,
  "tic-tac-toe": TicTacToeGame,
  pinball: PinballGame,
  breakout: BreakoutGame,
  asteroids: AsteroidsGame,
  minesweeper: MinesweeperGame,
  "2048": TwentyFortyEightGame,
  "doodle-jump": DoodleJumpGame,
  "flappy-bird": FlappyBirdGame,
  "crossy-roads": CrossyRoadsGame,
  "dino-run": DinoRunGame,
  "pac-maze": PacMazeGame,
  "block-drop": BlockDropGame,
  "cookie-crafter": CookieCrafterGame,
};
