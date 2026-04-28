export type DoodleJumpPhase = "idle" | "playing" | "paused" | "game-over";

export type DoodlePlatform = {
  id: number;
  x: number;
  y: number;
  width: number;
  kind: "green" | "blue" | "pink";
};

export type DoodlePlayer = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: -1 | 1;
};

export type DoodleJumpState = {
  phase: DoodleJumpPhase;
  player: DoodlePlayer;
  platforms: DoodlePlatform[];
  score: number;
  bestScore: number;
  cameraY: number;
  nextPlatformId: number;
};
