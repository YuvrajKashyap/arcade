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
  TwentyFortyEightTile,
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

const TILE_GAP = 10;
const SLIDE_DURATION_MS = 78;
const POP_DURATION_MS = 42;
const SPAWN_DURATION_MS = 28;
const SWIPE_THRESHOLD_PX = 28;

type RenderTile = {
  renderKey: string;
  id: number;
  value: number;
  row: number;
  column: number;
  slideRowDelta?: number;
  slideColumnDelta?: number;
  isSlideTarget?: boolean;
  phase?: "sliding" | "pop" | "spawn";
};

function getTilePositionStyle(row: number, column: number) {
  return {
    width: `calc(25% - ${(TILE_GAP * 3) / 4}px)`,
    height: `calc(25% - ${(TILE_GAP * 3) / 4}px)`,
    left: `calc(${column * 25}% + ${(column * TILE_GAP) / 4}px)`,
    top: `calc(${row * 25}% + ${(row * TILE_GAP) / 4}px)`,
  };
}

function getSlideTransform(rowDelta = 0, columnDelta = 0, isSlideTarget = false) {
  if (!isSlideTarget) {
    return "translate3d(0, 0, 0)";
  }

  const xSign = columnDelta < 0 ? "-1" : "1";
  const ySign = rowDelta < 0 ? "-1" : "1";
  const xMagnitude = Math.abs(columnDelta);
  const yMagnitude = Math.abs(rowDelta);

  return `translate3d(calc(${xSign} * ${xMagnitude} * (100% + ${TILE_GAP}px)), calc(${ySign} * ${yMagnitude} * (100% + ${TILE_GAP}px)), 0)`;
}

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

function createInitialGameState() {
  const bestScore = readStoredNumber(TWENTY_FORTY_EIGHT_STORAGE_KEY);
  const debugBoard =
    process.env.NODE_ENV !== "production" && typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("debugBoard")
      : null;
  if (
    debugBoard === "merge"
  ) {
    return {
      tiles: [
        { id: 1, value: 2, row: 0, column: 0 },
        { id: 2, value: 2, row: 0, column: 1 },
        { id: 3, value: 2, row: 0, column: 2 },
        { id: 4, value: 2, row: 0, column: 3 },
      ],
      score: 0,
      bestScore,
      phase: "playing",
      nextTileId: 5,
    } satisfies TwentyFortyEightState;
  }

  if (debugBoard === "locked") {
    return {
      tiles: [
        { id: 1, value: 2, row: 0, column: 0 },
        { id: 2, value: 4, row: 0, column: 1 },
        { id: 3, value: 2, row: 0, column: 2 },
        { id: 4, value: 4, row: 0, column: 3 },
        { id: 5, value: 4, row: 1, column: 0 },
        { id: 6, value: 2, row: 1, column: 1 },
        { id: 7, value: 4, row: 1, column: 2 },
        { id: 8, value: 2, row: 1, column: 3 },
        { id: 9, value: 2, row: 2, column: 0 },
        { id: 10, value: 4, row: 2, column: 1 },
        { id: 11, value: 2, row: 2, column: 2 },
        { id: 12, value: 4, row: 2, column: 3 },
        { id: 13, value: 4, row: 3, column: 0 },
        { id: 14, value: 2, row: 3, column: 1 },
        { id: 15, value: 4, row: 3, column: 2 },
        { id: 16, value: 2, row: 3, column: 3 },
      ],
      score: 128,
      bestScore: Math.max(bestScore, 128),
      phase: "game-over",
      nextTileId: 17,
    } satisfies TwentyFortyEightState;
  }

  return createTwentyFortyEightState(bestScore);
}

function createFinalRenderTiles(tiles: TwentyFortyEightTile[]): RenderTile[] {
  return tiles.map((tile) => ({
    renderKey: `final-${tile.id}`,
    id: tile.id,
    value: tile.value,
    row: tile.row,
    column: tile.column,
    phase: tile.isNew ? "spawn" : tile.mergedFrom ? "pop" : undefined,
  }));
}

function createSettledRenderTiles(tiles: TwentyFortyEightTile[]): RenderTile[] {
  return tiles.map((tile) => ({
    renderKey: `settled-${tile.id}`,
    id: tile.id,
    value: tile.value,
    row: tile.row,
    column: tile.column,
  }));
}

function createMoveRenderTiles(
  sourceTiles: TwentyFortyEightTile[],
  targetTiles: TwentyFortyEightTile[],
  animationId: number,
  useTargetPositions: boolean,
): RenderTile[] {
  const targetBySourceId = new Map<number, TwentyFortyEightTile>();

  for (const target of targetTiles) {
    if (target.mergedFrom) {
      for (const sourceId of target.mergedFrom) {
        targetBySourceId.set(sourceId, target);
      }
    } else {
      targetBySourceId.set(target.id, target);
    }
  }

  return sourceTiles.reduce<RenderTile[]>((tiles, source) => {
      const target = targetBySourceId.get(source.id);
      if (!target) {
        return tiles;
      }

      tiles.push({
        renderKey: `move-${animationId}-${source.id}`,
        id: source.id,
        value: source.value,
        row: source.row,
        column: source.column,
        slideRowDelta: target.row - source.row,
        slideColumnDelta: target.column - source.column,
        isSlideTarget: useTargetPositions,
        phase: "sliding",
      });
      return tiles;
    }, []);
}

export function TwentyFortyEightGame() {
  const initialState = createInitialGameState();
  const [state, setState] = useState<TwentyFortyEightState>(initialState);
  const [renderTiles, setRenderTiles] = useState<RenderTile[]>(() => createFinalRenderTiles(initialState.tiles));
  const stateRef = useRef(initialState);
  const touchStartRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const isAnimatingRef = useRef(false);
  const queuedDirectionRef = useRef<TwentyFortyEightDirection | null>(null);
  const animationIdRef = useRef(0);
  const slideFrameRef = useRef<number | null>(null);
  const slideTimerRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const spawnTimerRef = useRef<number | null>(null);
  const cells = useMemo(
    () =>
      Array.from({ length: TWENTY_FORTY_EIGHT_SIZE * TWENTY_FORTY_EIGHT_SIZE }, (_, index) => ({
        row: Math.floor(index / TWENTY_FORTY_EIGHT_SIZE),
        column: index % TWENTY_FORTY_EIGHT_SIZE,
      })),
    [],
  );

  function clearAnimationTimers() {
    if (slideFrameRef.current !== null) {
      window.cancelAnimationFrame(slideFrameRef.current);
      slideFrameRef.current = null;
    }

    if (slideTimerRef.current !== null) {
      window.clearTimeout(slideTimerRef.current);
      slideTimerRef.current = null;
    }

    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }

    if (spawnTimerRef.current !== null) {
      window.clearTimeout(spawnTimerRef.current);
      spawnTimerRef.current = null;
    }
  }

  function syncState(nextState: TwentyFortyEightState, shouldAnimateFinal = false) {
    stateRef.current = nextState;
    setState(nextState);
    setRenderTiles(shouldAnimateFinal ? createFinalRenderTiles(nextState.tiles) : createSettledRenderTiles(nextState.tiles));
    writeStoredNumber(TWENTY_FORTY_EIGHT_STORAGE_KEY, nextState.bestScore);
  }

  function resetGame() {
    clearAnimationTimers();
    isAnimatingRef.current = false;
    queuedDirectionRef.current = null;
    syncState(createTwentyFortyEightState(stateRef.current.bestScore), true);
  }

  function move(direction: TwentyFortyEightDirection) {
    if (isAnimatingRef.current) {
      queuedDirectionRef.current = direction;
      return;
    }

    const currentState = stateRef.current;
    const nextState = moveTwentyFortyEight(currentState, direction);
    if (nextState === currentState) {
      return;
    }

    clearAnimationTimers();
    isAnimatingRef.current = true;
    animationIdRef.current += 1;
    const animationId = animationIdRef.current;

    setRenderTiles(createMoveRenderTiles(currentState.tiles, nextState.tiles, animationId, false));

    slideFrameRef.current = window.requestAnimationFrame(() => {
      slideFrameRef.current = window.requestAnimationFrame(() => {
        setRenderTiles(createMoveRenderTiles(currentState.tiles, nextState.tiles, animationId, true));
        slideFrameRef.current = null;
      });
    });

    const mergedTiles = nextState.tiles.filter((tile) => !tile.isNew);
    const allTiles = nextState.tiles;

    slideTimerRef.current = window.setTimeout(() => {
      stateRef.current = nextState;
      setState(nextState);
      writeStoredNumber(TWENTY_FORTY_EIGHT_STORAGE_KEY, nextState.bestScore);
      setRenderTiles(createFinalRenderTiles(mergedTiles));
      settleTimerRef.current = window.setTimeout(() => {
        setRenderTiles(createFinalRenderTiles(allTiles));
        spawnTimerRef.current = window.setTimeout(() => {
          setRenderTiles(createSettledRenderTiles(allTiles));
          isAnimatingRef.current = false;
          const queuedDirection = queuedDirectionRef.current;
          queuedDirectionRef.current = null;
          if (queuedDirection) {
            window.requestAnimationFrame(() => move(queuedDirection));
          }
        }, SPAWN_DURATION_MS);
      }, POP_DURATION_MS);
    }, SLIDE_DURATION_MS);
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
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearAnimationTimers();
    };
  }, []);

  const handleTouchEnd = (id: number, x: number, y: number) => {
    const start = touchStartRef.current;
    if (!start || start.id !== id) {
      return;
    }

    touchStartRef.current = null;

    const dx = x - start.x;
    const dy = y - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD_PX) {
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
            if (event.pointerType !== "touch" || !event.isPrimary) {
              return;
            }

            event.currentTarget.setPointerCapture(event.pointerId);
            touchStartRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => {
            if (event.pointerType !== "touch") {
              return;
            }

            handleTouchEnd(event.pointerId, event.clientX, event.clientY);
          }}
          onPointerCancel={(event) => {
            if (touchStartRef.current?.id === event.pointerId) {
              touchStartRef.current = null;
            }
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

          <div className="pointer-events-none absolute inset-2.5">
            {renderTiles.map((tile) => (
              <div
                key={tile.renderKey}
                className={`absolute grid place-items-center rounded-[1rem] border-2 border-white/40 text-2xl font-black sm:text-4xl ${
                  tile.phase === "sliding" ? "z-10 will-change-transform transition-transform ease-[cubic-bezier(0.18,0.84,0.2,1)]" : ""
                } ${
                  tile.phase === "spawn"
                    ? "z-20 animate-[tileSpawn_80ms_cubic-bezier(0.2,0.9,0.25,1.2)]"
                    : tile.phase === "pop"
                      ? "z-20 animate-[tilePop_90ms_cubic-bezier(0.2,0.9,0.25,1.2)]"
                      : ""
                } ${getTileClass(tile.value)}`}
                style={{
                  ...getTilePositionStyle(tile.row, tile.column),
                  transform:
                    tile.phase === "sliding"
                      ? getSlideTransform(tile.slideRowDelta, tile.slideColumnDelta, tile.isSlideTarget)
                      : undefined,
                  transitionDuration: tile.phase === "sliding" ? `${SLIDE_DURATION_MS}ms` : undefined,
                }}
              >
                {tile.value}
              </div>
            ))}
          </div>

          {state.phase === "game-over" ? (
            <div className="absolute inset-0 z-30 grid place-items-center rounded-[1.25rem] bg-[#2a1608]/72 px-5 text-center shadow-[inset_0_0_80px_rgba(0,0,0,0.38)] backdrop-blur-[2px]">
              <div className="rounded-[1.2rem] border-[4px] border-[#fff1b8] bg-[linear-gradient(180deg,#ffdf6f,#f2953b)] px-5 py-4 text-[#4b2507] shadow-[0_9px_0_#7a4218,0_24px_48px_rgba(35,18,4,0.42)]">
                <div className="font-black uppercase tracking-[0.14em] text-[#6d270c] text-[clamp(1.55rem,7vw,3rem)]">
                  GAME OVER
                </div>
                <p className="mt-2 text-sm font-black uppercase tracking-[0.12em] text-[#7a4218]">
                  Press R or Space to restart
                </p>
                <button
                  type="button"
                  className="mt-4 rounded-full border-2 border-[#4b2507] bg-[#fff6bf] px-5 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#4b2507] shadow-[0_5px_0_#9b5a22] transition-transform hover:-translate-y-0.5 active:translate-y-0"
                  onClick={resetGame}
                >
                  Restart
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </GamePlayfield>

      <GameStatus>{getStatusCopy(state.phase)} Arrow keys or WASD move. R restarts.</GameStatus>
      <style jsx global>{`
        @keyframes tileSpawn {
          0% {
            transform: scale(0.2);
            opacity: 0.25;
          }
          72% {
            transform: scale(1.12);
            opacity: 1;
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes tilePop {
          0% {
            transform: scale(1);
          }
          58% {
            transform: scale(1.16);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </GamePanel>
  );
}
