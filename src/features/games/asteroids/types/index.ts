export type AsteroidsPhase = "idle" | "playing" | "paused" | "game-over";

export type AsteroidsVector = {
  x: number;
  y: number;
};

export type AsteroidsShip = AsteroidsVector & {
  vx: number;
  vy: number;
  angle: number;
  invulnerableTimer: number;
};

export type AsteroidsRock = AsteroidsVector & {
  id: number;
  vx: number;
  vy: number;
  radius: number;
  tier: number;
};

export type AsteroidsBullet = AsteroidsVector & {
  id: number;
  vx: number;
  vy: number;
  life: number;
};

export type AsteroidsInput = {
  turn: number;
  thrust: boolean;
  shoot: boolean;
};

export type AsteroidsState = {
  phase: AsteroidsPhase;
  score: number;
  bestScore: number;
  lives: number;
  wave: number;
  nextId: number;
  shotCooldown: number;
  ship: AsteroidsShip;
  rocks: AsteroidsRock[];
  bullets: AsteroidsBullet[];
};
