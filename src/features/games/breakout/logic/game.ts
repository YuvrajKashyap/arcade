import {
  BREAKOUT_BALL_RADIUS,
  BREAKOUT_BALL_SPEED,
  BREAKOUT_BRICK_COLUMNS,
  BREAKOUT_BRICK_GAP,
  BREAKOUT_BRICK_HEIGHT,
  BREAKOUT_BRICK_LEFT,
  BREAKOUT_BRICK_ROWS,
  BREAKOUT_BRICK_TOP,
  BREAKOUT_BRICK_WIDTH,
  BREAKOUT_HEIGHT,
  BREAKOUT_LEVELS,
  BREAKOUT_LIVES,
  BREAKOUT_PADDLE_HEIGHT,
  BREAKOUT_PADDLE_SPEED,
  BREAKOUT_PADDLE_WIDTH,
  BREAKOUT_PADDLE_Y,
  BREAKOUT_WIDTH,
} from "@/features/games/breakout/config/constants";
import type { BreakoutBall, BreakoutBrick, BreakoutState } from "@/features/games/breakout/types";
import { clamp } from "@/features/games/shared/utils/math";

function createBall(): BreakoutBall {
  return {
    x: BREAKOUT_WIDTH / 2,
    y: BREAKOUT_PADDLE_Y - 24,
    vx: BREAKOUT_BALL_SPEED * (Math.random() > 0.5 ? 0.62 : -0.62),
    vy: -BREAKOUT_BALL_SPEED,
  };
}

function createBricks(level: number): BreakoutBrick[] {
  const bricks: BreakoutBrick[] = [];

  for (let row = 0; row < BREAKOUT_BRICK_ROWS; row += 1) {
    for (let column = 0; column < BREAKOUT_BRICK_COLUMNS; column += 1) {
      const patternedGap =
        level === 2 && row > 0 && row < 5 && column > 1 && column < 8 && (row + column) % 2 === 0;
      if (patternedGap) {
        continue;
      }

      const maxStrength =
        level >= 3 && row < 2 ? 3 : level >= 2 && row < 3 ? 2 : 1;
      bricks.push({
        x: BREAKOUT_BRICK_LEFT + column * (BREAKOUT_BRICK_WIDTH + BREAKOUT_BRICK_GAP),
        y: BREAKOUT_BRICK_TOP + row * (BREAKOUT_BRICK_HEIGHT + BREAKOUT_BRICK_GAP),
        strength: maxStrength,
        maxStrength,
      });
    }
  }

  return bricks;
}

export function createBreakoutState(bestScore = 0, level = 1): BreakoutState {
  return {
    phase: "idle",
    level,
    score: 0,
    bestScore,
    lives: BREAKOUT_LIVES,
    paddleX: (BREAKOUT_WIDTH - BREAKOUT_PADDLE_WIDTH) / 2,
    paddleWidth: BREAKOUT_PADDLE_WIDTH,
    wideTimer: 0,
    ball: createBall(),
    bricks: createBricks(level),
    powerup: null,
  };
}

function resetServe(state: BreakoutState): BreakoutState {
  return {
    ...state,
    paddleX: clamp(state.paddleX, 0, BREAKOUT_WIDTH - state.paddleWidth),
    ball: createBall(),
  };
}

function advanceLevel(state: BreakoutState): BreakoutState {
  const nextLevel = state.level >= BREAKOUT_LEVELS ? 1 : state.level + 1;

  return {
    ...state,
    phase: state.level >= BREAKOUT_LEVELS ? "cleared" : "playing",
    level: nextLevel,
    paddleWidth: BREAKOUT_PADDLE_WIDTH,
    wideTimer: 0,
    ball: createBall(),
    bricks: state.level >= BREAKOUT_LEVELS ? [] : createBricks(nextLevel),
    powerup: null,
  };
}

export function startBreakout(state: BreakoutState): BreakoutState {
  if (state.phase === "game-over" || state.phase === "cleared") {
    return {
      ...createBreakoutState(state.bestScore),
      phase: "playing",
    };
  }

  return {
    ...state,
    phase: "playing",
  };
}

export function updateBreakout(
  state: BreakoutState,
  deltaSeconds: number,
  inputDirection: number,
  pointerX: number | null,
): BreakoutState {
  if (state.phase !== "playing") {
    return state;
  }

  const nextWideTimer = Math.max(0, state.wideTimer - deltaSeconds);
  const nextPaddleWidth = nextWideTimer > 0 ? 152 : BREAKOUT_PADDLE_WIDTH;
  const directedPaddleX =
    pointerX === null
      ? state.paddleX + inputDirection * BREAKOUT_PADDLE_SPEED * deltaSeconds
      : pointerX - nextPaddleWidth / 2;

  let nextState: BreakoutState = {
    ...state,
    wideTimer: nextWideTimer,
    paddleWidth: nextPaddleWidth,
    paddleX: clamp(directedPaddleX, 0, BREAKOUT_WIDTH - nextPaddleWidth),
  };

  let nextBall = {
    ...nextState.ball,
    x: nextState.ball.x + nextState.ball.vx * deltaSeconds,
    y: nextState.ball.y + nextState.ball.vy * deltaSeconds,
  };

  if (nextBall.x - BREAKOUT_BALL_RADIUS <= 0 || nextBall.x + BREAKOUT_BALL_RADIUS >= BREAKOUT_WIDTH) {
    nextBall = {
      ...nextBall,
      x: clamp(nextBall.x, BREAKOUT_BALL_RADIUS, BREAKOUT_WIDTH - BREAKOUT_BALL_RADIUS),
      vx: nextBall.vx * -1,
    };
  }

  if (nextBall.y - BREAKOUT_BALL_RADIUS <= 0) {
    nextBall = {
      ...nextBall,
      y: BREAKOUT_BALL_RADIUS,
      vy: Math.abs(nextBall.vy),
    };
  }

  const paddleRight = nextState.paddleX + nextState.paddleWidth;
  if (
    nextBall.vy > 0 &&
    nextBall.y + BREAKOUT_BALL_RADIUS >= BREAKOUT_PADDLE_Y &&
    nextBall.y - BREAKOUT_BALL_RADIUS <= BREAKOUT_PADDLE_Y + BREAKOUT_PADDLE_HEIGHT &&
    nextBall.x >= nextState.paddleX &&
    nextBall.x <= paddleRight
  ) {
    const impact = (nextBall.x - (nextState.paddleX + nextState.paddleWidth / 2)) / (nextState.paddleWidth / 2);
    nextBall = {
      ...nextBall,
      y: BREAKOUT_PADDLE_Y - BREAKOUT_BALL_RADIUS,
      vx: impact * 360,
      vy: -Math.abs(nextBall.vy) * 1.015,
    };
  }

  let nextBricks = nextState.bricks;
  let nextPowerup = nextState.powerup
    ? {
        ...nextState.powerup,
        y: nextState.powerup.y + 130 * deltaSeconds,
      }
    : null;

  for (const brick of nextState.bricks) {
    const overlapsBrick =
      nextBall.x + BREAKOUT_BALL_RADIUS >= brick.x &&
      nextBall.x - BREAKOUT_BALL_RADIUS <= brick.x + BREAKOUT_BRICK_WIDTH &&
      nextBall.y + BREAKOUT_BALL_RADIUS >= brick.y &&
      nextBall.y - BREAKOUT_BALL_RADIUS <= brick.y + BREAKOUT_BRICK_HEIGHT;

    if (!overlapsBrick) {
      continue;
    }

    const nextStrength = brick.strength - 1;
    nextBricks = nextState.bricks.flatMap((candidate) => {
      if (candidate !== brick) {
        return candidate;
      }

      return nextStrength > 0
        ? [{ ...candidate, strength: nextStrength }]
        : [];
    });
    nextState = {
      ...nextState,
      score: nextState.score + 50 * brick.maxStrength,
      bestScore: Math.max(nextState.bestScore, nextState.score + 50 * brick.maxStrength),
    };
    if (!nextPowerup && nextStrength <= 0 && (brick.x + brick.y + nextState.score) % 5 === 0) {
      nextPowerup = { x: brick.x + BREAKOUT_BRICK_WIDTH / 2, y: brick.y, active: true };
    }
    nextBall = { ...nextBall, vy: nextBall.vy * -1 };
    break;
  }

  if (nextPowerup && nextPowerup.y > BREAKOUT_HEIGHT) {
    nextPowerup = null;
  }

  if (
    nextPowerup &&
    nextPowerup.y >= BREAKOUT_PADDLE_Y - 8 &&
    nextPowerup.x >= nextState.paddleX &&
    nextPowerup.x <= nextState.paddleX + nextState.paddleWidth
  ) {
    nextPowerup = null;
    nextState = {
      ...nextState,
      wideTimer: 10,
      paddleWidth: 152,
      score: nextState.score + 100,
      bestScore: Math.max(nextState.bestScore, nextState.score + 100),
    };
  }

  if (nextBall.y - BREAKOUT_BALL_RADIUS > BREAKOUT_HEIGHT) {
    const nextLives = nextState.lives - 1;
    if (nextLives <= 0) {
      return {
        ...nextState,
        lives: 0,
        phase: "game-over",
        ball: nextBall,
        bricks: nextBricks,
        powerup: null,
      };
    }

    return resetServe({
      ...nextState,
      lives: nextLives,
      ball: nextBall,
      bricks: nextBricks,
      powerup: null,
    });
  }

  if (nextBricks.length === 0) {
    return advanceLevel({
      ...nextState,
      ball: nextBall,
      bricks: nextBricks,
      powerup: nextPowerup,
    });
  }

  return {
    ...nextState,
    ball: nextBall,
    bricks: nextBricks,
    powerup: nextPowerup,
  };
}
