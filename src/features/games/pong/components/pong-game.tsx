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

type PongEffect =
  | { type: "hit"; x: number; y: number; age: number; side: "player" | "ai" }
  | { type: "wall"; x: number; y: number; age: number }
  | { type: "score"; x: number; y: number; age: number; scorer: "player" | "ai" };

type BallTrailPoint = {
  x: number;
  y: number;
  age: number;
  speed: number;
};

const PONG_EFFECT_SECONDS = 0.5;
const PONG_SCORE_EFFECT_SECONDS = 0.9;
const PONG_TRAIL_SECONDS = 0.24;
const PONG_PREVENT_DEFAULT_KEYS = ["w", "s", "arrowup", "arrowdown", " "];

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

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawPongArena(
  context: CanvasRenderingContext2D,
  elapsedSeconds: number,
) {
  const background = context.createRadialGradient(
    PONG_WIDTH * 0.5,
    PONG_HEIGHT * 0.35,
    30,
    PONG_WIDTH * 0.5,
    PONG_HEIGHT * 0.5,
    PONG_WIDTH * 0.72,
  );
  background.addColorStop(0, "#142746");
  background.addColorStop(0.56, "#071527");
  background.addColorStop(1, "#020611");

  context.fillStyle = background;
  context.fillRect(0, 0, PONG_WIDTH, PONG_HEIGHT);

  context.save();
  context.globalAlpha = 0.12;
  context.strokeStyle = "#6ee7ff";
  context.lineWidth = 1;
  for (let y = 54; y < PONG_HEIGHT; y += 48) {
    const sway = Math.sin(elapsedSeconds * 0.7 + y * 0.02) * 6;
    context.beginPath();
    context.moveTo(0, y + sway);
    context.lineTo(PONG_WIDTH, y - sway);
    context.stroke();
  }
  context.restore();

  context.save();
  context.shadowBlur = 18;
  context.shadowColor = "rgba(110, 231, 255, 0.58)";
  context.strokeStyle = "rgba(110, 231, 255, 0.72)";
  context.lineWidth = 4;
  drawRoundedRect(context, 14, 14, PONG_WIDTH - 28, PONG_HEIGHT - 28, 18);
  context.stroke();
  context.restore();

  context.save();
  context.shadowBlur = 10;
  context.shadowColor = "rgba(168, 85, 247, 0.7)";
  context.strokeStyle = "rgba(168, 85, 247, 0.72)";
  context.lineWidth = 3;
  context.setLineDash([4, 15]);
  context.lineDashOffset = -elapsedSeconds * 28;
  context.beginPath();
  context.moveTo(PONG_WIDTH / 2, 34);
  context.lineTo(PONG_WIDTH / 2, PONG_HEIGHT - 34);
  context.stroke();
  context.restore();

  context.fillStyle = "rgba(255,255,255,0.045)";
  context.fillRect(PONG_WIDTH / 2 - 88, 24, 176, 66);
}

function drawScore(context: CanvasRenderingContext2D, state: PongState) {
  context.save();
  context.textAlign = "center";
  context.font = "800 58px sans-serif";
  context.shadowBlur = 10;
  context.shadowColor = "rgba(110, 231, 255, 0.45)";
  context.fillStyle = "rgba(236, 253, 255, 0.92)";
  context.fillText(String(state.playerScore), PONG_WIDTH / 2 - 56, 74);
  context.shadowColor = "rgba(244, 114, 182, 0.45)";
  context.fillText(String(state.aiScore), PONG_WIDTH / 2 + 56, 74);
  context.restore();
}

function drawPaddle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  glow: string,
) {
  context.save();
  context.shadowBlur = 16;
  context.shadowColor = glow;

  const paddleGradient = context.createLinearGradient(
    x,
    y,
    x + PONG_PADDLE_WIDTH,
    y + PONG_PADDLE_HEIGHT,
  );
  paddleGradient.addColorStop(0, "rgba(255,255,255,0.95)");
  paddleGradient.addColorStop(0.22, color);
  paddleGradient.addColorStop(1, "rgba(4, 12, 24, 0.8)");

  context.fillStyle = paddleGradient;
  drawRoundedRect(
    context,
    x,
    y,
    PONG_PADDLE_WIDTH,
    PONG_PADDLE_HEIGHT,
    PONG_PADDLE_WIDTH / 2,
  );
  context.fill();

  context.shadowBlur = 0;
  context.fillStyle = "rgba(255,255,255,0.38)";
  drawRoundedRect(context, x + 4, y + 8, 3, PONG_PADDLE_HEIGHT - 16, 2);
  context.fill();
  context.restore();
}

function drawBallTrail(
  context: CanvasRenderingContext2D,
  trail: BallTrailPoint[],
) {
  trail.forEach((point) => {
    const progress = Math.min(point.age / PONG_TRAIL_SECONDS, 1);
    const alpha = 1 - progress;
    const radius = PONG_BALL_RADIUS * (1.2 - progress * 0.55);

    context.save();
    context.globalAlpha = alpha * 0.32;
    context.fillStyle = "#ff9f5a";
    context.shadowBlur = 9 + point.speed * 0.01;
    context.shadowColor = "rgba(255, 130, 74, 0.85)";
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  });
}

function drawBall(context: CanvasRenderingContext2D, state: PongState) {
  const speed = Math.hypot(state.ball.vx, state.ball.vy);
  const radius = PONG_BALL_RADIUS * (1 + Math.min(speed / 900, 0.28));
  const glow = context.createRadialGradient(
    state.ball.x - radius * 0.3,
    state.ball.y - radius * 0.4,
    1,
    state.ball.x,
    state.ball.y,
    radius * 2.4,
  );
  glow.addColorStop(0, "#fff6d7");
  glow.addColorStop(0.34, "#ffb45a");
  glow.addColorStop(1, "rgba(255, 92, 59, 0)");

  context.save();
  context.shadowBlur = 18 + speed * 0.012;
  context.shadowColor = "rgba(255, 122, 72, 0.95)";
  context.fillStyle = glow;
  context.beginPath();
  context.arc(state.ball.x, state.ball.y, radius * 2.2, 0, Math.PI * 2);
  context.fill();

  context.shadowBlur = 12;
  context.fillStyle = "#fff3bf";
  context.beginPath();
  context.arc(state.ball.x, state.ball.y, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawPongEffects(
  context: CanvasRenderingContext2D,
  effects: PongEffect[],
) {
  effects.forEach((effect) => {
    const lifespan =
      effect.type === "score" ? PONG_SCORE_EFFECT_SECONDS : PONG_EFFECT_SECONDS;
    const progress = Math.min(effect.age / lifespan, 1);
    const alpha = 1 - progress;

    context.save();
    context.globalAlpha = alpha;
  context.shadowBlur = 12;

    if (effect.type === "score") {
      context.strokeStyle =
        effect.scorer === "player" ? "#6ee7ff" : "#f472b6";
      context.shadowColor =
        effect.scorer === "player"
          ? "rgba(110, 231, 255, 0.8)"
          : "rgba(244, 114, 182, 0.8)";
      context.lineWidth = 4 * alpha + 1;
      context.beginPath();
      context.arc(effect.x, effect.y, 28 + progress * 82, 0, Math.PI * 2);
      context.stroke();
    } else {
      const color = effect.type === "wall" ? "#a855f7" : "#6ee7ff";
      context.strokeStyle = color;
      context.fillStyle = color;
      context.shadowColor =
        effect.type === "wall"
          ? "rgba(168, 85, 247, 0.8)"
          : "rgba(110, 231, 255, 0.8)";
      for (let index = 0; index < 8; index += 1) {
        const angle = (Math.PI * 2 * index) / 8 + progress * 1.6;
        const distance = 8 + progress * 34;
        context.beginPath();
        context.arc(
          effect.x + Math.cos(angle) * distance,
          effect.y + Math.sin(angle) * distance,
          2.4 * alpha + 0.5,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
    }

    context.restore();
  });
}

function getOverlayTitle(state: PongState) {
  if (state.phase === "finished") {
    return state.winner === "player" ? "Player wins" : "AI wins";
  }

  if (state.phase === "paused") {
    return "Paused";
  }

  if (state.phase === "idle") {
    return "Pong";
  }

  return "Serve incoming";
}

function detectPongEffects(previousState: PongState, nextState: PongState) {
  const effects: PongEffect[] = [];

  if (nextState.playerScore > previousState.playerScore) {
    effects.push({
      type: "score",
      x: PONG_WIDTH * 0.38,
      y: PONG_HEIGHT / 2,
      age: 0,
      scorer: "player",
    });
  }

  if (nextState.aiScore > previousState.aiScore) {
    effects.push({
      type: "score",
      x: PONG_WIDTH * 0.62,
      y: PONG_HEIGHT / 2,
      age: 0,
      scorer: "ai",
    });
  }

  if (
    previousState.ball.vx < 0 &&
    nextState.ball.vx > 0 &&
    previousState.phase === "playing"
  ) {
    effects.push({
      type: "hit",
      x: PONG_PADDLE_GAP + PONG_PADDLE_WIDTH,
      y: nextState.ball.y,
      age: 0,
      side: "player",
    });
  }

  if (
    previousState.ball.vx > 0 &&
    nextState.ball.vx < 0 &&
    previousState.phase === "playing"
  ) {
    effects.push({
      type: "hit",
      x: PONG_WIDTH - PONG_PADDLE_GAP - PONG_PADDLE_WIDTH,
      y: nextState.ball.y,
      age: 0,
      side: "ai",
    });
  }

  if (
    previousState.ball.vy !== 0 &&
    Math.sign(previousState.ball.vy) !== Math.sign(nextState.ball.vy) &&
    nextState.ball.vx !== 0
  ) {
    effects.push({
      type: "wall",
      x: nextState.ball.x,
      y: nextState.ball.y < PONG_HEIGHT / 2 ? 18 : PONG_HEIGHT - 18,
      age: 0,
    });
  }

  return effects;
}

function drawPongScene(
  context: CanvasRenderingContext2D,
  state: PongState,
  effects: PongEffect[],
  trail: BallTrailPoint[],
  elapsedSeconds: number,
) {
  context.clearRect(0, 0, PONG_WIDTH, PONG_HEIGHT);
  drawPongArena(context, elapsedSeconds);
  drawScore(context, state);
  drawPongEffects(context, effects);
  drawPaddle(
    context,
    PONG_PADDLE_GAP,
    state.playerY,
    "#6ee7ff",
    "rgba(110, 231, 255, 0.82)",
  );
  drawPaddle(
    context,
    PONG_WIDTH - PONG_PADDLE_GAP - PONG_PADDLE_WIDTH,
    state.aiY,
    "#f472b6",
    "rgba(244, 114, 182, 0.82)",
  );
  drawBallTrail(context, trail);
  drawBall(context, state);

  if (state.phase !== "playing" || state.serveTimer > 0) {
    context.fillStyle = "rgba(2, 6, 17, 0.6)";
    context.fillRect(0, 0, PONG_WIDTH, PONG_HEIGHT);

    const pulse = state.serveTimer > 0 ? Math.sin(elapsedSeconds * 8) * 0.08 : 0;
    context.fillStyle = "rgba(8, 17, 31, 0.82)";
    drawRoundedRect(
      context,
      PONG_WIDTH / 2 - 148,
      PONG_HEIGHT / 2 - 62,
      296,
      124,
      24,
    );
    context.fill();
    context.strokeStyle = "rgba(110, 231, 255, 0.38)";
    context.lineWidth = 1.4 + pulse * 4;
    context.stroke();

    context.fillStyle = "#f8fafc";
    context.textAlign = "center";
    context.font = "800 32px sans-serif";
    context.fillText(getOverlayTitle(state), PONG_WIDTH / 2, PONG_HEIGHT / 2 - 8);
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
  const effectsRef = useRef<PongEffect[]>([]);
  const ballTrailRef = useRef<BallTrailPoint[]>([]);
  const elapsedSecondsRef = useRef(0);
  const touchDirectionRef = useRef(0);
  const pressedKeysRef = useKeyboardState({
    preventDefaultKeys: PONG_PREVENT_DEFAULT_KEYS,
  });
  const [hudState, setHudState] = useState(() => ({
    playerScore: 0,
    aiScore: 0,
    phase: "idle" as PongPhase,
    winner: null as PongState["winner"],
  }));
  const hudStateRef = useRef(hudState);

  function syncState(nextState: PongState) {
    stateRef.current = nextState;
    const currentHudState = hudStateRef.current;
    if (
      currentHudState.playerScore === nextState.playerScore &&
      currentHudState.aiScore === nextState.aiScore &&
      currentHudState.phase === nextState.phase &&
      currentHudState.winner === nextState.winner
    ) {
      return;
    }

    const nextHudState = {
      playerScore: nextState.playerScore,
      aiScore: nextState.aiScore,
      phase: nextState.phase,
      winner: nextState.winner,
    };
    hudStateRef.current = nextHudState;
    setHudState(nextHudState);
  }

  function renderCurrentState(elapsedSeconds = elapsedSecondsRef.current) {
    const context = contextRef.current;
    if (!context) {
      return;
    }

    drawPongScene(
      context,
      stateRef.current,
      effectsRef.current,
      ballTrailRef.current,
      elapsedSeconds,
    );
  }

  function startMatch() {
    effectsRef.current = [];
    ballTrailRef.current = [];
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
    elapsedSecondsRef.current += deltaSeconds;
    effectsRef.current = effectsRef.current
      .map((effect) => ({ ...effect, age: effect.age + deltaSeconds }))
      .filter((effect) => {
        const lifespan =
          effect.type === "score"
            ? PONG_SCORE_EFFECT_SECONDS
            : PONG_EFFECT_SECONDS;
        return effect.age < lifespan;
      });
    ballTrailRef.current = ballTrailRef.current
      .map((point) => ({ ...point, age: point.age + deltaSeconds }))
      .filter((point) => point.age < PONG_TRAIL_SECONDS);

    const pressedKeys = pressedKeysRef.current;
    const keyboardDirection =
      Number(pressedKeys.has("s") || pressedKeys.has("arrowdown")) -
      Number(pressedKeys.has("w") || pressedKeys.has("arrowup"));
    const inputDirection = keyboardDirection || touchDirectionRef.current;
    const previousState = stateRef.current;
    const nextState = updatePong(previousState, deltaSeconds, inputDirection);

    if (nextState !== stateRef.current) {
      effectsRef.current.push(...detectPongEffects(previousState, nextState));
      syncState(nextState);
    }

    if (nextState.phase === "playing" && nextState.ball.vx !== 0) {
      ballTrailRef.current.unshift({
        x: nextState.ball.x,
        y: nextState.ball.y,
        age: 0,
        speed: Math.hypot(nextState.ball.vx, nextState.ball.vy),
      });
      ballTrailRef.current = ballTrailRef.current.slice(0, 9);
    }

    renderCurrentState(elapsedSecondsRef.current);
  });

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "Player", value: hudState.playerScore },
          { label: "AI", value: hudState.aiScore },
          { label: "Status", value: hudState.phase },
        ]}
        actions={
          <>
            <GameButton variant="primary" onClick={startMatch}>
              {hudState.phase === "finished" ? "Restart" : "Start"}
            </GameButton>
            <GameButton onClick={togglePause}>
              {hudState.phase === "paused" ? "Resume" : "Pause"}
            </GameButton>
          </>
        }
      />

      <GamePlayfield className="mx-auto aspect-[12/7] w-full">
        <canvas ref={canvasRef} className="h-full w-full" aria-label="Pong match" />
      </GamePlayfield>

      <GameStatus>{getStatusCopy(hudState.phase, hudState.winner)}</GameStatus>

      <TouchControls className="max-w-[18rem]">
        <div className="flex gap-3">
        <GameButton
          onPointerDown={() => {
            touchDirectionRef.current = -1;
          }}
          onPointerUp={() => {
            touchDirectionRef.current = 0;
          }}
          onPointerLeave={() => {
            touchDirectionRef.current = 0;
          }}
          variant="touch"
          className="flex-1 rounded-2xl"
        >
          Up
        </GameButton>
        <GameButton
          onPointerDown={() => {
            touchDirectionRef.current = 1;
          }}
          onPointerUp={() => {
            touchDirectionRef.current = 0;
          }}
          onPointerLeave={() => {
            touchDirectionRef.current = 0;
          }}
          variant="touch"
          className="flex-1 rounded-2xl"
        >
          Down
        </GameButton>
      </div>
      </TouchControls>
    </GamePanel>
  );
}
