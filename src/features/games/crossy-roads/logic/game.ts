import {
  CROSSY_COLUMNS,
  CROSSY_START_COLUMN,
  CROSSY_START_ROW,
  CROSSY_TILE,
  CROSSY_VISIBLE_ROWS,
  CROSSY_WIDTH,
} from "@/features/games/crossy-roads/config/constants";
import type { CrossyDirection, CrossyLane, CrossyState, CrossyVehicle } from "@/features/games/crossy-roads/types";
import { clamp } from "@/features/games/shared/utils/math";

const vehicleColors = ["#ff5f57", "#4aa9ff", "#ffd24a", "#7cdd6c", "#ff8fd2", "#8a7cff"];

function isRoadRow(row: number) {
  if (row <= 0 || row % 6 === 0) {
    return false;
  }

  return row % 2 === 1 || row % 5 === 0;
}

function createVehicle(id: number, row: number, index: number, direction: -1 | 1): CrossyVehicle {
  const width = row % 5 === 0 ? 92 : 66 + (row % 3) * 14;
  const speed = (72 + (row % 7) * 16) * direction;
  const laneSpan = CROSSY_WIDTH + 220;
  const seededX = ((index * 190 + row * 47) % laneSpan) - 110;
  return {
    id,
    x: direction > 0 ? seededX : CROSSY_WIDTH - seededX - width,
    width,
    speed,
    color: vehicleColors[(row + index) % vehicleColors.length] ?? "#ff5f57",
  };
}

function createLane(row: number, nextVehicleId: number): { lane: CrossyLane; nextVehicleId: number } {
  const type = isRoadRow(row) ? "road" : "grass";
  const direction: -1 | 1 = row % 4 < 2 ? 1 : -1;
  let id = nextVehicleId;
  const vehicles: CrossyVehicle[] = [];

  if (type === "road") {
    const count = row % 5 === 0 ? 2 : 3;
    for (let index = 0; index < count; index += 1) {
      vehicles.push(createVehicle(id, row, index, direction));
      id += 1;
    }
  }

  return {
    lane: {
      row,
      type,
      direction,
      vehicles,
    },
    nextVehicleId: id,
  };
}

function createLanes(minRow: number, maxRow: number, nextVehicleId: number) {
  const lanes: CrossyLane[] = [];
  let id = nextVehicleId;
  for (let row = minRow; row <= maxRow; row += 1) {
    const created = createLane(row, id);
    lanes.push(created.lane);
    id = created.nextVehicleId;
  }

  return { lanes, nextVehicleId: id };
}

export function createCrossyState(bestScore = 0): CrossyState {
  const created = createLanes(-2, CROSSY_VISIBLE_ROWS + 4, 1);
  return {
    phase: "idle",
    player: {
      column: CROSSY_START_COLUMN,
      row: CROSSY_START_ROW,
      fromColumn: CROSSY_START_COLUMN,
      fromRow: CROSSY_START_ROW,
      hopProgress: 1,
    },
    lanes: created.lanes,
    score: 0,
    bestScore,
    cameraRow: 0,
    highestRow: 0,
    nextVehicleId: created.nextVehicleId,
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
  const minNeeded = Math.floor(state.cameraRow) - 3;
  const maxNeeded = Math.floor(state.cameraRow) + CROSSY_VISIBLE_ROWS + 7;
  const existing = new Map(state.lanes.map((lane) => [lane.row, lane]));
  let nextVehicleId = state.nextVehicleId;
  const lanes: CrossyLane[] = [];

  for (let row = minNeeded; row <= maxNeeded; row += 1) {
    const existingLane = existing.get(row);
    if (existingLane) {
      lanes.push(existingLane);
    } else {
      const created = createLane(row, nextVehicleId);
      lanes.push(created.lane);
      nextVehicleId = created.nextVehicleId;
    }
  }

  return {
    ...state,
    lanes,
    nextVehicleId,
  };
}

export function moveCrossy(state: CrossyState, direction: CrossyDirection): CrossyState {
  const playingState = state.phase === "idle" ? startCrossy(state) : state;
  if (playingState.phase !== "playing") {
    return state;
  }

  const rowDelta = direction === "up" ? 1 : direction === "down" ? -1 : 0;
  const columnDelta = direction === "right" ? 1 : direction === "left" ? -1 : 0;
  const row = Math.max(CROSSY_START_ROW, playingState.player.row + rowDelta);
  const column = clamp(playingState.player.column + columnDelta, 0, CROSSY_COLUMNS - 1);
  const highestRow = Math.max(playingState.highestRow, row);
  const score = highestRow;
  const cameraRow = Math.max(0, highestRow - 4);

  return ensureLaneRange({
    ...playingState,
    player: {
      column,
      row,
      fromColumn: playingState.player.column,
      fromRow: playingState.player.row,
      hopProgress: 0,
    },
    highestRow,
    score,
    bestScore: Math.max(playingState.bestScore, score),
    cameraRow,
  });
}

function vehicleOverlapsPlayer(vehicle: CrossyVehicle, playerX: number) {
  const playerLeft = playerX + 10;
  const playerRight = playerX + CROSSY_TILE - 10;
  return playerRight > vehicle.x && playerLeft < vehicle.x + vehicle.width;
}

export function updateCrossy(state: CrossyState, deltaSeconds: number): CrossyState {
  if (state.phase !== "playing") {
    return state;
  }

  const lanes = state.lanes.map((lane) => {
    if (lane.type !== "road") {
      return lane;
    }

    return {
      ...lane,
      vehicles: lane.vehicles.map((vehicle) => {
        let x = vehicle.x + vehicle.speed * deltaSeconds;
        if (vehicle.speed > 0 && x > CROSSY_WIDTH + 90) {
          x = -vehicle.width - 140;
        } else if (vehicle.speed < 0 && x < -vehicle.width - 90) {
          x = CROSSY_WIDTH + 140;
        }

        return { ...vehicle, x };
      }),
    };
  });

  const player = {
    ...state.player,
    hopProgress: Math.min(1, state.player.hopProgress + deltaSeconds * 8),
  };
  const currentLane = lanes.find((lane) => lane.row === player.row);
  const playerX = 35 + player.column * CROSSY_TILE;
  const hitVehicle =
    currentLane?.type === "road" && currentLane.vehicles.some((vehicle) => vehicleOverlapsPlayer(vehicle, playerX));

  return {
    ...state,
    phase: hitVehicle ? "game-over" : state.phase,
    lanes,
    player,
  };
}
