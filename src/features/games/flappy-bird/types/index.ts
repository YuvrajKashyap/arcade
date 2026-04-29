export type FlappyBirdPhase = "idle" | "playing" | "paused" | "game-over";

export type FlappyBirdPlayer = {
  y: number;
  vy: number;
  rotation: number;
};

export type FlappyPipe = {
  id: number;
  x: number;
  gapY: number;
  passed: boolean;
};

export type FlappyBirdState = {
  phase: FlappyBirdPhase;
  bird: FlappyBirdPlayer;
  pipes: FlappyPipe[];
  score: number;
  bestScore: number;
  scroll: number;
  nextPipeId: number;
};
