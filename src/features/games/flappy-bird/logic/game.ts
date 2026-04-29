import {
  FLAPPY_BIRD_RADIUS,
  FLAPPY_BIRD_X,
  FLAPPY_FLAP_VELOCITY,
  FLAPPY_GRAVITY,
  FLAPPY_GROUND_HEIGHT,
  FLAPPY_HEIGHT,
  FLAPPY_PIPE_GAP,
  FLAPPY_PIPE_SPACING,
  FLAPPY_PIPE_SPEED,
  FLAPPY_PIPE_WIDTH,
  FLAPPY_WIDTH,
} from "@/features/games/flappy-bird/config/constants";
import type { FlappyBirdState, FlappyPipe } from "@/features/games/flappy-bird/types";
import { clamp } from "@/features/games/shared/utils/math";

function createPipe(id: number, x: number, pipeGap = FLAPPY_PIPE_GAP): FlappyPipe {
  const minGapY = 104;
  const maxGapY = FLAPPY_HEIGHT - FLAPPY_GROUND_HEIGHT - pipeGap - 104;
  return {
    id,
    x,
    gapY: minGapY + Math.random() * (maxGapY - minGapY),
    passed: false,
  };
}

function createPipes(pipeGap = FLAPPY_PIPE_GAP) {
  return [
    createPipe(1, FLAPPY_WIDTH + 80, pipeGap),
    createPipe(2, FLAPPY_WIDTH + 80 + FLAPPY_PIPE_SPACING, pipeGap),
  ];
}

export function createFlappyBirdState(
  bestScore = 0,
  pipeGap = FLAPPY_PIPE_GAP,
): FlappyBirdState {
  return {
    phase: "idle",
    bird: {
      y: FLAPPY_HEIGHT * 0.46,
      vy: 0,
      rotation: 0,
    },
    pipes: createPipes(pipeGap),
    score: 0,
    bestScore,
    scroll: 0,
    nextPipeId: 3,
  };
}

export function startFlappyBird(
  state: FlappyBirdState,
  pipeGap = FLAPPY_PIPE_GAP,
): FlappyBirdState {
  if (state.phase === "game-over") {
    const nextState = createFlappyBirdState(state.bestScore, pipeGap);
    return {
      ...nextState,
      phase: "playing",
      bird: { ...nextState.bird, vy: FLAPPY_FLAP_VELOCITY },
    };
  }

  return {
    ...state,
    phase: "playing",
  };
}

export function flapFlappyBird(
  state: FlappyBirdState,
  pipeGap = FLAPPY_PIPE_GAP,
): FlappyBirdState {
  if (state.phase === "idle" || state.phase === "game-over") {
    const started = startFlappyBird(state, pipeGap);
    return {
      ...started,
      bird: {
        ...started.bird,
        vy: FLAPPY_FLAP_VELOCITY,
      },
    };
  }

  if (state.phase !== "playing") {
    return state;
  }

  return {
    ...state,
    bird: {
      ...state.bird,
      vy: FLAPPY_FLAP_VELOCITY,
    },
  };
}

function collidesWithPipe(
  birdY: number,
  pipe: FlappyPipe,
  pipeGap = FLAPPY_PIPE_GAP,
) {
  const birdLeft = FLAPPY_BIRD_X - FLAPPY_BIRD_RADIUS + 4;
  const birdRight = FLAPPY_BIRD_X + FLAPPY_BIRD_RADIUS - 4;
  const birdTop = birdY - FLAPPY_BIRD_RADIUS + 3;
  const birdBottom = birdY + FLAPPY_BIRD_RADIUS - 3;
  const pipeLeft = pipe.x;
  const pipeRight = pipe.x + FLAPPY_PIPE_WIDTH;
  const gapTop = pipe.gapY;
  const gapBottom = pipe.gapY + pipeGap;

  return birdRight > pipeLeft && birdLeft < pipeRight && (birdTop < gapTop || birdBottom > gapBottom);
}

export function updateFlappyBird(
  state: FlappyBirdState,
  deltaSeconds: number,
  pipeGap = FLAPPY_PIPE_GAP,
): FlappyBirdState {
  if (state.phase !== "playing") {
    return state;
  }

  const bird = {
    ...state.bird,
    vy: state.bird.vy + FLAPPY_GRAVITY * deltaSeconds,
  };
  bird.y += bird.vy * deltaSeconds;
  bird.rotation = clamp(bird.vy / 720, -0.55, 0.82);

  let nextPipeId = state.nextPipeId;
  let score = state.score;
  let pipes = state.pipes
    .map((pipe) => {
      const x = pipe.x - FLAPPY_PIPE_SPEED * deltaSeconds;
      const passed = pipe.passed || x + FLAPPY_PIPE_WIDTH < FLAPPY_BIRD_X;
      if (!pipe.passed && passed) {
        score += 1;
      }
      return { ...pipe, x, passed };
    })
    .filter((pipe) => pipe.x > -FLAPPY_PIPE_WIDTH - 20);

  const furthestX = Math.max(...pipes.map((pipe) => pipe.x), FLAPPY_WIDTH);
  while (pipes.length < 3) {
    pipes = [
      ...pipes,
      createPipe(
        nextPipeId,
        furthestX + FLAPPY_PIPE_SPACING + (nextPipeId - state.nextPipeId) * FLAPPY_PIPE_SPACING,
        pipeGap,
      ),
    ];
    nextPipeId += 1;
  }

  const hitPipe = pipes.some((pipe) => collidesWithPipe(bird.y, pipe, pipeGap));
  const hitWorld = bird.y - FLAPPY_BIRD_RADIUS < 0 || bird.y + FLAPPY_BIRD_RADIUS > FLAPPY_HEIGHT - FLAPPY_GROUND_HEIGHT;
  const nextPhase = hitPipe || hitWorld ? "game-over" : "playing";

  return {
    ...state,
    phase: nextPhase,
    bird,
    pipes,
    score,
    bestScore: Math.max(state.bestScore, score),
    scroll: state.scroll + FLAPPY_PIPE_SPEED * deltaSeconds,
    nextPipeId,
  };
}
