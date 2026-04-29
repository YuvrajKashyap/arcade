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
import {
  readStoredNumber,
  writeStoredNumber,
} from "@/features/games/shared/utils/local-storage";

const STORAGE_KEY = "arcade.sorry.bestScore";
const TRACK_LENGTH = 60;
const HOME_PROGRESS = 65;
const BOARD_CELLS = 16;
const PAWNS_PER_SIDE = 4;
const CARD_DECK = [1, 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, "sorry"] as const;

type Card = (typeof CARD_DECK)[number];
type Color = "blue" | "red" | "yellow" | "green";
type Phase = "ready" | "choosing" | "animating" | "won" | "lost";
type Pawn = { progress: number };
type Side = {
  color: Color;
  label: string;
  pawns: Pawn[];
  startIndex: number;
};
type Move = {
  side: Color;
  pawnIndex: number;
  card: Card;
  progress: number;
  targetProgress: number;
  targetAbsolute: number | null;
  sorryTarget?: { side: Color; pawnIndex: number };
  label: string;
};
type State = {
  phase: Phase;
  sides: Record<Color, Side>;
  current: Color;
  card: Card | null;
  moves: number;
  bestScore: number;
  message: string;
  selectedMove: number;
  winner: Color | null;
};

const TURN_ORDER: Color[] = ["blue", "red", "yellow", "green"];
const SIDE_META: Record<Color, { label: string; startIndex: number; color: string; dark: string; glow: string }> = {
  blue: { label: "Blue", startIndex: 4, color: "#2089ff", dark: "#124aa8", glow: "rgba(32,137,255,0.42)" },
  red: { label: "Red", startIndex: 19, color: "#ef3340", dark: "#9f1722", glow: "rgba(239,51,64,0.42)" },
  yellow: { label: "Yellow", startIndex: 34, color: "#ffd43b", dark: "#b98300", glow: "rgba(255,212,59,0.42)" },
  green: { label: "Green", startIndex: 49, color: "#18b957", dark: "#087335", glow: "rgba(24,185,87,0.42)" },
};

const SLIDES: Array<{ start: number; end: number; color: Color }> = [
  { start: 1, end: 4, color: "blue" },
  { start: 9, end: 14, color: "blue" },
  { start: 16, end: 19, color: "red" },
  { start: 24, end: 29, color: "red" },
  { start: 31, end: 34, color: "yellow" },
  { start: 39, end: 44, color: "yellow" },
  { start: 46, end: 49, color: "green" },
  { start: 54, end: 59, color: "green" },
];

function nextTurn(color: Color) {
  return TURN_ORDER[(TURN_ORDER.indexOf(color) + 1) % TURN_ORDER.length]!;
}

function cardLabel(card: Card | null) {
  if (card === null) return "-";
  if (card === "sorry") return "SORRY!";
  if (card === 4) return "BACK 4";
  if (card === 10) return "10 / -1";
  if (card === 11) return "11 / SWAP";
  return String(card);
}

function createSide(color: Color): Side {
  const meta = SIDE_META[color];
  return {
    color,
    label: meta.label,
    startIndex: meta.startIndex,
    pawns: Array.from({ length: PAWNS_PER_SIDE }, () => ({ progress: -1 })),
  };
}

function createState(bestScore = 0): State {
  return {
    phase: "ready",
    sides: {
      blue: createSide("blue"),
      red: createSide("red"),
      yellow: createSide("yellow"),
      green: createSide("green"),
    },
    current: "blue",
    card: null,
    moves: 0,
    bestScore,
    message: "Draw a card, choose a legal blue pawn, and race every pawn home.",
    selectedMove: 0,
    winner: null,
  };
}

function cloneSides(sides: State["sides"]): State["sides"] {
  return {
    blue: { ...sides.blue, pawns: sides.blue.pawns.map((pawn) => ({ ...pawn })) },
    red: { ...sides.red, pawns: sides.red.pawns.map((pawn) => ({ ...pawn })) },
    yellow: { ...sides.yellow, pawns: sides.yellow.pawns.map((pawn) => ({ ...pawn })) },
    green: { ...sides.green, pawns: sides.green.pawns.map((pawn) => ({ ...pawn })) },
  };
}

function drawCard() {
  return CARD_DECK[Math.floor(Math.random() * CARD_DECK.length)]!;
}

function absoluteFor(side: Side, progress: number) {
  if (progress < 0 || progress >= TRACK_LENGTH) return null;
  return (side.startIndex + progress) % TRACK_LENGTH;
}

function isSafe(pawn: Pawn) {
  return pawn.progress >= TRACK_LENGTH && pawn.progress < HOME_PROGRESS;
}

function isHome(pawn: Pawn) {
  return pawn.progress >= HOME_PROGRESS;
}

function cellForTrack(index: number) {
  if (index < 16) return { column: index, row: 0 };
  if (index < 31) return { column: 15, row: index - 15 };
  if (index < 46) return { column: 45 - index, row: 15 };
  return { column: 0, row: 60 - index };
}

function safetyCells(color: Color) {
  if (color === "blue") return [1, 2, 3, 4, 5].map((row) => ({ column: 2, row }));
  if (color === "red") return [13, 12, 11, 10, 9].map((column) => ({ column, row: 2 }));
  if (color === "yellow") return [13, 12, 11, 10, 9].map((row) => ({ column: 13, row }));
  return [1, 2, 3, 4, 5].map((column) => ({ column, row: 13 }));
}

function startCells(color: Color) {
  if (color === "blue") return [{ column: 4, row: 12 }, { column: 5, row: 12 }, { column: 4, row: 13 }, { column: 5, row: 13 }];
  if (color === "red") return [{ column: 11, row: 4 }, { column: 12, row: 4 }, { column: 11, row: 5 }, { column: 12, row: 5 }];
  if (color === "yellow") return [{ column: 11, row: 10 }, { column: 12, row: 10 }, { column: 11, row: 11 }, { column: 12, row: 11 }];
  return [{ column: 3, row: 4 }, { column: 4, row: 4 }, { column: 3, row: 5 }, { column: 4, row: 5 }];
}

function homeCells(color: Color) {
  if (color === "blue") return [{ column: 4, row: 8 }, { column: 5, row: 8 }, { column: 4, row: 9 }, { column: 5, row: 9 }];
  if (color === "red") return [{ column: 7, row: 4 }, { column: 8, row: 4 }, { column: 7, row: 5 }, { column: 8, row: 5 }];
  if (color === "yellow") return [{ column: 10, row: 7 }, { column: 11, row: 7 }, { column: 10, row: 8 }, { column: 11, row: 8 }];
  return [{ column: 7, row: 10 }, { column: 8, row: 10 }, { column: 7, row: 11 }, { column: 8, row: 11 }];
}

function ownPawnAtProgress(side: Side, progress: number, exceptIndex: number) {
  return side.pawns.some((pawn, index) => index !== exceptIndex && pawn.progress === progress && !isHome(pawn));
}

function pawnAtAbsolute(sides: State["sides"], absolute: number, exclude?: { side: Color; pawnIndex: number }) {
  for (const color of TURN_ORDER) {
    const side = sides[color];
    for (let pawnIndex = 0; pawnIndex < side.pawns.length; pawnIndex += 1) {
      if (exclude?.side === color && exclude.pawnIndex === pawnIndex) continue;
      const pawn = side.pawns[pawnIndex]!;
      if (isHome(pawn) || isSafe(pawn)) continue;
      if (absoluteFor(side, pawn.progress) === absolute) {
        return { side: color, pawnIndex };
      }
    }
  }
  return null;
}

function slideFor(side: Color, absolute: number) {
  return SLIDES.find((slide) => slide.start === absolute && slide.color !== side) ?? null;
}

function progressForAbsolute(side: Side, absolute: number) {
  return (absolute - side.startIndex + TRACK_LENGTH) % TRACK_LENGTH;
}

function addMove(
  moves: Move[],
  side: Side,
  pawnIndex: number,
  card: Card,
  targetProgress: number,
  label: string,
) {
  if (targetProgress > HOME_PROGRESS || targetProgress < 0) return;
  if (targetProgress !== HOME_PROGRESS && ownPawnAtProgress(side, targetProgress, pawnIndex)) return;
  moves.push({
    side: side.color,
    pawnIndex,
    card,
    progress: side.pawns[pawnIndex]!.progress,
    targetProgress,
    targetAbsolute: absoluteFor(side, targetProgress),
    label,
  });
}

function legalMoves(state: State, color = state.current, card = state.card): Move[] {
  if (card === null) return [];
  const side = state.sides[color];
  const moves: Move[] = [];

  side.pawns.forEach((pawn, pawnIndex) => {
    if (isHome(pawn)) return;
    if (pawn.progress < 0) {
      if (card === 1 || card === 2) {
        addMove(moves, side, pawnIndex, card, 0, `pawn ${pawnIndex + 1} out of start`);
      }
      if (card === "sorry") {
        for (const rivalColor of TURN_ORDER) {
          if (rivalColor === color) continue;
          const rival = state.sides[rivalColor];
          rival.pawns.forEach((targetPawn, targetIndex) => {
            const absolute = absoluteFor(rival, targetPawn.progress);
            if (absolute === null || isSafe(targetPawn) || isHome(targetPawn)) return;
            moves.push({
              side: color,
              pawnIndex,
              card,
              progress: pawn.progress,
              targetProgress: progressForAbsolute(side, absolute),
              targetAbsolute: absolute,
              sorryTarget: { side: rivalColor, pawnIndex: targetIndex },
              label: `SORRY! pawn ${pawnIndex + 1} bumps ${SIDE_META[rivalColor].label} ${targetIndex + 1}`,
            });
          });
        }
      }
      return;
    }

    if (card === "sorry") return;
    if (card === 4) {
      addMove(moves, side, pawnIndex, card, Math.max(0, pawn.progress - 4), `pawn ${pawnIndex + 1} back 4`);
      return;
    }
    if (card === 10) {
      addMove(moves, side, pawnIndex, card, pawn.progress + 10, `pawn ${pawnIndex + 1} forward 10`);
      addMove(moves, side, pawnIndex, card, Math.max(0, pawn.progress - 1), `pawn ${pawnIndex + 1} back 1`);
      return;
    }
    if (card === 11) {
      addMove(moves, side, pawnIndex, card, pawn.progress + 11, `pawn ${pawnIndex + 1} forward 11`);
      const fromAbsolute = absoluteFor(side, pawn.progress);
      if (fromAbsolute !== null && !isSafe(pawn)) {
        for (const rivalColor of TURN_ORDER) {
          if (rivalColor === color) continue;
          const rival = state.sides[rivalColor];
          rival.pawns.forEach((targetPawn, targetIndex) => {
            const absolute = absoluteFor(rival, targetPawn.progress);
            if (absolute === null || isSafe(targetPawn) || isHome(targetPawn)) return;
            moves.push({
              side: color,
              pawnIndex,
              card,
              progress: pawn.progress,
              targetProgress: progressForAbsolute(side, absolute),
              targetAbsolute: absolute,
              sorryTarget: { side: rivalColor, pawnIndex: targetIndex },
              label: `swap pawn ${pawnIndex + 1} with ${SIDE_META[rivalColor].label} ${targetIndex + 1}`,
            });
          });
        }
      }
      return;
    }
    if (typeof card === "number") {
      addMove(moves, side, pawnIndex, card, pawn.progress + card, `pawn ${pawnIndex + 1} forward ${card}`);
    }
  });

  return moves;
}

function applySlideAndBump(sides: State["sides"], color: Color, pawnIndex: number) {
  const side = sides[color];
  const pawn = side.pawns[pawnIndex]!;
  const absolute = absoluteFor(side, pawn.progress);
  if (absolute === null) return "";

  let message = "";
  const slide = slideFor(color, absolute);
  if (slide) {
    const slideTarget = progressForAbsolute(side, slide.end);
    side.pawns[pawnIndex] = { progress: slideTarget };
    message = `${side.label} pawn slid to the circle.`;
    for (let step = slide.start; step !== (slide.end + 1) % TRACK_LENGTH; step = (step + 1) % TRACK_LENGTH) {
      const victim = pawnAtAbsolute(sides, step, { side: color, pawnIndex });
      if (victim) {
        sides[victim.side].pawns[victim.pawnIndex] = { progress: -1 };
      }
      if (step === slide.end) break;
    }
    return message;
  }

  const victim = pawnAtAbsolute(sides, absolute, { side: color, pawnIndex });
  if (victim) {
    sides[victim.side].pawns[victim.pawnIndex] = { progress: -1 };
    message = `${side.label} bumped ${SIDE_META[victim.side].label} back to start.`;
  }
  return message;
}

function applyMove(state: State, move: Move): State {
  const sides = cloneSides(state.sides);
  const side = sides[move.side];
  let message = `${side.label} ${move.label}.`;

  if ((move.card === "sorry" || move.card === 11) && move.sorryTarget) {
    const target = sides[move.sorryTarget.side].pawns[move.sorryTarget.pawnIndex]!;
    if (move.card === 11 && move.progress >= 0) {
      target.progress = move.progress;
    } else {
      target.progress = -1;
    }
  }

  side.pawns[move.pawnIndex] = { progress: move.targetProgress };
  const slideOrBumpMessage = applySlideAndBump(sides, move.side, move.pawnIndex);
  if (slideOrBumpMessage) message = slideOrBumpMessage;

  const winner = TURN_ORDER.find((color) => sides[color].pawns.every(isHome)) ?? null;
  const score = winner === "blue" ? Math.max(1, 2000 - state.moves * 12) : state.bestScore;
  return {
    ...state,
    sides,
    phase: winner ? (winner === "blue" ? "won" : "lost") : "animating",
    winner,
    bestScore: Math.max(state.bestScore, score),
    message: winner ? `${SIDE_META[winner].label} got every pawn Home.` : message,
  };
}

function drawForTurn(state: State, color = state.current): State {
  if (state.phase === "won" || state.phase === "lost") return createState(state.bestScore);
  const card = drawCard();
  const choosingState = {
    ...state,
    phase: "choosing" as Phase,
    current: color,
    card,
    selectedMove: 0,
    moves: state.moves + 1,
    message: `${SIDE_META[color].label} drew ${cardLabel(card)}.`,
  };
  const moves = legalMoves(choosingState, color, card);
  if (moves.length === 0) {
    return {
      ...choosingState,
      phase: "animating",
      message: `${SIDE_META[color].label} drew ${cardLabel(card)}, but has no legal move.`,
    };
  }
  return choosingState;
}

function scoreMove(move: Move) {
  let score = move.targetProgress;
  if (move.targetProgress >= HOME_PROGRESS) score += 300;
  if (move.targetProgress >= TRACK_LENGTH) score += 120;
  if (move.card === "sorry" || move.sorryTarget) score += 80;
  return score;
}

function chooseCpuMove(state: State) {
  const moves = legalMoves(state);
  return moves.toSorted((a, b) => scoreMove(b) - scoreMove(a))[0] ?? null;
}

function passTurn(state: State): State {
  return {
    ...state,
    phase: "ready",
    current: nextTurn(state.current),
    card: null,
    selectedMove: 0,
    message: `${SIDE_META[nextTurn(state.current)].label}'s turn. Draw a card.`,
  };
}

function playCpuTurns(state: State): State {
  let nextState = state;
  let guard = 0;
  while (nextState.current !== "blue" && nextState.phase !== "won" && nextState.phase !== "lost" && guard < 3) {
    nextState = drawForTurn(nextState, nextState.current);
    const move = chooseCpuMove(nextState);
    if (move) {
      nextState = applyMove(nextState, move);
    }
    if (nextState.phase === "won" || nextState.phase === "lost") return nextState;
    nextState = passTurn(nextState);
    guard += 1;
  }
  return nextState;
}

function pawnCell(side: Side, pawn: Pawn, index: number) {
  if (pawn.progress < 0) return startCells(side.color)[index]!;
  if (isHome(pawn)) return homeCells(side.color)[index]!;
  if (isSafe(pawn)) return safetyCells(side.color)[Math.min(4, pawn.progress - TRACK_LENGTH)]!;
  const absolute = absoluteFor(side, pawn.progress);
  return cellForTrack(absolute ?? side.startIndex);
}

export function SorrySprintGame() {
  const initialState = createState(readStoredNumber(STORAGE_KEY));
  const [state, setState] = useState(initialState);
  const stateRef = useRef(initialState);
  const allTrackCells = useMemo(() => Array.from({ length: TRACK_LENGTH }, (_, index) => ({ index, ...cellForTrack(index) })), []);

  function sync(nextState: State) {
    stateRef.current = nextState;
    setState(nextState);
    writeStoredNumber(STORAGE_KEY, nextState.bestScore);
  }

  function restart() {
    sync(createState(stateRef.current.bestScore));
  }

  function finishTurn(nextState = stateRef.current) {
    if (nextState.phase === "won" || nextState.phase === "lost") {
      sync(nextState);
      return;
    }
    sync(playCpuTurns(passTurn(nextState)));
  }

  function drawOrContinue() {
    const current = stateRef.current;
    if (current.phase === "won" || current.phase === "lost") {
      restart();
      return;
    }
    if (current.current !== "blue") return;
    if (current.phase === "animating") {
      finishTurn(current);
      return;
    }
    const nextState = drawForTurn(current, "blue");
    const moves = legalMoves(nextState);
    if (moves.length === 0) {
      finishTurn(nextState);
      return;
    }
    sync(nextState);
  }

  function chooseMove(index: number) {
    const current = stateRef.current;
    const moves = legalMoves(current);
    const move = moves[index];
    if (!move || current.current !== "blue") return;
    const moved = applyMove(current, move);
    if (moved.phase === "won" || moved.phase === "lost") {
      sync(moved);
      return;
    }
    finishTurn(moved);
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    const moves = legalMoves(stateRef.current);
    if (key === " " || key === "enter") {
      event.preventDefault();
      if (stateRef.current.phase === "choosing" && moves.length > 0) {
        chooseMove(stateRef.current.selectedMove);
      } else {
        drawOrContinue();
      }
    } else if (key === "arrowright" || key === "d") {
      event.preventDefault();
      if (moves.length > 0) {
        const selectedMove = (stateRef.current.selectedMove + 1) % moves.length;
        sync({ ...stateRef.current, selectedMove });
      }
    } else if (key === "arrowleft" || key === "a") {
      event.preventDefault();
      if (moves.length > 0) {
        const selectedMove = (stateRef.current.selectedMove - 1 + moves.length) % moves.length;
        sync({ ...stateRef.current, selectedMove });
      }
    } else if (key === "r") {
      event.preventDefault();
      restart();
    }
  });

  useEffect(() => {
    const handler = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const moves = legalMoves(state);
  const selectedMove = moves[state.selectedMove] ?? null;
  const blueHome = state.sides.blue.pawns.filter(isHome).length;

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "Turn", value: SIDE_META[state.current].label },
          { label: "Card", value: cardLabel(state.card) },
          { label: "Home", value: `${blueHome}/4` },
          { label: "Best", value: state.bestScore },
        ]}
        actions={
          <>
            <GameButton variant="primary" onClick={drawOrContinue}>
              {state.phase === "choosing" ? "Play" : state.phase === "won" || state.phase === "lost" ? "New Game" : "Draw"}
            </GameButton>
            <GameButton onClick={restart}>Restart</GameButton>
          </>
        }
      />
      <GamePlayfield className="mx-auto aspect-square w-full max-w-[min(38rem,60dvh)] touch-none border-0 bg-[#f4d64a] p-3">
        <div
          className="relative grid h-full w-full overflow-hidden rounded-[1.4rem] border-4 border-[#203d86] bg-[#ffe880] shadow-[inset_0_6px_rgba(255,255,255,0.45),0_18px_50px_rgba(0,0,0,0.25)]"
          style={{ gridTemplateColumns: `repeat(${BOARD_CELLS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${BOARD_CELLS}, minmax(0, 1fr))` }}
        >
          <div className="absolute inset-[24%] grid place-items-center rounded-[1.2rem] border-4 border-[#203d86] bg-white/80 text-center shadow-inner">
            <div>
              <div className="text-3xl font-black uppercase tracking-[0.08em] text-[#e62e38] drop-shadow-[2px_2px_0_#203d86]">Sorry!</div>
              <div className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.2em] text-[#203d86]">draw - bump - slide - home</div>
            </div>
          </div>

          {allTrackCells.map((cell) => {
            const slide = SLIDES.find((candidate) => candidate.start === cell.index || candidate.end === cell.index);
            return (
              <div
                key={cell.index}
                className="relative m-[5%] rounded-md border-2 border-[#203d86] bg-white shadow-[inset_0_2px_rgba(255,255,255,0.7)]"
                style={{ gridColumn: cell.column + 1, gridRow: cell.row + 1 }}
              >
                {slide ? (
                  <span
                    className="absolute inset-1 rounded-sm opacity-80"
                    style={{ backgroundColor: SIDE_META[slide.color].color }}
                  />
                ) : null}
                {SLIDES.some((candidate) => candidate.start === cell.index) ? (
                  <span className="absolute inset-0 grid place-items-center text-[0.55rem] font-black text-white">SLIDE</span>
                ) : null}
              </div>
            );
          })}

          {TURN_ORDER.flatMap((color) =>
            safetyCells(color).map((cell, index) => (
              <div
                key={`${color}-safe-${index}`}
                className="m-[7%] rounded-md border-2 border-white/80 shadow-inner"
                style={{
                  gridColumn: cell.column + 1,
                  gridRow: cell.row + 1,
                  backgroundColor: SIDE_META[color].color,
                  boxShadow: `0 0 12px ${SIDE_META[color].glow}`,
                }}
              />
            )),
          )}

          {TURN_ORDER.map((color) => (
            <div
              key={`${color}-start`}
              className="grid place-items-center rounded-full border-4 bg-white/70 text-[0.56rem] font-black uppercase tracking-[0.12em] shadow-md"
              style={{
                gridColumn: color === "blue" || color === "green" ? "4 / span 3" : "11 / span 3",
                gridRow: color === "blue" || color === "yellow" ? "11 / span 3" : "4 / span 3",
                borderColor: SIDE_META[color].color,
                color: SIDE_META[color].dark,
              }}
            >
              Start
            </div>
          ))}

          {TURN_ORDER.map((color) => (
            <div
              key={`${color}-home`}
              className="grid place-items-center rounded-full border-4 bg-white/80 text-[0.6rem] font-black uppercase tracking-[0.12em] shadow-md"
              style={{
                gridColumn: color === "blue" ? "4 / span 3" : color === "red" ? "7 / span 3" : color === "yellow" ? "10 / span 3" : "7 / span 3",
                gridRow: color === "blue" ? "8 / span 3" : color === "red" ? "4 / span 3" : color === "yellow" ? "7 / span 3" : "10 / span 3",
                borderColor: SIDE_META[color].color,
                color: SIDE_META[color].dark,
              }}
            >
              Home
            </div>
          ))}

          {TURN_ORDER.flatMap((color) =>
            state.sides[color].pawns.map((pawn, pawnIndex) => {
              const cell = pawnCell(state.sides[color], pawn, pawnIndex);
              const active =
                selectedMove?.side === color &&
                selectedMove.pawnIndex === pawnIndex &&
                state.current === "blue";
              return (
                <button
                  key={`${color}-${pawnIndex}`}
                  type="button"
                  aria-label={`${SIDE_META[color].label} pawn ${pawnIndex + 1}`}
                  onClick={() => {
                    const moveIndex = moves.findIndex((move) => move.side === color && move.pawnIndex === pawnIndex);
                    if (moveIndex >= 0) chooseMove(moveIndex);
                  }}
                  className="absolute z-20 h-[6.2%] w-[6.2%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_4px_10px_rgba(0,0,0,0.35)] transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  style={{
                    left: `${((cell.column + 0.5) / BOARD_CELLS) * 100}%`,
                    top: `${((cell.row + 0.5) / BOARD_CELLS) * 100}%`,
                    background: `radial-gradient(circle at 34% 26%, white 0 9%, ${SIDE_META[color].color} 10% 62%, ${SIDE_META[color].dark} 63%)`,
                    boxShadow: active ? `0 0 0 4px white, 0 0 24px ${SIDE_META[color].glow}` : `0 4px 10px rgba(0,0,0,0.35)`,
                  }}
                />
              );
            }),
          )}
        </div>
      </GamePlayfield>

      {state.phase === "choosing" && moves.length > 0 ? (
        <TouchControls className="max-w-[34rem]">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {moves.slice(0, 6).map((move, index) => (
              <GameButton
                key={`${move.pawnIndex}-${move.label}`}
                variant={index === state.selectedMove ? "primary" : "touch"}
                onClick={() => chooseMove(index)}
              >
                {move.label}
              </GameButton>
            ))}
          </div>
        </TouchControls>
      ) : null}

      <GameStatus>
        {state.message} Space/Enter draws or confirms. A/D choose a move. R restarts.
      </GameStatus>
    </GamePanel>
  );
}
