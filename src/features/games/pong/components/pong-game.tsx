"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  PONG_BALL_RADIUS,
  PONG_HEIGHT,
  PONG_PADDLE_GAP,
  PONG_PADDLE_HEIGHT,
  PONG_PADDLE_WIDTH,
  PONG_WIDTH,
} from "@/features/games/pong/config/constants";
import { createPongState, updatePong } from "@/features/games/pong/logic/game";
import type { PongPhase, PongState } from "@/features/games/pong/types";
import { configureHiDPICanvas } from "@/features/games/shared/canvas/configure-canvas";
import { useAnimationFrameLoop } from "@/features/games/shared/hooks/use-animation-frame-loop";
import { useKeyboardState } from "@/features/games/shared/hooks/use-keyboard-state";

function getStatusCopy(phase: PongPhase, winner: PongState["winner"]) {
  if (phase === "finished") {
    return winner === "player"
      ? "Match won. Restart for another first-to-five run."
      : "The AI took the set. Restart and force a longer rally.";
  }

  if (phase === "paused") {
    return "Paused. Resume when you want the next exchange back.";
  }

  if (phase === "playing") {
    return "W/S or arrow keys control the paddle. First side to five points takes the match.";
  }

  return "Start the match and hold the left paddle against the AI.";
}

function drawPongScene(
  context: CanvasRenderingContext2D,
  state: PongState,
) {
  context.clearRect(0, 0, PONG_WIDTH, PONG_HEIGHT);
  context.fillStyle = "#08111f";
  context.fillRect(0, 0, PONG_WIDTH, PONG_HEIGHT);

  context.strokeStyle = "rgba(255,255,255,0.14)";
  context.lineWidth = 2;
  context.setLineDash([10, 12]);
  context.beginPath();
  context.moveTo(PONG_WIDTH / 2, 0);
  context.lineTo(PONG_WIDTH / 2, PONG_HEIGHT);
  context.stroke();
  context.setLineDash([]);

  context.fillStyle = "#f8fafc";
  context.fillRect(PONG_PADDLE_GAP, state.playerY, PONG_PADDLE_WIDTH, PONG_PADDLE_HEIGHT);
  context.fillRect(
    PONG_WIDTH - PONG_PADDLE_GAP - PONG_PADDLE_WIDTH,
    state.aiY,
    PONG_PADDLE_WIDTH,
    PONG_PADDLE_HEIGHT,
  );

  context.beginPath();
  context.fillStyle = "#ff6b35";
  context.arc(state.ball.x, state.ball.y, PONG_BALL_RADIUS, 0, Math.PI * 2);
  context.fill();

  context.font = "600 54px sans-serif";
  context.fillStyle = "rgba(248,250,252,0.9)";
  context.fillText(String(state.playerScore), PONG_WIDTH / 2 - 88, 72);
  context.fillText(String(state.aiScore), PONG_WIDTH / 2 + 56, 72);

  if (state.phase !== "playing" || state.serveTimer > 0) {
    context.fillStyle = "rgba(8, 17, 31, 0.52)";
    context.fillRect(0, 0, PONG_WIDTH, PONG_HEIGHT);
    context.fillStyle = "#f8fafc";
    context.textAlign = "center";
    context.font = "600 30px sans-serif";
    context.fillText(
      state.phase === "finished"
        ? state.winner === "player"
          ? "Player wins"
          : "AI wins"
        : state.phase === "paused"
          ? "Paused"
          : state.phase === "idle"
            ? "Pong"
            : "Serve incoming",
      PONG_WIDTH / 2,
      PONG_HEIGHT / 2 - 8,
    );
    context.font = "500 15px sans-serif";
    context.fillStyle = "rgba(248, 250, 252, 0.76)";
    context.fillText(
      state.phase === "finished"
        ? "Press Space to restart the match"
        : state.phase === "paused"
          ? "Press P or Resume"
          : state.phase === "idle"
            ? "Press Space to begin"
            : "Hold position for the next serve",
      PONG_WIDTH / 2,
      PONG_HEIGHT / 2 + 22,
    );
  }
}

export function PongGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef<PongState>(createPongState());
  const touchDirectionRef = useRef(0);
  const pressedKeysRef = useKeyboardState({
    preventDefaultKeys: ["w", "s", "arrowup", "arrowdown", " "],
  });
  const [hudState, setHudState] = useState(() => ({
    playerScore: 0,
    aiScore: 0,
    phase: "idle" as PongPhase,
    winner: null as PongState["winner"],
  }));

  function syncState(nextState: PongState) {
    stateRef.current = nextState;
    setHudState({
      playerScore: nextState.playerScore,
      aiScore: nextState.aiScore,
      phase: nextState.phase,
      winner: nextState.winner,
    });
  }

  function renderCurrentState() {
    const context = contextRef.current;
    if (!context) {
      return;
    }

    drawPongScene(context, stateRef.current);
  }

  function startMatch() {
    const nextState = {
      ...createPongState(),
      phase: "playing" as const,
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

  const handleKeyboardInput = useEffectEvent((event: KeyboardEvent) => {
    const normalizedKey = event.key.toLowerCase();

    if (normalizedKey === " ") {
      event.preventDefault();
      startMatch();
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

    contextRef.current = configureHiDPICanvas(canvas, PONG_WIDTH, PONG_HEIGHT);
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
    const pressedKeys = pressedKeysRef.current;
    const keyboardDirection =
      Number(pressedKeys.has("s") || pressedKeys.has("arrowdown")) -
      Number(pressedKeys.has("w") || pressedKeys.has("arrowup"));
    const inputDirection = keyboardDirection || touchDirectionRef.current;
    const nextState = updatePong(stateRef.current, deltaSeconds, inputDirection);

    if (nextState !== stateRef.current) {
      syncState(nextState);
    }

    renderCurrentState();
  });

  return (
    <div className="flex flex-col gap-5 text-foreground">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-foreground-soft">
          <span>
            Player <strong className="ml-1 text-foreground">{hudState.playerScore}</strong>
          </span>
          <span>
            AI <strong className="ml-1 text-foreground">{hudState.aiScore}</strong>
          </span>
          <span className="capitalize">
            Status <strong className="ml-1 text-foreground">{hudState.phase}</strong>
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={startMatch}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-background hover:-translate-y-0.5 hover:bg-accent-strong"
          >
            {hudState.phase === "finished" ? "Restart" : "Start"}
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
        className="mx-auto aspect-[12/7] w-full rounded-[1.4rem] border border-line bg-background-strong"
        aria-label="Pong match"
      />

      <p className="text-center text-sm leading-7 text-foreground-soft">
        {getStatusCopy(hudState.phase, hudState.winner)}
      </p>

      <div className="mx-auto flex w-full max-w-[18rem] gap-3 md:hidden">
        <button
          type="button"
          onPointerDown={() => {
            touchDirectionRef.current = -1;
          }}
          onPointerUp={() => {
            touchDirectionRef.current = 0;
          }}
          onPointerLeave={() => {
            touchDirectionRef.current = 0;
          }}
          className="surface-subtle flex-1 rounded-2xl px-4 py-3 text-sm font-semibold hover:bg-surface"
        >
          Up
        </button>
        <button
          type="button"
          onPointerDown={() => {
            touchDirectionRef.current = 1;
          }}
          onPointerUp={() => {
            touchDirectionRef.current = 0;
          }}
          onPointerLeave={() => {
            touchDirectionRef.current = 0;
          }}
          className="surface-subtle flex-1 rounded-2xl px-4 py-3 text-sm font-semibold hover:bg-surface"
        >
          Down
        </button>
      </div>
    </div>
  );
}
