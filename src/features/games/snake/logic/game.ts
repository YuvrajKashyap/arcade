import { SNAKE_BOARD_SIZE } from "@/features/games/snake/config/constants";
import type {
  SnakeDirection,
  SnakePoint,
  SnakeState,
} from "@/features/games/snake/types";

const INITIAL_SNAKE: SnakePoint[] = [
  { x: 6, y: 9 },
  { x: 5, y: 9 },
  { x: 4, y: 9 },
];

const OPPOSITE_DIRECTION: Record<SnakeDirection, SnakeDirection> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

function createFoodPosition(snake: SnakePoint[]) {
  let candidate: SnakePoint = { x: 0, y: 0 };

  do {
    candidate = {
      x: Math.floor(Math.random() * SNAKE_BOARD_SIZE),
      y: Math.floor(Math.random() * SNAKE_BOARD_SIZE),
    };
  } while (
    snake.some((segment) => segment.x === candidate.x && segment.y === candidate.y)
  );

  return candidate;
}

function getNextHeadPosition(
  head: SnakePoint,
  direction: SnakeDirection,
): SnakePoint {
  if (direction === "up") {
    return { x: head.x, y: head.y - 1 };
  }

  if (direction === "down") {
    return { x: head.x, y: head.y + 1 };
  }

  if (direction === "left") {
    return { x: head.x - 1, y: head.y };
  }

  return { x: head.x + 1, y: head.y };
}

export function createSnakeState(bestScore = 0): SnakeState {
  return {
    snake: INITIAL_SNAKE,
    direction: "right",
    queuedDirection: "right",
    food: createFoodPosition(INITIAL_SNAKE),
    score: 0,
    phase: "idle",
    bestScore,
  };
}

export function queueSnakeDirection(
  currentDirection: SnakeDirection,
  nextDirection: SnakeDirection,
) {
  return OPPOSITE_DIRECTION[currentDirection] === nextDirection
    ? currentDirection
    : nextDirection;
}

export function advanceSnake(state: SnakeState): SnakeState {
  const activeDirection = state.queuedDirection;
  const currentHead = state.snake[0];
  const nextHead = getNextHeadPosition(currentHead, activeDirection);
  const eatsFood =
    nextHead.x === state.food.x && nextHead.y === state.food.y;
  const collisionBody = (eatsFood ? state.snake : state.snake.slice(0, -1)).some(
    (segment) => segment.x === nextHead.x && segment.y === nextHead.y,
  );

  const hitWall =
    nextHead.x < 0 ||
    nextHead.x >= SNAKE_BOARD_SIZE ||
    nextHead.y < 0 ||
    nextHead.y >= SNAKE_BOARD_SIZE;

  if (hitWall || collisionBody) {
    return {
      ...state,
      phase: "game-over",
      bestScore: Math.max(state.bestScore, state.score),
    };
  }

  const nextSnake = [nextHead, ...state.snake];
  if (!eatsFood) {
    nextSnake.pop();
  }

  const nextScore = eatsFood ? state.score + 1 : state.score;

  return {
    ...state,
    snake: nextSnake,
    direction: activeDirection,
    queuedDirection: activeDirection,
    food: eatsFood ? createFoodPosition(nextSnake) : state.food,
    score: nextScore,
    bestScore: Math.max(state.bestScore, nextScore),
  };
}
