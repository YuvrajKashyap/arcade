"use client";

import { type TouchEvent, useEffect, useEffectEvent, useRef, useState } from "react";
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

const TILE = 16;
const COLS = 28;
const ROWS = 31;
const WIDTH = COLS * TILE;
const HEIGHT = ROWS * TILE;
const STORAGE_KEY = "arcade.pacMaze.bestScore";

const RAW_MAP = [
  "############################",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#o####.#####.##.#####.####o#",
  "#.####.#####.##.#####.####.#",
  "#..........................#",
  "#.####.##.########.##.####.#",
  "#.####.##.########.##.####.#",
  "#......##....##....##......#",
  "######.##### ## #####.######",
  "     #.##### ## #####.#     ",
  "     #.##          ##.#     ",
  "     #.## ###--### ##.#     ",
  "######.## #      # ##.######",
  "      .   #      #   .      ",
  "######.## #      # ##.######",
  "     #.## ######## ##.#     ",
  "     #.##          ##.#     ",
  "     #.## ######## ##.#     ",
  "######.## ######## ##.######",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#.####.#####.##.#####.####.#",
  "#o..##.......  .......##..o#",
  "###.##.##.########.##.##.###",
  "###.##.##.########.##.##.###",
  "#......##....##....##......#",
  "#.##########.##.##########.#",
  "#.##########.##.##########.#",
  "#..........................#",
  "############################",
] as const;

type DirectionName = "up" | "down" | "left" | "right" | "none";
type Phase = "idle" | "playing" | "paused" | "game-over" | "won";
type Mode = "scatter" | "chase" | "frightened";
type Direction = { x: number; y: number; name: DirectionName };
type Actor = { x: number; y: number; direction: Direction; nextDirection: Direction };
type GhostName = "blinky" | "pinky" | "inky" | "clyde";
type Ghost = Actor & {
  name: GhostName;
  color: string;
  scatter: { x: number; y: number };
  home: { x: number; y: number };
  releaseAt: number;
  eaten: boolean;
};
type State = {
  phase: Phase;
  pac: Actor;
  ghosts: Ghost[];
  pellets: Set<string>;
  powers: Set<string>;
  frightenedUntil: number;
  ghostCombo: number;
  modeTimer: number;
  mode: Mode;
  score: number;
  bestScore: number;
  lives: number;
  level: number;
  deathPause: number;
};

const DIRS: Record<DirectionName, Direction> = {
  up: { x: 0, y: -1, name: "up" },
  down: { x: 0, y: 1, name: "down" },
  left: { x: -1, y: 0, name: "left" },
  right: { x: 1, y: 0, name: "right" },
  none: { x: 0, y: 0, name: "none" },
};

const KEY_TO_DIR: Record<string, Direction> = {
  arrowup: DIRS.up,
  w: DIRS.up,
  arrowdown: DIRS.down,
  s: DIRS.down,
  arrowleft: DIRS.left,
  a: DIRS.left,
  arrowright: DIRS.right,
  d: DIRS.right,
};

const FINAL_LEVEL = 3;
const LEVEL_CLEAR_BONUS = 500;
const MIN_SWIPE_DISTANCE = 24;

const GHOSTS: Ghost[] = [
  {
    name: "blinky",
    x: 13,
    y: 11,
    home: { x: 13, y: 11 },
    scatter: { x: 25, y: 0 },
    color: "#ff0000",
    direction: DIRS.left,
    nextDirection: DIRS.left,
    releaseAt: 0,
    eaten: false,
  },
  {
    name: "pinky",
    x: 14,
    y: 14,
    home: { x: 14, y: 14 },
    scatter: { x: 2, y: 0 },
    color: "#ffb8ff",
    direction: DIRS.up,
    nextDirection: DIRS.up,
    releaseAt: 2,
    eaten: false,
  },
  {
    name: "inky",
    x: 12,
    y: 14,
    home: { x: 12, y: 14 },
    scatter: { x: 27, y: 30 },
    color: "#00ffff",
    direction: DIRS.up,
    nextDirection: DIRS.up,
    releaseAt: 5,
    eaten: false,
  },
  {
    name: "clyde",
    x: 15,
    y: 14,
    home: { x: 15, y: 14 },
    scatter: { x: 0, y: 30 },
    color: "#ffb852",
    direction: DIRS.up,
    nextDirection: DIRS.up,
    releaseAt: 8,
    eaten: false,
  },
];

function cellKey(column: number, row: number) {
  return `${column}:${row}`;
}

function tileAt(column: number, row: number) {
  if (row < 0 || row >= ROWS) {
    return "#";
  }

  const wrappedColumn = (column + COLS) % COLS;
  return RAW_MAP[row]?.[wrappedColumn] ?? "#";
}

function isWall(column: number, row: number) {
  const tile = tileAt(column, row);
  return tile === "#" || tile === "-";
}

function canOccupy(column: number, row: number, actor: "pac" | "ghost") {
  const tile = tileAt(column, row);
  if (tile === "#") {
    return false;
  }
  if (tile === "-" && actor === "pac") {
    return false;
  }
  return true;
}

function isCenter(value: number) {
  return Math.abs(value - Math.round(value)) < 0.045;
}

function atTileCenter(actor: Actor) {
  return isCenter(actor.x) && isCenter(actor.y);
}

function directionAngle(direction: Direction) {
  if (direction.name === "left") return Math.PI;
  if (direction.name === "up") return -Math.PI / 2;
  if (direction.name === "down") return Math.PI / 2;
  return 0;
}

function reverse(direction: Direction) {
  if (direction.name === "up") return DIRS.down;
  if (direction.name === "down") return DIRS.up;
  if (direction.name === "left") return DIRS.right;
  if (direction.name === "right") return DIRS.left;
  return DIRS.none;
}

function validDirections(actor: Actor, type: "pac" | "ghost", allowReverse = true) {
  const column = Math.round(actor.x);
  const row = Math.round(actor.y);
  return [DIRS.up, DIRS.left, DIRS.down, DIRS.right].filter((direction) => {
    if (!allowReverse && direction.name === reverse(actor.direction).name) {
      return false;
    }
    return canOccupy(column + direction.x, row + direction.y, type);
  });
}

function createState(bestScore = 0, level = 1): State {
  const pellets = new Set<string>();
  const powers = new Set<string>();
  RAW_MAP.forEach((line, row) => {
    [...line].forEach((cell, column) => {
      if (cell === ".") pellets.add(cellKey(column, row));
      if (cell === "o") powers.add(cellKey(column, row));
    });
  });

  return {
    phase: "idle",
    pac: { x: 13, y: 23, direction: DIRS.left, nextDirection: DIRS.left },
    ghosts: GHOSTS.map((ghost) => ({ ...ghost })),
    pellets,
    powers,
    frightenedUntil: 0,
    ghostCombo: 0,
    modeTimer: 0,
    mode: "scatter",
    score: 0,
    bestScore,
    lives: 3,
    level,
    deathPause: 0,
  };
}

function resetActors(state: State): State {
  return {
    ...state,
    pac: { x: 13, y: 23, direction: DIRS.left, nextDirection: DIRS.left },
    ghosts: GHOSTS.map((ghost) => ({ ...ghost })),
    frightenedUntil: 0,
    ghostCombo: 0,
    deathPause: 0.9,
  };
}

function createNextLevelState(state: State, score: number, lives: number): State {
  const bestScore = Math.max(state.bestScore, score);
  const nextState = createState(bestScore, state.level + 1);

  return {
    ...nextState,
    phase: "playing",
    score,
    bestScore,
    lives,
    deathPause: 1.25,
  };
}

function moveActor(actor: Actor, speed: number, delta: number, type: "pac" | "ghost"): Actor {
  let direction = actor.direction;
  const centered = atTileCenter(actor);
  let x = actor.x;
  let y = actor.y;

  if (centered) {
    x = Math.round(x);
    y = Math.round(y);

    if (actor.nextDirection.name !== "none" && canOccupy(x + actor.nextDirection.x, y + actor.nextDirection.y, type)) {
      direction = actor.nextDirection;
    }

    if (direction.name !== "none" && !canOccupy(x + direction.x, y + direction.y, type)) {
      direction = DIRS.none;
    }
  }

  x += direction.x * speed * delta;
  y += direction.y * speed * delta;

  if (x < -0.5) x = COLS - 0.5;
  if (x > COLS - 0.5) x = -0.5;

  return { ...actor, x, y, direction };
}

function updateMode(state: State, delta: number): Pick<State, "mode" | "modeTimer"> {
  const modeTimer = state.modeTimer + delta;
  const cycle = modeTimer % 54;
  if (cycle < 7 || (cycle >= 27 && cycle < 34)) {
    return { mode: "scatter", modeTimer };
  }
  return { mode: "chase", modeTimer };
}

function targetForGhost(ghost: Ghost, state: State) {
  if (ghost.eaten) return ghost.home;
  if (state.mode === "scatter") return ghost.scatter;

  const pac = state.pac;
  if (ghost.name === "blinky") {
    return { x: pac.x, y: pac.y };
  }
  if (ghost.name === "pinky") {
    return { x: pac.x + pac.direction.x * 4, y: pac.y + pac.direction.y * 4 };
  }
  if (ghost.name === "inky") {
    const blinky = state.ghosts.find((candidate) => candidate.name === "blinky") ?? ghost;
    const ahead = { x: pac.x + pac.direction.x * 2, y: pac.y + pac.direction.y * 2 };
    return { x: ahead.x + (ahead.x - blinky.x), y: ahead.y + (ahead.y - blinky.y) };
  }

  const distance = Math.hypot(ghost.x - pac.x, ghost.y - pac.y);
  return distance > 8 ? { x: pac.x, y: pac.y } : ghost.scatter;
}

function chooseGhostDirection(ghost: Ghost, state: State, frightened: boolean) {
  const options = validDirections(ghost, "ghost", false);
  const fallback = validDirections(ghost, "ghost", true);
  const choices = options.length > 0 ? options : fallback;
  if (choices.length === 0) {
    return DIRS.none;
  }

  if (frightened && !ghost.eaten) {
    const seed = Math.floor(state.score + ghost.x * 17 + ghost.y * 31 + state.modeTimer * 7);
    return choices[Math.abs(seed) % choices.length] ?? choices[0]!;
  }

  const target = targetForGhost(ghost, state);
  return choices.reduce((best, direction) => {
    const bestDistance = Math.hypot(ghost.x + best.x - target.x, ghost.y + best.y - target.y);
    const distance = Math.hypot(ghost.x + direction.x - target.x, ghost.y + direction.y - target.y);
    return distance < bestDistance ? direction : best;
  }, choices[0]!);
}

function updateState(state: State, delta: number, elapsed: number): State {
  if (state.phase !== "playing") return state;
  if (state.deathPause > 0) {
    return { ...state, deathPause: Math.max(0, state.deathPause - delta) };
  }

  const mode = updateMode(state, delta);
  const frightened = elapsed < state.frightenedUntil;
  const pac = moveActor(state.pac, 7.2, delta, "pac");
  const column = Math.round(pac.x);
  const row = Math.round(pac.y);
  const pellets = new Set(state.pellets);
  const powers = new Set(state.powers);
  let score = state.score;
  let frightenedUntil = state.frightenedUntil;
  let ghostCombo = frightened ? state.ghostCombo : 0;

  if (pellets.delete(cellKey(column, row))) score += 10;
  if (powers.delete(cellKey(column, row))) {
    score += 50;
    frightenedUntil = elapsed + 7;
    ghostCombo = 0;
  }

  const nextBeforeGhosts = { ...state, ...mode, pac, pellets, powers, score, frightenedUntil, ghostCombo };
  const ghosts = state.ghosts.map((ghost) => {
    let nextDirection = ghost.nextDirection;
    let eaten = ghost.eaten;
    if (Math.hypot(ghost.x - ghost.home.x, ghost.y - ghost.home.y) < 0.3 && ghost.eaten) {
      eaten = false;
    }
    if (atTileCenter(ghost)) {
      nextDirection = chooseGhostDirection({ ...ghost, eaten }, nextBeforeGhosts, frightened);
    }
    const speed = eaten ? 8.8 : frightened ? 4.2 : 5.45 + state.level * 0.08;
    const moved = moveActor({ ...ghost, nextDirection }, speed, delta, "ghost") as Ghost;
    return { ...moved, eaten };
  });

  let lives = state.lives;
  let phase: Phase = "playing";

  if (pellets.size === 0 && powers.size === 0) {
    score += LEVEL_CLEAR_BONUS * state.level;
    const bestScore = Math.max(state.bestScore, score);

    if (state.level >= FINAL_LEVEL) {
      return {
        ...state,
        ...mode,
        phase: "won",
        pac,
        ghosts,
        pellets,
        powers,
        frightenedUntil,
        ghostCombo,
        score,
        bestScore,
        lives,
      };
    }

    return createNextLevelState({ ...state, bestScore }, score, lives);
  }

  const hitIndex = ghosts.findIndex((ghost) => !ghost.eaten && Math.hypot(ghost.x - pac.x, ghost.y - pac.y) < 0.72);

  if (hitIndex >= 0) {
    if (elapsed < frightenedUntil) {
      ghostCombo += 1;
      score += 200 * 2 ** (ghostCombo - 1);
      ghosts[hitIndex] = { ...ghosts[hitIndex]!, eaten: true, direction: reverse(ghosts[hitIndex]!.direction) };
    } else {
      lives -= 1;
      phase = lives <= 0 ? "game-over" : "playing";
      return {
        ...resetActors({ ...state, ...mode, pellets, powers, score, lives, phase }),
        bestScore: Math.max(state.bestScore, score),
      };
    }
  }

  return {
    ...state,
    ...mode,
    phase,
    pac,
    ghosts,
    pellets,
    powers,
    frightenedUntil,
    ghostCombo,
    score,
    bestScore: Math.max(state.bestScore, score),
    lives,
  };
}

function drawMaze(context: CanvasRenderingContext2D) {
  context.fillStyle = "#000000";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.lineWidth = 2.8;
  context.strokeStyle = "#2121ff";
  context.shadowColor = "#0a39ff";
  context.shadowBlur = 5;

  RAW_MAP.forEach((line, row) => {
    [...line].forEach((cell, column) => {
      if (cell !== "#") return;
      const x = column * TILE;
      const y = row * TILE;
      const up = isWall(column, row - 1);
      const down = isWall(column, row + 1);
      const left = isWall(column - 1, row);
      const right = isWall(column + 1, row);

      context.beginPath();
      if (!up) {
        context.moveTo(x + 2, y + 2);
        context.lineTo(x + TILE - 2, y + 2);
      }
      if (!down) {
        context.moveTo(x + 2, y + TILE - 2);
        context.lineTo(x + TILE - 2, y + TILE - 2);
      }
      if (!left) {
        context.moveTo(x + 2, y + 2);
        context.lineTo(x + 2, y + TILE - 2);
      }
      if (!right) {
        context.moveTo(x + TILE - 2, y + 2);
        context.lineTo(x + TILE - 2, y + TILE - 2);
      }
      context.stroke();
    });
  });

  context.shadowBlur = 0;
  context.strokeStyle = "#ffb8ff";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(13 * TILE, 12.5 * TILE);
  context.lineTo(15 * TILE, 12.5 * TILE);
  context.stroke();
}

function drawPellets(context: CanvasRenderingContext2D, state: State, elapsed: number) {
  context.fillStyle = "#f7d8a3";
  state.pellets.forEach((key) => {
    const [column, row] = key.split(":").map(Number);
    context.beginPath();
    context.arc(column * TILE + TILE / 2, row * TILE + TILE / 2, 1.8, 0, Math.PI * 2);
    context.fill();
  });

  const pulse = 4.5 + Math.sin(elapsed * 8) * 1.2;
  state.powers.forEach((key) => {
    const [column, row] = key.split(":").map(Number);
    context.beginPath();
    context.arc(column * TILE + TILE / 2, row * TILE + TILE / 2, pulse, 0, Math.PI * 2);
    context.fill();
  });
}

function drawPacman(context: CanvasRenderingContext2D, state: State, elapsed: number) {
  const pac = state.pac;
  const angle = directionAngle(pac.direction);
  const mouth = state.phase === "playing" ? Math.abs(Math.sin(elapsed * 13)) * 0.58 + 0.06 : 0.55;
  const x = pac.x * TILE + TILE / 2;
  const y = pac.y * TILE + TILE / 2;

  context.fillStyle = "#ffd500";
  context.beginPath();
  context.moveTo(x, y);
  context.arc(x, y, 7.4, angle + mouth, angle + Math.PI * 2 - mouth);
  context.closePath();
  context.fill();
}

function drawGhost(context: CanvasRenderingContext2D, ghost: Ghost, state: State, elapsed: number) {
  const frightened = elapsed < state.frightenedUntil && !ghost.eaten;
  const flashing = frightened && state.frightenedUntil - elapsed < 2 && Math.floor(elapsed * 8) % 2 === 0;
  const x = ghost.x * TILE + TILE / 2;
  const y = ghost.y * TILE + TILE / 2;

  context.fillStyle = ghost.eaten ? "rgba(255,255,255,0.08)" : frightened ? (flashing ? "#ffffff" : "#1f4fff") : ghost.color;
  context.beginPath();
  context.arc(x, y - 2, 7.5, Math.PI, 0);
  context.lineTo(x + 7.5, y + 7);
  context.lineTo(x + 4, y + 4.5);
  context.lineTo(x, y + 7);
  context.lineTo(x - 4, y + 4.5);
  context.lineTo(x - 7.5, y + 7);
  context.closePath();
  context.fill();

  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(x - 3.2, y - 2.8, 2.5, 0, Math.PI * 2);
  context.arc(x + 3.2, y - 2.8, 2.5, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = frightened ? "#ffffff" : "#1b3cff";
  context.beginPath();
  context.arc(x - 3.2 + ghost.direction.x * 1.1, y - 2.8 + ghost.direction.y * 1.1, 1.15, 0, Math.PI * 2);
  context.arc(x + 3.2 + ghost.direction.x * 1.1, y - 2.8 + ghost.direction.y * 1.1, 1.15, 0, Math.PI * 2);
  context.fill();
}

function drawTextOverlay(context: CanvasRenderingContext2D, state: State) {
  if (state.phase === "playing" && state.deathPause <= 0) {
    return;
  }

  const title =
    state.phase === "won"
      ? "YOU WON!"
      : state.phase === "game-over"
        ? "GAME OVER"
        : state.phase === "paused"
          ? "PAUSED"
          : `LEVEL ${state.level}`;
  const subtitle =
    state.phase === "won"
      ? "ALL 3 LEVELS CLEARED"
      : state.phase === "game-over"
        ? "SPACE OR R TO RESTART"
        : "ARROWS / WASD TO MOVE";

  context.fillStyle = "rgba(0,0,0,0.64)";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = state.phase === "game-over" ? "#ff3030" : state.phase === "won" ? "#ffe760" : "#ffd500";
  context.textAlign = "center";
  context.font = "900 24px 'Courier New', monospace";
  context.fillText(title, WIDTH / 2, HEIGHT / 2 - 8);
  context.font = "700 12px 'Courier New', monospace";
  context.fillStyle = "#ffffff";
  context.fillText(subtitle, WIDTH / 2, HEIGHT / 2 + 17);
  context.textAlign = "left";
}

function drawScene(context: CanvasRenderingContext2D, state: State, elapsed: number) {
  context.clearRect(0, 0, WIDTH, HEIGHT);
  drawMaze(context);
  drawPellets(context, state, elapsed);
  drawPacman(context, state, elapsed);
  state.ghosts.forEach((ghost) => drawGhost(context, ghost, state, elapsed));

  context.fillStyle = "#ffffff";
  context.font = "800 11px 'Courier New', monospace";
  context.fillText(`SCORE ${Math.floor(state.score)}`, 8, 13);
  context.fillText(`LIVES ${state.lives}`, WIDTH - 70, 13);
  context.fillText(`LEVEL ${state.level}`, WIDTH / 2 - 24, HEIGHT - 8);
  drawTextOverlay(context, state);
}

export function PacMazeGame() {
  const initialState = createState(readStoredNumber(STORAGE_KEY));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef(initialState);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const elapsedRef = useRef(0);
  const [hud, setHud] = useState({
    score: initialState.score,
    bestScore: initialState.bestScore,
    lives: initialState.lives,
    level: initialState.level,
    phase: initialState.phase,
  });
  const hudRef = useRef(hud);

  function sync(nextState: State, forceHud = false) {
    const previousHud = hudRef.current;
    stateRef.current = nextState;
    if (
      forceHud ||
      nextState.phase !== previousHud.phase ||
      nextState.lives !== previousHud.lives ||
      nextState.level !== previousHud.level ||
      Math.floor(nextState.score / 10) !== Math.floor(previousHud.score / 10) ||
      Math.floor(nextState.bestScore / 10) !== Math.floor(previousHud.bestScore / 10)
    ) {
      const nextHud = {
        score: Math.floor(nextState.score),
        bestScore: Math.floor(nextState.bestScore),
        lives: nextState.lives,
        level: nextState.level,
        phase: nextState.phase,
      };
      hudRef.current = nextHud;
      setHud(nextHud);
    }
    if (nextState.bestScore > previousHud.bestScore || nextState.phase === "game-over" || nextState.phase === "won") {
      writeStoredNumber(STORAGE_KEY, nextState.bestScore);
    }
  }

  function restart() {
    sync({ ...createState(stateRef.current.bestScore), phase: "playing" }, true);
  }

  function steer(direction: Direction) {
    const current = stateRef.current.phase === "idle" ? { ...stateRef.current, phase: "playing" as Phase } : stateRef.current;
    if (current.phase !== "playing") return;
    sync({ ...current, pac: { ...current.pac, nextDirection: direction } }, true);
  }

  function touchStartOrRestart() {
    const current = stateRef.current;
    if (current.phase === "idle") {
      sync({ ...current, phase: "playing" }, true);
    } else if (current.phase === "game-over" || current.phase === "won") {
      restart();
    }
  }

  function onTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    if (!touch) return;
    event.preventDefault();
    event.stopPropagation();
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchMove(event: TouchEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  function onTouchEnd(event: TouchEvent) {
    event.preventDefault();
    event.stopPropagation();

    const start = touchStartRef.current;
    touchStartRef.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) < MIN_SWIPE_DISTANCE) {
      touchStartOrRestart();
      return;
    }

    if (absX > absY) {
      steer(dx > 0 ? DIRS.right : DIRS.left);
    } else {
      steer(dy > 0 ? DIRS.down : DIRS.up);
    }
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
    const direction = KEY_TO_DIR[key];
    if (direction) {
      event.preventDefault();
      event.stopPropagation();
      steer(direction);
    } else if (key === "p") {
      event.preventDefault();
      event.stopPropagation();
      const current = stateRef.current;
      sync({ ...current, phase: current.phase === "playing" ? "paused" : "playing" }, true);
    } else if (key === "r" || key === " ") {
      event.preventDefault();
      event.stopPropagation();
      restart();
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const context = configureHiDPICanvas(canvas, WIDTH, HEIGHT);
      if (context) {
        contextRef.current = context;
        drawScene(context, stateRef.current, 0);
      }
    }
    const handler = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, []);

  useAnimationFrameLoop((delta, elapsed) => {
    elapsedRef.current = elapsed;
    const nextState = updateState(stateRef.current, Math.min(delta, 0.035), elapsed);
    if (nextState !== stateRef.current) sync(nextState);
    if (contextRef.current) drawScene(contextRef.current, stateRef.current, elapsed);
  });

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "Score", value: hud.score },
          { label: "Best", value: hud.bestScore },
          { label: "Lives", value: hud.lives },
          { label: "Level", value: `${hud.level}/${FINAL_LEVEL}` },
          { label: "Status", value: hud.phase },
        ]}
        actions={
          <GameButton variant="primary" onClick={restart}>
            Start
          </GameButton>
        }
      />
      <GamePlayfield className="mx-auto aspect-[28/31] w-full max-w-[min(25rem,58dvh)] touch-none border-0 bg-black">
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          aria-label="Pacman field"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={() => {
            touchStartRef.current = null;
          }}
        />
      </GamePlayfield>
      <GameStatus>Clear 3 mazes to win. Arrow keys or WASD steer. Power pellets turn ghosts blue.</GameStatus>
      <TouchControls className="max-w-[16rem]">
        <div className="grid grid-cols-3 gap-2">
          <span />
          <GameButton variant="touch" onClick={() => steer(DIRS.up)}>
            Up
          </GameButton>
          <span />
          <GameButton variant="touch" onClick={() => steer(DIRS.left)}>
            Left
          </GameButton>
          <GameButton variant="touch" onClick={() => steer(DIRS.down)}>
            Down
          </GameButton>
          <GameButton variant="touch" onClick={() => steer(DIRS.right)}>
            Right
          </GameButton>
        </div>
      </TouchControls>
    </GamePanel>
  );
}
