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

export const gameComponentMap: Record<GameSlug, React.ComponentType> = {
  snake: SnakeGame,
  pong: PongGame,
  "reaction-time": ReactionTimeGame,
};
