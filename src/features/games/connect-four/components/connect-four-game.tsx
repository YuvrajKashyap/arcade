"use client";

import { useEffect, useState } from "react";
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
type Difficulty = "easy" | "medium" | "hard" | "impossible";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "impossible"];

function createBoard(): Cell[][] {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 0 as Cell));
}

function validMoves(board: Cell[][]) {
  return Array.from({ length: COLS }, (_, column) => column).filter((column) => board[0][column] === 0);
}

function drop(board: Cell[][], column: number, player: Cell) {
  const next = board.map((row) => [...row] as Cell[]);
  for (let row = ROWS - 1; row >= 0; row -= 1) {
    if (next[row][column] === 0) {
      next[row][column] = player;
      return next;
    }
  }
  return board;
}

function winner(board: Cell[][]) {
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const player = board[row][col];
      if (!player) continue;
      for (const [dr, dc] of dirs) {
        const cells = Array.from({ length: 4 }, (_, index) => [row + dr * index, col + dc * index]);
        if (cells.every(([r, c]) => r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player)) return player;
      }
    }
  }
  return validMoves(board).length ? 0 : 3;
}

function scoreWindow(values: Cell[]) {
  const cpu = values.filter((value) => value === 2).length;
  const user = values.filter((value) => value === 1).length;
  const empty = values.filter((value) => value === 0).length;
  if (cpu === 4) return 100000;
  if (user === 4) return -100000;
  if (cpu === 3 && empty === 1) return 120;
  if (cpu === 2 && empty === 2) return 16;
  if (user === 3 && empty === 1) return -160;
  if (user === 2 && empty === 2) return -18;
  return 0;
}

function evaluate(board: Cell[][]) {
  let score = board.reduce((sum, row) => sum + (row[3] === 2 ? 7 : row[3] === 1 ? -7 : 0), 0);
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

function minimax(board: Cell[][], depth: number, maximizing: boolean, alpha: number, beta: number): number {
  const result = winner(board);
  if (result === 2) return 100000 + depth;
  if (result === 1) return -100000 - depth;
  if (result === 3 || depth === 0) return evaluate(board);
  const moves = validMoves(board);
  if (maximizing) {
    let value = -Infinity;
    for (const move of moves) {
      value = Math.max(value, minimax(drop(board, move, 2), depth - 1, false, alpha, beta));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  }
  let value = Infinity;
  for (const move of moves) {
    value = Math.min(value, minimax(drop(board, move, 1), depth - 1, true, alpha, beta));
    beta = Math.min(beta, value);
    if (alpha >= beta) break;
  }
  return value;
}

function pickMove(board: Cell[][], difficulty: Difficulty) {
  const moves = validMoves(board);
  if (difficulty === "easy") return moves[Math.floor(Math.random() * moves.length)];
  for (const move of moves) if (winner(drop(board, move, 2)) === 2) return move;
  for (const move of moves) if (winner(drop(board, move, 1)) === 1) return move;
  if (difficulty === "medium") return moves.sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3))[0];
  const depth = difficulty === "hard" ? 4 : 6;
  return moves.map((move) => ({ move, score: minimax(drop(board, move, 2), depth, false, -Infinity, Infinity) })).sort((a, b) => b.score - a.score)[0].move;
}

export function ConnectFourGame() {
  const [board, setBoard] = useState(createBoard);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [turn, setTurn] = useState<1 | 2>(1);
  const [selectedColumn, setSelectedColumn] = useState(3);
  const [thinking, setThinking] = useState(false);
  const [wins, setWins] = useState(() => readStoredNumber(WIN_KEY));
  const [losses, setLosses] = useState(() => readStoredNumber(LOSS_KEY));
  const [draws, setDraws] = useState(() => readStoredNumber(DRAW_KEY));
  const result = winner(board);

  function restart() {
    setBoard(createBoard());
    setTurn(1);
    setThinking(false);
    setSelectedColumn(3);
  }

  function play(column: number) {
    if (turn !== 1 || thinking || result || !validMoves(board).includes(column)) return;
    const nextBoard = drop(board, column, 1);
    const nextResult = winner(nextBoard);
    if (nextResult === 1) {
      setWins((value) => {
        writeStoredNumber(WIN_KEY, value + 1);
        return value + 1;
      });
    } else if (nextResult === 3) {
      setDraws((value) => {
        writeStoredNumber(DRAW_KEY, value + 1);
        return value + 1;
      });
    }
    setBoard(nextBoard);
    setThinking(nextResult === 0);
    setTurn(2);
  }

  useEffect(() => {
    if (turn !== 2 || result) return undefined;
    const timer = window.setTimeout(() => {
      setBoard((current) => {
        const nextBoard = drop(current, pickMove(current, difficulty), 2);
        const nextResult = winner(nextBoard);
        if (nextResult === 2) {
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
        return nextBoard;
      });
      setTurn(1);
      setThinking(false);
    }, 360);
    return () => window.clearTimeout(timer);
  }, [turn, result, difficulty]);

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
        play(selectedColumn);
      } else if (key === "r") {
        event.preventDefault();
        restart();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const status = result === 1 ? "YOU WON" : result === 2 ? "CPU WON" : result === 3 ? "DRAW" : thinking ? "CPU is thinking..." : "Drop a red disc.";

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "Mode", value: difficulty },
          { label: "Wins", value: wins },
          { label: "Losses", value: losses },
          { label: "Draws", value: draws },
        ]}
        actions={<GameButton variant="primary" onClick={restart}>New Round</GameButton>}
      />
      <GamePlayfield className="mx-auto w-full max-w-[min(42rem,60dvh)] border-0 bg-gradient-to-b from-[#aee8ff] to-[#fff4aa] p-3">
        <div className="mb-3 grid grid-cols-4 gap-2">
          {DIFFICULTIES.map((level) => (
            <button key={level} type="button" onClick={() => setDifficulty(level)} className={`rounded-full px-2 py-2 text-xs font-black uppercase ${difficulty === level ? "bg-[#264de4] text-white" : "bg-white/70 text-[#264de4]"}`}>
              {level}
            </button>
          ))}
        </div>
        <div className="grid aspect-[7/6] grid-cols-7 gap-2 rounded-[1.4rem] border-4 border-[#132a9f] bg-[#2458ff] p-3 shadow-[inset_0_5px_0_rgba(255,255,255,0.3),0_10px_0_#132a9f]">
          {board.flatMap((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                type="button"
                onClick={() => play(colIndex)}
                onMouseEnter={() => setSelectedColumn(colIndex)}
                className={`rounded-full border-4 border-[#1838bc] shadow-[inset_0_7px_0_rgba(0,0,0,0.16)] transition ${selectedColumn === colIndex && !result ? "ring-4 ring-[#fff16a]" : ""} ${cell === 1 ? "bg-gradient-to-br from-[#ff6a6a] to-[#d91435]" : cell === 2 ? "bg-gradient-to-br from-[#ffe86a] to-[#f5a400]" : "bg-[#c7e8ff]"}`}
                aria-label={`Column ${colIndex + 1}`}
              />
            )),
          )}
        </div>
      </GamePlayfield>
      <GameStatus>{status}. Arrow keys choose a column, Enter or Space drops, R restarts.</GameStatus>
    </GamePanel>
  );
}
