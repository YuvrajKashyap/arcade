export type PongPhase = "idle" | "playing" | "paused" | "finished";
export type PongWinner = "player" | "ai" | null;
export type PongDifficulty = "easy" | "medium" | "difficult";

export type PongBall = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export type PongState = {
  playerY: number;
  aiY: number;
  ball: PongBall;
  playerScore: number;
  aiScore: number;
  difficulty: PongDifficulty;
  rallyHits: number;
  phase: PongPhase;
  winner: PongWinner;
  serveTimer: number;
  nextServeDirection: 1 | -1;
};
