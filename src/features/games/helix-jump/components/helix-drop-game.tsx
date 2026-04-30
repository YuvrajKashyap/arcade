"use client";

import { type PointerEvent, useEffect, useEffectEvent, useRef, useState } from "react";
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
const CENTER_X = WIDTH / 2;
const BALL_X = WIDTH / 2;
const BALL_RADIUS = 15;
const STORAGE_KEY = "arcade.helixDrop.bestScore";
const PLATFORM_SPACING = 78;
const START_PLATFORM_Y = 178;
const TOWER_RADIUS = 112;
const PERSPECTIVE_Y = 0.34;
const DANGER_SIZE = 48;
const FIREBALL_DROP_COUNT = 3;

type Phase = "idle" | "playing" | "paused" | "game-over" | "won";
type Layer = {
  id: number;
  y: number;
  gapStart: number;
  gapSize: number;
  dangerStart: number;
  dangerSize: number;
  hue: number;
};
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
};
type State = {
  phase: Phase;
  rotation: number;
  ballY: number;
  velocityY: number;
  layers: Layer[];
  particles: Particle[];
  score: number;
  bestScore: number;
  level: number;
  combo: number;
  fireTime: number;
  message: string;
};

function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

function inArc(angle: number, start: number, size: number) {
  const a = normalizeAngle(angle);
  const s = normalizeAngle(start);
  const e = s + size;
  return e <= 360 ? a >= s && a <= e : a >= s || a <= e - 360;
}

function seededLayer(index: number, y: number, level: number): Layer {
  const gapSize = Math.max(64, 104 - level * 3 - (index % 3) * 8);
  return {
    id: index,
    y,
    gapStart: normalizeAngle(index * 67 + level * 41),
    gapSize,
    dangerStart: normalizeAngle(index * 113 + level * 29 + 96),
    dangerSize: Math.min(72, DANGER_SIZE + level * 2),
    hue: (index * 34 + level * 21) % 360,
  };
}

function createLayers(level = 1) {
  return Array.from({ length: 13 }, (_, index) => seededLayer(index, START_PLATFORM_Y + index * PLATFORM_SPACING, level));
}

function createState(bestScore = 0): State {
  return {
    phase: "idle",
    rotation: 0,
    ballY: 112,
    velocityY: 0,
    layers: createLayers(1),
    particles: [],
    score: 0,
    bestScore,
    level: 1,
    combo: 0,
    fireTime: 0,
    message: "Drag or use arrows to rotate the tower.",
  };
}

function createBurst(x: number, y: number, color: string, count = 16) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.5;
    const speed = 90 + Math.random() * 170;
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 80,
      life: 0.45 + Math.random() * 0.3,
      color,
      size: 2 + Math.random() * 4,
    };
  });
}

function updateParticles(particles: Particle[], delta: number) {
  return particles
    .map((particle) => ({
      ...particle,
      x: particle.x + particle.vx * delta,
      y: particle.y + particle.vy * delta,
      vy: particle.vy + 420 * delta,
      life: particle.life - delta,
    }))
    .filter((particle) => particle.life > 0);
}

function impactAngle(rotation: number) {
  return normalizeAngle(270 - rotation);
}

function updateState(state: State, delta: number, input: number): State {
  if (state.phase !== "playing") {
    return { ...state, particles: updateParticles(state.particles, delta) };
  }

  const rotation = normalizeAngle(state.rotation + input * 245 * delta);
  let ballY = state.ballY + state.velocityY * delta;
  let velocityY = state.velocityY + 1160 * delta;
  let layers = state.layers.map((layer) => ({ ...layer }));
  const particles = updateParticles(state.particles, delta);
  let score = state.score;
  let bestScore = state.bestScore;
  let combo = state.combo;
  let fireTime = Math.max(0, state.fireTime - delta);
  let message = state.message;

  const cameraLift = Math.max(0, ballY - 150);
  if (cameraLift > 0) {
    ballY -= cameraLift;
    layers = layers.map((layer) => ({ ...layer, y: layer.y - cameraLift }));
  }

  for (const layer of layers) {
    const platformTop = layer.y - 7;
    const platformBottom = layer.y + 9;
    const crossing = velocityY > 0 && ballY + BALL_RADIUS >= platformTop && ballY + BALL_RADIUS <= platformBottom;
    if (!crossing) continue;

    const localAngle = impactAngle(rotation);
    const gap = inArc(localAngle, layer.gapStart, layer.gapSize);
    const danger = inArc(localAngle, layer.dangerStart, layer.dangerSize);
    const fireball = fireTime > 0 || combo >= FIREBALL_DROP_COUNT;

    if (gap) {
      layer.y = -999;
      score += 1 + Math.max(0, combo - 1);
      bestScore = Math.max(bestScore, score);
      combo += 1;
      fireTime = combo >= FIREBALL_DROP_COUNT ? 1.2 : fireTime;
      particles.push(...createBurst(BALL_X, layer.y, "#ffffff", 10));
      message = combo >= FIREBALL_DROP_COUNT ? "Fireball active. Smash through a layer." : "Clean drop.";
    } else if (danger && !fireball) {
      particles.push(...createBurst(BALL_X, layer.y - 5, "#ff2355", 34));
      return {
        ...state,
        phase: "game-over",
        rotation,
        ballY,
        velocityY: 0,
        layers,
        particles,
        score,
        bestScore,
        combo: 0,
        fireTime: 0,
        message: "You hit a danger slice.",
      };
    } else if (fireball && velocityY > 520) {
      layer.y = -999;
      score += danger ? 4 : 2;
      bestScore = Math.max(bestScore, score);
      combo += 1;
      fireTime = 0.85;
      particles.push(...createBurst(BALL_X, layer.y - 5, danger ? "#ff2355" : "#ffe15c", 30));
      message = "Smash drop.";
    } else {
      ballY = platformTop - BALL_RADIUS;
      velocityY = -475 - Math.min(90, combo * 10);
      combo = 0;
      fireTime = 0;
      particles.push(...createBurst(BALL_X, platformTop - 2, danger ? "#ff2355" : "#37f2aa", 14));
      message = "Bounce.";
    }
  }

  layers = layers.filter((layer) => layer.y > -110);
  while (layers.length < 13) {
    const nextId = Math.max(0, ...layers.map((layer) => layer.id)) + 1;
    const lastY = Math.max(START_PLATFORM_Y, ...layers.map((layer) => layer.y));
    const level = Math.floor(score / 10) + 1;
    layers.push(seededLayer(nextId, lastY + PLATFORM_SPACING, level));
  }

  const level = Math.floor(score / 10) + 1;
  return {
    ...state,
    phase: "playing",
    rotation,
    ballY,
    velocityY,
    layers,
    particles,
    score,
    bestScore,
    level,
    combo,
    fireTime,
    message,
  };
}

function drawSector(
  context: CanvasRenderingContext2D,
  start: number,
  size: number,
  inner: number,
  outer: number,
  color: string,
) {
  const startRad = (start * Math.PI) / 180;
  const endRad = ((start + size) * Math.PI) / 180;
  context.beginPath();
  context.arc(0, 0, outer, startRad, endRad);
  context.arc(0, 0, inner, endRad, startRad, true);
  context.closePath();
  context.fillStyle = color;
  context.fill();
}

function drawLayer(context: CanvasRenderingContext2D, layer: Layer, rotation: number) {
  context.save();
  context.translate(CENTER_X, layer.y);
  context.scale(1, PERSPECTIVE_Y);
  context.rotate((rotation * Math.PI) / 180);

  context.shadowColor = "rgba(0,0,0,0.28)";
  context.shadowBlur = 14;
  context.shadowOffsetY = 12;

  for (let start = 0; start < 360; start += 7.5) {
    if (inArc(start + 3, layer.gapStart, layer.gapSize)) continue;
    const danger = inArc(start + 3, layer.dangerStart, layer.dangerSize);
    const shade = danger ? "#ed1f4f" : `hsl(${layer.hue} 86% ${start > 180 ? 48 : 56}%)`;
    drawSector(context, start, 7.1, 37, TOWER_RADIUS, shade);
  }

  context.shadowBlur = 0;
  for (let start = 0; start < 360; start += 24) {
    if (inArc(start + 12, layer.gapStart, layer.gapSize)) continue;
    context.strokeStyle = "rgba(255,255,255,0.18)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 0, TOWER_RADIUS - 5, (start * Math.PI) / 180, ((start + 14) * Math.PI) / 180);
    context.stroke();
  }

  context.restore();

  context.save();
  context.translate(CENTER_X, layer.y + 4);
  context.scale(1, PERSPECTIVE_Y);
  context.strokeStyle = "rgba(255,255,255,0.36)";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(0, 0, TOWER_RADIUS, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawBall(context: CanvasRenderingContext2D, state: State, elapsed: number) {
  const squash = Math.max(-0.12, Math.min(0.16, state.velocityY / 3600));
  const fire = state.fireTime > 0 || state.combo >= FIREBALL_DROP_COUNT;

  context.save();
  context.translate(BALL_X, state.ballY);
  context.scale(1 + squash, 1 - squash);
  context.shadowColor = fire ? "#ffd43b" : "#ffffff";
  context.shadowBlur = fire ? 28 : 12;
  const gradient = context.createRadialGradient(-5, -7, 3, 0, 0, BALL_RADIUS + 5);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.18, fire ? "#fff275" : "#ffe0f2");
  gradient.addColorStop(0.58, fire ? "#ff7a1a" : "#ff3eb5");
  gradient.addColorStop(1, fire ? "#ef233c" : "#8a2be2");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
  context.fill();
  context.lineWidth = 3;
  context.strokeStyle = "rgba(255,255,255,0.82)";
  context.stroke();

  if (fire) {
    for (let i = 0; i < 3; i += 1) {
      context.strokeStyle = `rgba(255, ${160 + i * 25}, 40, ${0.42 - i * 0.1})`;
      context.lineWidth = 4 - i;
      context.beginPath();
      context.arc(0, 0, BALL_RADIUS + 5 + Math.sin(elapsed * 12 + i) * 3 + i * 5, 0, Math.PI * 2);
      context.stroke();
    }
  }
  context.restore();

  context.save();
  context.translate(BALL_X, state.ballY + 38);
  context.scale(1, 0.24);
  context.fillStyle = "rgba(0,0,0,0.26)";
  context.beginPath();
  context.arc(0, 0, 23, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawParticles(context: CanvasRenderingContext2D, particles: Particle[]) {
  particles.forEach((particle) => {
    context.globalAlpha = Math.max(0, Math.min(1, particle.life * 2.4));
    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    context.fill();
  });
  context.globalAlpha = 1;
}

function drawScene(context: CanvasRenderingContext2D, state: State, elapsed: number) {
  context.clearRect(0, 0, WIDTH, HEIGHT);
  const gradient = context.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#6c45ff");
  gradient.addColorStop(0.48, "#ff4fa7");
  gradient.addColorStop(1, "#ffb24a");
  context.fillStyle = gradient;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.fillStyle = "rgba(255,255,255,0.08)";
  for (let i = 0; i < 18; i += 1) {
    const x = (i * 71 + elapsed * 12) % (WIDTH + 80) - 40;
    const y = (i * 97) % HEIGHT;
    context.beginPath();
    context.arc(x, y, 3 + (i % 4), 0, Math.PI * 2);
    context.fill();
  }

  context.save();
  context.translate(CENTER_X, 0);
  const towerGradient = context.createLinearGradient(-22, 0, 22, 0);
  towerGradient.addColorStop(0, "#d7d4ff");
  towerGradient.addColorStop(0.5, "#ffffff");
  towerGradient.addColorStop(1, "#b8b2ef");
  context.fillStyle = towerGradient;
  context.shadowColor = "rgba(63,31,125,0.35)";
  context.shadowBlur = 24;
  context.beginPath();
  context.roundRect(-20, -30, 40, HEIGHT + 90, 22);
  context.fill();
  context.restore();

  [...state.layers]
    .sort((a, b) => a.y - b.y)
    .forEach((layer) => drawLayer(context, layer, state.rotation));

  drawParticles(context, state.particles);
  drawBall(context, state, elapsed);

  context.fillStyle = "#ffffff";
  context.font = "900 34px Arial, sans-serif";
  context.fillText(String(state.score), 24, 45);
  context.font = "800 12px Arial, sans-serif";
  context.fillText(`LEVEL ${state.level}`, 26, 65);
  if (state.combo > 1) {
    context.fillStyle = state.fireTime > 0 ? "#fff275" : "#ffffff";
    context.font = "900 18px Arial, sans-serif";
    context.fillText(`${state.combo}x DROP`, WIDTH - 118, 45);
  }

  if (state.phase !== "playing") {
    context.fillStyle = "rgba(31,18,64,0.48)";
    context.fillRect(0, 0, WIDTH, HEIGHT);
    context.textAlign = "center";
    context.fillStyle = "#ffffff";
    context.font = "900 38px Arial, sans-serif";
    context.fillText(state.phase === "game-over" ? "GAME OVER" : state.phase === "paused" ? "PAUSED" : "HELIX JUMP", WIDTH / 2, HEIGHT / 2 - 12);
    context.font = "800 15px Arial, sans-serif";
    context.fillText(state.phase === "idle" ? "drag left or right to rotate" : "space or start to retry", WIDTH / 2, HEIGHT / 2 + 20);
    context.textAlign = "left";
  }
}

export function HelixDropGame() {
  const initialState = createState(readStoredNumber(STORAGE_KEY));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef(initialState);
  const inputRef = useRef(0);
  const dragRef = useRef<{ x: number; pointerId: number } | null>(null);
  const [hud, setHud] = useState({
    score: 0,
    bestScore: initialState.bestScore,
    combo: 0,
    phase: initialState.phase,
    message: initialState.message,
  });

  function sync(nextState: State) {
    stateRef.current = nextState;
    setHud({
      score: nextState.score,
      bestScore: nextState.bestScore,
      combo: nextState.combo,
      phase: nextState.phase,
      message: nextState.message,
    });
    writeStoredNumber(STORAGE_KEY, nextState.bestScore);
  }

  function start() {
    sync({ ...createState(stateRef.current.bestScore), phase: "playing" });
  }

  function rotateByDrag(clientX: number) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = clientX - drag.x;
    dragRef.current = { ...drag, x: clientX };
    const current = stateRef.current.phase === "idle" ? { ...stateRef.current, phase: "playing" as Phase } : stateRef.current;
    sync({ ...current, rotation: normalizeAngle(current.rotation + dx * 0.86) });
  }

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, pointerId: event.pointerId };
    if (stateRef.current.phase === "idle" || stateRef.current.phase === "game-over") {
      start();
    }
  }

  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    rotateByDrag(event.clientX);
  }

  function onPointerEnd(event: PointerEvent<HTMLCanvasElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (key === "arrowleft" || key === "a") {
      event.preventDefault();
      inputRef.current = -1;
      if (stateRef.current.phase === "idle") sync({ ...stateRef.current, phase: "playing" });
    } else if (key === "arrowright" || key === "d") {
      event.preventDefault();
      inputRef.current = 1;
      if (stateRef.current.phase === "idle") sync({ ...stateRef.current, phase: "playing" });
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
      if (contextRef.current) drawScene(contextRef.current, stateRef.current, 0);
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

  useAnimationFrameLoop((delta, elapsed) => {
    const nextState = updateState(stateRef.current, Math.min(delta, 0.034), inputRef.current);
    if (nextState !== stateRef.current) sync(nextState);
    if (contextRef.current) drawScene(contextRef.current, stateRef.current, elapsed);
  });

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "Score", value: hud.score },
          { label: "Best", value: hud.bestScore },
          { label: "Combo", value: hud.combo > 1 ? `${hud.combo}x` : "-" },
          { label: "Status", value: hud.phase },
        ]}
        actions={
          <GameButton variant="primary" onClick={start}>
            Start
          </GameButton>
        }
      />
      <GamePlayfield className="mx-auto aspect-[3/4] w-full max-w-[min(24rem,58dvh)] touch-none border-0 bg-[#8b5cff]">
        <canvas
          ref={canvasRef}
          className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
          aria-label="Helix Jump field"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        />
      </GamePlayfield>
      <GameStatus>{hud.message} Drag the tower, fall through gaps, avoid red slices, and chain drops for fireball smash.</GameStatus>
      <TouchControls className="max-w-[18rem]">
        <div className="grid grid-cols-2 gap-2">
          <GameButton variant="touch" onPointerDown={() => (inputRef.current = -1)} onPointerUp={() => (inputRef.current = 0)} onPointerLeave={() => (inputRef.current = 0)}>
            Left
          </GameButton>
          <GameButton variant="touch" onPointerDown={() => (inputRef.current = 1)} onPointerUp={() => (inputRef.current = 0)} onPointerLeave={() => (inputRef.current = 0)}>
            Right
          </GameButton>
        </div>
      </TouchControls>
    </GamePanel>
  );
}
