"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  GameButton,
  GameHud,
  GamePanel,
  GamePlayfield,
  GameStatus,
} from "@/features/games/shared/components/game-ui";
import { readStoredNumber, writeStoredNumber } from "@/features/games/shared/utils/local-storage";

const ROWS = 6;
const COLS = 7;
const WIN_KEY = "arcade.connectFour.wins";
const LOSS_KEY = "arcade.connectFour.losses";
const DRAW_KEY = "arcade.connectFour.draws";

type Cell = 0 | 1 | 2;
type Player = 1 | 2;
type Difficulty = "casual" | "sharp" | "master";
type Phase = "playing" | "thinking" | "won" | "lost" | "draw";
type WinResult = { winner: Cell | 3; cells: Array<[number, number]> };
type FallingDisc = { id: number; row: number; col: number; player: Player };

const DIFFICULTIES: Array<{ id: Difficulty; label: string; depth: number }> = [
  { id: "casual", label: "Casual", depth: 2 },
  { id: "sharp", label: "Sharp", depth: 4 },
  { id: "master", label: "Master", depth: 6 },
];

function createBoard(): Cell[][] {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 0 as Cell));
}

function validMoves(board: Cell[][]) {
  return Array.from({ length: COLS }, (_, column) => column).filter((column) => board[0][column] === 0);
}

function findDropRow(board: Cell[][], column: number) {
  for (let row = ROWS - 1; row >= 0; row -= 1) {
    if (board[row][column] === 0) return row;
  }
  return -1;
}

function drop(board: Cell[][], column: number, player: Player) {
  const row = findDropRow(board, column);
  if (row < 0) return { board, row: -1 };
  const next = board.map((line) => [...line] as Cell[]);
  next[row][column] = player;
  return { board: next, row };
}

function winner(board: Cell[][]): WinResult {
  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const player = board[row][col];
      if (!player) continue;
      for (const [dr, dc] of dirs) {
        const cells = Array.from({ length: 4 }, (_, index) => [row + dr * index, col + dc * index] as [number, number]);
        if (cells.every(([r, c]) => r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player)) {
          return { winner: player, cells };
        }
      }
    }
  }
  return validMoves(board).length ? { winner: 0, cells: [] } : { winner: 3, cells: [] };
}

function scoreWindow(values: Cell[]) {
  const cpu = values.filter((value) => value === 2).length;
  const user = values.filter((value) => value === 1).length;
  const empty = values.filter((value) => value === 0).length;
  if (cpu === 4) return 100000;
  if (user === 4) return -100000;
  if (cpu === 3 && empty === 1) return 220;
  if (cpu === 2 && empty === 2) return 34;
  if (cpu === 1 && empty === 3) return 4;
  if (user === 3 && empty === 1) return -260;
  if (user === 2 && empty === 2) return -42;
  if (user === 1 && empty === 3) return -5;
  return 0;
}

function evaluate(board: Cell[][]) {
  let score = 0;
  const center = board.map((row) => row[3]).filter((cell) => cell === 2).length;
  const opponentCenter = board.map((row) => row[3]).filter((cell) => cell === 1).length;
  score += center * 24 - opponentCenter * 24;

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (col <= COLS - 4) score += scoreWindow([0, 1, 2, 3].map((i) => board[row][col + i]));
      if (row <= ROWS - 4) score += scoreWindow([0, 1, 2, 3].map((i) => board[row + i][col]));
      if (row <= ROWS - 4 && col <= COLS - 4) score += scoreWindow([0, 1, 2, 3].map((i) => board[row + i][col + i]));
      if (row <= ROWS - 4 && col >= 3) score += scoreWindow([0, 1, 2, 3].map((i) => board[row + i][col - i]));
    }
  }
  return score;
}

function orderedMoves(board: Cell[][]) {
  const preference = [3, 2, 4, 1, 5, 0, 6];
  const moves = validMoves(board);
  return preference.filter((move) => moves.includes(move));
}

function minimax(board: Cell[][], depth: number, maximizing: boolean, alpha: number, beta: number): number {
  const result = winner(board).winner;
  if (result === 2) return 1000000 + depth;
  if (result === 1) return -1000000 - depth;
  if (result === 3 || depth === 0) return evaluate(board);

  if (maximizing) {
    let value = -Infinity;
    for (const move of orderedMoves(board)) {
      value = Math.max(value, minimax(drop(board, move, 2).board, depth - 1, false, alpha, beta));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  }

  let value = Infinity;
  for (const move of orderedMoves(board)) {
    value = Math.min(value, minimax(drop(board, move, 1).board, depth - 1, true, alpha, beta));
    beta = Math.min(beta, value);
    if (alpha >= beta) break;
  }
  return value;
}

function pickMove(board: Cell[][], difficulty: Difficulty) {
  const moves = orderedMoves(board);
  if (!moves.length) return -1;
  if (difficulty === "casual" && Math.random() < 0.22) return moves[Math.floor(Math.random() * moves.length)] ?? moves[0];
  for (const move of moves) if (winner(drop(board, move, 2).board).winner === 2) return move;
  for (const move of moves) if (winner(drop(board, move, 1).board).winner === 1) return move;
  const depth = DIFFICULTIES.find((level) => level.id === difficulty)?.depth ?? 4;
  return moves
    .map((move) => ({ move, score: minimax(drop(board, move, 2).board, depth, false, -Infinity, Infinity) }))
    .sort((a, b) => b.score - a.score)[0]!.move;
}

function isWinningCell(cells: Array<[number, number]>, row: number, col: number) {
  return cells.some(([r, c]) => r === row && c === col);
}

function discClass(cell: Cell) {
  if (cell === 1) return "connect-disc-red";
  if (cell === 2) return "connect-disc-yellow";
  return "connect-disc-empty";
}

function phaseFromWinner(value: Cell | 3): Phase {
  if (value === 1) return "won";
  if (value === 2) return "lost";
  if (value === 3) return "draw";
  return "playing";
}

export function ConnectFourGame() {
  const [board, setBoard] = useState(createBoard);
  const [difficulty, setDifficulty] = useState<Difficulty>("sharp");
  const [selectedColumn, setSelectedColumn] = useState(3);
  const [phase, setPhase] = useState<Phase>("playing");
  const [fallingDisc, setFallingDisc] = useState<FallingDisc | null>(null);
  const [wins, setWins] = useState(() => readStoredNumber(WIN_KEY));
  const [losses, setLosses] = useState(() => readStoredNumber(LOSS_KEY));
  const [draws, setDraws] = useState(() => readStoredNumber(DRAW_KEY));
  const moveIdRef = useRef(0);
  const result = useMemo(() => winner(board), [board]);
  const openMoves = useMemo(() => validMoves(board), [board]);
  const canPlay = phase === "playing" && result.winner === 0 && !fallingDisc;

  function persistResult(nextResult: Cell | 3) {
    if (nextResult === 1) {
      setWins((value) => {
        writeStoredNumber(WIN_KEY, value + 1);
        return value + 1;
      });
    } else if (nextResult === 2) {
      setLosses((value) => {
        writeStoredNumber(LOSS_KEY, value + 1);
        return value + 1;
      });
    } else if (nextResult === 3) {
      setDraws((value) => {
        writeStoredNumber(DRAW_KEY, value + 1);
        return value + 1;
      });
    }
  }

  function animateMove(row: number, col: number, player: Player) {
    moveIdRef.current += 1;
    setFallingDisc({ id: moveIdRef.current, row, col, player });
    window.setTimeout(() => setFallingDisc((disc) => (disc?.id === moveIdRef.current ? null : disc)), 460);
  }

  function restart() {
    setBoard(createBoard());
    setPhase("playing");
    setSelectedColumn(3);
    setFallingDisc(null);
  }

  function applyPlayerMove(column: number) {
    if (!canPlay || !openMoves.includes(column)) return;
    const { board: nextBoard, row } = drop(board, column, 1);
    if (row < 0) return;
    animateMove(row, column, 1);
    const nextResult = winner(nextBoard);
    setBoard(nextBoard);
    setSelectedColumn(column);
    if (nextResult.winner) {
      persistResult(nextResult.winner);
      setPhase(phaseFromWinner(nextResult.winner));
    } else {
      setPhase("thinking");
    }
  }

  useEffect(() => {
    if (phase !== "thinking" || result.winner) return undefined;
    const timer = window.setTimeout(() => {
      setBoard((current) => {
        const move = pickMove(current, difficulty);
        if (move < 0) return current;
        const { board: nextBoard, row } = drop(current, move, 2);
        animateMove(row, move, 2);
        const nextResult = winner(nextBoard);
        if (nextResult.winner) {
          persistResult(nextResult.winner);
          setPhase(phaseFromWinner(nextResult.winner));
        } else {
          setPhase("playing");
        }
        setSelectedColumn(move);
        return nextBoard;
      });
    }, 520);
    return () => window.clearTimeout(timer);
  }, [phase, result.winner, difficulty]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "arrowleft" || key === "a") {
        event.preventDefault();
        setSelectedColumn((value) => Math.max(0, value - 1));
      } else if (key === "arrowright" || key === "d") {
        event.preventDefault();
        setSelectedColumn((value) => Math.min(COLS - 1, value + 1));
      } else if (key === "enter" || key === " ") {
        event.preventDefault();
        applyPlayerMove(selectedColumn);
      } else if (key === "r") {
        event.preventDefault();
        restart();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const status =
    phase === "won"
      ? "You connected four"
      : phase === "lost"
        ? "CPU connected four"
        : phase === "draw"
          ? "Board filled"
          : phase === "thinking"
            ? "CPU lining up a move"
            : "Drop a red disc";

  const previewRow = canPlay ? findDropRow(board, selectedColumn) : -1;
  const winCells = result.cells;

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "Mode", value: difficulty },
          { label: "Wins", value: wins },
          { label: "Losses", value: losses },
          { label: "Draws", value: draws },
          { label: "Turn", value: phase === "thinking" ? "CPU" : phase === "playing" ? "You" : "Over" },
        ]}
        actions={<GameButton variant="primary" onClick={restart}>New Round</GameButton>}
      />
      <GamePlayfield className="mx-auto w-full max-w-[min(48rem,70dvh)] border-0 bg-[#071a78] p-0 shadow-[0_28px_90px_rgba(0,35,190,0.32)]">
        <div className="connect-four-shell">
          <div className="connect-four-rays" />
          <div className="connect-four-top">
            <div>
              <p className="connect-four-kicker">Premium arcade</p>
              <h2>Connect Four</h2>
            </div>
            <div className="connect-four-status" data-phase={phase}>{status}</div>
          </div>

          <div className="connect-four-controls" aria-label="Difficulty">
            {DIFFICULTIES.map((level) => (
              <button
                key={level.id}
                type="button"
                onClick={() => setDifficulty(level.id)}
                className={difficulty === level.id ? "active" : ""}
              >
                {level.label}
              </button>
            ))}
          </div>

          <div className="connect-four-stage">
            <div className="connect-four-tray connect-four-tray-red" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="connect-four-board-wrap">
              <div className="connect-four-column-guides">
                {Array.from({ length: COLS }, (_, col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => applyPlayerMove(col)}
                    onMouseEnter={() => setSelectedColumn(col)}
                    onFocus={() => setSelectedColumn(col)}
                    disabled={!canPlay || !openMoves.includes(col)}
                    className={selectedColumn === col ? "selected" : ""}
                    aria-label={`Drop in column ${col + 1}`}
                  >
                    <span />
                  </button>
                ))}
              </div>

              <div className="connect-four-board" style={{ "--selected-column": selectedColumn } as React.CSSProperties}>
                <div className="connect-four-board-shine" />
                {fallingDisc ? (
                  <div
                    key={fallingDisc.id}
                    className={`connect-four-falling ${fallingDisc.player === 1 ? "connect-disc-red" : "connect-disc-yellow"}`}
                    style={{
                      "--fall-col": fallingDisc.col,
                      "--fall-row": fallingDisc.row,
                    } as React.CSSProperties}
                  />
                ) : null}
                {board.flatMap((row, rowIndex) =>
                  row.map((cell, colIndex) => {
                    const isWin = isWinningCell(winCells, rowIndex, colIndex);
                    const isPreview = previewRow === rowIndex && selectedColumn === colIndex;
                    return (
                      <button
                        key={`${rowIndex}-${colIndex}`}
                        type="button"
                        onClick={() => applyPlayerMove(colIndex)}
                        onMouseEnter={() => setSelectedColumn(colIndex)}
                        onFocus={() => setSelectedColumn(colIndex)}
                        disabled={!canPlay || !openMoves.includes(colIndex)}
                        className={`connect-four-slot ${selectedColumn === colIndex && canPlay ? "column-hot" : ""} ${isWin ? "winning" : ""}`}
                        aria-label={`Column ${colIndex + 1}, row ${rowIndex + 1}`}
                      >
                        <span className={`connect-four-disc ${discClass(cell)} ${isPreview ? "preview" : ""}`} />
                      </button>
                    );
                  }),
                )}
              </div>
              <div className="connect-four-foot" />
            </div>
            <div className="connect-four-tray connect-four-tray-yellow" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </GamePlayfield>
      <GameStatus>{status}. Click or tap a column to drop. Arrow keys choose a column, Enter or Space drops, R restarts.</GameStatus>
      <style>{`
        .connect-four-shell {
          position: relative;
          box-sizing: border-box;
          overflow: hidden;
          min-height: 100%;
          padding: clamp(1rem, 2.6vw, 1.4rem);
          color: white;
          background:
            radial-gradient(circle at 50% 38%, rgba(56, 218, 255, 0.54), transparent 34%),
            linear-gradient(145deg, #0736d6 0%, #087be8 42%, #0a2aa6 100%);
        }

        .connect-four-shell *,
        .connect-four-shell *::before,
        .connect-four-shell *::after {
          box-sizing: border-box;
        }

        .connect-four-rays {
          position: absolute;
          inset: -20%;
          opacity: 0.24;
          background: repeating-conic-gradient(from -10deg at 50% 42%, rgba(255,255,255,0.95) 0deg 8deg, transparent 8deg 18deg);
          pointer-events: none;
        }

        .connect-four-top {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 0.8rem;
        }

        .connect-four-kicker {
          margin: 0 0 0.1rem;
          color: #aeeaff;
          font-size: 0.68rem;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .connect-four-top h2 {
          margin: 0;
          color: #fff;
          font-size: clamp(1.75rem, 4.5vw, 3.25rem);
          font-weight: 1000;
          letter-spacing: 0;
          line-height: 0.9;
          text-shadow: 0 5px 0 #071154, 0 14px 28px rgba(0,0,0,0.42);
        }

        .connect-four-status {
          max-width: 13rem;
          border: 2px solid rgba(255,255,255,0.34);
          border-radius: 0.85rem;
          padding: 0.65rem 0.85rem;
          background: rgba(3, 22, 98, 0.52);
          color: #fff6a8;
          font-size: 0.78rem;
          font-weight: 950;
          text-align: right;
          text-transform: uppercase;
          box-shadow: inset 0 2px 0 rgba(255,255,255,0.18);
        }

        .connect-four-status[data-phase="won"] {
          color: #ffefe8;
          background: rgba(255, 42, 67, 0.62);
        }

        .connect-four-status[data-phase="lost"] {
          color: #fff5a4;
          background: rgba(255, 177, 20, 0.58);
        }

        .connect-four-controls {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.45rem;
          margin-bottom: 0.85rem;
        }

        .connect-four-controls button {
          border: 1px solid rgba(255,255,255,0.35);
          border-radius: 999px;
          padding: 0.55rem 0.35rem;
          background: rgba(255,255,255,0.22);
          color: #e7f7ff;
          font-size: 0.72rem;
          font-weight: 950;
          text-transform: uppercase;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.18);
        }

        .connect-four-controls button.active {
          background: linear-gradient(180deg, #fff477, #ffbd1f);
          color: #08206d;
          box-shadow: 0 5px 0 #ba6300, 0 12px 20px rgba(0,0,0,0.22);
        }

        .connect-four-stage {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 5.25rem minmax(0, 1fr) 5.25rem;
          align-items: end;
          gap: 0.75rem;
        }

        .connect-four-board-wrap {
          min-width: 0;
          perspective: 900px;
        }

        .connect-four-column-guides {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: clamp(0.28rem, 1vw, 0.55rem);
          padding: 0 5.4% 0.45rem;
        }

        .connect-four-column-guides button {
          display: grid;
          place-items: center;
          min-height: 1.55rem;
          border: 0;
          border-radius: 999px;
          background: rgba(255,255,255,0.14);
          cursor: pointer;
        }

        .connect-four-column-guides button span {
          width: 58%;
          aspect-ratio: 1;
          border-radius: 999px;
          background: rgba(255, 58, 69, 0.9);
          box-shadow: inset 0 3px 0 rgba(255,255,255,0.35), 0 0 18px rgba(255,55,70,0.55);
          opacity: 0;
          transform: translateY(0) scale(0.82);
          transition: transform 140ms ease, opacity 140ms ease;
        }

        .connect-four-column-guides button.selected span {
          opacity: 1;
          transform: translateY(-0.18rem) scale(1.1);
        }

        .connect-four-column-guides button:disabled {
          opacity: 0.28;
          cursor: not-allowed;
        }

        .connect-four-board {
          position: relative;
          display: grid;
          width: 100%;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          grid-template-rows: repeat(6, minmax(0, 1fr));
          gap: clamp(0.34rem, 1.2vw, 0.62rem);
          aspect-ratio: 7 / 6;
          border: clamp(0.45rem, 1.5vw, 0.8rem) solid #051766;
          border-radius: clamp(1rem, 2.4vw, 1.6rem);
          padding: clamp(0.45rem, 1.4vw, 0.82rem);
          background:
            linear-gradient(120deg, rgba(255,255,255,0.28), transparent 22% 76%, rgba(0,0,0,0.18)),
            linear-gradient(180deg, #246dff 0%, #0d39cf 54%, #061a83 100%);
          box-shadow:
            inset 0 0.55rem 0 rgba(255,255,255,0.25),
            inset 0 -0.8rem 0 rgba(0,0,0,0.24),
            0 0.8rem 0 #031158,
            0 2rem 2.4rem rgba(0, 12, 86, 0.42);
          transform: rotateX(3deg);
        }

        .connect-four-board::before {
          content: "";
          position: absolute;
          top: 0.65rem;
          bottom: 0.65rem;
          left: calc(0.8rem + (100% - 1.6rem) / 7 * var(--selected-column));
          width: calc((100% - 1.6rem) / 7);
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(255,255,255,0.2), transparent);
          opacity: 0.72;
          pointer-events: none;
        }

        .connect-four-board-shine {
          position: absolute;
          inset: 0.45rem;
          border-radius: 1rem;
          background: linear-gradient(115deg, rgba(255,255,255,0.28), transparent 28% 100%);
          pointer-events: none;
          mix-blend-mode: screen;
        }

        .connect-four-slot {
          position: relative;
          z-index: 1;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 999px;
          background: radial-gradient(circle at 50% 45%, #02145e 0 47%, #113bd2 49% 66%, #08208b 67% 100%);
          box-shadow:
            inset 0 0.35rem 0.45rem rgba(0,0,0,0.54),
            inset 0 -0.18rem 0.2rem rgba(255,255,255,0.12),
            0 0.12rem 0 rgba(255,255,255,0.18);
          cursor: pointer;
        }

        .connect-four-slot:disabled {
          cursor: default;
        }

        .connect-four-disc {
          width: 83%;
          aspect-ratio: 1;
          border-radius: 999px;
          transform: scale(0.98);
          transition: transform 180ms ease, opacity 180ms ease, box-shadow 180ms ease;
        }

        .connect-disc-empty {
          opacity: 0.16;
          background: radial-gradient(circle at 38% 28%, #7df0ff, #1590e7 62%, #064cad 100%);
        }

        .connect-disc-red {
          background:
            radial-gradient(circle at 35% 24%, #ffb0a4 0 13%, transparent 14%),
            radial-gradient(circle at 50% 48%, #ff473f 0 46%, #e10d2d 47% 69%, #950319 70% 100%);
          box-shadow: inset 0 0.22rem 0 rgba(255,255,255,0.38), inset 0 -0.45rem 0 rgba(84,0,10,0.32), 0 0.2rem 0.34rem rgba(0,0,0,0.28);
          opacity: 1;
        }

        .connect-disc-yellow {
          background:
            radial-gradient(circle at 35% 24%, #fff9a7 0 13%, transparent 14%),
            radial-gradient(circle at 50% 48%, #fff044 0 46%, #ffc315 47% 69%, #c87800 70% 100%);
          box-shadow: inset 0 0.22rem 0 rgba(255,255,255,0.48), inset 0 -0.45rem 0 rgba(144,76,0,0.32), 0 0.2rem 0.34rem rgba(0,0,0,0.28);
          opacity: 1;
        }

        .connect-four-disc.preview {
          opacity: 0.46;
          background:
            radial-gradient(circle at 35% 24%, #ffb0a4 0 13%, transparent 14%),
            radial-gradient(circle at 50% 48%, #ff473f 0 46%, #e10d2d 47% 69%, #950319 70% 100%);
          transform: scale(0.86);
        }

        .connect-four-slot.winning .connect-four-disc {
          animation: connectFourWin 720ms ease-in-out infinite alternate;
          box-shadow: inset 0 0.22rem 0 rgba(255,255,255,0.48), 0 0 0 0.25rem rgba(255,255,255,0.8), 0 0 1.5rem 0.5rem rgba(255,234,62,0.88);
        }

        .connect-four-falling {
          position: absolute;
          z-index: 4;
          width: calc((100% - (6 * clamp(0.34rem, 1.2vw, 0.62rem)) - (2 * clamp(0.45rem, 1.4vw, 0.82rem))) / 7 * 0.83);
          aspect-ratio: 1;
          border-radius: 999px;
          left: calc(clamp(0.45rem, 1.4vw, 0.82rem) + var(--fall-col) * ((100% - (2 * clamp(0.45rem, 1.4vw, 0.82rem)) - (6 * clamp(0.34rem, 1.2vw, 0.62rem))) / 7 + clamp(0.34rem, 1.2vw, 0.62rem)) + ((100% - (2 * clamp(0.45rem, 1.4vw, 0.82rem)) - (6 * clamp(0.34rem, 1.2vw, 0.62rem))) / 7 * 0.085));
          top: calc(clamp(0.45rem, 1.4vw, 0.82rem) + var(--fall-row) * ((100% - (2 * clamp(0.45rem, 1.4vw, 0.82rem)) - (5 * clamp(0.34rem, 1.2vw, 0.62rem))) / 6 + clamp(0.34rem, 1.2vw, 0.62rem)) + ((100% - (2 * clamp(0.45rem, 1.4vw, 0.82rem)) - (5 * clamp(0.34rem, 1.2vw, 0.62rem))) / 6 * 0.085));
          animation: connectFourDrop 440ms cubic-bezier(0.18, 0.82, 0.22, 1.02) both;
          pointer-events: none;
        }

        .connect-four-foot {
          height: clamp(1.1rem, 2.3vw, 1.65rem);
          margin: 0 4%;
          border-radius: 0 0 1rem 1rem;
          background: linear-gradient(180deg, #0828b0, #03125d);
          box-shadow: inset 0 0.24rem 0 rgba(255,255,255,0.18), 0 0.7rem 0 #020a35;
        }

        .connect-four-tray {
          display: grid;
          gap: 0.18rem;
          justify-items: center;
          padding-bottom: 1.5rem;
        }

        .connect-four-tray span {
          width: clamp(2.8rem, 7vw, 4.2rem);
          aspect-ratio: 1 / 0.28;
          border-radius: 999px;
          box-shadow: inset 0 0.18rem 0 rgba(255,255,255,0.35), inset 0 -0.22rem 0 rgba(0,0,0,0.2), 0 0.28rem 0.35rem rgba(0,0,0,0.28);
        }

        .connect-four-tray-red span {
          background: linear-gradient(180deg, #ff574f, #d30a2a);
        }

        .connect-four-tray-yellow span {
          background: linear-gradient(180deg, #fff05b, #ffbf14);
        }

        @keyframes connectFourDrop {
          0% { transform: translateY(calc(-1 * (var(--fall-row) + 1) * 130%)) scale(1.02); }
          72% { transform: translateY(6%) scale(1.02, 0.96); }
          100% { transform: translateY(0) scale(1); }
        }

        @keyframes connectFourWin {
          from { transform: scale(0.98); }
          to { transform: scale(1.1); }
        }

        @media (max-width: 760px) {
          .connect-four-shell {
            padding: 0.8rem;
          }

          .connect-four-top {
            align-items: stretch;
            margin-bottom: 0.55rem;
          }

          .connect-four-top h2 {
            font-size: 1.55rem;
          }

          .connect-four-kicker {
            font-size: 0.55rem;
          }

          .connect-four-status {
            max-width: 9rem;
            padding: 0.5rem 0.55rem;
            font-size: 0.62rem;
          }

          .connect-four-controls {
            gap: 0.32rem;
            margin-bottom: 0.55rem;
          }

          .connect-four-controls button {
            padding: 0.46rem 0.2rem;
            font-size: 0.62rem;
          }

          .connect-four-stage {
            grid-template-columns: 1fr;
          }

          .connect-four-tray {
            display: none;
          }

          .connect-four-column-guides {
            padding-bottom: 0.3rem;
          }

          .connect-four-column-guides button {
            min-height: 1.15rem;
          }
        }
      `}</style>
    </GamePanel>
  );
}
