"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  MINESWEEPER_DIFFICULTIES,
  MINESWEEPER_STORAGE_KEY,
} from "@/features/games/minesweeper/config/constants";
import {
  createMinesweeperState,
  getDifficultyConfig,
  getNextCellIndex,
  revealCell,
  tickMinesweeper,
  toggleFlag,
} from "@/features/games/minesweeper/logic/game";
import type {
  MinesweeperDifficulty,
  MinesweeperPhase,
  MinesweeperState,
} from "@/features/games/minesweeper/types";
import {
  GameButton,
  GameHud,
  GamePanel,
  GamePlayfield,
  GameStatus,
} from "@/features/games/shared/components/game-ui";

function getStatusCopy(phase: MinesweeperPhase, flagMode: boolean) {
  if (phase === "won") {
    return "Board cleared. Change difficulty or restart for a faster solve.";
  }

  if (phase === "lost") {
    return "Mine triggered. Restart and use flags to isolate the next field.";
  }

  if (phase === "playing") {
    return flagMode
      ? "Flag mode is on. Tap covered cells to mark suspected mines."
      : "Reveal safe regions, count adjacent mines, and flag the field before committing.";
  }

  return "Pick a cell to generate the field. The first reveal is protected.";
}

function readBestTimes(): Partial<Record<MinesweeperDifficulty, number>> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const value = window.localStorage.getItem(MINESWEEPER_STORAGE_KEY);
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

function writeBestTimes(value: Partial<Record<MinesweeperDifficulty, number>>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(MINESWEEPER_STORAGE_KEY, JSON.stringify(value));
}

const numberColorClass: Record<number, string> = {
  1: "text-[#1477cf]",
  2: "text-[#2b9a30]",
  3: "text-[#e05243]",
  4: "text-[#7b56d9]",
  5: "text-[#cf6a19]",
  6: "text-[#009ea8]",
  7: "text-[#5a3c26]",
  8: "text-[#506070]",
};

function getCellClass({
  revealed,
  flagged,
  mine,
  adjacent,
  active,
  danger,
}: {
  revealed: boolean;
  flagged: boolean;
  mine: boolean;
  adjacent: number;
  active: boolean;
  danger: boolean;
}) {
  const base =
    "grid aspect-square place-items-center rounded-[0.55rem] border-2 text-[0.7rem] font-black leading-none transition sm:text-sm";
  const activeClass = active ? " ring-[3px] ring-[#0a8dff]/40 ring-offset-1 ring-offset-[#fff4b8]" : "";

  if (danger) {
    return `${base} border-[#9f1d1d] bg-[#ff6b5f] text-[#3b0808] shadow-[inset_0_2px_0_rgba(255,255,255,0.46),0_4px_0_#a72626]${activeClass}`;
  }

  if (revealed) {
    return `${base} border-[#efc66b] bg-[#fff8d7] ${mine ? "text-[#3b2618]" : numberColorClass[adjacent] ?? "text-[#a77b38]"} shadow-[inset_0_2px_0_rgba(255,255,255,0.72)]${activeClass}`;
  }

  if (flagged) {
    return `${base} border-[#ff8a1d] bg-[#ffd45f] text-[#a5351d] shadow-[inset_0_2px_0_rgba(255,255,255,0.55),0_4px_0_#d27419]${activeClass}`;
  }

  return `${base} border-[#2f9e4b] bg-[linear-gradient(145deg,#b9f16d,#5ecc62)] text-[#277239] shadow-[inset_0_2px_0_rgba(255,255,255,0.48),0_4px_0_#2f8f38] hover:-translate-y-0.5 hover:bg-[linear-gradient(145deg,#d5ff87,#72d96b)] focus-visible:outline-none${activeClass}`;
}

function getCellContent(cell: MinesweeperState["cells"][number]) {
  if (cell.flagged && !cell.revealed) {
    return "⚑";
  }

  if (!cell.revealed) {
    return "";
  }

  if (cell.mine) {
    return "●";
  }

  return cell.adjacent || "";
}

export function MinesweeperGame() {
  const [state, setState] = useState<MinesweeperState>(() => createMinesweeperState());
  const [bestTimes, setBestTimes] = useState(() => readBestTimes());
  const [flagMode, setFlagMode] = useState(false);
  const [activeCellIndex, setActiveCellIndex] = useState(0);
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const longPressTimerRef = useRef<number | null>(null);
  const suppressNextClickRef = useRef(false);
  const bestTime = bestTimes[state.difficulty] ?? null;

  function commitState(nextState: MinesweeperState) {
    setState(nextState);
    if (nextState.phase === "won") {
      setBestTimes((currentBestTimes) => {
        const currentBestTime = currentBestTimes[nextState.difficulty];
        const nextBestTime =
          currentBestTime === undefined
            ? nextState.elapsedSeconds
            : Math.min(currentBestTime, nextState.elapsedSeconds);
        const nextBestTimes = {
          ...currentBestTimes,
          [nextState.difficulty]: nextBestTime,
        };
        writeBestTimes(nextBestTimes);
        return nextBestTimes;
      });
    }
  }

  function restart(difficulty = state.difficulty) {
    const config = getDifficultyConfig(difficulty);
    setActiveCellIndex(0);
    setFlagMode(false);
    setState(createMinesweeperState(config.id));
  }

  function handleCellPrimary(index: number) {
    setActiveCellIndex(index);
    commitState(flagMode ? toggleFlag(state, index) : revealCell(state, index, performance.now()));
  }

  function handleCellFlag(index: number) {
    setActiveCellIndex(index);
    commitState(toggleFlag(state, index));
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
        getNextCellIndex(currentIndex, normalizedKey, state.rows, state.columns),
      );
      return;
    }

    if (normalizedKey === "enter" || normalizedKey === " ") {
      event.preventDefault();
      handleCellPrimary(activeCellIndex);
      return;
    }

    if (normalizedKey === "f") {
      event.preventDefault();
      handleCellFlag(activeCellIndex);
      return;
    }

    if (normalizedKey === "r") {
      event.preventDefault();
      restart();
    }
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setState((currentState) => tickMinesweeper(currentState, performance.now()));
    }, 400);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => handleKeyboardInput(event);
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    cellRefs.current[activeCellIndex]?.focus();
  }, [activeCellIndex]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const maxCellSize =
    state.columns >= 18 ? "1.45rem" : state.columns >= 14 ? "1.75rem" : "2.35rem";
  const boardCellSize = `min(${maxCellSize}, calc((100vw - 5rem) / ${state.columns}), calc((52dvh - 1.75rem) / ${state.rows}))`;

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "Time", value: `${state.elapsedSeconds}s` },
          { label: "Best", value: bestTime === null ? "None" : `${bestTime}s` },
          { label: "Mines", value: Math.max(state.mines - state.flags, 0) },
          { label: "Status", value: state.phase },
        ]}
        actions={
          <>
            <GameButton variant="primary" onClick={() => restart()}>
              Restart
            </GameButton>
            <GameButton onClick={() => setFlagMode((current) => !current)}>
              {flagMode ? "Reveal Mode" : "Flag Mode"}
            </GameButton>
          </>
        }
      />

      <div className="flex flex-wrap justify-center gap-2">
        {MINESWEEPER_DIFFICULTIES.map((difficulty) => (
          <GameButton
            key={difficulty.id}
            variant={difficulty.id === state.difficulty ? "primary" : "secondary"}
            className="px-3 py-1.5 text-xs"
            onClick={() => restart(difficulty.id)}
          >
            {difficulty.label}
          </GameButton>
        ))}
      </div>

      <GamePlayfield className="mx-auto flex min-h-0 w-full max-w-[min(64rem,96vw)] items-center justify-center border-0 bg-[linear-gradient(180deg,#bfefff_0%,#d8f6ff_28%,#a7e678_29%,#64c95c_100%)] p-2 shadow-[0_28px_80px_rgba(14,58,27,0.28)] sm:p-3">
        <div
          className="relative rounded-[1.4rem] border-[5px] border-[#236a34] bg-[#ffcb57] p-2 shadow-[inset_0_4px_0_rgba(255,255,255,0.42),0_8px_0_#87551b,0_18px_32px_rgba(50,40,20,0.22)]"
        >
          <div
          className="grid max-h-full max-w-full gap-1 overflow-hidden"
          style={{
            gridTemplateColumns: `repeat(${state.columns}, ${boardCellSize})`,
            gridTemplateRows: `repeat(${state.rows}, ${boardCellSize})`,
          }}
        >
          {state.cells.map((cell, index) => {
            const active = index === activeCellIndex;
            const danger = state.phase === "lost" && cell.mine;

            return (
              <button
                key={index}
                ref={(node) => {
                  cellRefs.current[index] = node;
                }}
                type="button"
                onClick={() => {
                  if (suppressNextClickRef.current) {
                    suppressNextClickRef.current = false;
                    return;
                  }

                  handleCellPrimary(index);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  handleCellFlag(index);
                }}
                onPointerDown={() => {
                  if (longPressTimerRef.current !== null) {
                    window.clearTimeout(longPressTimerRef.current);
                  }
                  longPressTimerRef.current = window.setTimeout(() => {
                    suppressNextClickRef.current = true;
                    handleCellFlag(index);
                    longPressTimerRef.current = null;
                  }, 420);
                }}
                onPointerUp={() => {
                  if (longPressTimerRef.current !== null) {
                    window.clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                  }
                }}
                onPointerCancel={() => {
                  if (longPressTimerRef.current !== null) {
                    window.clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                  }
                }}
                style={{ touchAction: "manipulation" }}
                className={getCellClass({
                  revealed: cell.revealed,
                  flagged: cell.flagged,
                  mine: cell.mine,
                  adjacent: cell.adjacent,
                  active,
                  danger,
                })}
                aria-label={`Cell ${index + 1}`}
              >
                {getCellContent(cell)}
              </button>
            );
          })}
          </div>
        </div>
      </GamePlayfield>

      <GameStatus>{getStatusCopy(state.phase, flagMode)}</GameStatus>
    </GamePanel>
  );
}
