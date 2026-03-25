import {
  PONG_AI_SPEED,
  PONG_BALL_RADIUS,
  PONG_BASE_BALL_SPEED,
  PONG_HEIGHT,
  PONG_PADDLE_GAP,
  PONG_PADDLE_HEIGHT,
  PONG_PADDLE_WIDTH,
  PONG_PLAYER_SPEED,
  PONG_WIDTH,
  PONG_WINNING_SCORE,
} from "@/features/games/pong/config/constants";
import type { PongBall, PongState, PongWinner } from "@/features/games/pong/types";
import { clamp, randomBetween } from "@/features/games/shared/utils/math";

function createBall(direction: 1 | -1): PongBall {
  return {
    x: PONG_WIDTH / 2,
    y: PONG_HEIGHT / 2,
    vx: PONG_BASE_BALL_SPEED * direction,
    vy: randomBetween(-PONG_BASE_BALL_SPEED * 0.55, PONG_BASE_BALL_SPEED * 0.55),
  };
}

function createCenteredBall(): PongBall {
  return {
    x: PONG_WIDTH / 2,
    y: PONG_HEIGHT / 2,
    vx: 0,
    vy: 0,
  };
}

function resetRound(
  state: PongState,
  scorer: PongWinner,
  nextPlayerScore: number,
  nextAiScore: number,
): PongState {
  const winner =
    nextPlayerScore >= PONG_WINNING_SCORE
      ? "player"
      : nextAiScore >= PONG_WINNING_SCORE
        ? "ai"
        : null;

  return {
    ...state,
    playerScore: nextPlayerScore,
    aiScore: nextAiScore,
    ball: createCenteredBall(),
    serveTimer: winner ? 0 : 0.9,
    nextServeDirection: scorer === "player" ? 1 : -1,
    phase: winner ? "finished" : "playing",
    winner,
  };
}

export function createPongState(): PongState {
  return {
    playerY: (PONG_HEIGHT - PONG_PADDLE_HEIGHT) / 2,
    aiY: (PONG_HEIGHT - PONG_PADDLE_HEIGHT) / 2,
    ball: createCenteredBall(),
    playerScore: 0,
    aiScore: 0,
    phase: "idle",
    winner: null,
    serveTimer: 0.9,
    nextServeDirection: 1,
  };
}

export function updatePong(
  state: PongState,
  deltaSeconds: number,
  inputDirection: number,
): PongState {
  if (state.phase !== "playing") {
    return state;
  }

  const nextPlayerY = clamp(
    state.playerY + inputDirection * PONG_PLAYER_SPEED * deltaSeconds,
    0,
    PONG_HEIGHT - PONG_PADDLE_HEIGHT,
  );

  const aiTargetY = state.ball.y - PONG_PADDLE_HEIGHT / 2;
  const aiDirection = Math.sign(aiTargetY - state.aiY);
  const nextAiY = clamp(
    state.aiY + aiDirection * PONG_AI_SPEED * deltaSeconds,
    0,
    PONG_HEIGHT - PONG_PADDLE_HEIGHT,
  );

  let nextState: PongState = {
    ...state,
    playerY: nextPlayerY,
    aiY: nextAiY,
  };

  if (nextState.serveTimer > 0) {
    const nextServeTimer = Math.max(nextState.serveTimer - deltaSeconds, 0);
    if (nextServeTimer > 0) {
      return {
        ...nextState,
        serveTimer: nextServeTimer,
      };
    }

    nextState = {
      ...nextState,
      serveTimer: 0,
      ball: createBall(nextState.nextServeDirection),
    };
  }

  let nextBall = {
    ...nextState.ball,
    x: nextState.ball.x + nextState.ball.vx * deltaSeconds,
    y: nextState.ball.y + nextState.ball.vy * deltaSeconds,
  };

  if (nextBall.y - PONG_BALL_RADIUS <= 0 || nextBall.y + PONG_BALL_RADIUS >= PONG_HEIGHT) {
    nextBall = {
      ...nextBall,
      y: clamp(nextBall.y, PONG_BALL_RADIUS, PONG_HEIGHT - PONG_BALL_RADIUS),
      vy: nextBall.vy * -1,
    };
  }

  const playerPaddleRight = PONG_PADDLE_GAP + PONG_PADDLE_WIDTH;
  if (
    nextBall.vx < 0 &&
    nextBall.x - PONG_BALL_RADIUS <= playerPaddleRight &&
    nextBall.x > PONG_PADDLE_GAP &&
    nextBall.y >= nextState.playerY &&
    nextBall.y <= nextState.playerY + PONG_PADDLE_HEIGHT
  ) {
    const impact = (nextBall.y - (nextState.playerY + PONG_PADDLE_HEIGHT / 2)) / (PONG_PADDLE_HEIGHT / 2);
    nextBall = {
      ...nextBall,
      x: playerPaddleRight + PONG_BALL_RADIUS,
      vx: Math.abs(nextBall.vx) * 1.04,
      vy: clamp(nextBall.vy + impact * 170, -460, 460),
    };
  }

  const aiPaddleLeft = PONG_WIDTH - PONG_PADDLE_GAP - PONG_PADDLE_WIDTH;
  if (
    nextBall.vx > 0 &&
    nextBall.x + PONG_BALL_RADIUS >= aiPaddleLeft &&
    nextBall.x < PONG_WIDTH - PONG_PADDLE_GAP &&
    nextBall.y >= nextState.aiY &&
    nextBall.y <= nextState.aiY + PONG_PADDLE_HEIGHT
  ) {
    const impact = (nextBall.y - (nextState.aiY + PONG_PADDLE_HEIGHT / 2)) / (PONG_PADDLE_HEIGHT / 2);
    nextBall = {
      ...nextBall,
      x: aiPaddleLeft - PONG_BALL_RADIUS,
      vx: -Math.abs(nextBall.vx) * 1.04,
      vy: clamp(nextBall.vy + impact * 170, -460, 460),
    };
  }

  if (nextBall.x + PONG_BALL_RADIUS < 0) {
    return resetRound(nextState, "ai", nextState.playerScore, nextState.aiScore + 1);
  }

  if (nextBall.x - PONG_BALL_RADIUS > PONG_WIDTH) {
    return resetRound(nextState, "player", nextState.playerScore + 1, nextState.aiScore);
  }

  return {
    ...nextState,
    ball: nextBall,
  };
}
