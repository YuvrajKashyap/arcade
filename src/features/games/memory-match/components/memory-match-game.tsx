"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  GameButton,
  GameHud,
  GamePanel,
  GamePlayfield,
  GameStatus,
} from "@/features/games/shared/components/game-ui";
import { readStoredNumber, writeStoredNumber } from "@/features/games/shared/utils/local-storage";

const STORAGE_KEY = "arcade.memoryMatch.bestTime";
const SYMBOLS = [
  "rocket",
  "star",
  "heart",
  "bolt",
  "gem",
  "sun",
  "moon",
  "crown",
  "comet",
  "planet",
  "wand",
  "trophy",
  "fire",
  "shell",
  "balloon",
  "dice",
  "key",
  "music",
];
const ICONS: Record<string, string> = {
  rocket: "R",
  star: "S",
  heart: "H",
  bolt: "B",
  gem: "G",
  sun: "SUN",
  moon: "M",
  crown: "C",
  comet: "COM",
  planet: "P",
  wand: "W",
  trophy: "T",
  fire: "F",
  shell: "SH",
  balloon: "BAL",
  dice: "D",
  key: "K",
  music: "N",
};

type Mode = "solo" | "cpu" | "two-player";
type BoardSize = "4x4" | "4x5" | "6x6";
type Phase = "idle" | "playing" | "won";
type Player = "blue" | "red" | "cpu";
type Card = { id: string; symbol: string; matchedBy?: Player };
type Memory = Record<string, number[]>;

const MODES: Array<{ id: Mode; label: string }> = [
  { id: "solo", label: "Solo Run" },
  { id: "cpu", label: "vs CPU" },
  { id: "two-player", label: "2 Player" },
];
const BOARD_SIZES: Record<BoardSize, { label: string; rows: number; cols: number; pairs: number }> = {
  "4x4": { label: "4x4", rows: 4, cols: 4, pairs: 8 },
  "4x5": { label: "4x5", rows: 4, cols: 5, pairs: 10 },
  "6x6": { label: "6x6", rows: 6, cols: 6, pairs: 18 },
};

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function createDeck(size: BoardSize) {
  const pairs = BOARD_SIZES[size].pairs;
  const deck: Card[] = SYMBOLS.slice(0, pairs).flatMap((symbol) =>
    [0, 1].map((copy) => ({ id: `${symbol}-${copy}-${Math.random().toString(36).slice(2)}`, symbol })),
  );
  return shuffle(
    deck,
  );
}

function remember(memory: Memory, cards: Card[], indexes: number[]) {
  const next: Memory = {};
  for (const [symbol, known] of Object.entries(memory)) {
    next[symbol] = known.filter((index) => !cards[index]?.matchedBy);
  }
  for (const index of indexes) {
    const card = cards[index];
    if (!card || card.matchedBy) continue;
    next[card.symbol] = Array.from(new Set([...(next[card.symbol] ?? []), index]));
  }
  return next;
}

function visibleCard(cards: Card[], open: number[], index: number) {
  return Boolean(cards[index].matchedBy || open.includes(index));
}

function nextPlayer(current: Player, mode: Mode) {
  if (mode === "two-player") return current === "blue" ? "red" : "blue";
  if (mode === "cpu") return current === "blue" ? "cpu" : "blue";
  return "blue";
}

function cpuPick(memory: Memory, cards: Card[], open: number[]) {
  const available = cards.map((card, index) => ({ card, index })).filter(({ card, index }) => !card.matchedBy && !open.includes(index));
  const knownPairs = Object.values(memory)
    .map((indexes) => indexes.filter((index) => available.some((item) => item.index === index)))
    .find((indexes) => indexes.length >= 2);
  if (knownPairs && Math.random() < 0.72) return knownPairs[0];

  if (open.length === 1) {
    const symbol = cards[open[0]].symbol;
    const knownMatch = (memory[symbol] ?? []).find((index) => index !== open[0] && available.some((item) => item.index === index));
    if (knownMatch !== undefined && Math.random() < 0.78) return knownMatch;
  }

  const unknown = available.filter(({ index }) => !Object.values(memory).some((indexes) => indexes.includes(index)));
  const pool = unknown.length && Math.random() < 0.62 ? unknown : available;
  return pool[Math.floor(Math.random() * pool.length)]?.index ?? available[0]?.index ?? -1;
}

export function MemoryMatchGame() {
  const [mode, setMode] = useState<Mode>("solo");
  const [size, setSize] = useState<BoardSize>("4x4");
  const [cards, setCards] = useState(() => createDeck("4x4"));
  const [open, setOpen] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [moves, setMoves] = useState(0);
  const [streak, setStreak] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [bestTime, setBestTime] = useState(() => readStoredNumber(STORAGE_KEY, 0));
  const [turn, setTurn] = useState<Player>("blue");
  const [scores, setScores] = useState({ blue: 0, red: 0, cpu: 0 });
  const [cpuMemory, setCpuMemory] = useState<Memory>({});
  const lockRef = useRef(false);
  const cpuTimerRef = useRef<number | null>(null);

  const board = BOARD_SIZES[size];
  const matches = cards.filter((card) => card.matchedBy).length / 2;
  const winner = useMemo(() => {
    if (phase !== "won" || mode === "solo") return "";
    if (mode === "cpu") return scores.blue === scores.cpu ? "Draw game." : scores.blue > scores.cpu ? "Blue beats the CPU." : "CPU wins the board.";
    if (scores.blue === scores.red) return "Blue and Red draw.";
    return scores.blue > scores.red ? "Blue wins the board." : "Red wins the board.";
  }, [mode, phase, scores]);
  const status =
    phase === "won"
      ? mode === "solo"
        ? "Perfect board cleared."
        : winner
      : phase === "idle"
        ? "Choose a mode and flip a card to start."
        : turn === "cpu"
          ? "CPU is thinking..."
          : `${turn === "red" ? "Red" : "Blue"} turn. Matches keep the turn.`;

  function reset(nextMode = mode, nextSize = size) {
    if (cpuTimerRef.current) window.clearTimeout(cpuTimerRef.current);
    setMode(nextMode);
    setSize(nextSize);
    setCards(createDeck(nextSize));
    setOpen([]);
    setMoves(0);
    setStreak(0);
    setSeconds(0);
    setPhase("idle");
    setTurn("blue");
    setScores({ blue: 0, red: 0, cpu: 0 });
    setCpuMemory({});
    lockRef.current = false;
  }

  function finishMatch(first: number, second: number, matched: boolean) {
    const actor = turn;
    window.setTimeout(() => {
      if (matched) {
        setCards((current) => {
          const nextCards = current.map((card, cardIndex) => (cardIndex === first || cardIndex === second ? { ...card, matchedBy: actor } : card));
          if (nextCards.every((card) => card.matchedBy)) {
            setPhase("won");
            if (mode === "solo") {
              setBestTime((currentBest) => {
                const nextBest = currentBest === 0 ? seconds : Math.min(currentBest, seconds);
                writeStoredNumber(STORAGE_KEY, nextBest);
                return nextBest;
              });
            }
          }
          return nextCards;
        });
        setScores((current) => ({ ...current, [actor]: current[actor] + 1 }));
        setStreak((value) => value + 1);
      } else {
        setStreak(0);
        setTurn((current) => nextPlayer(current, mode));
      }
      setCpuMemory((memory) => remember(memory, cards, [first, second]));
      setOpen([]);
      lockRef.current = false;
    }, matched ? 360 : 780);
  }

  function chooseCard(index: number) {
    if (lockRef.current || cards[index]?.matchedBy || open.includes(index) || phase === "won" || (mode === "cpu" && turn === "cpu")) return;
    if (phase === "idle") setPhase("playing");
    const nextOpen = [...open, index];
    setOpen(nextOpen);
    setCpuMemory((memory) => remember(memory, cards, [index]));
    if (nextOpen.length !== 2) return;
    lockRef.current = true;
    setMoves((value) => value + 1);
    const [first, second] = nextOpen;
    finishMatch(first, second, cards[first].symbol === cards[second].symbol);
  }

  const cpuChoose = useEffectEvent(() => {
    if (phase === "idle") setPhase("playing");
    const pick = cpuPick(cpuMemory, cards, open);
    if (pick < 0) return;
    const nextOpen = [...open, pick];
    setOpen(nextOpen);
    setCpuMemory((memory) => remember(memory, cards, [pick]));
    if (nextOpen.length === 2) {
      lockRef.current = true;
      setMoves((value) => value + 1);
      const [first, second] = nextOpen;
      finishMatch(first, second, cards[first].symbol === cards[second].symbol);
    }
  });

  useEffect(() => {
    if (phase !== "playing") return undefined;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (mode !== "cpu" || turn !== "cpu" || phase === "won" || lockRef.current) return undefined;
    cpuTimerRef.current = window.setTimeout(() => cpuChoose(), open.length ? 520 : 760);
    return () => {
      if (cpuTimerRef.current) window.clearTimeout(cpuTimerRef.current);
    };
  }, [mode, open.length, phase, turn]);

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      reset();
    }
  });

  useEffect(() => {
    const down = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  const hudItems =
    mode === "solo"
      ? [
          { label: "Mode", value: "Solo Run" },
          { label: "Time", value: `${seconds}s` },
          { label: "Best", value: bestTime ? `${bestTime}s` : "-" },
          { label: "Moves", value: moves },
          { label: "Pairs", value: `${matches}/${board.pairs}` },
          { label: "Streak", value: streak },
        ]
      : mode === "cpu"
        ? [
            { label: "Mode", value: "vs CPU" },
            { label: "Blue", value: scores.blue },
            { label: "CPU", value: scores.cpu },
            { label: "Turn", value: turn === "cpu" ? "CPU" : "Blue" },
            { label: "Pairs", value: `${matches}/${board.pairs}` },
          ]
        : [
            { label: "Mode", value: "2 Player" },
            { label: "Blue", value: scores.blue },
            { label: "Red", value: scores.red },
            { label: "Turn", value: turn === "red" ? "Red" : "Blue" },
            { label: "Pairs", value: `${matches}/${board.pairs}` },
          ];

  return (
    <GamePanel>
      <GameHud
        items={hudItems}
        actions={
          <GameButton variant="primary" onClick={() => reset()}>
            New Board
          </GameButton>
        }
      />
      <GamePlayfield className="mx-auto aspect-[1/1] w-full max-w-[min(38rem,62dvh)] border-0 bg-gradient-to-br from-[#fff2b8] via-[#ffd3ef] to-[#bdeeff] p-3">
        <div className="flex h-full flex-col gap-2 rounded-[1.25rem] border-4 border-[#7f4df2] bg-white/55 p-2 shadow-[inset_0_4px_0_rgba(255,255,255,0.7)]">
          <div className="grid grid-cols-3 gap-1">
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => reset(item.id, size)}
                className={`rounded-full px-2 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.08em] ${
                  mode === item.id ? "bg-[#6f48ff] text-white shadow-[0_4px_0_#4425b6]" : "bg-white/75 text-[#5534bd]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1">
            {(Object.keys(BOARD_SIZES) as BoardSize[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => reset(mode, item)}
                className={`rounded-full px-2 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.08em] ${
                  size === item ? "bg-[#ff8c2b] text-white shadow-[0_4px_0_#b65312]" : "bg-white/75 text-[#a34d10]"
                }`}
              >
                {BOARD_SIZES[item].label}
              </button>
            ))}
          </div>
          <div
            className="grid min-h-0 flex-1 gap-1.5 rounded-[1rem] bg-gradient-to-br from-[#7d60ff] to-[#2fa1ff] p-2"
            style={{ gridTemplateColumns: `repeat(${board.cols}, minmax(0, 1fr))` }}
          >
            {cards.map((card, index) => {
              const visible = visibleCard(cards, open, index);
              const matchedClass =
                card.matchedBy === "blue"
                  ? "ring-4 ring-[#228cff]"
                  : card.matchedBy === "red"
                    ? "ring-4 ring-[#ff3e62]"
                    : card.matchedBy === "cpu"
                      ? "ring-4 ring-[#ffb92e]"
                      : "";
              return (
                <button
                  key={card.id}
                  type="button"
                  aria-label={visible ? `${card.symbol} card` : "Hidden card"}
                  onClick={() => chooseCard(index)}
                  className={`relative rounded-[clamp(0.55rem,1.7dvh,1rem)] border-[3px] text-[clamp(0.68rem,3.6dvh,2.1rem)] font-black shadow-[0_5px_0_rgba(59,33,130,0.22)] transition duration-200 focus:outline-none focus:ring-4 focus:ring-[#fff56e] ${
                    visible
                      ? "scale-[1.015] border-[#ff9f35] bg-gradient-to-br from-white via-[#fff7bf] to-[#ffd6f1] text-[#3c246f]"
                      : "border-[#4b2bb2] bg-gradient-to-br from-[#a38dff] via-[#6b7dff] to-[#2fb6ff] hover:-translate-y-0.5"
                  } ${matchedClass}`}
                >
                  <span className={`grid h-full place-items-center transition ${visible ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}>
                    {ICONS[card.symbol]}
                  </span>
                  {!visible ? (
                    <>
                      <span className="absolute inset-2 rounded-[0.7rem] border-2 border-white/45" />
                      <span className="absolute left-2 top-2 h-3 w-8 rounded-full bg-white/35" />
                    </>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </GamePlayfield>
      <GameStatus>{status} Choose Solo Run, vs CPU, or 2 Player. Pick 4x4, 4x5, or 6x6. R restarts.</GameStatus>
    </GamePanel>
  );
}
