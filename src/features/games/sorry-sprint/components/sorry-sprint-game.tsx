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

const STORAGE_KEY = "arcade.sorrySprint.bestScore";
const pathLength = 40;
const cards = [1, 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, -4];
type Phase = "ready" | "playing" | "won" | "lost";
type Pawn = { position: number; home: boolean };
type State = {
  phase: Phase;
  pawns: Pawn[];
  rivals: Pawn[];
  card: number;
  moves: number;
  homeCount: number;
  bestScore: number;
  message: string;
};

function createState(bestScore = 0): State {
  return {
    phase: "ready",
    pawns: [{ position: -1, home: false }, { position: -1, home: false }, { position: -1, home: false }, { position: -1, home: false }],
    rivals: [{ position: 9, home: false }, { position: 19, home: false }, { position: 29, home: false }, { position: -1, home: false }],
    card: 1,
    moves: 0,
    homeCount: 0,
    bestScore,
    message: "Draw cards and race all blue pawns home.",
  };
}

function pointFor(index: number) {
  const side = Math.floor(index / 10);
  const step = index % 10;
  const inset = 7.5;
  const span = 85;
  if (side === 0) return { x: inset + step * (span / 9), y: 92.5 };
  if (side === 1) return { x: 92.5, y: 92.5 - step * (span / 9) };
  if (side === 2) return { x: 92.5 - step * (span / 9), y: 7.5 };
  return { x: 7.5, y: 7.5 + step * (span / 9) };
}

function movePawn(pawn: Pawn, card: number) {
  if (pawn.home) return pawn;
  if (pawn.position < 0) return card === 1 || card === 2 ? { ...pawn, position: 0 } : pawn;
  const next = pawn.position + card;
  if (next >= pathLength) return { position: pathLength, home: true };
  return { ...pawn, position: Math.max(0, next) };
}

function advance(state: State): State {
  if (state.phase === "won" || state.phase === "lost") return createState(state.bestScore);
  const card = cards[Math.floor(Math.random() * cards.length)]!;
  const pawnIndex = state.pawns.findIndex((pawn) => !pawn.home && (pawn.position >= 0 || card === 1 || card === 2));
  const pawns = [...state.pawns];
  if (pawnIndex >= 0) pawns[pawnIndex] = movePawn(pawns[pawnIndex]!, card);
  let rivals = state.rivals.map((rival, index) => (index === state.moves % 4 ? movePawn(rival, cards[(state.moves + index) % cards.length]!) : rival));
  const moved = pawnIndex >= 0 ? pawns[pawnIndex]! : null;
  if (moved && !moved.home) {
    rivals = rivals.map((rival) => (rival.position === moved.position ? { ...rival, position: -1 } : rival));
  }
  const homeCount = pawns.filter((pawn) => pawn.home).length;
  const rivalHome = rivals.filter((pawn) => pawn.home).length;
  const phase = homeCount === 4 ? "won" : rivalHome >= 4 ? "lost" : "playing";
  const moves = state.moves + 1;
  const bestScore = phase === "won" ? Math.max(state.bestScore, Math.max(1, 1000 - moves * 8)) : state.bestScore;
  return {
    phase,
    pawns,
    rivals,
    card,
    moves,
    homeCount,
    bestScore,
    message: phase === "won" ? "All pawns are home." : phase === "lost" ? "Rivals got home first." : `Card ${card > 0 ? card : "back 4"} moved ${pawnIndex >= 0 ? "a pawn" : "no pawn"}.`,
  };
}

export function SorrySprintGame() {
  const initialState = createState(readStoredNumber(STORAGE_KEY));
  const [state, setState] = useState(initialState);
  const stateRef = useRef(initialState);
  const boardCells = useMemo(() => Array.from({ length: pathLength }, (_, index) => index), []);

  function sync(nextState: State) {
    stateRef.current = nextState;
    setState(nextState);
    writeStoredNumber(STORAGE_KEY, nextState.bestScore);
  }

  function drawCard() {
    sync(advance(stateRef.current));
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (key === " " || key === "enter") {
      event.preventDefault();
      drawCard();
    } else if (key === "r") {
      event.preventDefault();
      sync(createState(stateRef.current.bestScore));
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
        items={[{ label: "Moves", value: state.moves }, { label: "Home", value: `${state.homeCount}/4` }, { label: "Card", value: state.card }, { label: "Best", value: state.bestScore }]}
        actions={
          <>
            <GameButton variant="primary" onClick={drawCard}>Draw</GameButton>
            <GameButton onClick={() => sync(createState(state.bestScore))}>Restart</GameButton>
          </>
        }
      />
      <GamePlayfield className="mx-auto aspect-square w-full max-w-[min(34rem,54dvh)] border-0 bg-[#f9e063] p-4">
        <div className="relative h-full rounded-[2rem] border-4 border-[#21468b] bg-[#fff4a8] shadow-[inset_0_5px_rgba(255,255,255,0.65)]">
          {boardCells.map((cell) => {
            const point = pointFor(cell);
            return <span key={cell} className="absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg border-2 border-[#263b7b] bg-white text-[0.55rem] font-black" style={{ left: `${point.x}%`, top: `${point.y}%` }}>{cell + 1}</span>;
          })}
          <div className="absolute left-1/2 top-1/2 grid h-[36%] w-[36%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-3xl border-4 border-[#e23b42] bg-[#ffffff] text-center text-lg font-black text-[#21468b]">
            SORRY<br />SPRINT
          </div>
          {[...state.pawns.map((pawn, index) => ({ pawn, index, color: "#278cff", offset: -5 })), ...state.rivals.map((pawn, index) => ({ pawn, index, color: "#ff454e", offset: 5 }))].map(({ pawn, index, color, offset }) => {
            const point = pawn.home ? { x: color === "#278cff" ? 39 + index * 4 : 39 + index * 4, y: color === "#278cff" ? 57 : 43 } : pawn.position < 0 ? { x: color === "#278cff" ? 18 + index * 5 : 62 + index * 5, y: color === "#278cff" ? 78 : 22 } : pointFor(pawn.position);
            return <span key={`${color}-${index}`} className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md" style={{ left: `${point.x}%`, top: `calc(${point.y}% + ${offset}px)`, backgroundColor: color }} />;
          })}
        </div>
      </GamePlayfield>
      <GameStatus>{state.message} Space draws a card. R restarts.</GameStatus>
    </GamePanel>
  );
}
