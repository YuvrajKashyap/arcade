"use client";

import type { GameSlug } from "@/content/games/registry";
import { GameLoadingState } from "@/components/games/game-loading-state";
import { GameRuntimeBoundary } from "@/components/games/game-runtime-boundary";
import { gameComponentMap } from "@/features/games/runtime";

type GamePlayerProps = {
  slug: GameSlug;
};

export function GamePlayer({ slug }: GamePlayerProps) {
  const GameComponent = gameComponentMap[slug];

  if (!GameComponent) {
    return <GameLoadingState />;
  }

  return (
    <GameRuntimeBoundary>
      <GameComponent />
    </GameRuntimeBoundary>
  );
}
