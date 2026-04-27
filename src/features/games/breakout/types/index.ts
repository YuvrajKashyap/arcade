export type BreakoutPhase = "idle" | "playing" | "paused" | "cleared" | "game-over";

export type BreakoutBrick = {
  x: number;
  y: number;
  strength: number;
  maxStrength: number;
};

export type BreakoutBall = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export type BreakoutPowerup = {
  x: number;
  y: number;
  active: boolean;
};

export type BreakoutState = {
  phase: BreakoutPhase;
  level: number;
  score: number;
  bestScore: number;
  lives: number;
  paddleX: number;
  paddleWidth: number;
  wideTimer: number;
  ball: BreakoutBall;
  bricks: BreakoutBrick[];
  powerup: BreakoutPowerup | null;
};
