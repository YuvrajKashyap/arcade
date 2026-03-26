"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import {
  TIC_TAC_TOE_CPU_DELAY_MS,
  TIC_TAC_TOE_STORAGE_KEY,
} from "@/features/games/tic-tac-toe/config/constants";
import {
  createEmptyBoard,
  getBestCpuMove,
  getNextKeyboardCellIndex,
  getWinningLine,
  getWinner,
  isBoardFull,
} from "@/features/games/tic-tac-toe/logic/game";
import type {
  TicTacToeBoard,
  TicTacToeOutcome,
  TicTacToePhase,
  TicTacToeStats,
  TicTacToeTurn,
} from "@/features/games/tic-tac-toe/types";

function getDefaultStats(): TicTacToeStats {
  return {
    wins: 0,
    losses: 0,
    draws: 0,
  };
}

function readStoredStats() {
  if (typeof window === "undefined") {
    return getDefaultStats();
  }

  try {
    const rawValue = window.localStorage.getItem(TIC_TAC_TOE_STORAGE_KEY);

    if (!rawValue) {
      return getDefaultStats();
    }

    const parsedValue = JSON.parse(rawValue) as Partial<TicTacToeStats>;

    return {
      wins: parsedValue.wins ?? 0,
      losses: parsedValue.losses ?? 0,
      draws: parsedValue.draws ?? 0,
    };
  } catch {
    return getDefaultStats();
  }
}

function writeStoredStats(stats: TicTacToeStats) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TIC_TAC_TOE_STORAGE_KEY, JSON.stringify(stats));
}

function getStatusCopy(
  phase: TicTacToePhase,
  turn: TicTacToeTurn,
  outcome: TicTacToeOutcome,
) {
  if (phase === "finished") {
    if (outcome === "player") {
      return "You found the win. Restart for another round against the CPU.";
    }

    if (outcome === "cpu") {
      return "The CPU closed the line. Fight for the center and block the fork earlier.";
    }

    return "Draw board. Reset and pressure the diagonals on the next round.";
  }

  if (phase === "idle") {
    return "You play X and move first. Click, tap, or press Enter on a cell to open.";
  }

  if (turn === "cpu") {
    return "CPU thinking. Watch the center, corners, and any two-in-a-row threats.";
  }

  return "Your move. Arrow keys or WASD shift focus, Enter or Space places X.";
}

function getCellCopy(value: TicTacToeBoard[number]) {
  if (value === "x") {
    return "X";
  }

  if (value === "o") {
    return "O";
  }

  return "";
}

export function TicTacToeGame() {
  const [board, setBoard] = useState<TicTacToeBoard>(() => createEmptyBoard());
  const [phase, setPhase] = useState<TicTacToePhase>("idle");
  const [turn, setTurn] = useState<TicTacToeTurn>("player");
  const [outcome, setOutcome] = useState<TicTacToeOutcome>(null);
  const [activeCellIndex, setActiveCellIndex] = useState(4);
  const [winningLine, setWinningLine] = useState<readonly number[] | null>(null);
  const [stats, setStats] = useState<TicTacToeStats>(() => readStoredStats());
  const cpuMoveTimerRef = useRef<number | null>(null);
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function clearCpuMoveTimer() {
    if (cpuMoveTimerRef.current !== null) {
      window.clearTimeout(cpuMoveTimerRef.current);
      cpuMoveTimerRef.current = null;
    }
  }

  const commitStats = useCallback((nextOutcome: Exclude<TicTacToeOutcome, null>) => {
    setStats((currentStats) => {
      const nextStats = {
        wins: currentStats.wins + Number(nextOutcome === "player"),
        losses: currentStats.losses + Number(nextOutcome === "cpu"),
        draws: currentStats.draws + Number(nextOutcome === "draw"),
      };

      writeStoredStats(nextStats);
      return nextStats;
    });
  }, []);

  const completeTurn = useCallback((nextBoard: TicTacToeBoard) => {
    const winner = getWinner(nextBoard);

    if (winner) {
      const nextOutcome = winner === "x" ? "player" : "cpu";
      setBoard(nextBoard);
      setWinningLine(getWinningLine(nextBoard));
      setOutcome(nextOutcome);
      setTurn("player");
      setPhase("finished");
      commitStats(nextOutcome);
      return true;
    }

    if (isBoardFull(nextBoard)) {
      setBoard(nextBoard);
      setWinningLine(null);
      setOutcome("draw");
      setTurn("player");
      setPhase("finished");
      commitStats("draw");
      return true;
    }

    return false;
  }, [commitStats]);

  function resetBoard() {
    clearCpuMoveTimer();
    setBoard(createEmptyBoard());
    setPhase("idle");
    setTurn("player");
    setOutcome(null);
    setWinningLine(null);
    setActiveCellIndex(4);
  }

  function clearStats() {
    const nextStats = getDefaultStats();
    writeStoredStats(nextStats);
    setStats(nextStats);
  }

  function handlePlayerMove(index: number) {
    if (turn !== "player" || phase === "finished" || board[index] !== null) {
      return;
    }

    clearCpuMoveTimer();
    const nextBoard = [...board];
    nextBoard[index] = "x";
    setActiveCellIndex(index);

    if (completeTurn(nextBoard)) {
      return;
    }

    setBoard(nextBoard);
    setPhase("playing");
    setTurn("cpu");
  }

  const handleKeyboardInput = useEffectEvent((event: KeyboardEvent) => {
    const normalizedKey = event.key.toLowerCase();

    if (
      normalizedKey === "arrowup" ||
      normalizedKey === "arrowdown" ||
      normalizedKey === "arrowleft" ||
      normalizedKey === "arrowright" ||
      normalizedKey === "w" ||
      normalizedKey === "a" ||
      normalizedKey === "s" ||
      normalizedKey === "d"
    ) {
      event.preventDefault();
      setActiveCellIndex((currentIndex) =>
        getNextKeyboardCellIndex(currentIndex, normalizedKey),
      );
      return;
    }

    if (normalizedKey === "enter" || normalizedKey === " ") {
      event.preventDefault();
      handlePlayerMove(activeCellIndex);
      return;
    }

    if (normalizedKey === "r") {
      event.preventDefault();
      resetBoard();
      return;
    }

    if (normalizedKey === "c") {
      event.preventDefault();
      clearStats();
    }
  });

  useEffect(() => {
    if (turn !== "cpu" || phase === "finished") {
      return;
    }

    cpuMoveTimerRef.current = window.setTimeout(() => {
      const nextBoard = [...board];
      const cpuMove = getBestCpuMove(nextBoard);

      if (cpuMove === -1) {
        return;
      }

      nextBoard[cpuMove] = "o";
      setActiveCellIndex(cpuMove);

      if (completeTurn(nextBoard)) {
        return;
      }

      setBoard(nextBoard);
      setTurn("player");
      setPhase("playing");
    }, TIC_TAC_TOE_CPU_DELAY_MS);

    return () => {
      clearCpuMoveTimer();
    };
  }, [board, completeTurn, phase, turn]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      handleKeyboardInput(event);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    cellRefs.current[activeCellIndex]?.focus();
  }, [activeCellIndex]);

  useEffect(() => {
    return () => {
      clearCpuMoveTimer();
    };
  }, []);

  return (
    <div className="flex flex-col gap-6 text-foreground">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="rounded-[2rem] border border-line bg-[linear-gradient(180deg,rgba(12,10,24,0.96),rgba(8,8,16,0.98))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.34)] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-foreground-muted">
                Solo board
              </p>
              <p className="mt-2 text-sm leading-7 text-foreground-soft">
                Beat the CPU by building a line before it blocks every fork.
              </p>
            </div>
            <div className="rounded-full border border-line bg-surface px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-foreground-soft">
              {phase === "finished"
                ? outcome === "player"
                  ? "You win"
                  : outcome === "cpu"
                    ? "CPU wins"
                    : "Draw"
                : turn === "cpu"
                  ? "CPU turn"
                  : "Your turn"}
            </div>
          </div>

          <div className="mx-auto mt-6 grid max-w-[30rem] grid-cols-3 gap-3">
            {board.map((cell, index) => {
              const isWinningCell = winningLine?.includes(index) ?? false;

              return (
                <button
                  key={index}
                  ref={(node) => {
                    cellRefs.current[index] = node;
                  }}
                  type="button"
                  onClick={() => handlePlayerMove(index)}
                  className={`aspect-square rounded-[1.5rem] border text-5xl font-semibold transition-all duration-200 sm:text-6xl ${
                    cell === "x"
                      ? "border-violet-400/30 bg-violet-500/10 text-violet-200"
                      : cell === "o"
                        ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-100"
                        : "border-line bg-background-strong text-white/18 hover:border-line-strong hover:bg-surface"
                  } ${isWinningCell ? "ring-2 ring-violet-300/50 ring-offset-0" : ""} ${index === activeCellIndex ? "outline-none ring-1 ring-white/18" : ""}`}
                  disabled={cell !== null || turn !== "player" || phase === "finished"}
                  aria-label={
                    cell
                      ? `Cell ${index + 1}, ${getCellCopy(cell)}`
                      : `Cell ${index + 1}, empty`
                  }
                >
                  {getCellCopy(cell)}
                </button>
              );
            })}
          </div>

          <p className="mt-5 text-center text-sm leading-7 text-foreground-soft">
            {getStatusCopy(phase, turn, outcome)}
          </p>
        </section>

        <aside className="flex flex-col gap-4">
          <div className="rounded-[1.75rem] border border-line bg-surface px-5 py-5">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-foreground-muted">
              Local record
            </p>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-[1.1rem] border border-line bg-background-strong px-3 py-4">
                <dt className="text-[10px] uppercase tracking-[0.18em] text-foreground-muted">
                  Wins
                </dt>
                <dd className="mt-2 text-2xl font-semibold text-foreground">{stats.wins}</dd>
              </div>
              <div className="rounded-[1.1rem] border border-line bg-background-strong px-3 py-4">
                <dt className="text-[10px] uppercase tracking-[0.18em] text-foreground-muted">
                  Losses
                </dt>
                <dd className="mt-2 text-2xl font-semibold text-foreground">{stats.losses}</dd>
              </div>
              <div className="rounded-[1.1rem] border border-line bg-background-strong px-3 py-4">
                <dt className="text-[10px] uppercase tracking-[0.18em] text-foreground-muted">
                  Draws
                </dt>
                <dd className="mt-2 text-2xl font-semibold text-foreground">{stats.draws}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-[1.75rem] border border-line bg-surface px-5 py-5">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-foreground-muted">
              Controls
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-foreground-soft">
              <li>Click or tap any open cell to place X.</li>
              <li>Arrow keys or WASD move focus. Enter or Space commits the move.</li>
              <li>R starts a new round. C clears the local record.</li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={resetBoard}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-background hover:-translate-y-0.5 hover:bg-accent-strong"
            >
              New round
            </button>
            <button
              type="button"
              onClick={clearStats}
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-foreground hover:-translate-y-0.5 hover:bg-surface"
            >
              Clear stats
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
