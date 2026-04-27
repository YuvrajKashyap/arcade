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

export const gameComponentMap: Record<GameSlug, React.ComponentType> = {
  snake: SnakeGame,
  pong: PongGame,
  "reaction-time": ReactionTimeGame,
  "tic-tac-toe": TicTacToeGame,
  pinball: PinballGame,
  breakout: BreakoutGame,
  asteroids: AsteroidsGame,
  minesweeper: MinesweeperGame,
};
