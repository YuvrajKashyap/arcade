"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  SNAKE_CANVAS_SIZE,
  SNAKE_CELL_SIZE,
  SNAKE_STORAGE_KEY,
  SNAKE_TICK_SECONDS,
} from "@/features/games/snake/config/constants";
import {
  advanceSnake,
  createSnakeState,
  queueSnakeDirection,
} from "@/features/games/snake/logic/game";
import type {
  SnakeDirection,
  SnakePhase,
  SnakePoint,
  SnakeState,
} from "@/features/games/snake/types";
import { configureHiDPICanvas } from "@/features/games/shared/canvas/configure-canvas";
import {
  GameButton,
  GameHud,
  GamePanel,
  GamePlayfield,
  GameStatus,
  TouchControls,
} from "@/features/games/shared/components/game-ui";
import { useAnimationFrameLoop } from "@/features/games/shared/hooks/use-animation-frame-loop";
import {
  readStoredNumber,
  writeStoredNumber,
} from "@/features/games/shared/utils/local-storage";

type SnakeRenderState = {
  previousSnake: SnakePoint[];
  currentSnake: SnakePoint[];
  progress: number;
};

type PickupEffect = {
  x: number;
  y: number;
  age: number;
};

const ARENA_PADDING = 14;
const PICKUP_EFFECT_SECONDS = 0.55;

function getStatusCopy(phase: SnakePhase) {
  if (phase === "playing") {
    return "Flow through the arena, chain pickups, and keep your tail out of the turn.";
  }

  if (phase === "paused") {
    return "Paused. Resume with the button or press P to jump back in.";
  }

  if (phase === "game-over") {
    return "Game over. Press Space or restart to reset the board instantly.";
  }

  return "Press Space to start. Arrow keys or WASD steer the snake.";
}

function pointToCanvasCenter(point: SnakePoint) {
  return {
    x: point.x * SNAKE_CELL_SIZE + SNAKE_CELL_SIZE / 2,
    y: point.y * SNAKE_CELL_SIZE + SNAKE_CELL_SIZE / 2,
  };
}

function easeOutCubic(progress: number) {
  const inverted = 1 - Math.min(Math.max(progress, 0), 1);
  return 1 - inverted * inverted * inverted;
}

function interpolatePoint(
  from: SnakePoint,
  to: SnakePoint,
  progress: number,
) {
  const easedProgress = easeOutCubic(progress);

  return {
    x: from.x + (to.x - from.x) * easedProgress,
    y: from.y + (to.y - from.y) * easedProgress,
  };
}

function getInterpolatedSnake(renderState: SnakeRenderState) {
  return renderState.currentSnake.map((segment, index) => {
    const previousSegment =
      renderState.previousSnake[index] ??
      renderState.previousSnake[renderState.previousSnake.length - 1] ??
      segment;

    return pointToCanvasCenter(
      interpolatePoint(previousSegment, segment, renderState.progress),
    );
  });
}

function getDirectionVector(direction: SnakeDirection) {
  if (direction === "up") {
    return { x: 0, y: -1 };
  }

  if (direction === "down") {
    return { x: 0, y: 1 };
  }

  if (direction === "left") {
    return { x: -1, y: 0 };
  }

  return { x: 1, y: 0 };
}

function drawArena(context: CanvasRenderingContext2D, elapsedSeconds: number) {
  const backgroundGradient = context.createRadialGradient(
    SNAKE_CANVAS_SIZE * 0.5,
    SNAKE_CANVAS_SIZE * 0.42,
    SNAKE_CANVAS_SIZE * 0.05,
    SNAKE_CANVAS_SIZE * 0.5,
    SNAKE_CANVAS_SIZE * 0.5,
    SNAKE_CANVAS_SIZE * 0.72,
  );
  backgroundGradient.addColorStop(0, "#11243b");
  backgroundGradient.addColorStop(0.62, "#081522");
  backgroundGradient.addColorStop(1, "#030712");

  context.fillStyle = backgroundGradient;
  context.fillRect(0, 0, SNAKE_CANVAS_SIZE, SNAKE_CANVAS_SIZE);

  context.save();
  context.globalAlpha = 0.16;
  context.strokeStyle = "#41e6c0";
  context.lineWidth = 1;
  for (
    let offset = -SNAKE_CANVAS_SIZE;
    offset < SNAKE_CANVAS_SIZE * 2;
    offset += 38
  ) {
    context.beginPath();
    context.moveTo(offset + Math.sin(elapsedSeconds * 0.4) * 8, 0);
    context.lineTo(offset + SNAKE_CANVAS_SIZE, SNAKE_CANVAS_SIZE);
    context.stroke();
  }
  context.restore();

  context.save();
  context.shadowBlur = 26;
  context.shadowColor = "rgba(65, 230, 192, 0.45)";
  context.strokeStyle = "rgba(65, 230, 192, 0.52)";
  context.lineWidth = 4;
  context.strokeRect(
    ARENA_PADDING,
    ARENA_PADDING,
    SNAKE_CANVAS_SIZE - ARENA_PADDING * 2,
    SNAKE_CANVAS_SIZE - ARENA_PADDING * 2,
  );
  context.restore();

  context.strokeStyle = "rgba(255,255,255,0.08)";
  context.lineWidth = 1;
  context.strokeRect(
    ARENA_PADDING + 8,
    ARENA_PADDING + 8,
    SNAKE_CANVAS_SIZE - (ARENA_PADDING + 8) * 2,
    SNAKE_CANVAS_SIZE - (ARENA_PADDING + 8) * 2,
  );
}

function drawFood(
  context: CanvasRenderingContext2D,
  food: SnakePoint,
  elapsedSeconds: number,
) {
  const center = pointToCanvasCenter(food);
  const pulse = 1 + Math.sin(elapsedSeconds * 7) * 0.08;
  const glowRadius = SNAKE_CELL_SIZE * 1.08 * pulse;

  const glow = context.createRadialGradient(
    center.x,
    center.y,
    1,
    center.x,
    center.y,
    glowRadius,
  );
  glow.addColorStop(0, "rgba(255, 126, 76, 0.78)");
  glow.addColorStop(0.46, "rgba(255, 70, 86, 0.24)");
  glow.addColorStop(1, "rgba(255, 70, 86, 0)");

  context.fillStyle = glow;
  context.beginPath();
  context.arc(center.x, center.y, glowRadius, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.shadowBlur = 18;
  context.shadowColor = "rgba(255, 92, 59, 0.85)";
  context.fillStyle = "#ff6b3d";
  context.beginPath();
  context.ellipse(
    center.x,
    center.y + 1,
    SNAKE_CELL_SIZE * 0.32 * pulse,
    SNAKE_CELL_SIZE * 0.38 * pulse,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();

  context.fillStyle = "#35e1a2";
  context.beginPath();
  context.ellipse(
    center.x + 4,
    center.y - 8,
    4,
    7,
    Math.PI * 0.85,
    0,
    Math.PI * 2,
  );
  context.fill();
}

function drawPickupEffects(
  context: CanvasRenderingContext2D,
  effects: PickupEffect[],
) {
  effects.forEach((effect) => {
    const progress = Math.min(effect.age / PICKUP_EFFECT_SECONDS, 1);
    const alpha = 1 - progress;
    const radius = SNAKE_CELL_SIZE * (0.55 + progress * 1.35);

    context.save();
    context.globalAlpha = alpha;
    context.strokeStyle = "#ffd166";
    context.lineWidth = 3 * alpha + 1;
    context.shadowBlur = 18;
    context.shadowColor = "rgba(255, 209, 102, 0.8)";
    context.beginPath();
    context.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  });
}

function drawSnakeBody(
  context: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
) {
  if (points.length === 0) {
    return;
  }

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.shadowBlur = 22;
  context.shadowColor = "rgba(91, 255, 126, 0.55)";

  if (points.length > 1) {
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);

    for (let index = 1; index < points.length - 1; index += 1) {
      const currentPoint = points[index];
      const nextPoint = points[index + 1];
      context.quadraticCurveTo(
        currentPoint.x,
        currentPoint.y,
        (currentPoint.x + nextPoint.x) / 2,
        (currentPoint.y + nextPoint.y) / 2,
      );
    }

    const tailPoint = points[points.length - 1];
    context.lineTo(tailPoint.x, tailPoint.y);
    context.strokeStyle = "#24d95f";
    context.lineWidth = SNAKE_CELL_SIZE * 0.82;
    context.stroke();

    context.shadowBlur = 0;
    context.strokeStyle = "rgba(226, 255, 219, 0.4)";
    context.lineWidth = SNAKE_CELL_SIZE * 0.24;
    context.stroke();
  }

  points.forEach((point, index) => {
    const tailProgress = index / Math.max(points.length - 1, 1);
    const radius = SNAKE_CELL_SIZE * (0.42 - tailProgress * 0.16);
    const segmentGradient = context.createRadialGradient(
      point.x - radius * 0.28,
      point.y - radius * 0.34,
      1,
      point.x,
      point.y,
      radius,
    );
    segmentGradient.addColorStop(0, "#d7ffb8");
    segmentGradient.addColorStop(0.22, "#5cff74");
    segmentGradient.addColorStop(1, "#128737");

    context.fillStyle = segmentGradient;
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
  });

  context.restore();
}

function drawSnakeHead(
  context: CanvasRenderingContext2D,
  head: { x: number; y: number },
  direction: SnakeDirection,
) {
  const vector = getDirectionVector(direction);
  const sideVector = { x: -vector.y, y: vector.x };
  const headLength = SNAKE_CELL_SIZE * 0.96;
  const headWidth = SNAKE_CELL_SIZE * 0.78;
  const headCenterX = head.x + vector.x * SNAKE_CELL_SIZE * 0.1;
  const headCenterY = head.y + vector.y * SNAKE_CELL_SIZE * 0.1;
  const headAngle = Math.atan2(vector.y, vector.x);

  context.save();
  context.shadowBlur = 24;
  context.shadowColor = "rgba(102, 255, 116, 0.58)";
  const headGradient = context.createRadialGradient(
    headCenterX - sideVector.x * 5 - vector.x * 4,
    headCenterY - sideVector.y * 5 - vector.y * 4,
    2,
    headCenterX,
    headCenterY,
    headLength,
  );
  headGradient.addColorStop(0, "#ddffaf");
  headGradient.addColorStop(0.46, "#55ef63");
  headGradient.addColorStop(1, "#137f32");
  context.fillStyle = headGradient;
  context.beginPath();
  context.ellipse(
    headCenterX,
    headCenterY,
    headLength * 0.52,
    headWidth * 0.48,
    headAngle,
    0,
    Math.PI * 2,
  );
  context.fill();

  context.shadowBlur = 0;
  context.strokeStyle = "rgba(220, 255, 196, 0.4)";
  context.lineWidth = 1.4;
  context.stroke();

  context.fillStyle = "#06101d";
  [-1, 1].forEach((side) => {
    const eyeX =
      headCenterX +
      vector.x * headLength * 0.18 +
      sideVector.x * side * headWidth * 0.24;
    const eyeY =
      headCenterY +
      vector.y * headLength * 0.18 +
      sideVector.y * side * headWidth * 0.24;
    context.beginPath();
    context.ellipse(eyeX, eyeY, 2.3, 3.5, headAngle, 0, Math.PI * 2);
    context.fill();
  });

  context.restore();
}

function drawSnakeScene(
  context: CanvasRenderingContext2D,
  state: SnakeState,
  renderState: SnakeRenderState,
  effects: PickupEffect[],
  elapsedSeconds: number,
) {
  context.clearRect(0, 0, SNAKE_CANVAS_SIZE, SNAKE_CANVAS_SIZE);
  drawArena(context, elapsedSeconds);
  drawFood(context, state.food, elapsedSeconds);
  drawPickupEffects(context, effects);

  const snakePoints = getInterpolatedSnake(renderState);
  drawSnakeBody(context, snakePoints);

  const head = snakePoints[0];
  if (head) {
    drawSnakeHead(context, head, state.direction);
  }

  if (state.phase !== "playing") {
    context.fillStyle = "rgba(3, 7, 18, 0.58)";
    context.fillRect(0, 0, SNAKE_CANVAS_SIZE, SNAKE_CANVAS_SIZE);

    const panelGradient = context.createLinearGradient(
      SNAKE_CANVAS_SIZE / 2,
      SNAKE_CANVAS_SIZE / 2 - 72,
      SNAKE_CANVAS_SIZE / 2,
      SNAKE_CANVAS_SIZE / 2 + 76,
    );
    panelGradient.addColorStop(0, "rgba(16, 31, 52, 0.92)");
    panelGradient.addColorStop(1, "rgba(8, 17, 31, 0.72)");

    context.fillStyle = panelGradient;
    context.beginPath();
    context.roundRect(
      SNAKE_CANVAS_SIZE / 2 - 128,
      SNAKE_CANVAS_SIZE / 2 - 68,
      256,
      136,
      24,
    );
    context.fill();

    context.strokeStyle = "rgba(65, 230, 192, 0.35)";
    context.lineWidth = 1;
    context.stroke();

    context.fillStyle = "#f8fafc";
    context.textAlign = "center";
    context.font = "700 30px sans-serif";
    context.fillText(
      state.phase === "game-over" ? "Run ended" : "Snake",
      SNAKE_CANVAS_SIZE / 2,
      SNAKE_CANVAS_SIZE / 2 - 12,
    );
    context.font = "500 15px sans-serif";
    context.fillStyle = "rgba(248, 250, 252, 0.78)";
    context.fillText(
      state.phase === "paused"
        ? "Resume when ready"
        : state.phase === "game-over"
          ? "Press Space to restart"
          : "Press Space to start",
      SNAKE_CANVAS_SIZE / 2,
      SNAKE_CANVAS_SIZE / 2 + 22,
    );
  }
}

export function SnakeGame() {
  const initialState = createSnakeState(readStoredNumber(SNAKE_STORAGE_KEY));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef<SnakeState>(initialState);
  const renderStateRef = useRef<SnakeRenderState>({
    previousSnake: initialState.snake,
    currentSnake: initialState.snake,
    progress: 1,
  });
  const pickupEffectsRef = useRef<PickupEffect[]>([]);
  const accumulatorRef = useRef(0);
  const elapsedSecondsRef = useRef(0);
  const [hudState, setHudState] = useState(() => ({
    score: initialState.score,
    bestScore: initialState.bestScore,
    phase: initialState.phase as SnakePhase,
  }));

  function syncState(nextState: SnakeState) {
    stateRef.current = nextState;
    setHudState({
      score: nextState.score,
      bestScore: nextState.bestScore,
      phase: nextState.phase,
    });
    writeStoredNumber(SNAKE_STORAGE_KEY, nextState.bestScore);
  }

  function renderCurrentState(elapsedSeconds = elapsedSecondsRef.current) {
    const context = contextRef.current;
    if (!context) {
      return;
    }

    drawSnakeScene(
      context,
      stateRef.current,
      renderStateRef.current,
      pickupEffectsRef.current,
      elapsedSeconds,
    );
  }

  function resetGame(phase: SnakePhase) {
    accumulatorRef.current = 0;
    pickupEffectsRef.current = [];
    const nextState = {
      ...createSnakeState(stateRef.current.bestScore),
      phase,
    };
    renderStateRef.current = {
      previousSnake: nextState.snake,
      currentSnake: nextState.snake,
      progress: 1,
    };
    syncState(nextState);
    renderCurrentState();
  }

  function togglePause() {
    const currentState = stateRef.current;
    if (currentState.phase === "playing") {
      syncState({ ...currentState, phase: "paused" });
      renderCurrentState();
      return;
    }

    if (currentState.phase === "paused") {
      syncState({ ...currentState, phase: "playing" });
      renderCurrentState();
    }
  }

  function queueDirection(direction: SnakeDirection) {
    const currentState = stateRef.current;
    if (currentState.phase === "game-over") {
      return;
    }

    const nextDirection = queueSnakeDirection(
      currentState.direction,
      direction,
    );

    if (nextDirection !== currentState.queuedDirection) {
      syncState({ ...currentState, queuedDirection: nextDirection });
      renderCurrentState();
    }
  }

  const handleKeyboardInput = useEffectEvent((event: KeyboardEvent) => {
    const directionByKey: Record<string, SnakeDirection> = {
      arrowup: "up",
      w: "up",
      arrowdown: "down",
      s: "down",
      arrowleft: "left",
      a: "left",
      arrowright: "right",
      d: "right",
    };

    const normalizedKey = event.key.toLowerCase();

    if (directionByKey[normalizedKey]) {
      event.preventDefault();
      queueDirection(directionByKey[normalizedKey]);
      return;
    }

    if (normalizedKey === " ") {
      event.preventDefault();
      resetGame("playing");
      return;
    }

    if (normalizedKey === "p") {
      event.preventDefault();
      togglePause();
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    contextRef.current = configureHiDPICanvas(
      canvas,
      SNAKE_CANVAS_SIZE,
      SNAKE_CANVAS_SIZE,
    );
    renderCurrentState();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      handleKeyboardInput(event);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useAnimationFrameLoop((deltaSeconds) => {
    let nextState = stateRef.current;
    elapsedSecondsRef.current += deltaSeconds;
    pickupEffectsRef.current = pickupEffectsRef.current
      .map((effect) => ({ ...effect, age: effect.age + deltaSeconds }))
      .filter((effect) => effect.age < PICKUP_EFFECT_SECONDS);

    if (nextState.phase === "playing") {
      accumulatorRef.current += deltaSeconds;

      while (
        accumulatorRef.current >= SNAKE_TICK_SECONDS &&
        nextState.phase === "playing"
      ) {
        accumulatorRef.current -= SNAKE_TICK_SECONDS;
        const previousSnake = nextState.snake;
        const previousFood = nextState.food;
        const previousScore = nextState.score;
        nextState = advanceSnake(nextState);

        renderStateRef.current = {
          previousSnake,
          currentSnake: nextState.snake,
          progress: 0,
        };

        if (nextState.score > previousScore) {
          pickupEffectsRef.current.push({
            ...pointToCanvasCenter(previousFood),
            age: 0,
          });
        }
      }

      renderStateRef.current = {
        ...renderStateRef.current,
        progress: Math.min(accumulatorRef.current / SNAKE_TICK_SECONDS, 1),
      };

      if (nextState !== stateRef.current) {
        syncState(nextState);
      }
    }

    renderCurrentState(elapsedSecondsRef.current);
  });

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "Score", value: hudState.score },
          { label: "Best", value: hudState.bestScore },
          { label: "Status", value: hudState.phase },
        ]}
        actions={
          <>
            <GameButton variant="primary" onClick={() => resetGame("playing")}>
              {hudState.phase === "game-over" ? "Restart" : "Start"}
            </GameButton>
            <GameButton onClick={togglePause}>
              {hudState.phase === "paused" ? "Resume" : "Pause"}
            </GameButton>
          </>
        }
      />

      <GamePlayfield className="mx-auto aspect-square w-full max-w-[34rem]">
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          aria-label="Snake game board"
        />
      </GamePlayfield>

      <GameStatus>{getStatusCopy(hudState.phase)}</GameStatus>

      <TouchControls className="max-w-[18rem]">
        <div className="grid grid-cols-3 gap-2">
        <div />
        <GameButton
          onClick={() => queueDirection("up")}
          variant="touch"
          className="rounded-2xl"
        >
          Up
        </GameButton>
        <div />
        <GameButton
          onClick={() => queueDirection("left")}
          variant="touch"
          className="rounded-2xl"
        >
          Left
        </GameButton>
        <GameButton
          onClick={() => resetGame("playing")}
          variant="touch"
          className="rounded-2xl"
        >
          Go
        </GameButton>
        <GameButton
          onClick={() => queueDirection("right")}
          variant="touch"
          className="rounded-2xl"
        >
          Right
        </GameButton>
        <div />
        <GameButton
          onClick={() => queueDirection("down")}
          variant="touch"
          className="rounded-2xl"
        >
          Down
        </GameButton>
        <div />
      </div>
      </TouchControls>
    </GamePanel>
  );
}
