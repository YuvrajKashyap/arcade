export type SnakeDirection = "up" | "down" | "left" | "right";
export type SnakePhase = "idle" | "playing" | "paused" | "game-over";

export type SnakePoint = {
  x: number;
  y: number;
};

export type SnakeState = {
  snake: SnakePoint[];
  direction: SnakeDirection;
  queuedDirection: SnakeDirection;
  food: SnakePoint;
  score: number;
  phase: SnakePhase;
  bestScore: number;
};
