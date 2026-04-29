"use client";

import { type TouchEvent, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  GameButton,
  GamePanel,
  GameStatus,
  TouchControls,
} from "@/features/games/shared/components/game-ui";
import { useAnimationFrameLoop } from "@/features/games/shared/hooks/use-animation-frame-loop";
import {
  readStoredNumber,
  writeStoredNumber,
} from "@/features/games/shared/utils/local-storage";

const WIDTH = 10;
const VISIBLE_HEIGHT = 20;
const HIDDEN_ROWS = 2;
const HEIGHT = VISIBLE_HEIGHT + HIDDEN_ROWS;
const LOCK_DELAY_SECONDS = 0.5;
const MAX_LOCK_RESETS = 15;
const PREVIEW_COUNT = 5;
const MIN_TOUCH_SWIPE_DISTANCE = 24;
const STORAGE_KEY = "arcade.tetris.bestScore.v2";

const TETROMINOES = ["I", "J", "L", "O", "S", "T", "Z"] as const;

type Tetromino = (typeof TETROMINOES)[number];
type Phase = "ready" | "playing" | "paused" | "game-over";
type Direction = -1 | 1;
type Cell = { type: Tetromino; ghost?: boolean } | null;
type Board = Array<Cell>;
type ActivePiece = {
  type: Tetromino;
  x: number;
  y: number;
  rotation: number;
  lastMoveWasRotation: boolean;
};

type GameState = {
  phase: Phase;
  board: Board;
  active: ActivePiece;
  hold: Tetromino | null;
  holdUsed: boolean;
  queue: Tetromino[];
  score: number;
  bestScore: number;
  lines: number;
  level: number;
  combo: number;
  backToBack: boolean;
  pendingDropScore: number;
  lastScoreGain: number;
  lastClearName: string;
  eventId: number;
  lockTimer: number;
  lockResets: number;
  dropAccumulator: number;
};

type ActionKey = "left" | "right" | "softDrop";

const COLORS: Record<Tetromino, { fill: string; edge: string; glow: string }> = {
  I: { fill: "#00e5ff", edge: "#8ff7ff", glow: "rgba(0, 229, 255, 0.55)" },
  J: { fill: "#2f6dff", edge: "#a9c1ff", glow: "rgba(47, 109, 255, 0.5)" },
  L: { fill: "#ff9f1c", edge: "#ffd18a", glow: "rgba(255, 159, 28, 0.5)" },
  O: { fill: "#ffe34d", edge: "#fff2a7", glow: "rgba(255, 227, 77, 0.48)" },
  S: { fill: "#25d366", edge: "#9bf0b7", glow: "rgba(37, 211, 102, 0.48)" },
  T: { fill: "#a855f7", edge: "#d7b4ff", glow: "rgba(168, 85, 247, 0.5)" },
  Z: { fill: "#ff3b57", edge: "#ffa1ad", glow: "rgba(255, 59, 87, 0.5)" },
};

const SHAPES: Record<Tetromino, ReadonlyArray<readonly [number, number]>> = {
  I: [[0, 1], [1, 1], [2, 1], [3, 1]],
  J: [[0, 0], [0, 1], [1, 1], [2, 1]],
  L: [[2, 0], [0, 1], [1, 1], [2, 1]],
  O: [[1, 0], [2, 0], [1, 1], [2, 1]],
  S: [[1, 0], [2, 0], [0, 1], [1, 1]],
  T: [[1, 0], [0, 1], [1, 1], [2, 1]],
  Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
};

const JLSTZ_KICKS: Record<string, ReadonlyArray<readonly [number, number]>> = {
  "0>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "1>0": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "1>2": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "2>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "2>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "3>2": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "3>0": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "0>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};

const I_KICKS: Record<string, ReadonlyArray<readonly [number, number]>> = {
  "0>1": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "1>0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "1>2": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  "2>1": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "2>3": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "3>2": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "3>0": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "0>3": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

const LINE_SCORE = [0, 100, 300, 500, 800] as const;
const T_SPIN_SCORE = { 1: 800, 2: 1200, 3: 1600 } as const;
const KEY_TO_ACTION: Partial<Record<string, ActionKey>> = {
  arrowleft: "left",
  a: "left",
  arrowright: "right",
  d: "right",
  arrowdown: "softDrop",
  s: "softDrop",
};

function createEmptyBoard(): Board {
  return Array.from({ length: WIDTH * HEIGHT }, () => null);
}

function shuffleBag(): Tetromino[] {
  const bag = [...TETROMINOES];
  for (let index = bag.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
  }
  return bag;
}

function refillQueue(queue: Tetromino[]): Tetromino[] {
  const nextQueue = [...queue];
  while (nextQueue.length < PREVIEW_COUNT + 2) {
    nextQueue.push(...shuffleBag());
  }
  return nextQueue;
}

function spawnPiece(type: Tetromino): ActivePiece {
  return {
    type,
    x: type === "O" ? 4 : 3,
    y: HIDDEN_ROWS,
    rotation: 0,
    lastMoveWasRotation: false,
  };
}

function takeNextPiece(queue: Tetromino[]) {
  const readyQueue = refillQueue(queue);
  const [type, ...rest] = readyQueue;
  return { active: spawnPiece(type), queue: refillQueue(rest) };
}

function createState(bestScore = 0): GameState {
  const next = takeNextPiece([]);
  return {
    phase: "ready",
    board: createEmptyBoard(),
    active: next.active,
    hold: null,
    holdUsed: false,
    queue: next.queue,
    score: 0,
    bestScore,
    lines: 0,
    level: 1,
    combo: -1,
    backToBack: false,
    pendingDropScore: 0,
    lastScoreGain: 0,
    lastClearName: "",
    eventId: 0,
    lockTimer: 0,
    lockResets: 0,
    dropAccumulator: 0,
  };
}

function rotatePoint(
  type: Tetromino,
  [x, y]: readonly [number, number],
  rotation: number,
): readonly [number, number] {
  if (type === "O") return [x, y];

  let px = x;
  let py = y;
  const pivot = type === "I" ? 1.5 : 1;

  for (let index = 0; index < rotation; index += 1) {
    const dx = px - pivot;
    const dy = py - pivot;
    px = Math.round(pivot + dy);
    py = Math.round(pivot - dx);
  }

  return [px, py];
}

function cellsFor(piece: ActivePiece) {
  return SHAPES[piece.type].map((cell) => {
    const [x, y] = rotatePoint(piece.type, cell, piece.rotation);
    return { x: piece.x + x, y: piece.y + y };
  });
}

function boardIndex(x: number, y: number) {
  return y * WIDTH + x;
}

function isBlocked(board: Board, piece: ActivePiece) {
  return cellsFor(piece).some(({ x, y }) => {
    return x < 0 || x >= WIDTH || y >= HEIGHT || (y >= 0 && board[boardIndex(x, y)] !== null);
  });
}

function isGrounded(board: Board, piece: ActivePiece) {
  return isBlocked(board, { ...piece, y: piece.y + 1 });
}

function findGhost(board: Board, piece: ActivePiece) {
  let ghost = piece;
  while (!isBlocked(board, { ...ghost, y: ghost.y + 1 })) {
    ghost = { ...ghost, y: ghost.y + 1 };
  }
  return ghost;
}

function mergePiece(board: Board, piece: ActivePiece): Board {
  const nextBoard = [...board];
  for (const cell of cellsFor(piece)) {
    if (cell.y >= 0) {
      nextBoard[boardIndex(cell.x, cell.y)] = { type: piece.type };
    }
  }
  return nextBoard;
}

function clearLines(board: Board) {
  const rows: Board[] = [];
  let cleared = 0;

  for (let y = 0; y < HEIGHT; y += 1) {
    const row = board.slice(y * WIDTH, y * WIDTH + WIDTH);
    if (row.every(Boolean)) {
      cleared += 1;
    } else {
      rows.push(row);
    }
  }

  while (rows.length < HEIGHT) {
    rows.unshift(Array.from({ length: WIDTH }, () => null));
  }

  return { board: rows.flat(), cleared };
}

function getGravityInterval(level: number) {
  return Math.max(0.016, Math.pow(0.8 - (level - 1) * 0.007, level - 1));
}

function isTSpin(board: Board, piece: ActivePiece) {
  if (piece.type !== "T" || !piece.lastMoveWasRotation) return false;

  const corners = [
    [piece.x, piece.y],
    [piece.x + 2, piece.y],
    [piece.x, piece.y + 2],
    [piece.x + 2, piece.y + 2],
  ] as const;

  const occupiedCorners = corners.filter(([x, y]) => {
    return x < 0 || x >= WIDTH || y >= HEIGHT || (y >= 0 && board[boardIndex(x, y)] !== null);
  }).length;

  return occupiedCorners >= 3;
}

function getPlacementScore(
  state: GameState,
  cleared: number,
  tSpin: boolean,
) {
  const difficult = cleared === 4 || (tSpin && cleared > 0);
  const base = tSpin
    ? T_SPIN_SCORE[cleared as keyof typeof T_SPIN_SCORE] ?? 400
    : LINE_SCORE[cleared] ?? 0;
  const backToBackBonus = difficult && state.backToBack ? Math.floor(base * 0.5) : 0;
  const combo = cleared > 0 ? Math.max(0, state.combo + 1) * 50 : 0;
  return (base + backToBackBonus + combo) * state.level;
}

function getClearName(cleared: number, tSpin: boolean) {
  if (tSpin && cleared === 0) return "T-Spin";
  if (tSpin) return `T-Spin ${["", "Single", "Double", "Triple"][cleared]}`;
  return ["", "Single", "Double", "Triple", "Tetris"][cleared] ?? "";
}

function spawnAfterLock(state: GameState, board: Board): GameState {
  const next = takeNextPiece(state.queue);
  const phase = isBlocked(board, next.active) ? "game-over" : "playing";
  const bestScore = Math.max(state.bestScore, state.score);

  return {
    ...state,
    phase,
    board,
    active: next.active,
    queue: next.queue,
    holdUsed: false,
    bestScore,
    pendingDropScore: 0,
    lockTimer: 0,
    lockResets: 0,
    dropAccumulator: 0,
  };
}

function lockPiece(state: GameState): GameState {
  const merged = mergePiece(state.board, state.active);
  const tSpin = isTSpin(state.board, state.active);
  const clear = clearLines(merged);
  const placementScore = getPlacementScore(state, clear.cleared, tSpin);
  const scoreGain = placementScore + state.pendingDropScore;
  const score = state.score + scoreGain;
  const lines = state.lines + clear.cleared;
  const level = Math.floor(lines / 10) + 1;
  const difficult = clear.cleared === 4 || (tSpin && clear.cleared > 0);
  const nextCombo = clear.cleared > 0 ? state.combo + 1 : -1;
  const nextBackToBack = difficult ? true : clear.cleared > 0 ? false : state.backToBack;

  return spawnAfterLock(
    {
      ...state,
      score,
      bestScore: Math.max(state.bestScore, score),
      lines,
      level,
      combo: nextCombo,
      backToBack: nextBackToBack,
      pendingDropScore: 0,
      lastScoreGain: scoreGain,
      lastClearName: getClearName(clear.cleared, tSpin) || (state.pendingDropScore > 0 ? "Drop" : ""),
      eventId: scoreGain > 0 || clear.cleared > 0 ? state.eventId + 1 : state.eventId,
    },
    clear.board,
  );
}

function resetLockIfNeeded(
  state: GameState,
  nextPiece: ActivePiece,
): Pick<GameState, "lockTimer" | "lockResets"> {
  if (!isGrounded(state.board, nextPiece) || state.lockResets >= MAX_LOCK_RESETS) {
    return { lockTimer: state.lockTimer, lockResets: state.lockResets };
  }

  return { lockTimer: 0, lockResets: state.lockResets + 1 };
}

function movePiece(
  state: GameState,
  dx: number,
  dy: number,
  options: { player?: boolean; softDrop?: boolean } = {},
): GameState {
  if (state.phase !== "playing") return state;

  const active = {
    ...state.active,
    x: state.active.x + dx,
    y: state.active.y + dy,
    lastMoveWasRotation: false,
  };

  if (!isBlocked(state.board, active)) {
    const lock = options.player ? resetLockIfNeeded(state, active) : {};
    return {
      ...state,
      active,
      score: options.softDrop && dy > 0 ? state.score + 1 : state.score,
      bestScore: options.softDrop && dy > 0 ? Math.max(state.bestScore, state.score + 1) : state.bestScore,
      ...lock,
    };
  }

  if (dy > 0 && !options.player) {
    return isGrounded(state.board, state.active) ? lockPiece(state) : state;
  }

  return state;
}

function rotatePiece(state: GameState, direction: Direction): GameState {
  if (state.phase !== "playing" || state.active.type === "O") {
    return state;
  }

  const from = state.active.rotation;
  const to = (from + direction + 4) % 4;
  const kickKey = `${from}>${to}`;
  const kicks = state.active.type === "I" ? I_KICKS[kickKey] : JLSTZ_KICKS[kickKey];

  for (const [dx, dy] of kicks) {
    const active = {
      ...state.active,
      x: state.active.x + dx,
      y: state.active.y + dy,
      rotation: to,
      lastMoveWasRotation: true,
    };

    if (!isBlocked(state.board, active)) {
      return { ...state, active, ...resetLockIfNeeded(state, active) };
    }
  }

  return state;
}

function hardDrop(state: GameState): GameState {
  if (state.phase !== "playing") return state;

  const ghost = findGhost(state.board, state.active);
  const distance = ghost.y - state.active.y;
  return lockPiece({
    ...state,
    active: ghost,
    pendingDropScore: state.pendingDropScore + distance * 2,
  });
}

function holdPiece(state: GameState): GameState {
  if (state.phase !== "playing" || state.holdUsed) return state;

  if (state.hold) {
    const active = spawnPiece(state.hold);
    if (isBlocked(state.board, active)) {
      return { ...state, phase: "game-over" };
    }
    return {
      ...state,
      active,
      hold: state.active.type,
      holdUsed: true,
      lockTimer: 0,
      lockResets: 0,
      dropAccumulator: 0,
    };
  }

  const next = takeNextPiece(state.queue);
  return {
    ...state,
    active: next.active,
    queue: next.queue,
    hold: state.active.type,
    holdUsed: true,
    lockTimer: 0,
    lockResets: 0,
    dropAccumulator: 0,
  };
}

function updateState(state: GameState, deltaSeconds: number): GameState {
  if (state.phase !== "playing") return state;

  let nextState = state;
  let dropAccumulator = state.dropAccumulator + deltaSeconds;
  const gravityInterval = getGravityInterval(state.level);

  while (dropAccumulator >= gravityInterval && nextState.phase === "playing") {
    dropAccumulator -= gravityInterval;
    const moved = movePiece(nextState, 0, 1);
    if (moved === nextState) break;
    nextState = moved;
  }

  if (nextState.phase !== "playing") {
    return nextState;
  }

  if (isGrounded(nextState.board, nextState.active)) {
    const lockTimer = nextState.lockTimer + deltaSeconds;
    if (lockTimer >= LOCK_DELAY_SECONDS) {
      return lockPiece({ ...nextState, lockTimer });
    }
    return { ...nextState, dropAccumulator, lockTimer };
  }

  return { ...nextState, dropAccumulator, lockTimer: 0 };
}

function buildDisplayBoard(state: GameState) {
  const board = state.board.map((cell) => (cell ? { ...cell } : null));
  const ghost = findGhost(state.board, state.active);

  for (const cell of cellsFor(ghost)) {
    if (cell.y >= HIDDEN_ROWS && board[boardIndex(cell.x, cell.y)] === null) {
      board[boardIndex(cell.x, cell.y)] = { type: state.active.type, ghost: true };
    }
  }

  return board.slice(HIDDEN_ROWS * WIDTH);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function MiniPiece({ type, muted = false }: { type: Tetromino | null; muted?: boolean }) {
  const cells = useMemo(() => Array.from({ length: 16 }, (_, index) => ({ x: index % 4, y: Math.floor(index / 4) })), []);
  const occupied = type
    ? new Set(SHAPES[type].map(([x, y]) => `${x}:${y}`))
    : new Set<string>();

  return (
    <div className="grid aspect-square w-16 shrink-0 grid-cols-4 gap-1 rounded-md bg-[#050712] p-1.5 shadow-inner">
      {cells.map((cell) => {
        const active = occupied.has(`${cell.x}:${cell.y}`);
        const color = type ? COLORS[type] : null;
        return (
          <div
            key={`${cell.x}:${cell.y}`}
            className="rounded-[0.16rem]"
            style={{
              background: active && color ? color.fill : "transparent",
              border: active && color ? `1px solid ${color.edge}` : "1px solid transparent",
              opacity: muted ? 0.42 : 1,
              boxShadow: active && color ? `inset 0 2px rgba(255,255,255,0.45), 0 0 8px ${color.glow}` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-md border border-white/10 bg-white/[0.055] px-3 py-2">
      <div className="font-mono text-[0.62rem] uppercase leading-none tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-1 truncate font-mono text-sm font-semibold text-slate-50">{value}</div>
    </div>
  );
}

function ActivePieceLayer({ piece }: { piece: ActivePiece }) {
  const activeCells = cellsFor(piece).filter((cell) => cell.y >= HIDDEN_ROWS);
  const color = COLORS[piece.type];

  return (
    <div className="pointer-events-none absolute inset-1.5 z-20">
      {activeCells.map((cell, index) => (
        <div
          key={`${piece.type}:${index}`}
          className="absolute rounded-[0.16rem] border transition-[left,top,transform,opacity] duration-100 ease-linear will-change-[left,top]"
          style={{
            width: "calc((100% - 27px) / 10)",
            height: "calc((100% - 57px) / 20)",
            left: `calc(${cell.x} * (((100% - 27px) / 10) + 3px))`,
            top: `calc(${cell.y - HIDDEN_ROWS} * (((100% - 57px) / 20) + 3px))`,
            background: `linear-gradient(145deg, ${color.edge}, ${color.fill} 38%, ${color.fill})`,
            borderColor: color.edge,
            boxShadow: `inset 0 3px rgba(255,255,255,0.42), inset 0 -4px rgba(0,0,0,0.22), 0 0 13px ${color.glow}`,
          }}
        >
          <span className="absolute inset-[18%] rounded-[0.12rem] border border-white/20 bg-white/10" />
        </div>
      ))}
    </div>
  );
}

export function BlockDropGame() {
  const initialState = useMemo(() => createState(readStoredNumber(STORAGE_KEY)), []);
  const stateRef = useRef<GameState>(initialState);
  const pressedRef = useRef<Record<ActionKey, boolean>>({ left: false, right: false, softDrop: false });
  const repeatRef = useRef<Record<ActionKey, number>>({ left: 0, right: 0, softDrop: 0 });
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [state, setState] = useState(initialState);
  const visibleCells = useMemo(() => Array.from({ length: WIDTH * VISIBLE_HEIGHT }, (_, index) => index), []);

  function sync(nextState: GameState) {
    stateRef.current = nextState;
    setState(nextState);
    writeStoredNumber(STORAGE_KEY, nextState.bestScore);
  }

  function start() {
    sync({ ...createState(stateRef.current.bestScore), phase: "playing" });
  }

  function togglePause() {
    const current = stateRef.current;
    if (current.phase === "playing" || current.phase === "paused") {
      sync({ ...current, phase: current.phase === "playing" ? "paused" : "playing" });
    }
  }

  function applyAction(action: ActionKey) {
    const current = stateRef.current;
    if (action === "left") sync(movePiece(current, -1, 0, { player: true }));
    if (action === "right") sync(movePiece(current, 1, 0, { player: true }));
    if (action === "softDrop") sync(movePiece(current, 0, 1, { player: true, softDrop: true }));
  }

  function setPressed(action: ActionKey, pressed: boolean) {
    pressedRef.current[action] = pressed;
    repeatRef.current[action] = pressed ? 0 : 0;
    if (pressed) applyAction(action);
  }

  function startOrRestartFromTouch() {
    const current = stateRef.current;
    if (current.phase === "ready" || current.phase === "game-over") {
      sync({ ...createState(current.bestScore), phase: "playing" });
    }
  }

  function onBoardTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    if (!touch) return;
    event.preventDefault();
    event.stopPropagation();
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function onBoardTouchMove(event: TouchEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  function onBoardTouchEnd(event: TouchEvent) {
    event.preventDefault();
    event.stopPropagation();

    const startTouch = touchStartRef.current;
    touchStartRef.current = null;
    const endTouch = event.changedTouches[0];
    if (!startTouch || !endTouch) return;

    const dx = endTouch.clientX - startTouch.x;
    const dy = endTouch.clientY - startTouch.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const current = stateRef.current;

    if (Math.max(absX, absY) < MIN_TOUCH_SWIPE_DISTANCE) {
      if (current.phase === "playing") {
        sync(rotatePiece(current, 1));
      } else {
        startOrRestartFromTouch();
      }
      return;
    }

    if (current.phase !== "playing") {
      startOrRestartFromTouch();
      return;
    }

    if (absX > absY) {
      sync(movePiece(current, dx > 0 ? 1 : -1, 0, { player: true }));
    } else if (dy > 0) {
      sync(movePiece(current, 0, 1, { player: true, softDrop: true }));
    } else {
      sync(hardDrop(current));
    }
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    const action = KEY_TO_ACTION[key];

    if (action) {
      event.preventDefault();
      if (!event.repeat) setPressed(action, true);
      return;
    }

    if (key === "arrowup" || key === "x" || key === "w") {
      event.preventDefault();
      sync(rotatePiece(stateRef.current, 1));
    } else if (key === "z" || event.code === "ControlLeft" || event.code === "ControlRight") {
      event.preventDefault();
      sync(rotatePiece(stateRef.current, -1));
    } else if (key === " ") {
      event.preventDefault();
      const current = stateRef.current;
      sync(current.phase === "ready" || current.phase === "game-over" ? { ...createState(current.bestScore), phase: "playing" } : hardDrop(current));
    } else if (key === "c" || key === "shift") {
      event.preventDefault();
      sync(holdPiece(stateRef.current));
    } else if (key === "p" || key === "escape") {
      event.preventDefault();
      togglePause();
    } else if (key === "r") {
      event.preventDefault();
      start();
    }
  });

  const onKeyUp = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    const action = KEY_TO_ACTION[key];
    if (action) {
      event.preventDefault();
      setPressed(action, false);
    }
  });

  useEffect(() => {
    const downHandler = (event: KeyboardEvent) => onKeyDown(event);
    const upHandler = (event: KeyboardEvent) => onKeyUp(event);
    window.addEventListener("keydown", downHandler);
    window.addEventListener("keyup", upHandler);
    return () => {
      window.removeEventListener("keydown", downHandler);
      window.removeEventListener("keyup", upHandler);
    };
  }, []);

  useAnimationFrameLoop((deltaSeconds) => {
    const current = stateRef.current;
    if (current.phase !== "playing") return;

    let nextState = updateState(current, deltaSeconds);
    const repeatDelay: Record<ActionKey, number> = {
      left: 0.105,
      right: 0.105,
      softDrop: 0.035,
    };

    for (const action of Object.keys(pressedRef.current) as ActionKey[]) {
      if (!pressedRef.current[action] || nextState.phase !== "playing") continue;
      repeatRef.current[action] += deltaSeconds;
      while (repeatRef.current[action] >= repeatDelay[action]) {
        repeatRef.current[action] -= repeatDelay[action];
        nextState =
          action === "left"
            ? movePiece(nextState, -1, 0, { player: true })
            : action === "right"
              ? movePiece(nextState, 1, 0, { player: true })
              : movePiece(nextState, 0, 1, { player: true, softDrop: true });
      }
    }

    if (nextState !== current) sync(nextState);
  });

  const displayBoard = buildDisplayBoard(state);
  const statusText =
    state.phase === "ready"
      ? "Press Start or Space"
      : state.phase === "paused"
        ? "Paused"
        : state.phase === "game-over"
          ? "Game Over"
          : isGrounded(state.board, state.active)
            ? "Locking"
            : "Playing";

  return (
    <GamePanel>
      <style>{`
        @keyframes tetris-score-pop {
          0% { opacity: 0; transform: translate(-50%, 0.4rem) scale(0.94); }
          18% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          72% { opacity: 1; transform: translate(-50%, -0.2rem) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -0.75rem) scale(0.98); }
        }
      `}</style>
      <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[7rem_minmax(18rem,27rem)_11rem] lg:items-start lg:justify-center">
        <aside className="order-2 grid grid-cols-2 gap-3 lg:order-none lg:grid-cols-1">
          <div className="rounded-lg border border-cyan-300/20 bg-[#07101e] p-3 shadow-[0_16px_45px_rgba(0,0,0,0.28)]">
            <div className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-cyan-200/75">Hold</div>
            <MiniPiece type={state.hold} muted={state.holdUsed} />
          </div>
          <div className="rounded-lg border border-cyan-300/20 bg-[#07101e] p-3 shadow-[0_16px_45px_rgba(0,0,0,0.28)] lg:hidden">
            <div className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-cyan-200/75">Next</div>
            <MiniPiece type={state.queue[0]} />
          </div>
        </aside>

        <main
          className="order-1 mx-auto w-full pt-14 sm:pt-0 lg:order-none"
          style={{ maxWidth: "clamp(16rem, calc((100dvh - 13rem) / 2), 23rem)" }}
        >
          <div className="mb-3 grid grid-cols-3 gap-2 rounded-lg border border-cyan-300/20 bg-[#07101e] p-2 shadow-[0_16px_45px_rgba(0,0,0,0.28)]">
            <StatPill label="Score" value={formatNumber(state.score)} />
            <StatPill label="Level" value={state.level} />
            <StatPill label="Lines" value={state.lines} />
          </div>

          <div className="rounded-lg border border-cyan-200/25 bg-[#050711] p-2 shadow-[0_28px_90px_rgba(0,0,0,0.52),0_0_48px_rgba(0,229,255,0.15)]">
            <div
              data-testid="tetris-board"
              className="relative aspect-[1/2] w-full touch-none overflow-hidden rounded-md border border-white/10 bg-[#02040b] p-1.5"
              onTouchStart={onBoardTouchStart}
              onTouchMove={onBoardTouchMove}
              onTouchEnd={onBoardTouchEnd}
              onTouchCancel={() => {
                touchStartRef.current = null;
              }}
            >
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:10%_5%]" />
              <div className="grid h-full grid-cols-10 grid-rows-20 gap-[3px]">
                {visibleCells.map((index) => {
                  const cell = displayBoard[index];
                  const color = cell ? COLORS[cell.type] : null;
                  return (
                    <div
                      key={index}
                      className="relative rounded-[0.16rem] border transition-colors duration-150"
                      style={{
                        background: color
                          ? cell?.ghost
                            ? "rgba(255,255,255,0.045)"
                            : `linear-gradient(145deg, ${color.edge}, ${color.fill} 38%, ${color.fill})`
                          : "rgba(255,255,255,0.025)",
                        borderColor: color
                          ? cell?.ghost
                            ? `${color.fill}88`
                            : color.edge
                          : "rgba(255,255,255,0.035)",
                        boxShadow:
                          color && !cell?.ghost
                            ? `inset 0 3px rgba(255,255,255,0.42), inset 0 -4px rgba(0,0,0,0.22), 0 0 13px ${color.glow}`
                            : undefined,
                      }}
                    >
                      {color && !cell?.ghost ? (
                        <span className="absolute inset-[18%] rounded-[0.12rem] border border-white/20 bg-white/10" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <ActivePieceLayer piece={state.active} />

              {state.lastScoreGain > 0 ? (
                <div
                  key={state.eventId}
                  className="pointer-events-none absolute left-1/2 top-7 z-30 rounded-full border border-cyan-200/40 bg-[#07101e]/92 px-4 py-2 text-center font-mono text-xs font-bold uppercase tracking-[0.16em] text-cyan-100 opacity-0 shadow-[0_0_24px_rgba(0,229,255,0.22)]"
                  style={{ animation: "tetris-score-pop 850ms ease-out forwards" }}
                >
                  {state.lastClearName ? `${state.lastClearName} ` : ""}
                  +{formatNumber(state.lastScoreGain)}
                </div>
              ) : null}

              {state.phase !== "playing" ? (
                <div className="absolute inset-0 grid place-items-center bg-[#02040b]/78 backdrop-blur-[2px]">
                  <div className="rounded-lg border border-cyan-200/25 bg-[#07101e]/95 px-5 py-4 text-center shadow-2xl">
                    <div className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-200">{statusText}</div>
                    <div className="mt-2 text-sm text-slate-300">
                      {state.phase === "game-over" ? "Stack reached the spawn zone." : "Guideline controls are active."}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </main>

        <aside className="order-3 flex flex-col gap-3">
          <div className="hidden rounded-lg border border-cyan-300/20 bg-[#07101e] p-3 shadow-[0_16px_45px_rgba(0,0,0,0.28)] lg:block">
            <div className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-cyan-200/75">Next</div>
            <div className="flex flex-col gap-2">
              {state.queue.slice(0, PREVIEW_COUNT).map((type, index) => (
                <MiniPiece key={`${type}:${index}`} type={type} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-lg border border-cyan-300/20 bg-[#07101e] p-3 shadow-[0_16px_45px_rgba(0,0,0,0.28)] lg:grid-cols-1">
            <StatPill label="Score" value={formatNumber(state.score)} />
            <StatPill label="Best" value={formatNumber(state.bestScore)} />
            <StatPill label="Level" value={state.level} />
            <StatPill label="Lines" value={state.lines} />
            <StatPill label="Last" value={state.lastScoreGain > 0 ? `+${formatNumber(state.lastScoreGain)}` : "-"} />
            <StatPill label="Combo" value={state.combo < 0 ? "-" : state.combo} />
            <StatPill label="B2B" value={state.backToBack ? "On" : "-"} />
          </div>

          <div className="grid gap-2 rounded-lg border border-cyan-300/20 bg-[#07101e] p-3 shadow-[0_16px_45px_rgba(0,0,0,0.28)]">
            <GameButton variant="primary" onClick={start}>{state.phase === "ready" ? "Start" : "Restart"}</GameButton>
            <GameButton onClick={togglePause} disabled={state.phase === "ready" || state.phase === "game-over"}>{state.phase === "paused" ? "Resume" : "Pause"}</GameButton>
          </div>
        </aside>
      </div>

      <GameStatus>
        Move with arrows or WASD. Up/X rotates clockwise, Z rotates counterclockwise, C holds, Space hard drops, P pauses, and R restarts.
      </GameStatus>

      <TouchControls className="max-w-[25rem]">
        <div className="grid grid-cols-5 gap-2">
          <GameButton variant="touch" onPointerDown={() => setPressed("left", true)} onPointerUp={() => setPressed("left", false)} onPointerLeave={() => setPressed("left", false)}>Left</GameButton>
          <GameButton variant="touch" onClick={() => sync(rotatePiece(stateRef.current, -1))}>CCW</GameButton>
          <GameButton variant="touch" onClick={() => sync(rotatePiece(stateRef.current, 1))}>CW</GameButton>
          <GameButton variant="touch" onPointerDown={() => setPressed("right", true)} onPointerUp={() => setPressed("right", false)} onPointerLeave={() => setPressed("right", false)}>Right</GameButton>
          <GameButton variant="touch" onClick={() => sync(holdPiece(stateRef.current))}>Hold</GameButton>
          <GameButton variant="touch" className="col-span-2" onPointerDown={() => setPressed("softDrop", true)} onPointerUp={() => setPressed("softDrop", false)} onPointerLeave={() => setPressed("softDrop", false)}>Soft</GameButton>
          <GameButton variant="touch" className="col-span-3" onClick={() => sync(hardDrop(stateRef.current))}>Hard Drop</GameButton>
        </div>
      </TouchControls>
    </GamePanel>
  );
}
