export type TwentyFortyEightPhase = "playing" | "won" | "game-over";

export type TwentyFortyEightDirection = "up" | "down" | "left" | "right";

export type TwentyFortyEightTile = {
  id: number;
  value: number;
  row: number;
  column: number;
  isNew?: boolean;
  mergedFrom?: number[];
};

export type TwentyFortyEightState = {
  tiles: TwentyFortyEightTile[];
  score: number;
  bestScore: number;
  phase: TwentyFortyEightPhase;
  nextTileId: number;
};
