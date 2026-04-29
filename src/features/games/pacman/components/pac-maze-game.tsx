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

const TILE = 20;
const COLS = 19;
const ROWS = 21;
const WIDTH = COLS * TILE;
const HEIGHT = ROWS * TILE;
const STORAGE_KEY = "arcade.pacMaze.bestScore";
const MAP = [
  "###################",
  "#o.......#.......o#",
  "#.###.###.#.###.###",
  "#.................#",
  "#.###.#.#####.#.###",
  "#.....#...#...#...#",
  "#####.### # ###.###",
  "    #.#       #.#  ",
  "#####.# ## ## #.###",
  "     .  #   #  .   ",
  "#####.# ##### #.###",
  "    #.#       #.#  ",
  "#####.# ##### #.###",
  "#........#........#",
  "#.###.##.#.##.###.#",
  "#o..#.........#..o#",
  "###.#.#.#####.#.#.#",
  "#.....#...#...#...#",
  "#.#######.#.#######",
  "#.................#",
  "###################",
];

type Direction = { x: number; y: number };
type Phase = "idle" | "playing" | "paused" | "game-over" | "won";
type Actor = { x: number; y: number; direction: Direction; nextDirection: Direction };
type Ghost = Actor & { color: string; homeX: number; homeY: number };
type State = {
  phase: Phase;
  pac: Actor;
  ghosts: Ghost[];
  pellets: Set<string>;
  powers: Set<string>;
  frightenedUntil: number;
  score: number;
  bestScore: number;
  lives: number;
};

const directions: Record<string, Direction> = {
  arrowup: { x: 0, y: -1 },
  w: { x: 0, y: -1 },
  arrowdown: { x: 0, y: 1 },
  s: { x: 0, y: 1 },
  arrowleft: { x: -1, y: 0 },
  a: { x: -1, y: 0 },
  arrowright: { x: 1, y: 0 },
  d: { x: 1, y: 0 },
};

function cellKey(column: number, row: number) {
  return `${column}:${row}`;
}

function isWall(column: number, row: number) {
  const wrappedColumn = (column + COLS) % COLS;
  return MAP[row]?.[wrappedColumn] === "#";
}

function createState(bestScore = 0): State {
  const pellets = new Set<string>();
  const powers = new Set<string>();
  MAP.forEach((line, row) => {
    [...line].forEach((cell, column) => {
      if (cell === ".") pellets.add(cellKey(column, row));
      if (cell === "o") powers.add(cellKey(column, row));
    });
  });
  return {
    phase: "idle",
    pac: { x: 9.5, y: 15.5, direction: { x: 0, y: 0 }, nextDirection: { x: 0, y: 0 } },
    ghosts: [
      { x: 8.5, y: 9.5, homeX: 8.5, homeY: 9.5, color: "#ff4040", direction: { x: 1, y: 0 }, nextDirection: { x: 1, y: 0 } },
      { x: 9.5, y: 9.5, homeX: 9.5, homeY: 9.5, color: "#ff9bd5", direction: { x: -1, y: 0 }, nextDirection: { x: -1, y: 0 } },
      { x: 10.5, y: 9.5, homeX: 10.5, homeY: 9.5, color: "#38d9ff", direction: { x: 1, y: 0 }, nextDirection: { x: 1, y: 0 } },
      { x: 9.5, y: 11.5, homeX: 9.5, homeY: 11.5, color: "#ffad33", direction: { x: -1, y: 0 }, nextDirection: { x: -1, y: 0 } },
    ],
    pellets,
    powers,
    frightenedUntil: 0,
    score: 0,
    bestScore,
    lives: 3,
  };
}

function canMove(x: number, y: number, direction: Direction) {
  const nx = Math.floor(x + direction.x * 0.64);
  const ny = Math.floor(y + direction.y * 0.64);
  return ny >= 0 && ny < ROWS && !isWall(nx, ny);
}

function moveActor(actor: Actor, speed: number, delta: number): Actor {
  let direction = actor.direction;
  if (canMove(actor.x, actor.y, actor.nextDirection)) direction = actor.nextDirection;
  if (!canMove(actor.x, actor.y, direction)) direction = { x: 0, y: 0 };
  let x = actor.x + direction.x * speed * delta;
  const y = actor.y + direction.y * speed * delta;
  if (x < -0.6) x = COLS - 0.4;
  if (x > COLS - 0.4) x = -0.6;
  return { ...actor, x, y, direction };
}

function chooseGhostDirection(ghost: Ghost, pac: Actor, frightened: boolean) {
  const options = Object.values(directions).filter((direction) => canMove(ghost.x, ghost.y, direction));
  let best = options[0] ?? { x: 0, y: 0 };
  let bestScore = frightened ? -Infinity : Infinity;
  for (const option of options) {
    const tx = ghost.x + option.x;
    const ty = ghost.y + option.y;
    const distance = Math.abs(tx - pac.x) + Math.abs(ty - pac.y);
    if ((!frightened && distance < bestScore) || (frightened && distance > bestScore)) {
      best = option;
      bestScore = distance;
    }
  }
  return best;
}

function updateState(state: State, delta: number, elapsed: number): State {
  if (state.phase !== "playing") return state;
  const frightened = elapsed < state.frightenedUntil;
  let pac = moveActor(state.pac, 6.2, delta);
  const column = Math.floor(pac.x);
  const row = Math.floor(pac.y);
  const pellets = new Set(state.pellets);
  const powers = new Set(state.powers);
  let score = state.score;
  let frightenedUntil = state.frightenedUntil;
  if (pellets.delete(cellKey(column, row))) score += 10;
  if (powers.delete(cellKey(column, row))) {
    score += 50;
    frightenedUntil = elapsed + 6;
  }
  const ghosts = state.ghosts.map((ghost, index) => {
    const nearCenter = Math.abs(ghost.x - Math.round(ghost.x) - 0.5) < 0.06 && Math.abs(ghost.y - Math.round(ghost.y) - 0.5) < 0.06;
    const nextDirection = nearCenter ? chooseGhostDirection(ghost, pac, frightened || index === 3) : ghost.nextDirection;
    return moveActor({ ...ghost, nextDirection }, frightened ? 3.3 : 4.2, delta) as Ghost;
  });
  let lives = state.lives;
  let phase: Phase = pellets.size === 0 && powers.size === 0 ? "won" : "playing";
  const hitIndex = ghosts.findIndex((ghost) => Math.hypot(ghost.x - pac.x, ghost.y - pac.y) < 0.72);
  if (hitIndex >= 0) {
    if (elapsed < frightenedUntil) {
      score += 200;
      ghosts[hitIndex] = { ...ghosts[hitIndex]!, x: ghosts[hitIndex]!.homeX, y: ghosts[hitIndex]!.homeY };
    } else {
      lives -= 1;
      pac = { ...pac, x: 9.5, y: 15.5, direction: { x: 0, y: 0 } };
      phase = lives <= 0 ? "game-over" : "playing";
    }
  }
  return { ...state, phase, pac, ghosts, pellets, powers, frightenedUntil, score, bestScore: Math.max(state.bestScore, score), lives };
}

function drawGhost(context: CanvasRenderingContext2D, ghost: Ghost, frightened: boolean) {
  const x = ghost.x * TILE;
  const y = ghost.y * TILE;
  context.fillStyle = frightened ? "#244dff" : ghost.color;
  context.beginPath();
  context.arc(x, y - 3, 10, Math.PI, 0);
  context.lineTo(x + 10, y + 10);
  context.lineTo(x + 5, y + 6);
  context.lineTo(x, y + 10);
  context.lineTo(x - 5, y + 6);
  context.lineTo(x - 10, y + 10);
  context.closePath();
  context.fill();
  context.fillStyle = "#fff";
  context.beginPath();
  context.arc(x - 4, y - 4, 3, 0, Math.PI * 2);
  context.arc(x + 5, y - 4, 3, 0, Math.PI * 2);
  context.fill();
}

function drawScene(context: CanvasRenderingContext2D, state: State, elapsed: number) {
  context.fillStyle = "#020212";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.strokeStyle = "#1d4fff";
  context.lineWidth = 3;
  MAP.forEach((line, row) => {
    [...line].forEach((cell, column) => {
      if (cell === "#") context.strokeRect(column * TILE + 2, row * TILE + 2, TILE - 4, TILE - 4);
    });
  });
  context.fillStyle = "#ffe7a2";
  state.pellets.forEach((key) => {
    const [column, row] = key.split(":").map(Number);
    context.beginPath();
    context.arc((column + 0.5) * TILE, (row + 0.5) * TILE, 2.5, 0, Math.PI * 2);
    context.fill();
  });
  state.powers.forEach((key) => {
    const [column, row] = key.split(":").map(Number);
    context.beginPath();
    context.arc((column + 0.5) * TILE, (row + 0.5) * TILE, 6, 0, Math.PI * 2);
    context.fill();
  });
  const mouth = state.phase === "playing" ? Math.abs(Math.sin(elapsed * 12)) * 0.55 + 0.1 : 0.55;
  const angle = Math.atan2(state.pac.direction.y, state.pac.direction.x || 0.0001);
  context.fillStyle = "#ffd82e";
  context.beginPath();
  context.moveTo(state.pac.x * TILE, state.pac.y * TILE);
  context.arc(state.pac.x * TILE, state.pac.y * TILE, 9, angle + mouth, angle + Math.PI * 2 - mouth);
  context.closePath();
  context.fill();
  state.ghosts.forEach((ghost) => drawGhost(context, ghost, elapsed < state.frightenedUntil));
  context.fillStyle = "#fff";
  context.font = "800 14px monospace";
  context.fillText(`score ${state.score}`, 8, 16);
  context.fillText(`lives ${state.lives}`, WIDTH - 72, 16);
  if (state.phase !== "playing") {
    context.fillStyle = "rgba(0,0,0,0.62)";
    context.fillRect(0, 0, WIDTH, HEIGHT);
    context.fillStyle = "#ffd82e";
    context.textAlign = "center";
    context.font = "900 28px sans-serif";
    context.fillText(state.phase === "won" ? "MAZE CLEARED" : state.phase === "game-over" ? "GAME OVER" : state.phase === "paused" ? "PAUSED" : "PACMAN", WIDTH / 2, HEIGHT / 2);
    context.font = "700 14px sans-serif";
    context.fillText("arrows or wasd to chase pellets", WIDTH / 2, HEIGHT / 2 + 30);
    context.textAlign = "left";
  }
}

export function PacMazeGame() {
  const initialState = createState(readStoredNumber(STORAGE_KEY));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef(initialState);
  const elapsedRef = useRef(0);
  const [hud, setHud] = useState({ score: initialState.score, bestScore: initialState.bestScore, lives: initialState.lives, phase: initialState.phase });

  function sync(nextState: State) {
    stateRef.current = nextState;
    setHud({ score: nextState.score, bestScore: nextState.bestScore, lives: nextState.lives, phase: nextState.phase });
    writeStoredNumber(STORAGE_KEY, nextState.bestScore);
  }

  function restart() {
    sync({ ...createState(stateRef.current.bestScore), phase: "playing" });
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    const direction = directions[key];
    if (direction) {
      event.preventDefault();
      const current = stateRef.current.phase === "idle" ? { ...stateRef.current, phase: "playing" as Phase } : stateRef.current;
      sync({ ...current, pac: { ...current.pac, nextDirection: direction } });
    } else if (key === "p") {
      event.preventDefault();
      const current = stateRef.current;
      sync({ ...current, phase: current.phase === "playing" ? "paused" : "playing" });
    } else if (key === "r" || key === " ") {
      event.preventDefault();
      restart();
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      contextRef.current = configureHiDPICanvas(canvas, WIDTH, HEIGHT);
      drawScene(contextRef.current!, stateRef.current, 0);
    }
    const handler = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useAnimationFrameLoop((delta, elapsed) => {
    elapsedRef.current = elapsed;
    const nextState = updateState(stateRef.current, delta, elapsed);
    if (nextState !== stateRef.current) sync(nextState);
    if (contextRef.current) drawScene(contextRef.current, stateRef.current, elapsed);
  });

  const touch = (direction: Direction) => {
    const current = stateRef.current.phase === "idle" ? { ...stateRef.current, phase: "playing" as Phase } : stateRef.current;
    sync({ ...current, pac: { ...current.pac, nextDirection: direction } });
  };

  return (
    <GamePanel>
      <GameHud
        items={[{ label: "Score", value: hud.score }, { label: "Best", value: hud.bestScore }, { label: "Lives", value: hud.lives }, { label: "Status", value: hud.phase }]}
        actions={<GameButton variant="primary" onClick={restart}>Start</GameButton>}
      />
      <GamePlayfield className="mx-auto aspect-[19/21] w-full max-w-[min(26rem,54dvh)] touch-none border-0 bg-black">
        <canvas ref={canvasRef} className="h-full w-full" aria-label="Pacman field" />
      </GamePlayfield>
      <GameStatus>Arrow keys or WASD steer. Power pellets turn chasers blue. R restarts.</GameStatus>
      <TouchControls className="max-w-[16rem]">
        <div className="grid grid-cols-3 gap-2">
          <span />
          <GameButton variant="touch" onClick={() => touch({ x: 0, y: -1 })}>Up</GameButton>
          <span />
          <GameButton variant="touch" onClick={() => touch({ x: -1, y: 0 })}>Left</GameButton>
          <GameButton variant="touch" onClick={() => touch({ x: 0, y: 1 })}>Down</GameButton>
          <GameButton variant="touch" onClick={() => touch({ x: 1, y: 0 })}>Right</GameButton>
        </div>
      </TouchControls>
    </GamePanel>
  );
}
