"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { configureHiDPICanvas } from "@/features/games/shared/canvas/configure-canvas";
import {
  GameButton,
  GameHud,
  GamePanel,
  GamePlayfield,
  GameStatus,
} from "@/features/games/shared/components/game-ui";
import { useAnimationFrameLoop } from "@/features/games/shared/hooks/use-animation-frame-loop";
import {
  readStoredNumber,
  writeStoredNumber,
} from "@/features/games/shared/utils/local-storage";

const WIDTH = 420;
const HEIGHT = 560;
const STORAGE_KEY = "arcade.stackTower.bestScore";
type Phase = "idle" | "playing" | "game-over";
type Block = { x: number; y: number; width: number; color: string };
type State = { phase: Phase; blocks: Block[]; moving: Block; direction: 1 | -1; score: number; bestScore: number; speed: number; cameraY: number };

function colorFor(index: number) {
  return `hsl(${(index * 32 + 190) % 360} 82% 58%)`;
}

function createState(bestScore = 0): State {
  const base = { x: 80, y: 470, width: 260, color: colorFor(0) };
  return { phase: "idle", blocks: [base], moving: { x: 0, y: 430, width: 260, color: colorFor(1) }, direction: 1, score: 0, bestScore, speed: 160, cameraY: 0 };
}

function dropBlock(state: State): State {
  if (state.phase === "idle" || state.phase === "game-over") return { ...createState(state.bestScore), phase: "playing" };
  const previous = state.blocks[state.blocks.length - 1]!;
  const overlapLeft = Math.max(previous.x, state.moving.x);
  const overlapRight = Math.min(previous.x + previous.width, state.moving.x + state.moving.width);
  const overlap = overlapRight - overlapLeft;
  if (overlap <= 8) return { ...state, phase: "game-over", bestScore: Math.max(state.bestScore, state.score) };
  const score = state.score + 1;
  const newBlock = { x: overlapLeft, y: previous.y - 28, width: overlap, color: state.moving.color };
  const blocks = [...state.blocks, newBlock].slice(-16);
  const cameraY = Math.max(0, 250 - newBlock.y);
  return {
    ...state,
    blocks,
    moving: { x: state.direction > 0 ? 0 : WIDTH - overlap, y: newBlock.y - 28, width: overlap, color: colorFor(score + 1) },
    direction: state.direction > 0 ? -1 : 1,
    score,
    bestScore: Math.max(state.bestScore, score),
    speed: state.speed + 10,
    cameraY,
  };
}

function updateState(state: State, delta: number): State {
  if (state.phase !== "playing") return state;
  let x = state.moving.x + state.direction * state.speed * delta;
  let direction = state.direction;
  if (x < 0) {
    x = 0;
    direction = 1;
  } else if (x + state.moving.width > WIDTH) {
    x = WIDTH - state.moving.width;
    direction = -1;
  }
  return { ...state, moving: { ...state.moving, x }, direction };
}

function drawBlock(context: CanvasRenderingContext2D, block: Block, cameraY: number) {
  const y = block.y + cameraY;
  context.fillStyle = block.color;
  context.fillRect(block.x, y, block.width, 28);
  context.fillStyle = "rgba(255,255,255,0.26)";
  context.fillRect(block.x, y, block.width, 7);
  context.strokeStyle = "rgba(0,0,0,0.18)";
  context.strokeRect(block.x, y, block.width, 28);
}

function drawScene(context: CanvasRenderingContext2D, state: State) {
  const gradient = context.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, "#ffd56f");
  gradient.addColorStop(1, "#ff6b9d");
  context.fillStyle = gradient;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  state.blocks.forEach((block) => drawBlock(context, block, state.cameraY));
  drawBlock(context, state.moving, state.cameraY);
  context.fillStyle = "#fff";
  context.font = "900 54px sans-serif";
  context.textAlign = "center";
  context.fillText(String(state.score), WIDTH / 2, 78);
  if (state.phase !== "playing") {
    context.fillStyle = "rgba(255,255,255,0.35)";
    context.fillRect(0, 0, WIDTH, HEIGHT);
    context.fillStyle = "#fff";
    context.font = "900 32px sans-serif";
    context.fillText(state.phase === "game-over" ? "GAME OVER" : "STACK TOWER", WIDTH / 2, HEIGHT / 2);
    context.font = "800 15px sans-serif";
    context.fillText("space or tap to drop", WIDTH / 2, HEIGHT / 2 + 30);
  }
}

export function StackTowerGame() {
  const initialState = createState(readStoredNumber(STORAGE_KEY));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef(initialState);
  const [hud, setHud] = useState({ score: 0, bestScore: initialState.bestScore, phase: initialState.phase });

  function sync(nextState: State) {
    stateRef.current = nextState;
    setHud({ score: nextState.score, bestScore: nextState.bestScore, phase: nextState.phase });
    writeStoredNumber(STORAGE_KEY, nextState.bestScore);
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (key === " " || key === "enter") {
      event.preventDefault();
      sync(dropBlock(stateRef.current));
    } else if (key === "r") {
      event.preventDefault();
      sync({ ...createState(stateRef.current.bestScore), phase: "playing" });
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      contextRef.current = configureHiDPICanvas(canvas, WIDTH, HEIGHT);
      drawScene(contextRef.current!, stateRef.current);
    }
    const handler = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useAnimationFrameLoop((delta) => {
    const nextState = updateState(stateRef.current, delta);
    if (nextState !== stateRef.current) sync(nextState);
    if (contextRef.current) drawScene(contextRef.current, stateRef.current);
  });

  return (
    <GamePanel>
      <GameHud items={[{ label: "Score", value: hud.score }, { label: "Best", value: hud.bestScore }, { label: "Status", value: hud.phase }]} actions={<GameButton variant="primary" onClick={() => sync(dropBlock(stateRef.current))}>Drop</GameButton>} />
      <GamePlayfield className="mx-auto aspect-[3/4] w-full max-w-[min(24rem,54dvh)] touch-none border-0 bg-[#ff8ab0]">
        <canvas ref={canvasRef} className="h-full w-full" aria-label="Stack Tower field" onPointerDown={() => sync(dropBlock(stateRef.current))} />
      </GamePlayfield>
      <GameStatus>Space, Enter, tap, or click drops the moving block. R restarts.</GameStatus>
    </GamePanel>
  );
}
