"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
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

const STORAGE_KEY = "arcade.sorry.bestScore.v3";
const TRACK_LENGTH = 60;
const SAFETY_START = 60;
const HOME_PROGRESS = 65;
const BOARD_CELLS = 16;
const PAWNS_PER_SIDE = 4;

const CARD_RANKS = [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, "sorry"] as const;

type Card = (typeof CARD_RANKS)[number];
type Color = "blue" | "red" | "yellow" | "green";
type Phase = "ready" | "choosing" | "game-over";
type Pawn = { progress: number };
type Side = {
  color: Color;
  label: string;
  startIndex: number;
  pawns: Pawn[];
};
type MoveKind = "enter" | "forward" | "back" | "minus-one" | "swap" | "sorry";
type Move = {
  kind: MoveKind;
  side: Color;
  pawnIndex: number;
  targetProgress: number;
  label: string;
  target?: { side: Color; pawnIndex: number };
};
type SplitMove = {
  first: Move;
  second: Move | null;
  label: string;
};
type TurnOption = Move | SplitMove;
type State = {
  phase: Phase;
  sides: Record<Color, Side>;
  current: Color;
  card: Card | null;
  deck: Card[];
  discard: Card[];
  turns: number;
  bestScore: number;
  selectedMove: number;
  winner: Color | null;
  message: string;
  log: string[];
};

const TURN_ORDER: Color[] = ["blue", "red", "yellow", "green"];
const SIDE_META: Record<Color, { label: string; startIndex: number; color: string; dark: string; pale: string; glow: string }> = {
  blue: { label: "Blue", startIndex: 4, color: "#2089ff", dark: "#113f9a", pale: "#cfe7ff", glow: "rgba(32,137,255,0.42)" },
  red: { label: "Red", startIndex: 19, color: "#ef3340", dark: "#991b1b", pale: "#ffd3d7", glow: "rgba(239,51,64,0.42)" },
  yellow: { label: "Yellow", startIndex: 34, color: "#ffd43b", dark: "#9a6700", pale: "#fff4bf", glow: "rgba(255,212,59,0.42)" },
  green: { label: "Green", startIndex: 49, color: "#18b957", dark: "#087335", pale: "#c9f7dc", glow: "rgba(24,185,87,0.42)" },
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

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap]!, copy[index]!];
  }
  return copy;
}

function createDeck() {
  const cards: Card[] = [];
  for (const rank of CARD_RANKS) {
    const count = rank === 1 ? 5 : 4;
    for (let index = 0; index < count; index += 1) cards.push(rank);
  }
  return shuffle(cards);
}

function cardLabel(card: Card | null) {
  if (card === null) return "-";
  if (card === "sorry") return "SORRY!";
  if (card === 4) return "BACK 4";
  if (card === 7) return "SPLIT 7";
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
    deck: createDeck(),
    discard: [],
    turns: 0,
    bestScore,
    selectedMove: 0,
    winner: null,
    message: "Draw a card. Get all four blue pawns from Start to Home before the CPU colors do.",
    log: ["Classic-inspired rules: 1 or 2 starts, 4 moves back, 7 can split, 10 can move -1, 11 can swap, Sorry! bumps from Start."],
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

function nextTurn(color: Color) {
  return TURN_ORDER[(TURN_ORDER.indexOf(color) + 1) % TURN_ORDER.length]!;
}

function drawFromDeck(state: State): Pick<State, "card" | "deck" | "discard"> {
  const deck = state.deck.length > 0 ? [...state.deck] : createDeck();
  const card = deck.shift()!;
  return {
    card,
    deck,
    discard: [...state.discard, card].slice(-8),
  };
}

function isHome(pawn: Pawn) {
  return pawn.progress >= HOME_PROGRESS;
}

function isSafe(pawn: Pawn) {
  return pawn.progress >= SAFETY_START && pawn.progress < HOME_PROGRESS;
}

function absoluteFor(side: Side, progress: number) {
  if (progress < 0 || progress >= TRACK_LENGTH) return null;
  return (side.startIndex + progress) % TRACK_LENGTH;
}

function progressForAbsolute(side: Side, absolute: number) {
  return (absolute - side.startIndex + TRACK_LENGTH) % TRACK_LENGTH;
}

function ownPawnAt(side: Side, progress: number, exceptIndex: number) {
  return side.pawns.some((pawn, index) => index !== exceptIndex && !isHome(pawn) && pawn.progress === progress);
}

function addProgressMove(moves: Move[], side: Side, pawnIndex: number, targetProgress: number, kind: MoveKind, label: string) {
  if (targetProgress < 0 || targetProgress > HOME_PROGRESS) return;
  if (targetProgress !== HOME_PROGRESS && ownPawnAt(side, targetProgress, pawnIndex)) return;
  moves.push({ kind, side: side.color, pawnIndex, targetProgress, label });
}

function baseMovesForCard(state: State, color: Color, card: Card): Move[] {
  const side = state.sides[color];
  const moves: Move[] = [];

  side.pawns.forEach((pawn, pawnIndex) => {
    if (isHome(pawn)) return;

    if (pawn.progress < 0) {
      if (card === 1 || card === 2) {
        addProgressMove(moves, side, pawnIndex, 0, "enter", `Pawn ${pawnIndex + 1}: leave Start`);
      }
      if (card === "sorry") {
        for (const rivalColor of TURN_ORDER) {
          if (rivalColor === color) continue;
          const rival = state.sides[rivalColor];
          rival.pawns.forEach((targetPawn, targetIndex) => {
            const absolute = absoluteFor(rival, targetPawn.progress);
            if (absolute === null || isSafe(targetPawn) || isHome(targetPawn)) return;
            const targetProgress = progressForAbsolute(side, absolute);
            if (ownPawnAt(side, targetProgress, pawnIndex)) return;
            moves.push({
              kind: "sorry",
              side: color,
              pawnIndex,
              targetProgress,
              target: { side: rivalColor, pawnIndex: targetIndex },
              label: `Pawn ${pawnIndex + 1}: Sorry! ${SIDE_META[rivalColor].label} ${targetIndex + 1}`,
            });
          });
        }
      }
      return;
    }

    if (card === "sorry") return;
    if (card === 4) {
      const target = pawn.progress - 4;
      addProgressMove(moves, side, pawnIndex, target < 0 ? TRACK_LENGTH + target : target, "back", `Pawn ${pawnIndex + 1}: back 4`);
      return;
    }
    if (card === 10) {
      addProgressMove(moves, side, pawnIndex, pawn.progress + 10, "forward", `Pawn ${pawnIndex + 1}: forward 10`);
      addProgressMove(moves, side, pawnIndex, pawn.progress - 1 < 0 ? TRACK_LENGTH - 1 : pawn.progress - 1, "minus-one", `Pawn ${pawnIndex + 1}: back 1`);
      return;
    }
    if (card === 11) {
      addProgressMove(moves, side, pawnIndex, pawn.progress + 11, "forward", `Pawn ${pawnIndex + 1}: forward 11`);
      const fromAbsolute = absoluteFor(side, pawn.progress);
      if (fromAbsolute !== null && !isSafe(pawn)) {
        for (const rivalColor of TURN_ORDER) {
          if (rivalColor === color) continue;
          const rival = state.sides[rivalColor];
          rival.pawns.forEach((targetPawn, targetIndex) => {
            const absolute = absoluteFor(rival, targetPawn.progress);
            if (absolute === null || isSafe(targetPawn) || isHome(targetPawn)) return;
            moves.push({
              kind: "swap",
              side: color,
              pawnIndex,
              targetProgress: progressForAbsolute(side, absolute),
              target: { side: rivalColor, pawnIndex: targetIndex },
              label: `Pawn ${pawnIndex + 1}: swap with ${SIDE_META[rivalColor].label} ${targetIndex + 1}`,
            });
          });
        }
      }
      return;
    }
    if (typeof card === "number") {
      addProgressMove(moves, side, pawnIndex, pawn.progress + card, "forward", `Pawn ${pawnIndex + 1}: forward ${card}`);
    }
  });

  return moves;
}

function absoluteOccupant(sides: State["sides"], absolute: number, exclude?: { side: Color; pawnIndex: number }) {
  for (const color of TURN_ORDER) {
    const side = sides[color];
    for (let pawnIndex = 0; pawnIndex < side.pawns.length; pawnIndex += 1) {
      if (exclude?.side === color && exclude.pawnIndex === pawnIndex) continue;
      const pawn = side.pawns[pawnIndex]!;
      if (isHome(pawn) || isSafe(pawn)) continue;
      if (absoluteFor(side, pawn.progress) === absolute) return { side: color, pawnIndex };
    }
  }
  return null;
}

function slideFor(color: Color, absolute: number) {
  return SLIDES.find((slide) => slide.start === absolute && slide.color !== color) ?? null;
}

function applySlideAndBumps(sides: State["sides"], color: Color, pawnIndex: number) {
  const side = sides[color];
  const pawn = side.pawns[pawnIndex]!;
  const absolute = absoluteFor(side, pawn.progress);
  if (absolute === null) return "";

  const slide = slideFor(color, absolute);
  if (slide) {
    for (let current = slide.start; ; current = (current + 1) % TRACK_LENGTH) {
      const victim = absoluteOccupant(sides, current, { side: color, pawnIndex });
      if (victim) sides[victim.side].pawns[victim.pawnIndex] = { progress: -1 };
      if (current === slide.end) break;
    }
    side.pawns[pawnIndex] = { progress: progressForAbsolute(side, slide.end) };
    return `${side.label} pawn took a slide to ${slide.end + 1}.`;
  }

  const victim = absoluteOccupant(sides, absolute, { side: color, pawnIndex });
  if (victim) {
    sides[victim.side].pawns[victim.pawnIndex] = { progress: -1 };
    return `${side.label} bumped ${SIDE_META[victim.side].label} back to Start.`;
  }

  return "";
}

function applySingleMove(state: State, move: Move): { state: State; note: string } {
  const sides = cloneSides(state.sides);
  const side = sides[move.side];
  const pawn = side.pawns[move.pawnIndex]!;
  let note = `${side.label} ${move.label}.`;

  if ((move.kind === "sorry" || move.kind === "swap") && move.target) {
    const targetSide = sides[move.target.side];
    const targetPawn = targetSide.pawns[move.target.pawnIndex]!;
    if (move.kind === "swap" && pawn.progress >= 0) {
      targetPawn.progress = progressForAbsolute(targetSide, absoluteFor(side, pawn.progress) ?? targetSide.startIndex);
      note = `${side.label} swapped with ${targetSide.label}.`;
    } else {
      targetPawn.progress = -1;
      note = `${side.label} said Sorry and sent ${targetSide.label} home.`;
    }
  }

  side.pawns[move.pawnIndex] = { progress: move.targetProgress };
  const slideOrBump = applySlideAndBumps(sides, move.side, move.pawnIndex);
  if (slideOrBump) note = slideOrBump;

  return { state: { ...state, sides }, note };
}

function simulateMove(state: State, move: Move) {
  return applySingleMove(state, move).state;
}

function splitMovesForSeven(state: State, color: Color): SplitMove[] {
  const firstMoves = baseMovesForCard(state, color, 7).filter((move) => move.kind === "forward");
  const splitMoves: SplitMove[] = [];
  const side = state.sides[color];

  side.pawns.forEach((pawn, firstPawnIndex) => {
    if (pawn.progress < 0 || isHome(pawn)) return;
    for (let firstSteps = 1; firstSteps <= 6; firstSteps += 1) {
      const firstTarget = pawn.progress + firstSteps;
      const first: Move = {
        kind: "forward",
        side: color,
        pawnIndex: firstPawnIndex,
        targetProgress: firstTarget,
        label: `Pawn ${firstPawnIndex + 1}: ${firstSteps}`,
      };
      if (firstTarget > HOME_PROGRESS || (firstTarget !== HOME_PROGRESS && ownPawnAt(side, firstTarget, firstPawnIndex))) continue;
      const intermediate = simulateMove(state, first);
      const remaining = 7 - firstSteps;
      const secondSide = intermediate.sides[color];
      secondSide.pawns.forEach((secondPawn, secondPawnIndex) => {
        if (secondPawnIndex === firstPawnIndex || secondPawn.progress < 0 || isHome(secondPawn)) return;
        const secondTarget = secondPawn.progress + remaining;
        if (secondTarget > HOME_PROGRESS || (secondTarget !== HOME_PROGRESS && ownPawnAt(secondSide, secondTarget, secondPawnIndex))) return;
        const second: Move = {
          kind: "forward",
          side: color,
          pawnIndex: secondPawnIndex,
          targetProgress: secondTarget,
          label: `Pawn ${secondPawnIndex + 1}: ${remaining}`,
        };
        splitMoves.push({
          first,
          second,
          label: `Split 7: pawn ${firstPawnIndex + 1} moves ${firstSteps}, pawn ${secondPawnIndex + 1} moves ${remaining}`,
        });
      });
    }
  });

  return [
    ...firstMoves.map((move) => ({ first: move, second: null, label: move.label })),
    ...splitMoves,
  ];
}

function legalOptions(state: State, color = state.current, card = state.card): TurnOption[] {
  if (card === null) return [];
  if (card === 7) return splitMovesForSeven(state, color);
  return baseMovesForCard(state, color, card);
}

function optionLabel(option: TurnOption) {
  return "first" in option ? option.label : option.label;
}

function optionScore(option: TurnOption) {
  const scoreMove = (move: Move) => {
    let score = move.targetProgress;
    if (move.targetProgress >= SAFETY_START) score += 80;
    if (move.targetProgress >= HOME_PROGRESS) score += 260;
    if (move.kind === "sorry" || move.kind === "swap") score += 120;
    if (move.kind === "back" || move.kind === "minus-one") score -= 10;
    return score;
  };

  if ("first" in option) return scoreMove(option.first) + (option.second ? scoreMove(option.second) : 0);
  return scoreMove(option);
}

function playerScore(state: State) {
  const blue = state.sides.blue.pawns;
  const homeScore = blue.filter(isHome).length * 500;
  const safetyScore = blue.filter(isSafe).length * 130;
  const boardScore = blue.reduce((total, pawn) => {
    if (pawn.progress < 0 || isHome(pawn)) return total;
    return total + Math.max(0, Math.min(pawn.progress, SAFETY_START));
  }, 0);
  const tempoBonus = Math.max(0, 600 - state.turns * 8);
  return homeScore + safetyScore + boardScore + tempoBonus;
}

function applyOption(state: State, option: TurnOption): State {
  const firstResult = applySingleMove(state, "first" in option ? option.first : option);
  const secondResult = "first" in option && option.second ? applySingleMove(firstResult.state, option.second) : null;
  const nextState = secondResult?.state ?? firstResult.state;
  const notes = [firstResult.note, secondResult?.note].filter(Boolean).join(" ");
  const winner = TURN_ORDER.find((color) => nextState.sides[color].pawns.every(isHome)) ?? null;
  const score = winner === "blue" ? Math.max(playerScore(nextState), 2500 - state.turns * 12) : state.bestScore;

  return {
    ...nextState,
    phase: winner ? "game-over" : "ready",
    current: winner || state.card === 2 ? state.current : nextTurn(state.current),
    card: null,
    selectedMove: 0,
    winner,
    bestScore: Math.max(state.bestScore, score),
    message: winner ? `${SIDE_META[winner].label} got all four pawns Home.` : `${notes}${state.card === 2 ? " Draw again." : ""}`,
    log: [`${SIDE_META[state.current].label}: ${cardLabel(state.card)} - ${optionLabel(option)}`, ...state.log].slice(0, 5),
  };
}

function drawForCurrent(state: State): State {
  if (state.phase === "game-over") return createState(state.bestScore);
  const draw = drawFromDeck(state);
  const nextState = {
    ...state,
    ...draw,
    phase: "choosing" as Phase,
    turns: state.turns + 1,
    selectedMove: 0,
    message: `${SIDE_META[state.current].label} drew ${cardLabel(draw.card)}.`,
  };
  const options = legalOptions(nextState, state.current, draw.card);
  if (options.length === 0) {
    return {
      ...nextState,
      phase: "ready",
      current: draw.card === 2 ? state.current : nextTurn(state.current),
      card: null,
      message: `${SIDE_META[state.current].label} drew ${cardLabel(draw.card)} but had no legal move.${draw.card === 2 ? " Draw again." : ""}`,
      log: [`${SIDE_META[state.current].label}: ${cardLabel(draw.card)} - no move`, ...state.log].slice(0, 5),
    };
  }
  return nextState;
}

function playCpuUntilBlue(state: State): State {
  let nextState = state;
  let guard = 0;
  while (nextState.current !== "blue" && nextState.phase !== "game-over" && guard < 20) {
    nextState = drawForCurrent(nextState);
    if (nextState.phase === "choosing") {
      const option = legalOptions(nextState).toSorted((a, b) => optionScore(b) - optionScore(a))[0];
      if (option) nextState = applyOption(nextState, option);
    }
    guard += 1;
  }
  return nextState;
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

function pawnCell(side: Side, pawn: Pawn, index: number) {
  if (pawn.progress < 0) return startCells(side.color)[index]!;
  if (isHome(pawn)) return homeCells(side.color)[index]!;
  if (isSafe(pawn)) return safetyCells(side.color)[Math.min(4, pawn.progress - SAFETY_START)]!;
  const absolute = absoluteFor(side, pawn.progress);
  return cellForTrack(absolute ?? side.startIndex);
}

function moveOptionMatchesPawn(option: TurnOption, color: Color, pawnIndex: number) {
  if ("first" in option) {
    return (
      (option.first.side === color && option.first.pawnIndex === pawnIndex) ||
      (option.second?.side === color && option.second.pawnIndex === pawnIndex)
    );
  }
  return option.side === color && option.pawnIndex === pawnIndex;
}

function MovePanel({
  options,
  selectedMove,
  chooseMove,
  setSelectedMove,
}: {
  options: TurnOption[];
  selectedMove: number;
  chooseMove: (index: number) => void;
  setSelectedMove: (index: number) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-2 rounded-xl border border-[#274d9d]/25 bg-[#fff8d8] p-3 text-[#172554] shadow-[0_16px_45px_rgba(0,0,0,0.22)]">
      <div className="font-mono text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#274d9d]">Choose a legal blue move</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.slice(0, 8).map((option, index) => (
          <button
            key={`${optionLabel(option)}-${index}`}
            type="button"
            onMouseEnter={() => setSelectedMove(index)}
            onFocus={() => setSelectedMove(index)}
            onClick={() => chooseMove(index)}
            className={`rounded-lg border px-3 py-2 text-left text-sm font-black transition ${
              selectedMove === index
                ? "border-[#274d9d] bg-[#2563eb] text-white shadow-[0_0_0_3px_rgba(37,99,235,0.2)]"
                : "border-[#274d9d]/20 bg-white text-[#172554] hover:bg-[#dbeafe]"
            }`}
          >
            {optionLabel(option)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SorrySprintGame() {
  const initialState = useMemo(() => createState(readStoredNumber(STORAGE_KEY)), []);
  const [state, setState] = useState(initialState);
  const stateRef = useRef(initialState);
  const allTrackCells = useMemo(() => Array.from({ length: TRACK_LENGTH }, (_, index) => ({ index, ...cellForTrack(index) })), []);
  const options = legalOptions(state);
  const selectedOption = options[state.selectedMove] ?? null;
  const blueHome = state.sides.blue.pawns.filter(isHome).length;
  const score = playerScore(state);

  function sync(nextState: State) {
    stateRef.current = nextState;
    setState(nextState);
    writeStoredNumber(STORAGE_KEY, nextState.bestScore);
  }

  function restart() {
    sync(createState(stateRef.current.bestScore));
  }

  function drawOrNewGame() {
    const current = stateRef.current;
    if (current.phase === "game-over") {
      restart();
      return;
    }
    if (current.current !== "blue") return;
    const nextState = drawForCurrent(current);
    sync(nextState.phase === "ready" && nextState.current !== "blue" ? playCpuUntilBlue(nextState) : nextState);
  }

  function chooseMove(index: number) {
    const current = stateRef.current;
    if (current.current !== "blue" || current.phase !== "choosing") return;
    const option = legalOptions(current)[index];
    if (!option) return;
    const moved = applyOption(current, option);
    sync(moved.current === "blue" || moved.phase === "game-over" ? moved : playCpuUntilBlue(moved));
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    const currentOptions = legalOptions(stateRef.current);
    if (key === " " || key === "enter") {
      event.preventDefault();
      if (stateRef.current.phase === "choosing" && currentOptions.length > 0) {
        chooseMove(stateRef.current.selectedMove);
      } else {
        drawOrNewGame();
      }
    } else if (key === "arrowright" || key === "d") {
      event.preventDefault();
      if (currentOptions.length > 0) {
        sync({ ...stateRef.current, selectedMove: (stateRef.current.selectedMove + 1) % currentOptions.length });
      }
    } else if (key === "arrowleft" || key === "a") {
      event.preventDefault();
      if (currentOptions.length > 0) {
        sync({ ...stateRef.current, selectedMove: (stateRef.current.selectedMove - 1 + currentOptions.length) % currentOptions.length });
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

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "Turn", value: SIDE_META[state.current].label },
          { label: "Card", value: cardLabel(state.card) },
          { label: "Score", value: score },
          { label: "Blue Home", value: `${blueHome}/4` },
          { label: "Deck", value: state.deck.length },
          { label: "Best", value: state.bestScore || "--" },
        ]}
        actions={
          <>
            <GameButton variant="primary" onClick={drawOrNewGame} disabled={state.phase === "choosing" && state.current === "blue"}>
              {state.phase === "game-over" ? "New Game" : "Draw Card"}
            </GameButton>
            <GameButton onClick={restart}>Restart</GameButton>
          </>
        }
      />

      <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[minmax(22rem,40rem)_18rem] lg:items-start">
        <GamePlayfield className="aspect-square w-full touch-none border-0 bg-[#f4d64a] p-3">
          <div
            data-testid="sorry-board"
            className="relative grid h-full w-full overflow-hidden rounded-[1.4rem] border-4 border-[#203d86] bg-[#ffe880] shadow-[inset_0_6px_rgba(255,255,255,0.45),0_18px_50px_rgba(0,0,0,0.25)]"
            style={{ gridTemplateColumns: `repeat(${BOARD_CELLS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${BOARD_CELLS}, minmax(0, 1fr))` }}
          >
            <div className="pointer-events-none absolute inset-[28%] z-0 grid place-items-center rounded-[1.2rem] border-4 border-[#203d86]/80 bg-white/60 text-center shadow-inner">
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
                  className="relative z-10 m-[5%] rounded-md border-2 border-[#203d86] bg-white shadow-[inset_0_2px_rgba(255,255,255,0.7)]"
                  style={{ gridColumn: cell.column + 1, gridRow: cell.row + 1 }}
                >
                  {slide ? (
                    <span className="absolute inset-1 rounded-sm opacity-80" style={{ backgroundColor: SIDE_META[slide.color].color }} />
                  ) : null}
                  {SLIDES.some((candidate) => candidate.start === cell.index) ? (
                    <span className="absolute inset-0 grid place-items-center text-[0.52rem] font-black text-white">SLIDE</span>
                  ) : null}
                </div>
              );
            })}

            {TURN_ORDER.flatMap((color) =>
              safetyCells(color).map((cell, index) => (
                <div
                  key={`${color}-safe-${index}`}
                  className="z-10 m-[7%] rounded-md border-2 border-white/80 shadow-inner"
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
                className="z-10 grid place-items-center rounded-full border-4 bg-white/70 text-[0.56rem] font-black uppercase tracking-[0.12em] shadow-md"
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
                className="z-10 grid place-items-center rounded-full border-4 bg-white/80 text-[0.6rem] font-black uppercase tracking-[0.12em] shadow-md"
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
                  Boolean(selectedOption) &&
                  moveOptionMatchesPawn(selectedOption, color, pawnIndex) &&
                  state.current === "blue";
                return (
                  <button
                    key={`${color}-${pawnIndex}`}
                    type="button"
                    aria-label={`${SIDE_META[color].label} pawn ${pawnIndex + 1}`}
                    onClick={() => {
                      const moveIndex = options.findIndex((option) => moveOptionMatchesPawn(option, color, pawnIndex));
                      if (moveIndex >= 0) chooseMove(moveIndex);
                    }}
                    className="absolute z-20 h-[6.2%] w-[6.2%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_4px_10px_rgba(0,0,0,0.35)] outline-none transition-[left,top,transform,box-shadow] duration-500 ease-[cubic-bezier(0.18,0.9,0.2,1)] hover:scale-110 focus-visible:ring-4 focus-visible:ring-white"
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

        <aside className="grid gap-3 rounded-xl border border-[#274d9d]/25 bg-[#fff8d8] p-3 text-[#172554] shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
          <div className="rounded-lg border border-[#274d9d]/20 bg-white/80 p-3">
            <div className="font-mono text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#274d9d]">Current Card</div>
            <div className="mt-2 grid min-h-28 place-items-center rounded-xl border-4 border-[#e62e38] bg-white text-3xl font-black text-[#203d86] shadow-inner">
              {cardLabel(state.card)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-[#274d9d]/15 bg-white/75 p-2">
              <div className="text-xs font-black uppercase text-[#274d9d]">Score</div>
              <div className="mt-1 text-2xl font-black text-[#e62e38]">{score}</div>
            </div>
            <div className="rounded-lg border border-[#274d9d]/15 bg-white/75 p-2">
              <div className="text-xs font-black uppercase text-[#274d9d]">Best</div>
              <div className="mt-1 text-2xl font-black text-[#203d86]">{state.bestScore || "--"}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {TURN_ORDER.map((color) => (
              <div key={color} className="rounded-lg border border-[#274d9d]/15 bg-white/75 p-2">
                <div className="text-xs font-black uppercase" style={{ color: SIDE_META[color].dark }}>{SIDE_META[color].label}</div>
                <div className="mt-1 text-sm font-black">{state.sides[color].pawns.filter(isHome).length}/4 Home</div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-[#274d9d]/20 bg-white/80 p-3">
            <div className="font-mono text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#274d9d]">Game Log</div>
            <div className="mt-2 grid gap-2">
              {state.log.map((item, index) => (
                <p key={`${item}-${index}`} className="rounded-md bg-[#dbeafe]/65 px-3 py-2 text-sm font-bold leading-5">
                  {item}
                </p>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <MovePanel
        options={options}
        selectedMove={state.selectedMove}
        chooseMove={chooseMove}
        setSelectedMove={(selectedMove) => sync({ ...stateRef.current, selectedMove })}
      />

      <GameStatus>
        {state.message} Draw cards, choose legal blue moves, use slides, bump rivals, and get all four pawns Home. Space/Enter confirms, A/D changes selected move, R restarts.
      </GameStatus>
    </GamePanel>
  );
}
