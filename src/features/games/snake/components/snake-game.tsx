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
  SnakeState,
} from "@/features/games/snake/types";
import { configureHiDPICanvas } from "@/features/games/shared/canvas/configure-canvas";
import { useAnimationFrameLoop } from "@/features/games/shared/hooks/use-animation-frame-loop";
import {
  readStoredNumber,
  writeStoredNumber,
} from "@/features/games/shared/utils/local-storage";

function getStatusCopy(phase: SnakePhase) {
  if (phase === "playing") {
    return "Stay compact, keep the line alive, and do not outrun your own turns.";
  }

  if (phase === "paused") {
    return "Paused. Resume with the button or press P to jump back in.";
  }

  if (phase === "game-over") {
    return "Game over. Press Space or restart to reset the board instantly.";
  }

  return "Press Space to start. Arrow keys or WASD steer the snake.";
}

function drawSnakeScene(
  context: CanvasRenderingContext2D,
  state: SnakeState,
) {
  context.clearRect(0, 0, SNAKE_CANVAS_SIZE, SNAKE_CANVAS_SIZE);
  context.fillStyle = "#08111f";
  context.fillRect(0, 0, SNAKE_CANVAS_SIZE, SNAKE_CANVAS_SIZE);

  context.strokeStyle = "rgba(255,255,255,0.05)";
  context.lineWidth = 1;
  for (let offset = 0; offset <= SNAKE_CANVAS_SIZE; offset += SNAKE_CELL_SIZE) {
    context.beginPath();
    context.moveTo(offset + 0.5, 0);
    context.lineTo(offset + 0.5, SNAKE_CANVAS_SIZE);
    context.stroke();

    context.beginPath();
    context.moveTo(0, offset + 0.5);
    context.lineTo(SNAKE_CANVAS_SIZE, offset + 0.5);
    context.stroke();
  }

  context.fillStyle = "#ff6b35";
  context.beginPath();
  context.arc(
    state.food.x * SNAKE_CELL_SIZE + SNAKE_CELL_SIZE / 2,
    state.food.y * SNAKE_CELL_SIZE + SNAKE_CELL_SIZE / 2,
    SNAKE_CELL_SIZE * 0.34,
    0,
    Math.PI * 2,
  );
  context.fill();

  state.snake.forEach((segment, index) => {
    context.fillStyle = index === 0 ? "#ffd166" : "#00a6a6";
    context.fillRect(
      segment.x * SNAKE_CELL_SIZE + 2,
      segment.y * SNAKE_CELL_SIZE + 2,
      SNAKE_CELL_SIZE - 4,
      SNAKE_CELL_SIZE - 4,
    );
  });

  if (state.phase !== "playing") {
    context.fillStyle = "rgba(8, 17, 31, 0.52)";
    context.fillRect(0, 0, SNAKE_CANVAS_SIZE, SNAKE_CANVAS_SIZE);
    context.fillStyle = "#f8fafc";
    context.textAlign = "center";
    context.font = "600 28px sans-serif";
    context.fillText(
      state.phase === "game-over" ? "Run ended" : "Snake",
      SNAKE_CANVAS_SIZE / 2,
      SNAKE_CANVAS_SIZE / 2 - 8,
    );
    context.font = "500 15px sans-serif";
    context.fillStyle = "rgba(248, 250, 252, 0.76)";
    context.fillText(
      state.phase === "paused"
        ? "Resume when ready"
        : state.phase === "game-over"
          ? "Press Space to restart"
          : "Press Space to start",
      SNAKE_CANVAS_SIZE / 2,
      SNAKE_CANVAS_SIZE / 2 + 24,
    );
  }
}

export function SnakeGame() {
  const initialState = createSnakeState(readStoredNumber(SNAKE_STORAGE_KEY));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef<SnakeState>(initialState);
  const accumulatorRef = useRef(0);
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

  function renderCurrentState() {
    const context = contextRef.current;
    if (!context) {
      return;
    }

    drawSnakeScene(context, stateRef.current);
  }

  function resetGame(phase: SnakePhase) {
    accumulatorRef.current = 0;
    const nextState = {
      ...createSnakeState(stateRef.current.bestScore),
      phase,
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

    if (nextState.phase === "playing") {
      accumulatorRef.current += deltaSeconds;

      while (
        accumulatorRef.current >= SNAKE_TICK_SECONDS &&
        nextState.phase === "playing"
      ) {
        accumulatorRef.current -= SNAKE_TICK_SECONDS;
        nextState = advanceSnake(nextState);
      }

      if (nextState !== stateRef.current) {
        syncState(nextState);
      }
    }

    renderCurrentState();
  });

  return (
    <div className="flex flex-col gap-5 text-foreground">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-foreground-soft">
          <span>
            Score <strong className="ml-1 text-foreground">{hudState.score}</strong>
          </span>
          <span>
            Best <strong className="ml-1 text-foreground">{hudState.bestScore}</strong>
          </span>
          <span className="capitalize">
            Status <strong className="ml-1 text-foreground">{hudState.phase}</strong>
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => resetGame("playing")}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-background hover:-translate-y-0.5 hover:bg-accent-strong"
          >
            {hudState.phase === "game-over" ? "Restart" : "Start"}
          </button>
          <button
            type="button"
            onClick={togglePause}
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-foreground hover:-translate-y-0.5 hover:bg-surface"
          >
            {hudState.phase === "paused" ? "Resume" : "Pause"}
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="mx-auto aspect-square w-full max-w-[34rem] rounded-[1.4rem] border border-line bg-background-strong"
        aria-label="Snake game board"
      />

      <p className="text-center text-sm leading-7 text-foreground-soft">
        {getStatusCopy(hudState.phase)}
      </p>

      <div className="mx-auto grid w-full max-w-[18rem] grid-cols-3 gap-2 md:hidden">
        <div />
        <button
          type="button"
          onClick={() => queueDirection("up")}
          className="surface-subtle rounded-2xl px-4 py-3 text-sm font-semibold hover:bg-surface"
        >
          Up
        </button>
        <div />
        <button
          type="button"
          onClick={() => queueDirection("left")}
          className="surface-subtle rounded-2xl px-4 py-3 text-sm font-semibold hover:bg-surface"
        >
          Left
        </button>
        <button
          type="button"
          onClick={() => resetGame("playing")}
          className="surface-subtle rounded-2xl px-4 py-3 text-sm font-semibold hover:bg-surface"
        >
          Go
        </button>
        <button
          type="button"
          onClick={() => queueDirection("right")}
          className="surface-subtle rounded-2xl px-4 py-3 text-sm font-semibold hover:bg-surface"
        >
          Right
        </button>
        <div />
        <button
          type="button"
          onClick={() => queueDirection("down")}
          className="surface-subtle rounded-2xl px-4 py-3 text-sm font-semibold hover:bg-surface"
        >
          Down
        </button>
        <div />
      </div>
    </div>
  );
}
