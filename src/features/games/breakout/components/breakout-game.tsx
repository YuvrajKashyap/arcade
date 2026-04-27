"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  BREAKOUT_BALL_RADIUS,
  BREAKOUT_BRICK_HEIGHT,
  BREAKOUT_BRICK_WIDTH,
  BREAKOUT_HEIGHT,
  BREAKOUT_PADDLE_HEIGHT,
  BREAKOUT_PADDLE_Y,
  BREAKOUT_STORAGE_KEY,
  BREAKOUT_WIDTH,
} from "@/features/games/breakout/config/constants";
import {
  createBreakoutState,
  startBreakout,
  updateBreakout,
} from "@/features/games/breakout/logic/game";
import type { BreakoutPhase, BreakoutState } from "@/features/games/breakout/types";
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
import { useKeyboardState } from "@/features/games/shared/hooks/use-keyboard-state";
import {
  readStoredNumber,
  writeStoredNumber,
} from "@/features/games/shared/utils/local-storage";

function getStatusCopy(phase: BreakoutPhase) {
  if (phase === "playing") {
    return "Clear the wall, catch wide-paddle capsules, and angle the ball with the paddle edge.";
  }

  if (phase === "paused") {
    return "Paused. Resume before the next rebound.";
  }

  if (phase === "cleared") {
    return "All three layouts cleared. Restart for a cleaner run.";
  }

  if (phase === "game-over") {
    return "Last ball drained. Restart to rebuild the score.";
  }

  return "Start the serve. Move with arrows, A/D, mouse, or touch.";
}

function drawBreakoutScene(context: CanvasRenderingContext2D, state: BreakoutState) {
  context.clearRect(0, 0, BREAKOUT_WIDTH, BREAKOUT_HEIGHT);
  context.fillStyle = "#08111f";
  context.fillRect(0, 0, BREAKOUT_WIDTH, BREAKOUT_HEIGHT);

  for (const brick of state.bricks) {
    const strengthRatio = brick.strength / brick.maxStrength;
    context.fillStyle =
      brick.maxStrength === 3
        ? `rgba(255, 107, 53, ${0.45 + strengthRatio * 0.45})`
        : brick.maxStrength === 2
          ? `rgba(255, 209, 102, ${0.5 + strengthRatio * 0.4})`
          : "#00a6a6";
    context.fillRect(brick.x, brick.y, BREAKOUT_BRICK_WIDTH, BREAKOUT_BRICK_HEIGHT);
  }

  if (state.powerup) {
    context.beginPath();
    context.fillStyle = "#cfb5ff";
    context.arc(state.powerup.x, state.powerup.y, 9, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = state.wideTimer > 0 ? "#cfb5ff" : "#f8fafc";
  context.fillRect(state.paddleX, BREAKOUT_PADDLE_Y, state.paddleWidth, BREAKOUT_PADDLE_HEIGHT);

  context.beginPath();
  context.fillStyle = "#ff6b35";
  context.arc(state.ball.x, state.ball.y, BREAKOUT_BALL_RADIUS, 0, Math.PI * 2);
  context.fill();

  if (state.phase !== "playing") {
    context.fillStyle = "rgba(8, 17, 31, 0.58)";
    context.fillRect(0, 0, BREAKOUT_WIDTH, BREAKOUT_HEIGHT);
    context.textAlign = "center";
    context.fillStyle = "#f8fafc";
    context.font = "600 32px sans-serif";
    context.fillText(
      state.phase === "cleared"
        ? "Wall cleared"
        : state.phase === "game-over"
          ? "Run ended"
          : state.phase === "paused"
            ? "Paused"
            : "Breakout",
      BREAKOUT_WIDTH / 2,
      BREAKOUT_HEIGHT / 2 - 10,
    );
    context.font = "500 15px sans-serif";
    context.fillStyle = "rgba(248,250,252,0.76)";
    context.fillText("Press Space or Start", BREAKOUT_WIDTH / 2, BREAKOUT_HEIGHT / 2 + 22);
  }
}

export function BreakoutGame() {
  const initialState = createBreakoutState(readStoredNumber(BREAKOUT_STORAGE_KEY));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef<BreakoutState>(initialState);
  const pointerXRef = useRef<number | null>(null);
  const touchDirectionRef = useRef(0);
  const pressedKeysRef = useKeyboardState({
    preventDefaultKeys: ["a", "d", "arrowleft", "arrowright", " "],
  });
  const [hudState, setHudState] = useState(() => ({
    score: initialState.score,
    bestScore: initialState.bestScore,
    lives: initialState.lives,
    level: initialState.level,
    phase: initialState.phase,
  }));

  function syncState(nextState: BreakoutState) {
    stateRef.current = nextState;
    setHudState({
      score: nextState.score,
      bestScore: nextState.bestScore,
      lives: nextState.lives,
      level: nextState.level,
      phase: nextState.phase,
    });
    writeStoredNumber(BREAKOUT_STORAGE_KEY, nextState.bestScore);
  }

  function renderCurrentState() {
    const context = contextRef.current;
    if (context) {
      drawBreakoutScene(context, stateRef.current);
    }
  }

  function beginRun() {
    syncState(startBreakout(stateRef.current));
    renderCurrentState();
  }

  function togglePause() {
    const current = stateRef.current;
    if (current.phase === "playing") {
      syncState({ ...current, phase: "paused" });
    } else if (current.phase === "paused") {
      syncState({ ...current, phase: "playing" });
    }
    renderCurrentState();
  }

  const handleKeyboardInput = useEffectEvent((event: KeyboardEvent) => {
    const normalizedKey = event.key.toLowerCase();
    if (normalizedKey === " ") {
      event.preventDefault();
      beginRun();
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

    contextRef.current = configureHiDPICanvas(canvas, BREAKOUT_WIDTH, BREAKOUT_HEIGHT);
    renderCurrentState();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => handleKeyboardInput(event);
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useAnimationFrameLoop((deltaSeconds) => {
    const pressedKeys = pressedKeysRef.current;
    const keyboardDirection =
      Number(pressedKeys.has("d") || pressedKeys.has("arrowright")) -
      Number(pressedKeys.has("a") || pressedKeys.has("arrowleft"));
    const nextState = updateBreakout(
      stateRef.current,
      deltaSeconds,
      keyboardDirection || touchDirectionRef.current,
      pointerXRef.current,
    );

    if (nextState !== stateRef.current) {
      syncState(nextState);
    }
    renderCurrentState();
  });

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "Score", value: hudState.score },
          { label: "Best", value: hudState.bestScore },
          { label: "Lives", value: hudState.lives },
          { label: "Level", value: hudState.level },
          { label: "Status", value: hudState.phase },
        ]}
        actions={
          <>
            <GameButton variant="primary" onClick={beginRun}>
              {hudState.phase === "game-over" || hudState.phase === "cleared" ? "Restart" : "Start"}
            </GameButton>
            <GameButton onClick={togglePause}>
              {hudState.phase === "paused" ? "Resume" : "Pause"}
            </GameButton>
          </>
        }
      />

      <GamePlayfield className="mx-auto aspect-[18/13] w-full">
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none"
          aria-label="Breakout board"
          onPointerMove={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            pointerXRef.current = ((event.clientX - bounds.left) / bounds.width) * BREAKOUT_WIDTH;
          }}
          onPointerLeave={() => {
            pointerXRef.current = null;
          }}
        />
      </GamePlayfield>

      <GameStatus>{getStatusCopy(hudState.phase)}</GameStatus>

      <TouchControls className="max-w-[22rem]">
        <div className="flex gap-3">
          <GameButton
            variant="touch"
            className="flex-1 rounded-2xl"
            onPointerDown={() => {
              touchDirectionRef.current = -1;
            }}
            onPointerUp={() => {
              touchDirectionRef.current = 0;
            }}
            onPointerLeave={() => {
              touchDirectionRef.current = 0;
            }}
          >
            Left
          </GameButton>
          <GameButton variant="touch" className="flex-1 rounded-2xl" onClick={beginRun}>
            Serve
          </GameButton>
          <GameButton
            variant="touch"
            className="flex-1 rounded-2xl"
            onPointerDown={() => {
              touchDirectionRef.current = 1;
            }}
            onPointerUp={() => {
              touchDirectionRef.current = 0;
            }}
            onPointerLeave={() => {
              touchDirectionRef.current = 0;
            }}
          >
            Right
          </GameButton>
        </div>
      </TouchControls>
    </GamePanel>
  );
}
