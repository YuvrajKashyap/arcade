"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
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

const WIDTH = 10;
const HEIGHT = 20;
const STORAGE_KEY = "arcade.blockDrop.bestScore";
const pieces = [
  { color: "#00d7ff", cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  { color: "#2e65ff", cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  { color: "#ff9d24", cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
  { color: "#ffe04d", cells: [[1, 0], [2, 0], [1, 1], [2, 1]] },
  { color: "#61dd45", cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  { color: "#a154ff", cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  { color: "#ff4f59", cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
] as const;

type Phase = "idle" | "playing" | "paused" | "game-over";
type Piece = { type: number; x: number; y: number; rotation: number };
type State = {
  phase: Phase;
  board: Array<string | null>;
  piece: Piece;
  nextType: number;
  score: number;
  bestScore: number;
  lines: number;
  level: number;
  fallTimer: number;
};

function createPiece(type = Math.floor(Math.random() * pieces.length)): Piece {
  return { type, x: 3, y: -1, rotation: 0 };
}

function createState(bestScore = 0): State {
  const firstType = Math.floor(Math.random() * pieces.length);
  return {
    phase: "idle",
    board: Array.from({ length: WIDTH * HEIGHT }, () => null),
    piece: createPiece(firstType),
    nextType: Math.floor(Math.random() * pieces.length),
    score: 0,
    bestScore,
    lines: 0,
    level: 1,
    fallTimer: 0,
  };
}

function rotateCell([x, y]: readonly number[], rotation: number) {
  let cx = x - 1.5;
  let cy = y - 1.5;
  for (let index = 0; index < rotation; index += 1) {
    [cx, cy] = [cy, -cx];
  }
  return [Math.round(cx + 1.5), Math.round(cy + 1.5)];
}

function cellsFor(piece: Piece) {
  return pieces[piece.type].cells.map((cell) => {
    const [x, y] = rotateCell(cell, piece.rotation % 4);
    return { x: piece.x + x, y: piece.y + y };
  });
}

function blocked(board: Array<string | null>, piece: Piece) {
  return cellsFor(piece).some(({ x, y }) => x < 0 || x >= WIDTH || y >= HEIGHT || (y >= 0 && board[y * WIDTH + x]));
}

function mergePiece(board: Array<string | null>, piece: Piece) {
  const nextBoard = [...board];
  for (const cell of cellsFor(piece)) {
    if (cell.y >= 0) nextBoard[cell.y * WIDTH + cell.x] = pieces[piece.type].color;
  }
  return nextBoard;
}

function clearLines(board: Array<string | null>) {
  const rows: Array<Array<string | null>> = [];
  let cleared = 0;
  for (let y = 0; y < HEIGHT; y += 1) {
    const row = board.slice(y * WIDTH, y * WIDTH + WIDTH);
    if (row.every(Boolean)) cleared += 1;
    else rows.push(row);
  }
  while (rows.length < HEIGHT) rows.unshift(Array.from({ length: WIDTH }, () => null));
  return { board: rows.flat(), cleared };
}

function lockPiece(state: State): State {
  const merged = mergePiece(state.board, state.piece);
  const clear = clearLines(merged);
  const nextPiece = createPiece(state.nextType);
  const nextType = Math.floor(Math.random() * pieces.length);
  const scoreGain = [0, 100, 300, 500, 800][clear.cleared] ?? 0;
  const lines = state.lines + clear.cleared;
  const level = Math.floor(lines / 8) + 1;
  const phase = blocked(clear.board, nextPiece) ? "game-over" : "playing";
  const score = state.score + scoreGain * level;
  return { ...state, phase, board: clear.board, piece: nextPiece, nextType, score, bestScore: Math.max(state.bestScore, score), lines, level };
}

function movePiece(state: State, dx: number, dy: number, rotation = 0): State {
  if (state.phase !== "playing") return state;
  const piece = { ...state.piece, x: state.piece.x + dx, y: state.piece.y + dy, rotation: (state.piece.rotation + rotation + 4) % 4 };
  if (!blocked(state.board, piece)) return { ...state, piece };
  if (dy > 0) return lockPiece(state);
  return state;
}

function hardDrop(state: State): State {
  let next = state;
  while (next.phase === "playing") {
    const moved = movePiece(next, 0, 1);
    if (moved === next || moved.piece.y <= next.piece.y) return lockPiece(next);
    next = moved;
  }
  return next;
}

function updateState(state: State, delta: number): State {
  if (state.phase !== "playing") return state;
  const fallTimer = state.fallTimer + delta;
  const interval = Math.max(0.12, 0.72 - state.level * 0.055);
  if (fallTimer < interval) return { ...state, fallTimer };
  return { ...movePiece(state, 0, 1), fallTimer: 0 };
}

function getCell(board: Array<string | null>, x: number, y: number, piece: Piece) {
  const pieceCell = cellsFor(piece).find((cell) => cell.x === x && cell.y === y);
  return pieceCell ? pieces[piece.type].color : board[y * WIDTH + x];
}

export function BlockDropGame() {
  const initialState = createState(readStoredNumber(STORAGE_KEY));
  const stateRef = useRef(initialState);
  const [state, setState] = useState(initialState);
  const cells = useMemo(() => Array.from({ length: WIDTH * HEIGHT }, (_, index) => ({ x: index % WIDTH, y: Math.floor(index / WIDTH) })), []);

  function sync(nextState: State) {
    stateRef.current = nextState;
    setState(nextState);
    writeStoredNumber(STORAGE_KEY, nextState.bestScore);
  }

  function start() {
    sync({ ...createState(stateRef.current.bestScore), phase: "playing" });
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (["arrowleft", "a"].includes(key)) {
      event.preventDefault();
      sync(movePiece(stateRef.current, -1, 0));
    } else if (["arrowright", "d"].includes(key)) {
      event.preventDefault();
      sync(movePiece(stateRef.current, 1, 0));
    } else if (["arrowdown", "s"].includes(key)) {
      event.preventDefault();
      sync(movePiece(stateRef.current, 0, 1));
    } else if (["arrowup", "w", "x"].includes(key)) {
      event.preventDefault();
      sync(movePiece(stateRef.current, 0, 0, 1));
    } else if (key === " ") {
      event.preventDefault();
      sync(stateRef.current.phase === "idle" || stateRef.current.phase === "game-over" ? { ...createState(stateRef.current.bestScore), phase: "playing" } : hardDrop(stateRef.current));
    } else if (key === "p") {
      event.preventDefault();
      const current = stateRef.current;
      sync({ ...current, phase: current.phase === "playing" ? "paused" : "playing" });
    } else if (key === "r") {
      event.preventDefault();
      start();
    }
  });

  useEffect(() => {
    const handler = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useAnimationFrameLoop((delta) => {
    const nextState = updateState(stateRef.current, delta);
    if (nextState !== stateRef.current) sync(nextState);
  });

  return (
    <GamePanel>
      <GameHud
        items={[{ label: "Score", value: state.score }, { label: "Best", value: state.bestScore }, { label: "Lines", value: state.lines }, { label: "Level", value: state.level }]}
        actions={<GameButton variant="primary" onClick={start}>Start</GameButton>}
      />
      <GamePlayfield className="mx-auto flex aspect-[5/8] w-full max-w-[min(24rem,54dvh)] items-center justify-center border-0 bg-[#09091c] p-3">
        <div className="grid h-full aspect-[1/2] grid-cols-10 gap-1 rounded-xl border-4 border-[#2e35ff] bg-black p-2 shadow-[0_0_32px_rgba(46,53,255,0.45)]">
          {cells.map((cell) => {
            const color = getCell(state.board, cell.x, cell.y, state.piece);
            return (
              <div
                key={`${cell.x}:${cell.y}`}
                className="rounded-[0.22rem] border border-white/10"
                style={{ backgroundColor: color ?? "rgba(255,255,255,0.06)", boxShadow: color ? `inset 0 3px rgba(255,255,255,0.35), 0 0 12px ${color}` : undefined }}
              />
            );
          })}
        </div>
      </GamePlayfield>
      <GameStatus>Arrow keys move, Up rotates, Space hard drops, P pauses, and R restarts.</GameStatus>
      <TouchControls className="max-w-[22rem]">
        <div className="grid grid-cols-4 gap-2">
          <GameButton variant="touch" onClick={() => sync(movePiece(stateRef.current, -1, 0))}>Left</GameButton>
          <GameButton variant="touch" onClick={() => sync(movePiece(stateRef.current, 0, 0, 1))}>Turn</GameButton>
          <GameButton variant="touch" onClick={() => sync(movePiece(stateRef.current, 1, 0))}>Right</GameButton>
          <GameButton variant="touch" onClick={() => sync(hardDrop(stateRef.current))}>Drop</GameButton>
        </div>
      </TouchControls>
    </GamePanel>
  );
}
