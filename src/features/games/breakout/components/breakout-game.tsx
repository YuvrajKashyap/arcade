"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  BREAKOUT_BALL_RADIUS,
  BREAKOUT_BRICK_GAP,
  BREAKOUT_BRICK_HEIGHT,
  BREAKOUT_BRICK_TOP,
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

const BRICK_PALETTE = ["#fb3b42", "#ff8b2b", "#ffd84c", "#4ecf5b", "#36a4ff", "#8b5cff"];

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function drawBreakoutBackground(context: CanvasRenderingContext2D) {
  const skyGradient = context.createLinearGradient(0, 0, 0, BREAKOUT_HEIGHT);
  skyGradient.addColorStop(0, "#fff4a4");
  skyGradient.addColorStop(0.48, "#ffd65f");
  skyGradient.addColorStop(1, "#f9a33a");
  context.fillStyle = skyGradient;
  context.fillRect(0, 0, BREAKOUT_WIDTH, BREAKOUT_HEIGHT);

  context.save();
  context.translate(BREAKOUT_WIDTH / 2, 118);
  context.strokeStyle = "rgba(255, 255, 255, 0.22)";
  context.lineWidth = 2;
  for (let angle = -70; angle <= 250; angle += 16) {
    const radians = (angle * Math.PI) / 180;
    context.beginPath();
    context.moveTo(Math.cos(radians) * 42, Math.sin(radians) * 42);
    context.lineTo(Math.cos(radians) * 560, Math.sin(radians) * 560);
    context.stroke();
  }
  context.restore();

  const sunGlow = context.createRadialGradient(BREAKOUT_WIDTH / 2, 115, 16, BREAKOUT_WIDTH / 2, 115, 250);
  sunGlow.addColorStop(0, "rgba(255, 255, 255, 0.5)");
  sunGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = sunGlow;
  context.fillRect(0, 0, BREAKOUT_WIDTH, BREAKOUT_HEIGHT);

  context.fillStyle = "rgba(255, 255, 255, 0.86)";
  for (const cloud of [
    { x: 74, y: 72, scale: 1.08 },
    { x: 595, y: 92, scale: 0.9 },
    { x: 122, y: 214, scale: 0.66 },
    { x: 636, y: 236, scale: 0.6 },
  ]) {
    context.beginPath();
    context.ellipse(cloud.x, cloud.y, 34 * cloud.scale, 18 * cloud.scale, 0, 0, Math.PI * 2);
    context.ellipse(cloud.x + 30 * cloud.scale, cloud.y + 3 * cloud.scale, 38 * cloud.scale, 20 * cloud.scale, 0, 0, Math.PI * 2);
    context.ellipse(cloud.x - 28 * cloud.scale, cloud.y + 6 * cloud.scale, 24 * cloud.scale, 15 * cloud.scale, 0, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = "#37b85c";
  context.beginPath();
  context.moveTo(0, BREAKOUT_HEIGHT);
  context.quadraticCurveTo(84, BREAKOUT_HEIGHT - 62, 176, BREAKOUT_HEIGHT);
  context.closePath();
  context.fill();

  context.fillStyle = "#239e4b";
  context.beginPath();
  context.moveTo(BREAKOUT_WIDTH, BREAKOUT_HEIGHT);
  context.quadraticCurveTo(BREAKOUT_WIDTH - 92, BREAKOUT_HEIGHT - 74, BREAKOUT_WIDTH - 214, BREAKOUT_HEIGHT);
  context.closePath();
  context.fill();

  context.strokeStyle = "rgba(91, 48, 15, 0.26)";
  context.lineWidth = 8;
  roundedRect(context, 10, 10, BREAKOUT_WIDTH - 20, BREAKOUT_HEIGHT - 20, 26);
  context.stroke();
}

function drawBrick(context: CanvasRenderingContext2D, brick: BreakoutState["bricks"][number]) {
  const row = Math.max(0, Math.round((brick.y - BREAKOUT_BRICK_TOP) / (BREAKOUT_BRICK_HEIGHT + BREAKOUT_BRICK_GAP)));
  const baseColor = BRICK_PALETTE[row % BRICK_PALETTE.length];
  const damageAlpha = 0.42 + (brick.strength / brick.maxStrength) * 0.58;
  const x = brick.x;
  const y = brick.y;

  context.save();
  context.globalAlpha = damageAlpha;
  context.shadowColor = "rgba(73, 39, 11, 0.3)";
  context.shadowBlur = 8;
  context.shadowOffsetY = 4;
  roundedRect(context, x, y, BREAKOUT_BRICK_WIDTH, BREAKOUT_BRICK_HEIGHT, 7);
  context.fillStyle = baseColor;
  context.fill();
  context.shadowColor = "transparent";

  const shine = context.createLinearGradient(x, y, x, y + BREAKOUT_BRICK_HEIGHT);
  shine.addColorStop(0, "rgba(255, 255, 255, 0.58)");
  shine.addColorStop(0.38, "rgba(255, 255, 255, 0.1)");
  shine.addColorStop(1, "rgba(0, 0, 0, 0.12)");
  context.fillStyle = shine;
  context.fill();

  context.lineWidth = 3;
  context.strokeStyle = "rgba(58, 33, 18, 0.75)";
  context.stroke();

  context.lineWidth = 1.5;
  context.strokeStyle = "rgba(255, 255, 255, 0.68)";
  roundedRect(context, x + 5, y + 4, BREAKOUT_BRICK_WIDTH - 10, 6, 4);
  context.stroke();
  context.restore();

  if (brick.maxStrength > 1) {
    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "rgba(43, 25, 12, 0.65)";
    context.font = "800 12px sans-serif";
    context.fillText(String(brick.strength), x + BREAKOUT_BRICK_WIDTH / 2, y + BREAKOUT_BRICK_HEIGHT / 2 + 1);
    context.restore();
  }
}

function drawPowerup(context: CanvasRenderingContext2D, state: BreakoutState) {
  if (!state.powerup) {
    return;
  }

  const { x, y } = state.powerup;
  context.save();
  context.translate(x, y);
  context.rotate(Math.sin(performance.now() / 160) * 0.16);
  context.shadowColor = "rgba(244, 63, 94, 0.35)";
  context.shadowBlur = 12;
  roundedRect(context, -19, -8, 38, 16, 8);
  context.fillStyle = "#ff3d71";
  context.fill();
  context.lineWidth = 3;
  context.strokeStyle = "rgba(92, 28, 35, 0.7)";
  context.stroke();
  context.fillStyle = "#fff7ad";
  context.fillRect(-4, -8, 8, 16);
  context.restore();
}

function drawPaddle(context: CanvasRenderingContext2D, state: BreakoutState) {
  const x = state.paddleX;
  const y = BREAKOUT_PADDLE_Y;
  const width = state.paddleWidth;
  const height = BREAKOUT_PADDLE_HEIGHT;

  context.save();
  context.shadowColor = state.wideTimer > 0 ? "rgba(39, 125, 255, 0.42)" : "rgba(89, 32, 16, 0.32)";
  context.shadowBlur = 14;
  context.shadowOffsetY = 5;
  roundedRect(context, x, y, width, height, height / 2);
  context.fillStyle = "#f8f2e4";
  context.fill();
  context.shadowColor = "transparent";

  roundedRect(context, x, y, width * 0.28, height, height / 2);
  context.fillStyle = "#e7353f";
  context.fill();
  roundedRect(context, x + width * 0.72, y, width * 0.28, height, height / 2);
  context.fillStyle = "#e7353f";
  context.fill();

  const highlight = context.createLinearGradient(0, y, 0, y + height);
  highlight.addColorStop(0, "rgba(255, 255, 255, 0.7)");
  highlight.addColorStop(1, "rgba(0, 0, 0, 0.16)");
  roundedRect(context, x + 3, y + 2, width - 6, height - 4, height / 2);
  context.fillStyle = highlight;
  context.fill();

  context.lineWidth = 3;
  context.strokeStyle = "rgba(73, 34, 21, 0.82)";
  roundedRect(context, x, y, width, height, height / 2);
  context.stroke();
  context.restore();
}

function drawBall(context: CanvasRenderingContext2D, state: BreakoutState) {
  const { ball } = state;
  const speed = Math.hypot(ball.vx, ball.vy) || 1;
  const trailLength = 34;
  const trailX = ball.x - (ball.vx / speed) * trailLength;
  const trailY = ball.y - (ball.vy / speed) * trailLength;
  const trail = context.createLinearGradient(trailX, trailY, ball.x, ball.y);
  trail.addColorStop(0, "rgba(33, 126, 255, 0)");
  trail.addColorStop(1, "rgba(20, 102, 255, 0.58)");
  context.save();
  context.lineCap = "round";
  context.lineWidth = BREAKOUT_BALL_RADIUS * 1.65;
  context.strokeStyle = trail;
  context.beginPath();
  context.moveTo(trailX, trailY);
  context.lineTo(ball.x, ball.y);
  context.stroke();

  context.shadowColor = "rgba(20, 102, 255, 0.58)";
  context.shadowBlur = 16;
  const orb = context.createRadialGradient(
    ball.x - 4,
    ball.y - 5,
    2,
    ball.x,
    ball.y,
    BREAKOUT_BALL_RADIUS + 5,
  );
  orb.addColorStop(0, "#ffffff");
  orb.addColorStop(0.18, "#9fe8ff");
  orb.addColorStop(0.72, "#1677ff");
  orb.addColorStop(1, "#0b3fa7");
  context.fillStyle = orb;
  context.beginPath();
  context.arc(ball.x, ball.y, BREAKOUT_BALL_RADIUS, 0, Math.PI * 2);
  context.fill();
  context.lineWidth = 2;
  context.strokeStyle = "rgba(7, 42, 112, 0.74)";
  context.stroke();
  context.restore();
}

function drawBreakoutScene(context: CanvasRenderingContext2D, state: BreakoutState) {
  context.clearRect(0, 0, BREAKOUT_WIDTH, BREAKOUT_HEIGHT);
  drawBreakoutBackground(context);

  for (const brick of state.bricks) {
    drawBrick(context, brick);
  }

  drawPowerup(context, state);
  drawPaddle(context, state);
  drawBall(context, state);

  if (state.phase !== "playing") {
    context.fillStyle = "rgba(72, 36, 9, 0.42)";
    context.fillRect(0, 0, BREAKOUT_WIDTH, BREAKOUT_HEIGHT);
    context.textAlign = "center";
    roundedRect(context, BREAKOUT_WIDTH / 2 - 150, BREAKOUT_HEIGHT / 2 - 64, 300, 118, 24);
    context.fillStyle = "rgba(255, 248, 220, 0.92)";
    context.fill();
    context.lineWidth = 4;
    context.strokeStyle = "rgba(91, 48, 15, 0.48)";
    context.stroke();
    context.fillStyle = "#4c280e";
    context.font = "800 34px sans-serif";
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
    context.font = "700 15px sans-serif";
    context.fillStyle = "rgba(76, 40, 14, 0.72)";
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
