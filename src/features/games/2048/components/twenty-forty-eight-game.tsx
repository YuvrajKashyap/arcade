"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { TWENTY_FORTY_EIGHT_SIZE, TWENTY_FORTY_EIGHT_STORAGE_KEY } from "@/features/games/2048/config/constants";
import {
  createTwentyFortyEightState,
  moveTwentyFortyEight,
} from "@/features/games/2048/logic/game";
import type {
  TwentyFortyEightDirection,
  TwentyFortyEightPhase,
  TwentyFortyEightState,
} from "@/features/games/2048/types";
import {
  GameButton,
  GameHud,
  GamePanel,
  GamePlayfield,
  GameStatus,
} from "@/features/games/shared/components/game-ui";
import {
  readStoredNumber,
  writeStoredNumber,
} from "@/features/games/shared/utils/local-storage";

const directionByKey: Record<string, TwentyFortyEightDirection | undefined> = {
  arrowup: "up",
  w: "up",
  arrowdown: "down",
  s: "down",
  arrowleft: "left",
  a: "left",
  arrowright: "right",
  d: "right",
};

const tileColors = new Map<number, string>([
  [2, "bg-[#fff1c7] text-[#7a4b18] shadow-[0_7px_0_#e2b664]"],
  [4, "bg-[#ffe3a3] text-[#7a4b18] shadow-[0_7px_0_#d89b45]"],
  [8, "bg-[#ffb45f] text-white shadow-[0_7px_0_#d66d2d]"],
  [16, "bg-[#ff8757] text-white shadow-[0_7px_0_#c94c31]"],
  [32, "bg-[#ff6969] text-white shadow-[0_7px_0_#c93b4a]"],
  [64, "bg-[#f94773] text-white shadow-[0_7px_0_#a92f58]"],
  [128, "bg-[#f7d35b] text-[#4d3a08] shadow-[0_7px_0_#c99b23]"],
  [256, "bg-[#c8df57] text-[#344700] shadow-[0_7px_0_#92a92a]"],
  [512, "bg-[#68d971] text-[#06390f] shadow-[0_7px_0_#36a94f]"],
  [1024, "bg-[#5ec9ff] text-[#04385d] shadow-[0_7px_0_#268bc7]"],
  [2048, "bg-[#9b7cff] text-white shadow-[0_7px_0_#6044c7]"],
]);

function getStatusCopy(phase: TwentyFortyEightPhase) {
  if (phase === "won") {
    return "2048 reached. Start a fresh board and chase a cleaner score.";
  }

  if (phase === "game-over") {
    return "Board locked. Restart and build from the corners.";
  }

  return "Slide the tiles, merge matching numbers, and build up to 2048.";
}

function getTileClass(value: number) {
  return tileColors.get(value) ?? "bg-[#5337a8] text-white shadow-[0_7px_0_#2f246b]";
}

export function TwentyFortyEightGame() {
  const initialState = createTwentyFortyEightState(readStoredNumber(TWENTY_FORTY_EIGHT_STORAGE_KEY));
  const [state, setState] = useState<TwentyFortyEightState>(initialState);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const cells = useMemo(
    () =>
      Array.from({ length: TWENTY_FORTY_EIGHT_SIZE * TWENTY_FORTY_EIGHT_SIZE }, (_, index) => ({
        row: Math.floor(index / TWENTY_FORTY_EIGHT_SIZE),
        column: index % TWENTY_FORTY_EIGHT_SIZE,
      })),
    [],
  );

  function syncState(nextState: TwentyFortyEightState) {
    setState(nextState);
    writeStoredNumber(TWENTY_FORTY_EIGHT_STORAGE_KEY, nextState.bestScore);
  }

  function resetGame() {
    syncState(createTwentyFortyEightState(state.bestScore));
  }

  function move(direction: TwentyFortyEightDirection) {
    syncState(moveTwentyFortyEight(state, direction));
  }

  const handleKeyboardInput = useEffectEvent((event: KeyboardEvent) => {
    const normalizedKey = event.key.toLowerCase();
    const direction = directionByKey[normalizedKey];

    if (direction) {
      event.preventDefault();
      move(direction);
      return;
    }

    if (normalizedKey === "r" || normalizedKey === " ") {
      event.preventDefault();
      if (state.phase !== "playing" || normalizedKey === "r") {
        resetGame();
      }
    }
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => handleKeyboardInput(event);
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleTouchEnd = (x: number, y: number) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) {
      return;
    }

    const dx = x - start.x;
    const dy = y - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) {
      return;
    }

    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
  };

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "Score", value: state.score },
          { label: "Best", value: state.bestScore },
          { label: "Status", value: state.phase === "playing" ? "sliding" : state.phase },
        ]}
        actions={
          <GameButton variant="primary" onClick={resetGame}>
            New Game
          </GameButton>
        }
      />

      <GamePlayfield className="mx-auto flex aspect-square w-full max-w-[min(31rem,54dvh)] touch-none items-center justify-center border-0 bg-[linear-gradient(135deg,#fff7d8,#f7c66d_48%,#f29852)] p-3 text-[#4d3216] shadow-[0_28px_80px_rgba(38,22,6,0.28)] sm:p-4">
        <div
          className="relative aspect-square w-full rounded-[1.55rem] border-[5px] border-[#8b5a2b] bg-[#b9824b] p-2.5 shadow-[inset_0_5px_0_rgba(255,255,255,0.35),0_10px_0_#6f4322]"
          onPointerDown={(event) => {
            touchStartRef.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => handleTouchEnd(event.clientX, event.clientY)}
          onPointerCancel={() => {
            touchStartRef.current = null;
          }}
          aria-label="2048 board"
          role="application"
        >
          <div className="grid h-full grid-cols-4 gap-2.5">
            {cells.map((cell) => (
              <div
                key={`${cell.row}:${cell.column}`}
                className="rounded-[1rem] bg-[#d7a96b] shadow-[inset_0_3px_0_rgba(255,255,255,0.22)]"
              />
            ))}
          </div>

          <div className="absolute inset-2.5 grid grid-cols-4 gap-2.5">
            {state.tiles.map((tile) => (
              <div
                key={tile.id}
                className={`grid aspect-square place-items-center rounded-[1rem] border-2 border-white/40 text-2xl font-black transition duration-150 sm:text-4xl ${
                  tile.isNew || tile.mergedFrom ? "scale-[1.03]" : ""
                } ${getTileClass(tile.value)}`}
                style={{
                  gridColumnStart: tile.column + 1,
                  gridRowStart: tile.row + 1,
                }}
              >
                {tile.value}
              </div>
            ))}
          </div>
        </div>
      </GamePlayfield>

      <GameStatus>{getStatusCopy(state.phase)} Arrow keys or WASD move. R restarts.</GameStatus>
    </GamePanel>
  );
}
