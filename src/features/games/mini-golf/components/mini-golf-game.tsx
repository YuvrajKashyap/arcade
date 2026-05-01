"use client";

import { type PointerEvent, useEffect, useEffectEvent, useRef, useState } from "react";
import { configureHiDPICanvas } from "@/features/games/shared/canvas/configure-canvas";
import { GameButton, GameHud, GamePanel, GamePlayfield, GameStatus } from "@/features/games/shared/components/game-ui";
import { useAnimationFrameLoop } from "@/features/games/shared/hooks/use-animation-frame-loop";
import { readStoredNumber, writeStoredNumber } from "@/features/games/shared/utils/local-storage";

const WIDTH = 720;
const HEIGHT = 440;
const BEST_KEY = "arcade.miniGolf.bestTotal";
type Vec = { x: number; y: number };
type Wall = { x: number; y: number; w: number; h: number };
type Hole = { start: Vec; cup: Vec; par: number; walls: Wall[]; water?: Wall; sand?: Wall };
type State = { phase: "idle" | "aiming" | "rolling" | "sunk" | "complete"; hole: number; ball: Vec; velocity: Vec; strokes: number; total: number; best: number; aim?: Vec; trail: Vec[] };

const HOLES: Hole[] = [
  { start: { x: 92, y: 220 }, cup: { x: 625, y: 220 }, par: 2, walls: [{ x: 330, y: 90, w: 30, h: 180 }] },
  { start: { x: 90, y: 95 }, cup: { x: 620, y: 350 }, par: 3, walls: [{ x: 230, y: 0, w: 28, h: 270 }, { x: 440, y: 170, w: 28, h: 270 }], sand: { x: 500, y: 250, w: 120, h: 70 } },
  { start: { x: 110, y: 345 }, cup: { x: 610, y: 80 }, par: 3, walls: [{ x: 180, y: 170, w: 330, h: 26 }], water: { x: 300, y: 250, w: 150, h: 75 } },
  { start: { x: 82, y: 220 }, cup: { x: 640, y: 86 }, par: 4, walls: [{ x: 180, y: 90, w: 28, h: 260 }, { x: 360, y: 0, w: 28, h: 250 }, { x: 520, y: 190, w: 28, h: 250 }] },
  { start: { x: 100, y: 105 }, cup: { x: 625, y: 330 }, par: 3, walls: [{ x: 270, y: 95, w: 180, h: 28 }, { x: 270, y: 315, w: 180, h: 28 }], sand: { x: 310, y: 175, w: 140, h: 90 } },
  { start: { x: 90, y: 360 }, cup: { x: 625, y: 65 }, par: 4, walls: [{ x: 210, y: 80, w: 28, h: 280 }, { x: 390, y: 80, w: 28, h: 280 }], water: { x: 485, y: 150, w: 120, h: 100 } },
  { start: { x: 90, y: 220 }, cup: { x: 620, y: 220 }, par: 2, walls: [{ x: 280, y: 110, w: 35, h: 90 }, { x: 280, y: 245, w: 35, h: 90 }, { x: 455, y: 160, w: 35, h: 120 }] },
  { start: { x: 110, y: 80 }, cup: { x: 620, y: 360 }, par: 4, walls: [{ x: 210, y: 0, w: 28, h: 190 }, { x: 210, y: 245, w: 28, h: 195 }, { x: 430, y: 110, w: 28, h: 230 }], sand: { x: 500, y: 270, w: 105, h: 70 } },
  { start: { x: 82, y: 220 }, cup: { x: 645, y: 220 }, par: 5, walls: [{ x: 175, y: 70, w: 30, h: 300 }, { x: 325, y: 0, w: 30, h: 280 }, { x: 475, y: 160, w: 30, h: 280 }], water: { x: 535, y: 70, w: 90, h: 95 } },
];

function createState(best = 0): State {
  return { phase: "idle", hole: 0, ball: { ...HOLES[0].start }, velocity: { x: 0, y: 0 }, strokes: 0, total: 0, best, trail: [] };
}

function clampBall(ball: Vec, velocity: Vec, wall: Wall) {
  const nearestX = Math.max(wall.x, Math.min(ball.x, wall.x + wall.w));
  const nearestY = Math.max(wall.y, Math.min(ball.y, wall.y + wall.h));
  if (Math.hypot(ball.x - nearestX, ball.y - nearestY) > 10) return;
  if (Math.abs(ball.x - nearestX) > Math.abs(ball.y - nearestY)) velocity.x *= -0.82;
  else velocity.y *= -0.82;
  ball.x += Math.sign(ball.x - nearestX || velocity.x) * 4;
  ball.y += Math.sign(ball.y - nearestY || velocity.y) * 4;
}

function draw(ctx: CanvasRenderingContext2D, state: State) {
  const hole = HOLES[state.hole];
  ctx.fillStyle = "#6ed16f";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#83df79";
  for (let y = -40; y < HEIGHT; y += 40) {
    ctx.beginPath();
    ctx.ellipse(WIDTH / 2, y, WIDTH * 0.7, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (hole.water) {
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(hole.water.x, hole.water.y, hole.water.w, hole.water.h);
  }
  if (hole.sand) {
    ctx.fillStyle = "#f6d97a";
    ctx.fillRect(hole.sand.x, hole.sand.y, hole.sand.w, hole.sand.h);
  }
  ctx.fillStyle = "#315830";
  hole.walls.forEach((wall) => {
    ctx.fillStyle = "#2d7a42";
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(wall.x + 3, wall.y + 3, Math.max(0, wall.w - 6), 5);
  });
  ctx.fillStyle = "#1a2530";
  ctx.beginPath();
  ctx.arc(hole.cup.x, hole.cup.y, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(hole.cup.x, hole.cup.y, 22, 0, Math.PI * 2);
  ctx.stroke();
  state.trail.forEach((point, index) => {
    ctx.globalAlpha = index / state.trail.length;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  if (state.aim) {
    ctx.strokeStyle = "#fff45c";
    ctx.lineWidth = 5;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(state.ball.x, state.ball.y);
    ctx.lineTo(state.aim.x, state.aim.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#17351d";
  ctx.font = "900 20px sans-serif";
  ctx.fillText(`HOLE ${state.hole + 1}  PAR ${hole.par}`, 22, 34);
  if (state.phase === "complete") {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "900 46px sans-serif";
    ctx.fillText("COURSE COMPLETE", WIDTH / 2, HEIGHT / 2);
    ctx.textAlign = "left";
  }
}

export function MiniGolfGame() {
  const initialState = createState(readStoredNumber(BEST_KEY));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef(initialState);
  const [hud, setHud] = useState(initialState);

  function sync(state: State) {
    stateRef.current = state;
    setHud(state);
    if (state.best) writeStoredNumber(BEST_KEY, state.best);
  }

  function restart() {
    sync(createState(stateRef.current.best));
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key.toLowerCase() === "r" || event.key === " ") {
      event.preventDefault();
      restart();
    }
  });

  function nextHole(state: State) {
    const total = state.total + state.strokes;
    if (state.hole === HOLES.length - 1) {
      const best = state.best === 0 ? total : Math.min(state.best, total);
      return { ...state, phase: "complete" as const, total, best };
    }
    const hole = state.hole + 1;
    return { ...state, phase: "idle" as const, hole, ball: { ...HOLES[hole].start }, velocity: { x: 0, y: 0 }, strokes: 0, total, trail: [], aim: undefined };
  }

  function pointer(event: PointerEvent<HTMLCanvasElement>, mode: "down" | "move" | "up") {
    const canvas = canvasRef.current;
    const state = stateRef.current;
    if (!canvas || state.phase === "rolling" || state.phase === "complete") return;
    const rect = canvas.getBoundingClientRect();
    const point = { x: ((event.clientX - rect.left) / rect.width) * WIDTH, y: ((event.clientY - rect.top) / rect.height) * HEIGHT };
    if (mode === "down") sync({ ...state, phase: "aiming", aim: point });
    if (mode === "move" && state.phase === "aiming") sync({ ...state, aim: point });
    if (mode === "up" && state.phase === "aiming" && state.aim) {
      const dx = state.ball.x - point.x;
      const dy = state.ball.y - point.y;
      const power = Math.min(620, Math.hypot(dx, dy) * 4.8);
      const angle = Math.atan2(dy, dx);
      sync({ ...state, phase: "rolling", strokes: state.strokes + 1, velocity: { x: Math.cos(angle) * power, y: Math.sin(angle) * power }, aim: undefined });
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) ctxRef.current = configureHiDPICanvas(canvas, WIDTH, HEIGHT);
    const down = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  useAnimationFrameLoop((delta) => {
    let state = stateRef.current;
    if (state.phase === "rolling") {
      const hole = HOLES[state.hole];
      const ball = { x: state.ball.x + state.velocity.x * delta, y: state.ball.y + state.velocity.y * delta };
      const velocity = { ...state.velocity };
      if (ball.x < 12 || ball.x > WIDTH - 12) velocity.x *= -0.86;
      if (ball.y < 12 || ball.y > HEIGHT - 12) velocity.y *= -0.86;
      ball.x = Math.max(12, Math.min(WIDTH - 12, ball.x));
      ball.y = Math.max(12, Math.min(HEIGHT - 12, ball.y));
      hole.walls.forEach((wall) => clampBall(ball, velocity, wall));
      const friction = hole.sand && ball.x > hole.sand.x && ball.x < hole.sand.x + hole.sand.w && ball.y > hole.sand.y && ball.y < hole.sand.y + hole.sand.h ? 0.9 : 0.985;
      velocity.x *= friction;
      velocity.y *= friction;
      if (hole.water && ball.x > hole.water.x && ball.x < hole.water.x + hole.water.w && ball.y > hole.water.y && ball.y < hole.water.y + hole.water.h) {
        state = { ...state, phase: "idle", ball: { ...hole.start }, velocity: { x: 0, y: 0 }, strokes: state.strokes + 1, trail: [] };
      } else if (Math.hypot(ball.x - hole.cup.x, ball.y - hole.cup.y) < 18 && Math.hypot(velocity.x, velocity.y) < 210) {
        state = nextHole({ ...state, phase: "sunk", ball, velocity: { x: 0, y: 0 } });
      } else {
        state = { ...state, ball, velocity, phase: Math.hypot(velocity.x, velocity.y) < 7 ? "idle" : "rolling", trail: [...state.trail.slice(-16), ball] };
      }
      sync(state);
    }
    if (ctxRef.current) draw(ctxRef.current, stateRef.current);
  });

  const parTotal = HOLES.reduce((sum, hole) => sum + hole.par, 0);

  return (
    <GamePanel>
      <GameHud items={[{ label: "Hole", value: `${hud.hole + 1}/9` }, { label: "Par", value: HOLES[hud.hole].par }, { label: "Strokes", value: hud.strokes }, { label: "Total", value: hud.total + hud.strokes }, { label: "Best", value: hud.best || "-" }]} actions={<GameButton variant="primary" onClick={restart}>New Course</GameButton>} />
      <GamePlayfield className="mx-auto aspect-[36/22] w-full max-w-[min(52rem,60dvh)] border-0 bg-[#6ed16f]">
        <canvas ref={canvasRef} className="h-full w-full touch-none" aria-label="Mini Golf course" onPointerDown={(event) => pointer(event, "down")} onPointerMove={(event) => pointer(event, "move")} onPointerUp={(event) => pointer(event, "up")} onPointerCancel={(event) => pointer(event, "up")} />
      </GamePlayfield>
      <GameStatus>Drag away from the ball to aim and set power. Complete 9 holes. Course par is {parTotal}.</GameStatus>
    </GamePanel>
  );
}
