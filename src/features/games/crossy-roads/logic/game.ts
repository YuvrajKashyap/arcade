import {
  CROSSY_COLUMNS,
  CROSSY_START_COLUMN,
  CROSSY_START_ROW,
  CROSSY_TILE,
  CROSSY_VISIBLE_ROWS,
  CROSSY_WIDTH,
} from "@/features/games/crossy-roads/config/constants";
import type {
  CrossyDirection,
  CrossyLane,
  CrossyLaneType,
  CrossyLog,
  CrossyPhase,
  CrossyScenery,
  CrossyState,
  CrossyVehicle,
} from "@/features/games/crossy-roads/types";
import { clamp } from "@/features/games/shared/utils/math";

const vehicleColors = [
  ["#f04f43", "#ffd15c"],
  ["#2f8cff", "#bde9ff"],
  ["#ffce3e", "#fff2a0"],
  ["#59bf69", "#d5ffc7"],
  ["#df61ff", "#ffd1ff"],
  ["#f78a31", "#ffe1a8"],
] as const;

function seeded(row: number, salt: number) {
  const value = Math.sin(row * 91.73 + salt * 17.11) * 10000;
  return value - Math.floor(value);
}

function laneTypeForRow(row: number): CrossyLaneType {
  if (row <= 2) {
    return "grass";
  }

  const cycle = row % 12;
  if (cycle === 0 || cycle === 4 || cycle === 7 || cycle === 11) {
    return "grass";
  }

  if (cycle === 9) {
    return "rail";
  }

  if (cycle === 5 || cycle === 6) {
    return "river";
  }

  return "road";
}

function createVehicle(id: number, row: number, index: number, direction: -1 | 1): CrossyVehicle {
  const isTrain = laneTypeForRow(row) === "rail";
  const kind = isTrain ? "train" : row % 6 === 0 ? "bus" : row % 4 === 0 ? "truck" : "car";
  const baseWidth = kind === "train" ? 260 : kind === "bus" ? 122 : kind === "truck" ? 108 : 78;
  const width = baseWidth + Math.round(seeded(row, index) * 18);
  const earlyLane = row < 8;
  const speedBase = kind === "train" ? 430 : kind === "bus" ? 104 : kind === "truck" ? 118 : 136;
  const speed = (speedBase + row * 3.2 + seeded(row, index + 4) * 32 + (earlyLane ? -18 : 0)) * direction;
  const palette = vehicleColors[(row + index) % vehicleColors.length] ?? vehicleColors[0];
  const count = laneTypeForRow(row) === "rail" ? 1 : row % 6 === 0 ? 2 : 3;
  const laneSpan = CROSSY_WIDTH + 360;
  const spacing = laneSpan / count;
  const seededX = ((index * spacing + seeded(row, index + 12) * 56 + row * 37) % laneSpan) - width - 150;

  return {
    id,
    x: direction > 0 ? seededX : CROSSY_WIDTH - seededX - width,
    width,
    speed,
    color: isTrain ? "#e7edf1" : palette[0],
    accent: isTrain ? "#e83f3f" : palette[1],
    kind,
  };
}

function createLog(id: number, row: number, index: number, direction: -1 | 1): CrossyLog {
  const isLily = row % 9 === 5 && index % 3 === 1;
  const count = row % 2 === 0 ? 4 : 5;
  const width = isLily ? 72 : count === 5 ? 118 + Math.round(seeded(row, index + 2) * 30) : 142 + Math.round(seeded(row, index + 2) * 46);
  const speed = (58 + row * 2.2 + seeded(row, index + 6) * 22) * direction;
  const laneSpan = CROSSY_WIDTH + 260;
  const spacing = laneSpan / count;
  const seededX = ((index * spacing + seeded(row, index + 18) * 34 + row * 23) % laneSpan) - width - 110;

  return {
    id,
    x: direction > 0 ? seededX : CROSSY_WIDTH - seededX - width,
    width,
    speed,
    kind: isLily ? "lily" : "log",
  };
}

function createScenery(id: number, row: number): { scenery: CrossyScenery[]; nextSceneryId: number } {
  const scenery: CrossyScenery[] = [];
  let nextSceneryId = id;

  if (row <= 2 || laneTypeForRow(row) !== "grass") {
    return { scenery, nextSceneryId };
  }

  for (let column = 0; column < CROSSY_COLUMNS; column += 1) {
    const roll = seeded(row, column);
    if ((column === CROSSY_START_COLUMN && row === 0) || roll < 0.64) {
      continue;
    }

    scenery.push({
      id: nextSceneryId,
      column,
      kind: roll > 0.9 ? "rock" : roll > 0.78 ? "bush" : "tree",
    });
    nextSceneryId += 1;
  }

  return { scenery, nextSceneryId };
}

function createLane(row: number, nextVehicleId: number, nextSceneryId: number) {
  const type = laneTypeForRow(row);
  const direction: -1 | 1 = row % 4 < 2 ? 1 : -1;
  let vehicleId = nextVehicleId;
  let sceneryId = nextSceneryId;
  const vehicles: CrossyVehicle[] = [];
  const logs: CrossyLog[] = [];
  let scenery: CrossyScenery[] = [];

  if (type === "road" || type === "rail") {
    const count = type === "rail" ? 1 : row % 6 === 0 ? 2 : 3;
    for (let index = 0; index < count; index += 1) {
      vehicles.push(createVehicle(vehicleId, row, index, direction));
      vehicleId += 1;
    }
  }

  if (type === "river") {
    const count = row % 2 === 0 ? 4 : 5;
    for (let index = 0; index < count; index += 1) {
      logs.push(createLog(vehicleId, row, index, direction));
      vehicleId += 1;
    }
  }

  if (type === "grass") {
    const createdScenery = createScenery(sceneryId, row);
    scenery = createdScenery.scenery;
    sceneryId = createdScenery.nextSceneryId;
  }

  return {
    lane: {
      row,
      type,
      direction,
      vehicles,
      logs,
      scenery,
      warning: type === "rail" ? seeded(row, 9) * 1.2 : 0,
    },
    nextVehicleId: vehicleId,
    nextSceneryId: sceneryId,
  };
}

function createLanes(minRow: number, maxRow: number, nextVehicleId: number, nextSceneryId: number) {
  const lanes: CrossyLane[] = [];
  let vehicleId = nextVehicleId;
  let sceneryId = nextSceneryId;

  for (let row = minRow; row <= maxRow; row += 1) {
    const created = createLane(row, vehicleId, sceneryId);
    lanes.push(created.lane);
    vehicleId = created.nextVehicleId;
    sceneryId = created.nextSceneryId;
  }

  return { lanes, nextVehicleId: vehicleId, nextSceneryId: sceneryId };
}

export function createCrossyState(bestScore = 0): CrossyState {
  const created = createLanes(-2, CROSSY_VISIBLE_ROWS + 7, 1, 1);
  return {
    phase: "idle",
    player: {
      column: CROSSY_START_COLUMN,
      row: CROSSY_START_ROW,
      fromColumn: CROSSY_START_COLUMN,
      fromRow: CROSSY_START_ROW,
      hopProgress: 1,
      carryOffset: 0,
      direction: "up",
    },
    lanes: created.lanes,
    score: 0,
    bestScore,
    cameraRow: 0,
    cameraTargetRow: 0,
    highestRow: 0,
    nextVehicleId: created.nextVehicleId,
    nextSceneryId: created.nextSceneryId,
  };
}

export function startCrossy(state: CrossyState): CrossyState {
  if (state.phase === "game-over") {
    return {
      ...createCrossyState(state.bestScore),
      phase: "playing",
    };
  }

  return {
    ...state,
    phase: "playing",
  };
}

function ensureLaneRange(state: CrossyState) {
  const minNeeded = Math.floor(state.cameraTargetRow) - 4;
  const maxNeeded = Math.floor(state.cameraTargetRow) + CROSSY_VISIBLE_ROWS + 8;
  const existing = new Map(state.lanes.map((lane) => [lane.row, lane]));
  let nextVehicleId = state.nextVehicleId;
  let nextSceneryId = state.nextSceneryId;
  const lanes: CrossyLane[] = [];

  for (let row = minNeeded; row <= maxNeeded; row += 1) {
    const existingLane = existing.get(row);
    if (existingLane) {
      lanes.push(existingLane);
    } else {
      const created = createLane(row, nextVehicleId, nextSceneryId);
      lanes.push(created.lane);
      nextVehicleId = created.nextVehicleId;
      nextSceneryId = created.nextSceneryId;
    }
  }

  return {
    ...state,
    lanes,
    nextVehicleId,
    nextSceneryId,
  };
}

function sceneryBlocks(lane: CrossyLane | undefined, column: number) {
  return lane?.scenery.some((item) => item.column === column) ?? false;
}

export function moveCrossy(state: CrossyState, direction: CrossyDirection): CrossyState {
  const playingState = state.phase === "idle" ? startCrossy(state) : state;
  if (playingState.phase !== "playing" || playingState.player.hopProgress < 0.34) {
    return state;
  }

  const rowDelta = direction === "up" ? 1 : direction === "down" ? -1 : 0;
  const columnDelta = direction === "right" ? 1 : direction === "left" ? -1 : 0;
  const row = Math.max(CROSSY_START_ROW, playingState.player.row + rowDelta);
  const column = clamp(playingState.player.column + columnDelta, 0, CROSSY_COLUMNS - 1);
  const targetLane = playingState.lanes.find((lane) => lane.row === row);

  if (sceneryBlocks(targetLane, column)) {
    return playingState;
  }

  const highestRow = Math.max(playingState.highestRow, row);
  const score = highestRow;
  const cameraTargetRow = Math.max(0, highestRow - 4);

  return ensureLaneRange({
    ...playingState,
    player: {
      column,
      row,
      fromColumn: playingState.player.column,
      fromRow: playingState.player.row,
      hopProgress: 0,
      carryOffset: 0,
      direction,
    },
    highestRow,
    score,
    bestScore: Math.max(playingState.bestScore, score),
    cameraTargetRow,
  });
}

function vehicleOverlapsPlayer(vehicle: CrossyVehicle, playerX: number) {
  const playerLeft = playerX + CROSSY_TILE * 0.24;
  const playerRight = playerX + CROSSY_TILE * 0.76;
  return playerRight > vehicle.x + 14 && playerLeft < vehicle.x + vehicle.width - 14;
}

function logUnderPlayer(log: CrossyLog, playerCenterX: number) {
  const inset = log.kind === "lily" ? 5 : 14;
  return playerCenterX > log.x + inset && playerCenterX < log.x + log.width - inset;
}

function wrapMovingBody<T extends { x: number; width: number; speed: number }>(body: T): T {
  let x = body.x;
  if (body.speed > 0 && x > CROSSY_WIDTH + 150) {
    x = -body.width - 160;
  } else if (body.speed < 0 && x < -body.width - 150) {
    x = CROSSY_WIDTH + 160;
  }

  return { ...body, x };
}

export function updateCrossy(state: CrossyState, deltaSeconds: number): CrossyState {
  if (state.phase !== "playing") {
    return state;
  }

  const lanes = state.lanes.map((lane) => {
    if (lane.type === "road" || lane.type === "rail") {
      return {
        ...lane,
        warning: lane.type === "rail" ? (lane.warning + deltaSeconds) % 2.8 : lane.warning,
        vehicles: lane.vehicles.map((vehicle) =>
          wrapMovingBody({
            ...vehicle,
            x: vehicle.x + vehicle.speed * deltaSeconds,
          }),
        ),
      };
    }

    if (lane.type === "river") {
      return {
        ...lane,
        logs: lane.logs.map((log) =>
          wrapMovingBody({
            ...log,
            x: log.x + log.speed * deltaSeconds,
          }),
        ),
      };
    }

    return lane;
  });

  const player = {
    ...state.player,
    hopProgress: Math.min(1, state.player.hopProgress + deltaSeconds * 7.8),
  };
  const currentLane = lanes.find((lane) => lane.row === player.row);
  const playerX = (CROSSY_WIDTH - CROSSY_COLUMNS * CROSSY_TILE) / 2 + player.column * CROSSY_TILE + player.carryOffset;
  const playerCenterX = playerX + CROSSY_TILE / 2;
  let phase: CrossyPhase = state.phase;
  let nextPlayer = player;

  const landedEnough = player.hopProgress >= 0.58;

  if ((currentLane?.type === "road" || currentLane?.type === "rail") && landedEnough) {
    if (currentLane.vehicles.some((vehicle) => vehicleOverlapsPlayer(vehicle, playerX))) {
      phase = "game-over";
    }
  } else if (currentLane?.type === "river" && landedEnough) {
    const supportingLog = currentLane.logs.find((log) => logUnderPlayer(log, playerCenterX));
    if (!supportingLog) {
      phase = "game-over";
    } else {
      const carryOffset = player.carryOffset + supportingLog.speed * deltaSeconds;
      const carriedCenterX = playerCenterX + supportingLog.speed * deltaSeconds;
      if (carriedCenterX < 0 || carriedCenterX > CROSSY_WIDTH) {
        phase = "game-over";
      }
      nextPlayer = { ...player, carryOffset };
    }
  }

  const cameraRow = state.cameraRow + (state.cameraTargetRow - state.cameraRow) * Math.min(1, deltaSeconds * 8);

  return {
    ...state,
    phase,
    lanes,
    player: nextPlayer,
    cameraRow,
  };
}
