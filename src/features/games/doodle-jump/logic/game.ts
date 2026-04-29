import {
  DOODLE_GRAVITY,
  DOODLE_HEIGHT,
  DOODLE_JUMP_VELOCITY,
  DOODLE_MOVE_SPEED,
  DOODLE_PLATFORM_HEIGHT,
  DOODLE_PLATFORM_WIDTH,
  DOODLE_PLAYER_HEIGHT,
  DOODLE_PLAYER_WIDTH,
  DOODLE_WIDTH,
} from "@/features/games/doodle-jump/config/constants";
import type { DoodleJumpState, DoodlePlatform } from "@/features/games/doodle-jump/types";
import { clamp } from "@/features/games/shared/utils/math";

function createStarterPlatforms() {
  const platforms: DoodlePlatform[] = [
    { id: 1, x: DOODLE_WIDTH / 2 - DOODLE_PLATFORM_WIDTH / 2, y: DOODLE_HEIGHT - 54, width: 96, kind: "green" },
  ];

  for (let index = 1; index < 8; index += 1) {
    platforms.push({
      id: index + 1,
      x: 26 + Math.random() * (DOODLE_WIDTH - DOODLE_PLATFORM_WIDTH - 52),
      y: DOODLE_HEIGHT - 54 - index * 74,
      width: DOODLE_PLATFORM_WIDTH,
      kind: index % 5 === 0 ? "pink" : index % 3 === 0 ? "blue" : "green",
    });
  }

  return platforms;
}

export function createDoodleJumpState(bestScore = 0): DoodleJumpState {
  return {
    phase: "idle",
    player: {
      x: DOODLE_WIDTH / 2 - DOODLE_PLAYER_WIDTH / 2,
      y: DOODLE_HEIGHT - 112,
      vx: 0,
      vy: DOODLE_JUMP_VELOCITY * 0.64,
      facing: 1,
    },
    platforms: createStarterPlatforms(),
    score: 0,
    bestScore,
    cameraY: 0,
    nextPlatformId: 9,
  };
}

export function startDoodleJump(state: DoodleJumpState): DoodleJumpState {
  if (state.phase === "game-over") {
    return {
      ...createDoodleJumpState(state.bestScore),
      phase: "playing",
    };
  }

  return {
    ...state,
    phase: "playing",
  };
}

function createPlatform(id: number, y: number, score: number): DoodlePlatform {
  const width = clamp(DOODLE_PLATFORM_WIDTH - Math.floor(score / 700) * 4, 54, DOODLE_PLATFORM_WIDTH);
  return {
    id,
    x: 18 + Math.random() * (DOODLE_WIDTH - width - 36),
    y,
    width,
    kind: score > 260 && id % 6 === 0 ? "breakable" : id % 7 === 0 ? "pink" : id % 4 === 0 ? "blue" : "green",
  };
}

export function updateDoodleJump(
  state: DoodleJumpState,
  deltaSeconds: number,
  inputDirection: number,
): DoodleJumpState {
  if (state.phase !== "playing") {
    return state;
  }

  const previousPlayer = state.player;
  let player = {
    ...previousPlayer,
    vx: inputDirection * DOODLE_MOVE_SPEED,
    vy: previousPlayer.vy + DOODLE_GRAVITY * deltaSeconds,
    facing: inputDirection === 0 ? previousPlayer.facing : inputDirection > 0 ? 1 : (-1 as -1 | 1),
  };

  player = {
    ...player,
    x: player.x + player.vx * deltaSeconds,
    y: player.y + player.vy * deltaSeconds,
  };

  if (player.x > DOODLE_WIDTH) {
    player.x = -DOODLE_PLAYER_WIDTH;
  } else if (player.x < -DOODLE_PLAYER_WIDTH) {
    player.x = DOODLE_WIDTH;
  }

  const falling = previousPlayer.vy > 0;
  if (falling) {
    const previousBottom = previousPlayer.y + DOODLE_PLAYER_HEIGHT;
    const nextBottom = player.y + DOODLE_PLAYER_HEIGHT;
    const playerCenterX = player.x + DOODLE_PLAYER_WIDTH / 2;
    const landedPlatform = state.platforms.find(
      (platform) =>
        previousBottom <= platform.y + 4 &&
        nextBottom >= platform.y &&
        nextBottom <= platform.y + DOODLE_PLATFORM_HEIGHT + 14 &&
        playerCenterX >= platform.x - 8 &&
        playerCenterX <= platform.x + platform.width + 8,
    );

    if (landedPlatform?.kind === "breakable") {
      state = {
        ...state,
        platforms: state.platforms.map((platform) =>
          platform.id === landedPlatform.id ? { ...platform, brokenAt: state.cameraY } : platform,
        ),
      };
    } else if (landedPlatform) {
      player = {
        ...player,
        y: landedPlatform.y - DOODLE_PLAYER_HEIGHT,
        vy: DOODLE_JUMP_VELOCITY,
      };
    }
  }

  const centerBandY = DOODLE_HEIGHT * 0.52;
  const targetCameraY =
    player.y < centerBandY ? state.cameraY + player.y - centerBandY : state.cameraY;
  const cameraDelta = targetCameraY - state.cameraY;
  const score = Math.max(state.score, Math.floor(Math.abs(targetCameraY)));
  let platforms = state.platforms.map((platform) => ({
    ...platform,
    y: platform.y - cameraDelta + (platform.brokenAt === undefined ? 0 : Math.abs(state.cameraY - platform.brokenAt) * 0.16),
  }));
  player = { ...player, y: player.y - cameraDelta };

  let nextPlatformId = state.nextPlatformId;
  let highestY = Math.min(...platforms.map((platform) => platform.y));
  platforms = platforms.filter((platform) => platform.y < DOODLE_HEIGHT + 42);

  while (highestY > -38) {
    highestY -= 66 + Math.random() * 22;
    platforms.push(createPlatform(nextPlatformId, highestY, score));
    nextPlatformId += 1;
  }

  if (player.y > DOODLE_HEIGHT + 24) {
    return {
      ...state,
      phase: "game-over",
      player,
      platforms,
      score,
      bestScore: Math.max(state.bestScore, score),
      cameraY: targetCameraY,
      nextPlatformId,
    };
  }

  return {
    ...state,
    player,
    platforms,
    score,
    bestScore: Math.max(state.bestScore, score),
    cameraY: targetCameraY,
    nextPlatformId,
  };
}
