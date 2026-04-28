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

export function MinesweeperGame() {
  const [state, setState] = useState<MinesweeperState>(() => createMinesweeperState());
  const [bestTimes, setBestTimes] = useState(() => readBestTimes());
  const [flagMode, setFlagMode] = useState(false);
  const [activeCellIndex, setActiveCellIndex] = useState(0);
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const longPressTimerRef = useRef<number | null>(null);
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

  const boardCellSize =
    state.columns >= 30
      ? "clamp(0.8rem, min(2.65vw, 4dvh), 1.35rem)"
      : state.columns >= 16
        ? "clamp(1rem, min(4.8vw, 4.8dvh), 1.75rem)"
        : "clamp(1.45rem, min(8vw, 6dvh), 2.15rem)";

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

      <div className="flex flex-wrap gap-2">
        {MINESWEEPER_DIFFICULTIES.map((difficulty) => (
          <GameButton
            key={difficulty.id}
            variant={difficulty.id === state.difficulty ? "primary" : "secondary"}
            onClick={() => restart(difficulty.id)}
          >
            {difficulty.label}
          </GameButton>
        ))}
      </div>

      <GamePlayfield className="mx-auto min-h-0 w-full p-2 sm:p-3">
        <div
          className="mx-auto grid max-h-full max-w-full gap-1 overflow-auto"
          style={{
            gridTemplateColumns: `repeat(${state.columns}, ${boardCellSize})`,
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
                onClick={() => handleCellPrimary(index)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  handleCellFlag(index);
                }}
                onPointerDown={() => {
                  if (longPressTimerRef.current !== null) {
                    window.clearTimeout(longPressTimerRef.current);
                  }
                  longPressTimerRef.current = window.setTimeout(() => {
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
                className={`aspect-square rounded-md border text-xs font-semibold sm:text-sm ${
                  cell.revealed
                    ? danger
                      ? "border-red-400/40 bg-red-500/25 text-red-100"
                      : "border-line bg-surface text-foreground"
                    : cell.flagged
                      ? "border-orange-300/40 bg-orange-400/16 text-orange-100"
                      : "border-line bg-background-strong text-foreground-soft hover:border-line-strong hover:bg-surface"
                } ${active ? "ring-2 ring-accent/45" : ""}`}
                aria-label={`Cell ${index + 1}`}
              >
                {cell.flagged && !cell.revealed
                  ? "F"
                  : cell.revealed
                    ? cell.mine
                      ? "*"
                      : cell.adjacent || ""
                    : ""}
              </button>
            );
          })}
        </div>
      </GamePlayfield>

      <GameStatus>{getStatusCopy(state.phase, flagMode)}</GameStatus>
    </GamePanel>
  );
}
