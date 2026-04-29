"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
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

const WIDTH = 420;
const HEIGHT = 560;
const STORAGE_KEY = "arcade.helixDrop.bestScore";
type Phase = "idle" | "playing" | "paused" | "game-over";
type Level = { y: number; gapStart: number; gapSize: number; dangerStart: number };
type State = { phase: Phase; angle: number; ballY: number; velocityY: number; levels: Level[]; score: number; bestScore: number };

function createLevels() {
  return Array.from({ length: 10 }, (_, index) => ({
    y: 150 + index * 82,
    gapStart: (index * 47) % 360,
    gapSize: 82,
    dangerStart: (index * 83 + 120) % 360,
  }));
}

function createState(bestScore = 0): State {
  return { phase: "idle", angle: 0, ballY: 86, velocityY: 0, levels: createLevels(), score: 0, bestScore };
}

function inArc(angle: number, start: number, size: number) {
  const a = ((angle % 360) + 360) % 360;
  const s = ((start % 360) + 360) % 360;
  return a >= s && a <= s + size ? true : s + size > 360 && a <= (s + size) % 360;
}

function updateState(state: State, delta: number, input: number): State {
  if (state.phase !== "playing") return state;
  const angle = state.angle + input * 190 * delta;
  let ballY = state.ballY + state.velocityY * delta;
  let velocityY = state.velocityY + 920 * delta;
  let score = state.score;
  let levels = state.levels.map((level) => ({ ...level, y: level.y - Math.max(0, ballY - 150) }));
  if (ballY > 150) ballY = 150;
  for (const level of levels) {
    if (velocityY > 0 && ballY + 13 >= level.y && ballY + 13 <= level.y + 16) {
      const localAngle = -angle;
      if (inArc(localAngle, level.gapStart, level.gapSize)) {
        score += 1;
        level.y = -999;
      } else if (inArc(localAngle, level.dangerStart, 42)) {
        return { ...state, phase: "game-over", angle, ballY, velocityY: 0, levels, score, bestScore: Math.max(state.bestScore, score) };
      } else {
        ballY = level.y - 14;
        velocityY = -430;
      }
    }
  }
  levels = levels.filter((level) => level.y > -80);
  while (levels.length < 10) {
    const lastY = Math.max(...levels.map((level) => level.y), 130);
    const index = levels.length + score;
    levels.push({ y: lastY + 82, gapStart: (index * 47) % 360, gapSize: 78, dangerStart: (index * 83 + 120) % 360 });
  }
  return { ...state, phase: "playing", angle, ballY, velocityY, levels, score, bestScore: Math.max(state.bestScore, score) };
}

function drawScene(context: CanvasRenderingContext2D, state: State) {
  context.clearRect(0, 0, WIDTH, HEIGHT);
  const gradient = context.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, "#7f5bff");
  gradient.addColorStop(1, "#ff6cb4");
  context.fillStyle = gradient;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.save();
  context.translate(WIDTH / 2, 0);
  context.fillStyle = "#f6f6ff";
  context.beginPath();
  context.roundRect(-18, 0, 36, HEIGHT, 18);
  context.fill();
  state.levels.forEach((level) => {
    context.save();
    context.translate(0, level.y);
    context.rotate((state.angle * Math.PI) / 180);
    for (let a = 0; a < 360; a += 8) {
      if (inArc(a, level.gapStart, level.gapSize)) continue;
      context.strokeStyle = inArc(a, level.dangerStart, 42) ? "#222" : "#4cf0b2";
      context.lineWidth = 12;
      context.beginPath();
      context.arc(0, 0, 92, (a * Math.PI) / 180, ((a + 7) * Math.PI) / 180);
      context.stroke();
    }
    context.restore();
  });
  context.restore();
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(WIDTH / 2, state.ballY, 14, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#5b2eff";
  context.lineWidth = 4;
  context.stroke();
  context.fillStyle = "#fff";
  context.font = "900 26px sans-serif";
  context.fillText(String(state.score), 24, 42);
  if (state.phase !== "playing") {
    context.fillStyle = "rgba(0,0,0,0.35)";
    context.fillRect(0, 0, WIDTH, HEIGHT);
    context.fillStyle = "#fff";
    context.textAlign = "center";
    context.font = "900 34px sans-serif";
    context.fillText(state.phase === "game-over" ? "GAME OVER" : state.phase === "paused" ? "PAUSED" : "HELIX JUMP", WIDTH / 2, HEIGHT / 2);
    context.font = "800 15px sans-serif";
    context.fillText("rotate to fall through gaps", WIDTH / 2, HEIGHT / 2 + 30);
    context.textAlign = "left";
  }
}

export function HelixDropGame() {
  const initialState = createState(readStoredNumber(STORAGE_KEY));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef(initialState);
  const inputRef = useRef(0);
  const [hud, setHud] = useState({ score: 0, bestScore: initialState.bestScore, phase: initialState.phase });

  function sync(nextState: State) {
    stateRef.current = nextState;
    setHud({ score: nextState.score, bestScore: nextState.bestScore, phase: nextState.phase });
    writeStoredNumber(STORAGE_KEY, nextState.bestScore);
  }

  function start() {
    sync({ ...createState(stateRef.current.bestScore), phase: "playing" });
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (key === "arrowleft" || key === "a") {
      event.preventDefault();
      inputRef.current = -1;
    } else if (key === "arrowright" || key === "d") {
      event.preventDefault();
      inputRef.current = 1;
    } else if (key === " " || key === "r") {
      event.preventDefault();
      start();
    } else if (key === "p") {
      event.preventDefault();
      const current = stateRef.current;
      sync({ ...current, phase: current.phase === "playing" ? "paused" : "playing" });
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      contextRef.current = configureHiDPICanvas(canvas, WIDTH, HEIGHT);
      drawScene(contextRef.current!, stateRef.current);
    }
    const down = (event: KeyboardEvent) => onKeyDown(event);
    const up = (event: KeyboardEvent) => {
      if (["arrowleft", "a", "arrowright", "d"].includes(event.key.toLowerCase())) inputRef.current = 0;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useAnimationFrameLoop((delta) => {
    const nextState = updateState(stateRef.current, delta, inputRef.current);
    if (nextState !== stateRef.current) sync(nextState);
    if (contextRef.current) drawScene(contextRef.current, stateRef.current);
  });

  return (
    <GamePanel>
      <GameHud items={[{ label: "Score", value: hud.score }, { label: "Best", value: hud.bestScore }, { label: "Status", value: hud.phase }]} actions={<GameButton variant="primary" onClick={start}>Start</GameButton>} />
      <GamePlayfield className="mx-auto aspect-[3/4] w-full max-w-[min(24rem,54dvh)] touch-none border-0 bg-[#7f5bff]">
        <canvas ref={canvasRef} className="h-full w-full" aria-label="Helix Jump field" />
      </GamePlayfield>
      <GameStatus>A/D or arrows rotate. Avoid black slices. Space starts.</GameStatus>
      <TouchControls className="max-w-[18rem]">
        <div className="grid grid-cols-2 gap-2">
          <GameButton variant="touch" onPointerDown={() => (inputRef.current = -1)} onPointerUp={() => (inputRef.current = 0)}>Left</GameButton>
          <GameButton variant="touch" onPointerDown={() => (inputRef.current = 1)} onPointerUp={() => (inputRef.current = 0)}>Right</GameButton>
        </div>
      </TouchControls>
    </GamePanel>
  );
}
