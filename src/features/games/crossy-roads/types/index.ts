export type CrossyPhase = "idle" | "playing" | "paused" | "game-over";
export type CrossyDirection = "up" | "down" | "left" | "right";
export type CrossyLaneType = "grass" | "road";

export type CrossyVehicle = {
  id: number;
  x: number;
  width: number;
  speed: number;
  color: string;
};

export type CrossyLane = {
  row: number;
  type: CrossyLaneType;
  direction: -1 | 1;
  vehicles: CrossyVehicle[];
};

export type CrossyPlayer = {
  column: number;
  row: number;
  fromColumn: number;
  fromRow: number;
  hopProgress: number;
};

export type CrossyState = {
  phase: CrossyPhase;
  player: CrossyPlayer;
  lanes: CrossyLane[];
  score: number;
  bestScore: number;
  cameraRow: number;
  highestRow: number;
  nextVehicleId: number;
};
