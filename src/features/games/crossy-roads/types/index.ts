export type CrossyPhase = "idle" | "playing" | "paused" | "game-over";
export type CrossyDirection = "up" | "down" | "left" | "right";
export type CrossyLaneType = "grass" | "road" | "river" | "rail";

export type CrossyScenery = {
  id: number;
  column: number;
  kind: "tree" | "rock" | "bush";
};

export type CrossyVehicle = {
  id: number;
  x: number;
  width: number;
  speed: number;
  color: string;
  accent: string;
  kind: "car" | "truck" | "bus" | "train";
};

export type CrossyLog = {
  id: number;
  x: number;
  width: number;
  speed: number;
};

export type CrossyLane = {
  row: number;
  type: CrossyLaneType;
  direction: -1 | 1;
  vehicles: CrossyVehicle[];
  logs: CrossyLog[];
  scenery: CrossyScenery[];
  warning: number;
};

export type CrossyPlayer = {
  column: number;
  row: number;
  fromColumn: number;
  fromRow: number;
  hopProgress: number;
  carryOffset: number;
  direction: CrossyDirection;
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
  nextSceneryId: number;
  cameraTargetRow: number;
};
