"use client";

import { type PointerEvent, useEffect, useEffectEvent, useRef, useState } from "react";
import { configureHiDPICanvas } from "@/features/games/shared/canvas/configure-canvas";
import {
  GameButton,
  GameHud,
  GamePanel,
  GamePlayfield,
  GameStatus,
} from "@/features/games/shared/components/game-ui";
import { useAnimationFrameLoop } from "@/features/games/shared/hooks/use-animation-frame-loop";
import { readStoredNumber, writeStoredNumber } from "@/features/games/shared/utils/local-storage";

const WIDTH = 640;
const HEIGHT = 420;
const STORAGE_KEY = "arcade.bubblePop.bestScore";
type Bubble = { id: number; x: number; y: number; r: number; speed: number; kind: "normal" | "bonus" | "hazard"; wobble: number };
type Pop = { x: number; y: number; age: number; color: string };
type State = { phase: "idle" | "playing" | "game-over"; score: number; best: number; lives: number; combo: number; bubbles: Bubble[]; pops: Pop[]; spawn: number; nextId: number };

function createState(best = 0): State {
  return { phase: "idle", score: 0, best, lives: 5, combo: 0, bubbles: [], pops: [], spawn: 0, nextId: 1 };
}

function spawnBubble(id: number): Bubble {
  const kind = Math.random() < 0.1 ? "bonus" : Math.random() < 0.14 ? "hazard" : "normal";
  const r = kind === "bonus" ? 24 : kind === "hazard" ? 22 : 16 + Math.random() * 18;
  return { id, x: r + Math.random() * (WIDTH - r * 2), y: HEIGHT + r, r, speed: 45 + Math.random() * 55, kind, wobble: Math.random() * 10 };
}

function draw(ctx: CanvasRenderingContext2D, state: State, elapsed: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0, "#8ee9ff");
  bg.addColorStop(0.55, "#2eb9e8");
  bg.addColorStop(1, "#0a5aa8");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  for (let i = 0; i < 18; i += 1) {
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.arc((i * 83 + elapsed * 18) % (WIDTH + 80) - 40, 40 + (i * 41) % HEIGHT, 3 + (i % 4), 0, Math.PI * 2);
    ctx.fill();
  }
  state.bubbles.forEach((bubble) => {
    const x = bubble.x + Math.sin(elapsed * 3 + bubble.wobble) * 7;
    const gradient = ctx.createRadialGradient(x - bubble.r * 0.35, bubble.y - bubble.r * 0.35, 2, x, bubble.y, bubble.r);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.36, bubble.kind === "bonus" ? "#fff475" : bubble.kind === "hazard" ? "#ff7b93" : "#b7f7ff");
    gradient.addColorStop(1, bubble.kind === "bonus" ? "#ffb52b" : bubble.kind === "hazard" ? "#c21843" : "#3aaeff");
    ctx.fillStyle = gradient;
    ctx.shadowColor = bubble.kind === "hazard" ? "#ff245a" : "#ffffff";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(x, bubble.y, bubble.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 3;
    ctx.stroke();
    if (bubble.kind === "hazard") {
      ctx.fillStyle = "#5c0620";
      ctx.font = "900 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("!", x, bubble.y + 6);
    }
  });
  state.pops.forEach((pop) => {
    ctx.globalAlpha = Math.max(0, 1 - pop.age / 0.45);
    ctx.strokeStyle = pop.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(pop.x, pop.y, 20 + pop.age * 85, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });
  if (state.phase !== "playing") {
    ctx.fillStyle = "rgba(3,30,68,0.42)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "900 42px sans-serif";
    ctx.fillText(state.phase === "game-over" ? "GAME OVER" : "BUBBLE POP", WIDTH / 2, HEIGHT / 2 - 10);
    ctx.font = "800 16px sans-serif";
    ctx.fillText("tap bubbles, avoid hazards", WIDTH / 2, HEIGHT / 2 + 24);
  }
}

export function BubblePopGame() {
  const initialState = createState(readStoredNumber(STORAGE_KEY));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef(initialState);
  const [hud, setHud] = useState(initialState);

  function sync(state: State) {
    stateRef.current = state;
    setHud(state);
    writeStoredNumber(STORAGE_KEY, state.best);
  }

  function start() {
    sync({ ...createState(stateRef.current.best), phase: "playing" });
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === " " || event.key.toLowerCase() === "r") {
      event.preventDefault();
      start();
    }
  });

  function popAt(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (stateRef.current.phase !== "playing") {
      start();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const state = stateRef.current;
    const bubble = [...state.bubbles].reverse().find((item) => Math.hypot(item.x - x, item.y - y) <= item.r + 8);
    if (!bubble) return sync({ ...state, combo: 0 });
    const bonus = bubble.kind === "bonus" ? 45 : bubble.kind === "hazard" ? -20 : 10 + Math.min(30, state.combo * 2);
    const lives = bubble.kind === "hazard" ? state.lives - 1 : state.lives;
    const score = Math.max(0, state.score + bonus);
    sync({
      ...state,
      score,
      best: Math.max(state.best, score),
      lives,
      combo: bubble.kind === "hazard" ? 0 : state.combo + 1,
      phase: lives <= 0 ? "game-over" : "playing",
      bubbles: state.bubbles.filter((item) => item.id !== bubble.id),
      pops: [...state.pops, { x: bubble.x, y: bubble.y, age: 0, color: bubble.kind === "hazard" ? "#ff245a" : "#ffffff" }],
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    ctxRef.current = configureHiDPICanvas(canvas, WIDTH, HEIGHT);
  }, []);

  useEffect(() => {
    const down = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  useAnimationFrameLoop((delta, elapsed) => {
    const state = stateRef.current;
    let next = state;
    if (state.phase === "playing") {
      const bubbles = state.bubbles
        .map((bubble) => ({ ...bubble, y: bubble.y - bubble.speed * delta }))
        .filter((bubble) => bubble.y + bubble.r > -20);
      const escaped = state.bubbles.filter((bubble) => bubble.y + bubble.r > -20).length - bubbles.length;
      const spawn = state.spawn - delta;
      next = { ...state, bubbles, pops: state.pops.map((pop) => ({ ...pop, age: pop.age + delta })).filter((pop) => pop.age < 0.45), spawn, lives: Math.max(0, state.lives - escaped), combo: escaped ? 0 : state.combo };
      if (next.lives <= 0) next = { ...next, phase: "game-over" };
      if (spawn <= 0) next = { ...next, bubbles: [...next.bubbles, spawnBubble(next.nextId)], nextId: next.nextId + 1, spawn: Math.max(0.32, 0.78 - next.score / 1200) };
      sync(next);
    }
    if (ctxRef.current) draw(ctxRef.current, stateRef.current, elapsed);
  });

  return (
    <GamePanel>
      <GameHud items={[{ label: "Score", value: hud.score }, { label: "Best", value: hud.best }, { label: "Lives", value: hud.lives }, { label: "Combo", value: hud.combo }]} actions={<GameButton variant="primary" onClick={start}>Start</GameButton>} />
      <GamePlayfield className="mx-auto aspect-[32/21] w-full max-w-[min(48rem,60dvh)] border-0 bg-[#29b9ed]">
        <canvas ref={canvasRef} onPointerDown={popAt} className="h-full w-full touch-none" aria-label="Bubble Pop field" />
      </GamePlayfield>
      <GameStatus>Pop bubbles for combos, hit gold for bonus, avoid red hazards. Space or tap starts.</GameStatus>
    </GamePanel>
  );
}
