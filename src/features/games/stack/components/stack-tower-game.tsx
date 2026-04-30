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

const WIDTH = 640;
const HEIGHT = 860;
const BLOCK_HEIGHT = 34;
const BASE_SIZE = 245;
const MIN_SIZE = 14;
const PERFECT_TOLERANCE = 7;
const STORAGE_KEY = "arcade.stackTower.bestScore";

type Phase = "idle" | "playing" | "game-over";
type Axis = "x" | "z";

type Block = {
  x: number;
  z: number;
  y: number;
  width: number;
  depth: number;
  hue: number;
  pulse: number;
};

type FallingPiece = {
  x: number;
  z: number;
  y: number;
  width: number;
  depth: number;
  hue: number;
  vx: number;
  vz: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
};

type Particle = {
  x: number;
  z: number;
  y: number;
  vx: number;
  vz: number;
  vy: number;
  size: number;
  hue: number;
  life: number;
  maxLife: number;
};

type State = {
  phase: Phase;
  blocks: Block[];
  moving: Block;
  falling: FallingPiece[];
  particles: Particle[];
  axis: Axis;
  direction: 1 | -1;
  score: number;
  bestScore: number;
  speed: number;
  combo: number;
  cameraY: number;
  targetCameraY: number;
  shake: number;
  message: string;
};

function hueFor(index: number) {
  return (190 + index * 23) % 360;
}

function createBlock(index: number, x: number, z: number, width: number, depth: number): Block {
  return { x, z, y: index * BLOCK_HEIGHT, width, depth, hue: hueFor(index), pulse: 0 };
}

function createState(bestScore = 0): State {
  const base = createBlock(0, 0, 0, BASE_SIZE, BASE_SIZE);
  const moving = createBlock(1, -360, 0, BASE_SIZE, BASE_SIZE);
  return {
    phase: "idle",
    blocks: [base],
    moving,
    falling: [],
    particles: [],
    axis: "x",
    direction: 1,
    score: 0,
    bestScore,
    speed: 255,
    combo: 0,
    cameraY: 0,
    targetCameraY: 0,
    shake: 0,
    message: "Tap to stack.",
  };
}

function startGame(bestScore: number): State {
  return { ...createState(bestScore), phase: "playing", message: "Stack." };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function rangeFor(center: number, size: number) {
  return { min: center - size / 2, max: center + size / 2 };
}

function projected(point: { x: number; z: number; y: number }, cameraY: number) {
  return {
    x: WIDTH / 2 + (point.x - point.z) * 0.74,
    y: 590 - (point.x + point.z) * 0.24 - (point.y - cameraY) * 1.56,
  };
}

function spawnMovingBlock(previous: Block, axis: Axis, score: number, speed: number): { moving: Block; direction: 1 | -1 } {
  const direction = score % 2 === 0 ? 1 : -1;
  const travel = 385 + Math.min(110, speed * 0.12);
  const moving = createBlock(
    score + 1,
    axis === "x" ? -direction * travel : previous.x,
    axis === "z" ? -direction * travel : previous.z,
    previous.width,
    previous.depth,
  );
  moving.y = previous.y + BLOCK_HEIGHT;
  return { moving, direction };
}

function spawnPerfectParticles(block: Block): Particle[] {
  return Array.from({ length: 22 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 22;
    const edge = index % 4;
    const x = block.x + (edge < 2 ? (edge === 0 ? -block.width / 2 : block.width / 2) : (Math.random() - 0.5) * block.width);
    const z = block.z + (edge >= 2 ? (edge === 2 ? -block.depth / 2 : block.depth / 2) : (Math.random() - 0.5) * block.depth);
    return {
      x,
      z,
      y: block.y + BLOCK_HEIGHT,
      vx: Math.cos(angle) * (34 + Math.random() * 88),
      vz: Math.sin(angle) * (34 + Math.random() * 88),
      vy: 110 + Math.random() * 120,
      size: 4 + Math.random() * 6,
      hue: block.hue,
      life: 0.56,
      maxLife: 0.56,
    };
  });
}

function createFallingPiece(
  moving: Block,
  axis: Axis,
  overlapStart: number,
  overlapEnd: number,
  offset: number,
): FallingPiece | undefined {
  const movingRange = rangeFor(axis === "x" ? moving.x : moving.z, axis === "x" ? moving.width : moving.depth);
  const overhangSize = Math.abs(offset) > 0
    ? Math.abs(offset) - Math.max(0, Math.abs(offset) - ((axis === "x" ? moving.width : moving.depth) - (overlapEnd - overlapStart)))
    : 0;
  const cutSize = axis === "x" ? moving.width - (overlapEnd - overlapStart) : moving.depth - (overlapEnd - overlapStart);
  if (cutSize <= 0.5 || overhangSize <= 0.5) return undefined;
  const positiveSide = offset > 0;
  const center = positiveSide
    ? (overlapEnd + movingRange.max) / 2
    : (movingRange.min + overlapStart) / 2;
  return {
    x: axis === "x" ? center : moving.x,
    z: axis === "z" ? center : moving.z,
    y: moving.y,
    width: axis === "x" ? cutSize : moving.width,
    depth: axis === "z" ? cutSize : moving.depth,
    hue: moving.hue,
    vx: axis === "x" ? Math.sign(offset || 1) * (105 + Math.random() * 70) : (Math.random() - 0.5) * 26,
    vz: axis === "z" ? Math.sign(offset || 1) * (105 + Math.random() * 70) : (Math.random() - 0.5) * 26,
    vy: 24,
    rotation: 0,
    rotationSpeed: Math.sign(offset || 1) * (1.9 + Math.random() * 1.4),
    life: 2.1,
  };
}

function dropBlock(state: State): State {
  if (state.phase === "idle" || state.phase === "game-over") return startGame(state.bestScore);

  const previous = state.blocks[state.blocks.length - 1]!;
  const moving = { ...state.moving };
  const axisSize = state.axis === "x" ? "width" : "depth";
  const axisPosition = state.axis;
  const previousRange = rangeFor(previous[axisPosition], previous[axisSize]);
  const movingRange = rangeFor(moving[axisPosition], moving[axisSize]);
  const overlapStart = Math.max(previousRange.min, movingRange.min);
  const overlapEnd = Math.min(previousRange.max, movingRange.max);
  const overlap = overlapEnd - overlapStart;
  const offset = moving[axisPosition] - previous[axisPosition];

  if (overlap <= MIN_SIZE) {
    const fallingWhole: FallingPiece = {
      x: moving.x,
      z: moving.z,
      y: moving.y,
      width: moving.width,
      depth: moving.depth,
      hue: moving.hue,
      vx: state.axis === "x" ? Math.sign(offset || state.direction) * 180 : 0,
      vz: state.axis === "z" ? Math.sign(offset || state.direction) * 180 : 0,
      vy: 40,
      rotation: 0,
      rotationSpeed: 2.7 * state.direction,
      life: 2.2,
    };
    return {
      ...state,
      phase: "game-over",
      moving,
      falling: [...state.falling, fallingWhole],
      bestScore: Math.max(state.bestScore, state.score),
      shake: 13,
      combo: 0,
      message: "Game over.",
    };
  }

  const perfect = Math.abs(offset) <= PERFECT_TOLERANCE;
  const placed: Block = {
    ...moving,
    x: state.axis === "x" ? (perfect ? previous.x : (overlapStart + overlapEnd) / 2) : previous.x,
    z: state.axis === "z" ? (perfect ? previous.z : (overlapStart + overlapEnd) / 2) : previous.z,
    width: state.axis === "x" ? (perfect ? Math.min(BASE_SIZE, previous.width + (state.combo >= 4 ? 2 : 0)) : overlap) : previous.width,
    depth: state.axis === "z" ? (perfect ? Math.min(BASE_SIZE, previous.depth + (state.combo >= 4 ? 2 : 0)) : overlap) : previous.depth,
    pulse: perfect ? 1 : 0,
  };

  const nextScore = state.score + 1;
  const combo = perfect ? state.combo + 1 : 0;
  const nextAxis: Axis = state.axis === "x" ? "z" : "x";
  const speed = Math.min(590, state.speed + 8 + Math.floor(nextScore / 8));
  const spawned = spawnMovingBlock(placed, nextAxis, nextScore, speed);
  const fallingPiece = perfect ? undefined : createFallingPiece(moving, state.axis, overlapStart, overlapEnd, offset);
  const particles = perfect ? [...state.particles, ...spawnPerfectParticles(placed)] : state.particles;
  const blocks = [...state.blocks, placed].slice(-24);
  return {
    ...state,
    blocks,
    moving: spawned.moving,
    falling: fallingPiece ? [...state.falling, fallingPiece] : state.falling,
    particles,
    axis: nextAxis,
    direction: spawned.direction,
    score: nextScore,
    bestScore: Math.max(state.bestScore, nextScore),
    speed,
    combo,
    targetCameraY: Math.max(0, placed.y - 210),
    shake: perfect ? Math.max(state.shake, 4) : Math.max(state.shake, 7),
    message: perfect ? (combo >= 3 ? `${combo} perfects` : "Perfect") : "Nice",
  };
}

function updateState(state: State, delta: number): State {
  let next = state;
  if (state.phase === "playing") {
    const axis = state.axis;
    const size = axis === "x" ? state.moving.width : state.moving.depth;
    const limit = 390 - size / 2;
    let position = state.moving[axis] + state.direction * state.speed * delta;
    let direction = state.direction;
    if (position > limit) {
      position = limit;
      direction = -1;
    } else if (position < -limit) {
      position = -limit;
      direction = 1;
    }
    next = { ...next, moving: { ...state.moving, [axis]: position }, direction };
  }

  const falling = next.falling
    .map((piece) => ({
      ...piece,
      x: piece.x + piece.vx * delta,
      z: piece.z + piece.vz * delta,
      y: piece.y - piece.vy * delta,
      vy: piece.vy + 660 * delta,
      rotation: piece.rotation + piece.rotationSpeed * delta,
      life: piece.life - delta,
    }))
    .filter((piece) => piece.life > 0);

  const particles = next.particles
    .map((particle) => ({
      ...particle,
      x: particle.x + particle.vx * delta,
      z: particle.z + particle.vz * delta,
      y: particle.y + particle.vy * delta,
      vy: particle.vy - 260 * delta,
      life: particle.life - delta,
    }))
    .filter((particle) => particle.life > 0);

  return {
    ...next,
    falling,
    particles,
    blocks: next.blocks.map((block) => ({ ...block, pulse: Math.max(0, block.pulse - delta * 3.6) })),
    moving: { ...next.moving, pulse: Math.max(0, next.moving.pulse - delta * 3.6) },
    cameraY: lerp(next.cameraY, next.targetCameraY, 1 - Math.pow(0.002, delta)),
    shake: Math.max(0, next.shake - delta * 24),
  };
}

function blockColor(hue: number, lightness: number) {
  return `hsl(${hue} 88% ${lightness}%)`;
}

function cuboidFaces(block: Block | FallingPiece, cameraY: number) {
  const halfW = block.width / 2;
  const halfD = block.depth / 2;
  const yTop = block.y + BLOCK_HEIGHT;
  const yBottom = block.y;
  const topBackLeft = projected({ x: block.x - halfW, z: block.z - halfD, y: yTop }, cameraY);
  const topBackRight = projected({ x: block.x + halfW, z: block.z - halfD, y: yTop }, cameraY);
  const topFrontRight = projected({ x: block.x + halfW, z: block.z + halfD, y: yTop }, cameraY);
  const topFrontLeft = projected({ x: block.x - halfW, z: block.z + halfD, y: yTop }, cameraY);
  const bottomBackLeft = projected({ x: block.x - halfW, z: block.z - halfD, y: yBottom }, cameraY);
  const bottomBackRight = projected({ x: block.x + halfW, z: block.z - halfD, y: yBottom }, cameraY);
  const bottomFrontRight = projected({ x: block.x + halfW, z: block.z + halfD, y: yBottom }, cameraY);
  const bottomFrontLeft = projected({ x: block.x - halfW, z: block.z + halfD, y: yBottom }, cameraY);
  const top = [topBackLeft, topBackRight, topFrontRight, topFrontLeft];
  const bottom = [bottomBackLeft, bottomFrontLeft, bottomFrontRight, bottomBackRight];
  const back = [topBackRight, topBackLeft, bottomBackLeft, bottomBackRight];
  const left = [topBackLeft, topFrontLeft, bottomFrontLeft, bottomBackLeft];
  const front = [topFrontLeft, topFrontRight, bottomFrontRight, bottomFrontLeft];
  const right = [topBackRight, topFrontRight, bottomFrontRight, bottomBackRight];
  return { top, bottom, back, left, front, right };
}

function drawPolygon(context: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>, fill: string, stroke = "rgba(255,255,255,0.28)") {
  context.beginPath();
  context.moveTo(points[0]!.x, points[0]!.y);
  for (const point of points.slice(1)) context.lineTo(point.x, point.y);
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = stroke;
  context.lineWidth = 2;
  context.stroke();
}

function drawBlock(context: CanvasRenderingContext2D, block: Block, cameraY: number, alpha = 1) {
  context.save();
  context.globalAlpha = alpha;
  const pulse = block.pulse;
  const faces = cuboidFaces({
    ...block,
    width: block.width + pulse * 8,
    depth: block.depth + pulse * 8,
  }, cameraY);
  drawPolygon(context, faces.bottom, blockColor(block.hue + 10, 27), "rgba(0,0,0,0.16)");
  drawPolygon(context, faces.back, blockColor(block.hue + 4, 32), "rgba(0,0,0,0.1)");
  drawPolygon(context, faces.left, blockColor(block.hue + 12, 37), "rgba(255,255,255,0.18)");
  drawPolygon(context, faces.front, blockColor(block.hue, 42));
  drawPolygon(context, faces.right, blockColor(block.hue + 8, 35));
  drawPolygon(context, faces.top, blockColor(block.hue, 61 + pulse * 8), "rgba(255,255,255,0.54)");
  context.restore();
}

function drawFallingPiece(context: CanvasRenderingContext2D, piece: FallingPiece, cameraY: number) {
  context.save();
  const center = projected({ x: piece.x, z: piece.z, y: piece.y + BLOCK_HEIGHT / 2 }, cameraY);
  context.translate(center.x, center.y);
  context.rotate(piece.rotation);
  context.translate(-center.x, -center.y);
  context.globalAlpha = clamp(piece.life / 0.4, 0, 1);
  const fakeBlock: Block = { ...piece, pulse: 0 };
  drawBlock(context, fakeBlock, cameraY, context.globalAlpha);
  context.restore();
}

function drawShadow(context: CanvasRenderingContext2D, block: Block, cameraY: number) {
  const center = projected({ x: block.x, z: block.z, y: block.y - 3 }, cameraY);
  context.save();
  context.fillStyle = "rgba(0,0,0,0.2)";
  context.beginPath();
  context.ellipse(center.x, center.y + 18, Math.max(28, block.width * 0.56), Math.max(12, block.depth * 0.2), -0.17, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawParticles(context: CanvasRenderingContext2D, particles: Particle[], cameraY: number) {
  for (const particle of particles) {
    const point = projected(particle, cameraY);
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = `hsl(${particle.hue} 96% 72%)`;
    context.translate(point.x, point.y);
    context.rotate(Math.PI / 4);
    context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
    context.restore();
  }
}

function drawBackground(context: CanvasRenderingContext2D, state: State, elapsed: number) {
  const gradient = context.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#2425e8");
  gradient.addColorStop(0.42, "#8425ff");
  gradient.addColorStop(0.72, "#ff5baa");
  gradient.addColorStop(1, "#ffd94f");
  context.fillStyle = gradient;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.save();
  context.globalAlpha = 0.15;
  for (let i = 0; i < 9; i += 1) {
    context.fillStyle = i % 2 === 0 ? "#ffffff" : "#4df7ff";
    context.beginPath();
    context.moveTo(WIDTH / 2, HEIGHT * 0.8);
    context.lineTo(i * 92 - 80, 0);
    context.lineTo(i * 92 + 20, 0);
    context.closePath();
    context.fill();
  }
  context.restore();

  context.save();
  context.globalAlpha = 0.5;
  context.strokeStyle = "rgba(255,255,255,0.72)";
  context.lineWidth = 6;
  context.setLineDash([18, 20]);
  const guideY = 315 - Math.min(160, state.score * 8);
  context.beginPath();
  context.moveTo(90 + Math.sin(elapsed) * 18, guideY);
  context.lineTo(520 + Math.cos(elapsed * 0.8) * 24, guideY - 88);
  context.stroke();
  context.restore();

  context.save();
  context.fillStyle = "rgba(255,255,255,0.86)";
  for (let i = 0; i < 18; i += 1) {
    const x = (i * 71 + elapsed * 22) % (WIDTH + 120) - 60;
    const y = (i * 127) % HEIGHT;
    context.translate(x, y);
    context.rotate(Math.PI / 4);
    context.fillRect(-4, -4, 8, 8);
    context.setTransform(1, 0, 0, 1, 0, 0);
  }
  context.restore();
}

function drawScene(context: CanvasRenderingContext2D, state: State, elapsed: number) {
  context.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground(context, state, elapsed);
  context.save();
  if (state.shake > 0) context.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);

  const visibleBlocks = state.blocks.filter((block) => block.y >= state.cameraY - 90 && block.y <= state.cameraY + 540);
  for (const block of visibleBlocks) drawShadow(context, block, state.cameraY);
  for (const block of visibleBlocks) drawBlock(context, block, state.cameraY);
  if (state.phase === "playing") {
    drawShadow(context, state.moving, state.cameraY);
    drawBlock(context, state.moving, state.cameraY);
  }
  for (const piece of state.falling) drawFallingPiece(context, piece, state.cameraY);
  drawParticles(context, state.particles, state.cameraY);
  context.restore();

  context.textAlign = "center";
  context.fillStyle = "rgba(255,255,255,0.95)";
  context.font = "900 86px sans-serif";
  context.fillText(String(state.score), WIDTH / 2, 116);
  if (state.combo >= 2 && state.phase === "playing") {
    context.font = "900 22px sans-serif";
    context.fillStyle = "rgba(255,255,255,0.88)";
    context.fillText(`${state.combo} PERFECT`, WIDTH / 2, 150);
  }

  if (state.phase !== "playing") {
    context.fillStyle = "rgba(35,18,88,0.32)";
    context.fillRect(0, 0, WIDTH, HEIGHT);
    context.fillStyle = "#fff";
    context.font = "900 48px sans-serif";
    context.fillText(state.phase === "game-over" ? "GAME OVER" : "STACK", WIDTH / 2, HEIGHT / 2 - 10);
    context.font = "800 18px sans-serif";
    context.fillText(state.phase === "game-over" ? "Tap to rebuild" : "Tap when the slab lines up", WIDTH / 2, HEIGHT / 2 + 28);
  }
}

export function StackTowerGame() {
  const initialState = createState(readStoredNumber(STORAGE_KEY));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef(initialState);
  const [hud, setHud] = useState({
    score: initialState.score,
    bestScore: initialState.bestScore,
    combo: initialState.combo,
    phase: initialState.phase,
  });

  function sync(nextState: State) {
    stateRef.current = nextState;
    setHud({
      score: nextState.score,
      bestScore: nextState.bestScore,
      combo: nextState.combo,
      phase: nextState.phase,
    });
    writeStoredNumber(STORAGE_KEY, nextState.bestScore);
  }

  function drop() {
    sync(dropBlock(stateRef.current));
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (key === " " || key === "enter") {
      event.preventDefault();
      drop();
    } else if (key === "r") {
      event.preventDefault();
      sync(startGame(stateRef.current.bestScore));
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      contextRef.current = configureHiDPICanvas(canvas, WIDTH, HEIGHT);
      if (contextRef.current) drawScene(contextRef.current, stateRef.current, 0);
    }
    const handler = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useAnimationFrameLoop((delta, elapsed) => {
    const nextState = updateState(stateRef.current, delta);
    if (nextState !== stateRef.current) sync(nextState);
    if (contextRef.current) drawScene(contextRef.current, stateRef.current, elapsed);
  });

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "Score", value: hud.score },
          { label: "Best", value: hud.bestScore },
          { label: "Perfect", value: hud.combo },
          { label: "Status", value: hud.phase },
        ]}
        actions={<GameButton variant="primary" onClick={drop}>Drop</GameButton>}
      />
      <GamePlayfield className="mx-auto aspect-[3/4] w-full max-w-[min(26rem,68dvh)] touch-none border-0 bg-[#6b2cff]">
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          aria-label="Stack field"
          onPointerDown={drop}
        />
      </GamePlayfield>
      <GameStatus>Space, Enter, tap, or click drops the moving slab. Perfect drops keep the tower wide. R restarts.</GameStatus>
    </GamePanel>
  );
}
