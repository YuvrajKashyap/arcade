"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import {
  TIC_TAC_TOE_CPU_DELAY_MS,
  TIC_TAC_TOE_DEFAULT_DIFFICULTY,
  TIC_TAC_TOE_DIFFICULTIES,
  TIC_TAC_TOE_STORAGE_KEY,
} from "@/features/games/tic-tac-toe/config/constants";
import {
  createEmptyBoard,
  getCpuMove,
  getNextKeyboardCellIndex,
  getWinningLine,
  getWinner,
  isBoardFull,
} from "@/features/games/tic-tac-toe/logic/game";
import type {
  TicTacToeBoard,
  TicTacToeDifficulty,
  TicTacToeOutcome,
  TicTacToePhase,
  TicTacToeStats,
  TicTacToeStatsByDifficulty,
  TicTacToeTurn,
} from "@/features/games/tic-tac-toe/types";
import {
  GameButton,
  GameHud,
  GamePanel,
  GamePlayfield,
  GameStatus,
} from "@/features/games/shared/components/game-ui";

function getDefaultStats(): TicTacToeStats {
  return {
    wins: 0,
    losses: 0,
    draws: 0,
  };
}

function getDefaultStatsByDifficulty(): TicTacToeStatsByDifficulty {
  return {
    easy: getDefaultStats(),
    medium: getDefaultStats(),
    hard: getDefaultStats(),
    impossible: getDefaultStats(),
  };
}

function normalizeStats(
  value: Partial<TicTacToeStats> | undefined,
): TicTacToeStats {
  return {
    wins: value?.wins ?? 0,
    losses: value?.losses ?? 0,
    draws: value?.draws ?? 0,
  };
}

function getDifficultyLabel(difficulty: TicTacToeDifficulty) {
  if (difficulty === "easy") {
    return "Easy";
  }

  if (difficulty === "medium") {
    return "Medium";
  }

  if (difficulty === "hard") {
    return "Hard";
  }

  return "Impossible";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getDifficultyDescription(difficulty: TicTacToeDifficulty) {
  if (difficulty === "easy") {
    return "Mostly loose play with occasional obvious finishes.";
  }

  if (difficulty === "medium") {
    return "Blocks basic threats, values the center, but misses deeper traps.";
  }

  if (difficulty === "hard") {
    return "Usually finds the best line, but still leaves a few openings.";
  }

  return "Full minimax. If a draw is possible, it will never hand you the win.";
}

function readStoredStats() {
  if (typeof window === "undefined") {
    return getDefaultStatsByDifficulty();
  }

  try {
    const rawValue = window.localStorage.getItem(TIC_TAC_TOE_STORAGE_KEY);

    if (!rawValue) {
      return getDefaultStatsByDifficulty();
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!isRecord(parsedValue)) {
      return getDefaultStatsByDifficulty();
    }

    if (
      "wins" in parsedValue ||
      "losses" in parsedValue ||
      "draws" in parsedValue
    ) {
      const migratedStats = getDefaultStatsByDifficulty();
      migratedStats.impossible = normalizeStats(parsedValue);
      return migratedStats;
    }

    return {
      easy: normalizeStats(
        isRecord(parsedValue.easy) ? parsedValue.easy : undefined,
      ),
      medium: normalizeStats(
        isRecord(parsedValue.medium) ? parsedValue.medium : undefined,
      ),
      hard: normalizeStats(
        isRecord(parsedValue.hard) ? parsedValue.hard : undefined,
      ),
      impossible: normalizeStats(
        isRecord(parsedValue.impossible) ? parsedValue.impossible : undefined,
      ),
    };
  } catch {
    return getDefaultStatsByDifficulty();
  }
}

function writeStoredStats(stats: TicTacToeStatsByDifficulty) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TIC_TAC_TOE_STORAGE_KEY, JSON.stringify(stats));
}

function getStatusCopy(
  phase: TicTacToePhase,
  turn: TicTacToeTurn,
  outcome: TicTacToeOutcome,
  difficulty: TicTacToeDifficulty,
) {
  const difficultyLabel = getDifficultyLabel(difficulty);

  if (phase === "finished") {
    if (outcome === "player") {
      return `${difficultyLabel} cleared. Restart for another round and tighten the next opening.`;
    }

    if (outcome === "cpu") {
      return `${difficultyLabel} CPU closed the board. Pressure the center sooner and cut off the fork.`;
    }

    return `${difficultyLabel} ended in a draw. Reset and try a sharper corner sequence.`;
  }

  if (phase === "idle") {
    return `${difficultyLabel} selected. You play X and move first.`;
  }

  if (turn === "cpu") {
    return `${difficultyLabel} CPU thinking. Watch the center, corners, and any two-in-a-row threats.`;
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
  const [difficulty, setDifficulty] = useState<TicTacToeDifficulty>(
    TIC_TAC_TOE_DEFAULT_DIFFICULTY,
  );
  const [phase, setPhase] = useState<TicTacToePhase>("idle");
  const [turn, setTurn] = useState<TicTacToeTurn>("player");
  const [outcome, setOutcome] = useState<TicTacToeOutcome>(null);
  const [activeCellIndex, setActiveCellIndex] = useState(4);
  const [winningLine, setWinningLine] = useState<readonly number[] | null>(null);
  const [stats, setStats] = useState<TicTacToeStatsByDifficulty>(() =>
    readStoredStats(),
  );
  const cpuMoveTimerRef = useRef<number | null>(null);
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeStats = stats[difficulty];

  function clearCpuMoveTimer() {
    if (cpuMoveTimerRef.current !== null) {
      window.clearTimeout(cpuMoveTimerRef.current);
      cpuMoveTimerRef.current = null;
    }
  }

  const commitStats = useCallback((nextOutcome: Exclude<TicTacToeOutcome, null>) => {
    setStats((currentStats) => {
      const nextStats = {
        ...currentStats,
        [difficulty]: {
          wins: currentStats[difficulty].wins + Number(nextOutcome === "player"),
          losses: currentStats[difficulty].losses + Number(nextOutcome === "cpu"),
          draws: currentStats[difficulty].draws + Number(nextOutcome === "draw"),
        },
      };

      writeStoredStats(nextStats);
      return nextStats;
    });
  }, [difficulty]);

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
    setStats((currentStats) => {
      const nextStats = {
        ...currentStats,
        [difficulty]: getDefaultStats(),
      };

      writeStoredStats(nextStats);
      return nextStats;
    });
  }

  function handleDifficultyChange(nextDifficulty: TicTacToeDifficulty) {
    if (nextDifficulty === difficulty) {
      return;
    }

    clearCpuMoveTimer();
    setDifficulty(nextDifficulty);
    setBoard(createEmptyBoard());
    setPhase("idle");
    setTurn("player");
    setOutcome(null);
    setWinningLine(null);
    setActiveCellIndex(4);
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
      const cpuMove = getCpuMove(nextBoard, difficulty);

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
  }, [board, completeTurn, difficulty, phase, turn]);

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
    <GamePanel>
      <GameHud
        items={[
          { label: "Difficulty", value: getDifficultyLabel(difficulty) },
          { label: "Turn", value: phase === "finished" ? outcome ?? "draw" : turn },
          { label: "Wins", value: activeStats.wins },
          { label: "Losses", value: activeStats.losses },
          { label: "Draws", value: activeStats.draws },
        ]}
        actions={
          <>
            <GameButton variant="primary" onClick={resetBoard}>
              New Round
            </GameButton>
            <GameButton onClick={clearStats}>Clear Record</GameButton>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <GamePlayfield className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-foreground-muted">
                Solo board
              </p>
              <p className="mt-2 text-sm leading-7 text-foreground-soft">
                Beat the CPU by building a line before it blocks every fork.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-foreground-soft">
              <span>{getDifficultyLabel(difficulty)}</span>
              <span className="text-white/18">/</span>
              <span>
                {phase === "finished"
                  ? outcome === "player"
                    ? "You win"
                    : outcome === "cpu"
                      ? "CPU wins"
                      : "Draw"
                  : turn === "cpu"
                    ? "CPU turn"
                    : "Your turn"}
              </span>
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
            {getStatusCopy(phase, turn, outcome, difficulty)}
          </p>
        </GamePlayfield>

        <aside className="flex flex-col gap-4">
          <div className="rounded-[1.75rem] border border-line bg-surface px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-foreground-muted">
                  Difficulty
                </p>
                <p className="mt-2 text-sm leading-7 text-foreground-soft">
                  {getDifficultyDescription(difficulty)}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {TIC_TAC_TOE_DIFFICULTIES.map((level) => {
                const isActive = level === difficulty;

                return (
                  <GameButton
                    key={level}
                    onClick={() => handleDifficultyChange(level)}
                    className={`rounded-[1.1rem] px-3 py-3 transition-all ${
                      isActive
                        ? "border-violet-300/40 bg-violet-500/12 text-violet-100 shadow-[0_10px_30px_rgba(124,58,237,0.12)]"
                        : "border-line bg-background-strong text-foreground-soft hover:-translate-y-0.5 hover:border-line-strong hover:bg-background"
                    }`}
                  >
                    {getDifficultyLabel(level)}
                  </GameButton>
                );
              })}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-line bg-surface px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-foreground-muted">
                Local record
              </p>
              <span className="rounded-full border border-line bg-background-strong px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-foreground-muted">
                {getDifficultyLabel(difficulty)}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-[1.1rem] border border-line bg-background-strong px-3 py-4">
                <dt className="text-[10px] uppercase tracking-[0.18em] text-foreground-muted">
                  Wins
                </dt>
                <dd className="mt-2 text-2xl font-semibold text-foreground">
                  {activeStats.wins}
                </dd>
              </div>
              <div className="rounded-[1.1rem] border border-line bg-background-strong px-3 py-4">
                <dt className="text-[10px] uppercase tracking-[0.18em] text-foreground-muted">
                  Losses
                </dt>
                <dd className="mt-2 text-2xl font-semibold text-foreground">
                  {activeStats.losses}
                </dd>
              </div>
              <div className="rounded-[1.1rem] border border-line bg-background-strong px-3 py-4">
                <dt className="text-[10px] uppercase tracking-[0.18em] text-foreground-muted">
                  Draws
                </dt>
                <dd className="mt-2 text-2xl font-semibold text-foreground">
                  {activeStats.draws}
                </dd>
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
              <li>R starts a new round. C clears the current difficulty record.</li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-3">
            <GameButton variant="primary" onClick={resetBoard}>
              New round
            </GameButton>
            <GameButton onClick={clearStats}>
              Clear record
            </GameButton>
          </div>
        </aside>
      </div>
      <GameStatus>
        Arrow keys or WASD move focus. Enter or Space places X. R starts a new round.
      </GameStatus>
    </GamePanel>
  );
}
