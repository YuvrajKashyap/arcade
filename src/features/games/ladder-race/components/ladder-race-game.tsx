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

const STORAGE_KEY = "arcade.ladderRace.bestRolls";
const jumps = new Map<number, number>([
  [4, 25],
  [13, 46],
  [33, 49],
  [42, 63],
  [50, 69],
  [62, 81],
  [74, 92],
  [27, 5],
  [40, 3],
  [54, 31],
  [66, 45],
  [76, 58],
  [89, 53],
  [99, 41],
]);

type Phase = "ready" | "playing" | "won";
type PlayerKey = "you" | "cpu";
type State = {
  phase: Phase;
  positions: Record<PlayerKey, number>;
  turn: PlayerKey;
  die: number;
  rolls: number;
  message: string;
  bestRolls: number;
};

function createState(bestRolls = 0): State {
  return {
    phase: "ready",
    positions: { you: 1, cpu: 1 },
    turn: "you",
    die: 1,
    rolls: 0,
    message: "Press Space or Roll to start the race.",
    bestRolls,
  };
}

function cellPosition(square: number) {
  const index = square - 1;
  const rowFromBottom = Math.floor(index / 10);
  const colInRow = index % 10;
  const column = rowFromBottom % 2 === 0 ? colInRow : 9 - colInRow;
  return { row: 9 - rowFromBottom, column };
}

function applyJump(square: number) {
  return jumps.get(square) ?? square;
}

function rollState(state: State): State {
  if (state.phase === "won") return createState(state.bestRolls);
  const die = 1 + Math.floor(Math.random() * 6);
  const player = state.turn;
  let target = state.positions[player] + die;
  if (target > 100) target = state.positions[player];
  const jumped = applyJump(target);
  const positions = { ...state.positions, [player]: jumped };
  const won = player === "you" && jumped === 100;
  const cpuWon = player === "cpu" && jumped === 100;
  const rolls = state.rolls + (player === "you" ? 1 : 0);
  const jumpCopy = jumped > target ? " found a ladder" : jumped < target ? " hit a snake" : "";
  return {
    phase: won || cpuWon ? "won" : "playing",
    positions,
    turn: player === "you" ? "cpu" : "you",
    die,
    rolls,
    bestRolls: won ? (state.bestRolls === 0 ? rolls : Math.min(state.bestRolls, rolls)) : state.bestRolls,
    message: won ? `You reached 100 in ${rolls} rolls.` : cpuWon ? "CPU reached 100 first. Roll again." : `${player === "you" ? "You" : "CPU"} rolled ${die}${jumpCopy}.`,
  };
}

export function LadderRaceGame() {
  const initialState = createState(readStoredNumber(STORAGE_KEY));
  const [state, setState] = useState(initialState);
  const stateRef = useRef(initialState);
  const cells = useMemo(() => Array.from({ length: 100 }, (_, index) => 100 - index), []);

  function sync(nextState: State) {
    stateRef.current = nextState;
    setState(nextState);
    writeStoredNumber(STORAGE_KEY, nextState.bestRolls);
  }

  function roll() {
    let nextState = rollState(stateRef.current);
    if (nextState.turn === "cpu" && nextState.phase !== "won") {
      nextState = rollState(nextState);
    }
    sync(nextState);
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (key === " " || key === "enter") {
      event.preventDefault();
      roll();
    } else if (key === "r") {
      event.preventDefault();
      sync(createState(stateRef.current.bestRolls));
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
          { label: "Rolls", value: state.rolls },
          { label: "Best", value: state.bestRolls || "--" },
          { label: "Die", value: state.die },
          { label: "Turn", value: state.turn },
        ]}
        actions={
          <>
            <GameButton variant="primary" onClick={roll}>Roll</GameButton>
            <GameButton onClick={() => sync(createState(state.bestRolls))}>Restart</GameButton>
          </>
        }
      />
      <GamePlayfield className="mx-auto aspect-square w-full max-w-[min(34rem,54dvh)] border-0 bg-[#fdf0a8] p-3">
        <div className="relative grid h-full grid-cols-10 grid-rows-10 rounded-2xl border-4 border-[#905a28] bg-[#ffdf75] p-1 shadow-[inset_0_5px_rgba(255,255,255,0.5)]">
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100">
            {[...jumps.entries()].map(([from, to]) => {
              const a = cellPosition(from);
              const b = cellPosition(to);
              const color = to > from ? "#2fa84f" : "#d53d46";
              return (
                <line
                  key={`${from}-${to}`}
                  x1={a.column * 10 + 5}
                  y1={a.row * 10 + 5}
                  x2={b.column * 10 + 5}
                  y2={b.row * 10 + 5}
                  stroke={color}
                  strokeWidth={to > from ? 1.4 : 2.2}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
          {cells.map((square) => {
            const pos = cellPosition(square);
            const youHere = state.positions.you === square;
            const cpuHere = state.positions.cpu === square;
            return (
              <div
                key={square}
                className={`relative grid place-items-start rounded-md border border-[#a66a2d]/30 p-1 text-[0.62rem] font-black ${
                  (pos.row + pos.column) % 2 === 0 ? "bg-[#fff2a8]" : "bg-[#ffc969]"
                }`}
              >
                {square}
                <div className="absolute bottom-1 right-1 flex gap-1">
                  {youHere ? <span className="h-3 w-3 rounded-full border border-white bg-[#258cff]" /> : null}
                  {cpuHere ? <span className="h-3 w-3 rounded-full border border-white bg-[#ff4f6d]" /> : null}
                </div>
              </div>
            );
          })}
        </div>
      </GamePlayfield>
      <GameStatus>{state.message} Ladders are green, snakes are red. Space rolls.</GameStatus>
    </GamePanel>
  );
}
