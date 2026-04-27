export type PinballPhase = "idle" | "playing" | "paused" | "game-over";

export type PinballHudState = {
  phase: PinballPhase;
  score: number;
  bestScore: number;
  lives: number;
  charge: number;
  ballSave: number;
  combo: number;
};
