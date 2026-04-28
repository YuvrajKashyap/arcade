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
    return "A friendly CPU that leaves plenty of room to win.";
  }

  if (difficulty === "medium") {
    return "Blocks simple lines, but still misses playful traps.";
  }

  if (difficulty === "hard") {
    return "Sharp enough to punish lazy moves, still beatable.";
  }

  return "Full minimax. The boss round for perfect play.";
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
      return `${difficultyLabel} cleared. Nice line. Start another round.`;
    }

    if (outcome === "cpu") {
      return `${difficultyLabel} CPU got this one. Try the center or a corner first.`;
    }

    return `${difficultyLabel} ended in a draw. One more round.`;
  }

  if (phase === "idle") {
    return `${difficultyLabel} selected. You are blue X and move first.`;
  }

  if (turn === "cpu") {
    return `${difficultyLabel} CPU is thinking...`;
  }

  return "Your move. Pick a bright square and make a line.";
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

function getRoundStatusLabel(
  phase: TicTacToePhase,
  turn: TicTacToeTurn,
  outcome: TicTacToeOutcome,
) {
  if (phase === "finished") {
    if (outcome === "player") {
      return "You win";
    }

    if (outcome === "cpu") {
      return "CPU wins";
    }

    return "Draw";
  }

  return turn === "cpu" ? "CPU turn" : "Your turn";
}

function getCellClass(
  value: TicTacToeBoard[number],
  isWinningCell: boolean,
  isActive: boolean,
) {
  const baseClass =
    "group relative grid aspect-square place-items-center overflow-hidden rounded-[1.15rem] border-2 text-4xl font-black transition duration-200 sm:rounded-[1.45rem] sm:text-5xl";
  const activeClass = isActive
    ? " outline-none ring-4 ring-[#ff7a1a]/35 ring-offset-2 ring-offset-[#fff7d6]"
    : "";
  const winningClass = isWinningCell
    ? " scale-[1.03] border-[#ff7a1a] shadow-[0_0_0_5px_rgba(255,255,255,0.82),0_18px_38px_rgba(255,122,26,0.28)]"
    : "";

  if (value === "x") {
    return `${baseClass} border-[#19a9ff] bg-[linear-gradient(145deg,#f3fbff,#a9e7ff_52%,#1aa9ff)] text-[#006bd6] shadow-[inset_0_3px_0_rgba(255,255,255,0.86),0_13px_0_#0575bd,0_20px_26px_rgba(0,117,189,0.22)] ${winningClass}${activeClass}`;
  }

  if (value === "o") {
    return `${baseClass} border-[#76d927] bg-[linear-gradient(145deg,#fbfff1,#c9ff63_48%,#61c91c)] text-[#2f8f00] shadow-[inset_0_3px_0_rgba(255,255,255,0.88),0_13px_0_#379411,0_20px_26px_rgba(55,148,17,0.2)] ${winningClass}${activeClass}`;
  }

  return `${baseClass} border-[#ffd46b] bg-[linear-gradient(145deg,#fffef4,#fff0af_58%,#ffd060)] text-[#ffb02e]/28 shadow-[inset_0_3px_0_rgba(255,255,255,0.9),0_11px_0_#f2a82e,0_18px_24px_rgba(190,112,12,0.18)] hover:-translate-y-1 hover:border-[#ff9f1a] hover:bg-[linear-gradient(145deg,#ffffff,#fff4b8_55%,#ffd76f)] hover:text-[#ffb02e]/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ff7a1a]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fff7d6] ${activeClass}`;
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
  const roundStatusLabel = getRoundStatusLabel(phase, turn, outcome);

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
          { label: "Turn", value: roundStatusLabel },
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

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_15rem]">
        <GamePlayfield className="relative isolate min-h-0 border-0 bg-[linear-gradient(135deg,#fff8d9,#ffecd1_42%,#e4f8ff)] p-3 text-[#3a2304] shadow-[0_28px_80px_rgba(20,10,0,0.24)] sm:p-4">
          <div className="pointer-events-none absolute -left-8 top-8 h-24 w-24 rounded-full bg-[#72d700]/35 blur-xl" />
          <div className="pointer-events-none absolute -right-8 top-8 h-28 w-28 rounded-full bg-[#00b8ff]/28 blur-xl" />
          <div className="relative z-10 flex h-full min-h-0 flex-col items-center justify-center">
            <div className="mb-2 flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/80 bg-white/62 px-3 py-1.5 text-xs font-black text-[#724500]">
              <span>{roundStatusLabel}</span>
              <span className="text-[#d56c00]">/</span>
              <span>{getDifficultyLabel(difficulty)}</span>
            </div>

            <div className="relative w-full max-w-[min(19rem,34dvh)] sm:max-w-[min(24rem,44dvh)]">
              {phase === "finished" && outcome === "player" ? (
                <div className="pointer-events-none absolute -inset-7 z-20">
                  {[...Array(12)].map((_, index) => (
                    <span
                      key={index}
                      className="absolute h-2 w-2 rounded-full shadow-sm"
                      style={{
                        left: `${(index * 23) % 100}%`,
                        top: `${(index * 41) % 100}%`,
                        backgroundColor: ["#13b8ff", "#86e01c", "#ffb703", "#ff4fb8"][index % 4],
                      }}
                    />
                  ))}
                </div>
              ) : null}

              <div className="relative rounded-[1.65rem] border-[5px] border-[#077cff] bg-[#ffb703] p-2.5 shadow-[inset_0_4px_0_rgba(255,255,255,0.52),0_10px_0_#c96b00,0_20px_28px_rgba(113,61,0,0.22)]">
                <div className="grid grid-cols-3 gap-2.5">
                  {board.map((cell, index) => {
                    const isWinningCell = winningLine?.includes(index) ?? false;
                    const isActive = index === activeCellIndex;

                    return (
                      <button
                        key={index}
                        ref={(node) => {
                          cellRefs.current[index] = node;
                        }}
                        type="button"
                        onClick={() => handlePlayerMove(index)}
                        className={getCellClass(cell, isWinningCell, isActive)}
                        disabled={cell !== null || turn !== "player" || phase === "finished"}
                        aria-label={
                          cell
                            ? `Cell ${index + 1}, ${getCellCopy(cell)}`
                            : `Cell ${index + 1}, empty`
                        }
                      >
                        <span className="relative z-10 drop-shadow-[0_3px_0_rgba(255,255,255,0.45)]">
                          {getCellCopy(cell)}
                        </span>
                        {!cell ? (
                          <span className="absolute inset-x-4 top-3 h-2 rounded-full bg-white/55 opacity-80" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <p className="mt-4 max-w-xl text-center text-sm font-bold leading-6 text-[#6b3c00]">
              {getStatusCopy(phase, turn, outcome, difficulty)}
            </p>
          </div>
        </GamePlayfield>

        <aside className="hidden min-h-0 flex-col gap-3 overflow-hidden lg:flex">
          <div className="rounded-[1.35rem] border-2 border-white/75 bg-white/72 p-3 shadow-[0_14px_26px_rgba(130,74,0,0.12)]">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#d56c00]">
                Difficulty
              </p>
              <span className="rounded-full bg-[#dff8ff] px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.08em] text-[#006bd6]">
                {getDifficultyLabel(difficulty)}
              </span>
            </div>
            <p className="mt-2 text-xs font-bold leading-5 text-[#724500]">
              {getDifficultyDescription(difficulty)}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {TIC_TAC_TOE_DIFFICULTIES.map((level) => {
                const isActive = level === difficulty;

                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handleDifficultyChange(level)}
                    aria-pressed={isActive}
                    className={`rounded-[1rem] border-2 px-2 py-2 text-xs font-black transition ${
                      isActive
                        ? "border-[#ff8a00] bg-[#ffcf35] text-[#3a2304] shadow-[0_5px_0_#d56c00,0_10px_16px_rgba(213,108,0,0.16)]"
                        : "border-[#bae8ff] bg-[#ecfbff] text-[#0072c8] hover:-translate-y-0.5 hover:border-[#13b8ff]"
                    }`}
                  >
                    {getDifficultyLabel(level)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[1.35rem] border-2 border-white/75 bg-white/72 p-3 shadow-[0_14px_26px_rgba(130,74,0,0.12)]">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#d56c00]">
              Local record
            </p>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              {([
                ["Wins", activeStats.wins, "#86e01c"],
                ["Draws", activeStats.draws, "#13b8ff"],
                ["Losses", activeStats.losses, "#ff4fb8"],
              ] satisfies Array<[string, number, string]>).map(([label, value, color]) => (
                <div
                  key={label}
                  className="rounded-[0.9rem] border border-white bg-[#fff8d9] px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]"
                >
                  <dt className="text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#8a4b00]">
                    {label}
                  </dt>
                  <dd className="mt-1 text-2xl font-black" style={{ color }}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </div>
      <GameStatus>
        Click, tap, or use the keyboard to make a line before the CPU does.
      </GameStatus>
    </GamePanel>
  );
}
