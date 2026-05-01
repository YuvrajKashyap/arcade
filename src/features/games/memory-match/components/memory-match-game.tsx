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

type Mode = "solo" | "cpu" | "two-player";
type BoardSize = "4x4" | "4x5" | "6x6";
type Phase = "idle" | "playing" | "won";
type Player = "blue" | "red" | "cpu";
type Card = { id: string; symbol: string; matchedBy?: Player };
type Memory = Record<string, number[]>;

const MODES: Array<{ id: Mode; label: string; detail: string }> = [
  { id: "solo", label: "Solo Run", detail: "timer chase" },
  { id: "cpu", label: "vs CPU", detail: "medium memory" },
  { id: "two-player", label: "2 Player", detail: "blue vs red" },
];
const BOARD_SIZES: Record<BoardSize, { label: string; rows: number; cols: number; pairs: number }> = {
  "4x4": { label: "4x4", rows: 4, cols: 4, pairs: 8 },
  "4x5": { label: "4x5", rows: 4, cols: 5, pairs: 10 },
  "6x6": { label: "6x6", rows: 6, cols: 6, pairs: 18 },
};

function CardArt({ symbol }: { symbol: string }) {
  const common = "memory-card-art drop-shadow-[0_6px_0_rgba(63,36,122,0.14)]";
  switch (symbol) {
    case "rocket":
      return (
        <svg viewBox="0 0 100 100" className={`h-[72%] w-[72%] ${common}`} aria-hidden="true">
          <path d="M52 9c18 12 24 36 14 59l-29 3C27 45 34 22 52 9Z" fill="#ff5b8a" stroke="#4b2b91" strokeWidth="5" />
          <path d="M44 28 20 45l17 6M62 43l23 15-21 6" fill="#60c7ff" stroke="#4b2b91" strokeWidth="5" strokeLinejoin="round" />
          <circle cx="53" cy="34" r="10" fill="#c9f5ff" stroke="#4b2b91" strokeWidth="4" />
          <path d="M42 72c-3 8 1 14 8 19 8-5 12-12 8-20Z" fill="#ffb72e" stroke="#4b2b91" strokeWidth="4" />
        </svg>
      );
    case "star":
      return (
        <svg viewBox="0 0 100 100" className={`h-[70%] w-[70%] ${common}`} aria-hidden="true">
          <path d="m50 9 11 26 28 3-21 18 7 28-25-15-25 15 7-28-21-18 28-3Z" fill="#ffd84c" stroke="#614000" strokeWidth="5" strokeLinejoin="round" />
          <circle cx="39" cy="45" r="4" fill="#614000" /><circle cx="61" cy="45" r="4" fill="#614000" />
          <path d="M40 58c6 6 14 6 20 0" fill="none" stroke="#614000" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case "heart":
      return (
        <svg viewBox="0 0 100 100" className={`h-[72%] w-[72%] ${common}`} aria-hidden="true">
          <path d="M50 84S15 61 15 34c0-14 17-22 30-9l5 6 5-6c13-13 30-5 30 9 0 27-35 50-35 50Z" fill="#ff4f87" stroke="#7d1540" strokeWidth="5" />
          <path d="M30 32c4-6 12-7 18-2" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".65" />
        </svg>
      );
    case "bolt":
      return (
        <svg viewBox="0 0 100 100" className={`h-[72%] w-[72%] ${common}`} aria-hidden="true">
          <path d="M58 8 22 55h25L39 92l39-52H53Z" fill="#ffe94f" stroke="#765300" strokeWidth="6" strokeLinejoin="round" />
          <path d="M58 18 36 49" stroke="#fff6a8" strokeWidth="5" strokeLinecap="round" />
        </svg>
      );
    case "gem":
      return (
        <svg viewBox="0 0 100 100" className={`h-[72%] w-[72%] ${common}`} aria-hidden="true">
          <path d="M20 32 35 14h30l15 18-30 53Z" fill="#54d7ff" stroke="#185d91" strokeWidth="5" strokeLinejoin="round" />
          <path d="M20 32h60M35 14l15 18 15-18M35 32l15 53 15-53" fill="none" stroke="#e9fbff" strokeWidth="4" strokeLinejoin="round" />
        </svg>
      );
    case "sun":
      return (
        <svg viewBox="0 0 100 100" className={`h-[74%] w-[74%] ${common}`} aria-hidden="true">
          <circle cx="50" cy="50" r="22" fill="#ffd54a" stroke="#9b6300" strokeWidth="5" />
          {Array.from({ length: 10 }, (_, i) => (
            <path key={i} d="M50 9v11" stroke="#ffb02e" strokeWidth="6" strokeLinecap="round" transform={`rotate(${i * 36} 50 50)`} />
          ))}
          <circle cx="42" cy="47" r="3" fill="#7b4a00" /><circle cx="58" cy="47" r="3" fill="#7b4a00" />
          <path d="M41 57c6 5 12 5 18 0" fill="none" stroke="#7b4a00" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case "moon":
      return (
        <svg viewBox="0 0 100 100" className={`h-[72%] w-[72%] ${common}`} aria-hidden="true">
          <path d="M67 78C38 76 20 51 31 26c4-9 12-16 21-19-9 21 5 48 31 52-4 8-9 15-16 19Z" fill="#c8d4ff" stroke="#394178" strokeWidth="5" />
          <circle cx="55" cy="35" r="4" fill="#8f9bd9" /><circle cx="63" cy="55" r="5" fill="#8f9bd9" />
        </svg>
      );
    case "crown":
      return (
        <svg viewBox="0 0 100 100" className={`h-[72%] w-[72%] ${common}`} aria-hidden="true">
          <path d="M18 73h64l6-44-22 19-16-28-16 28-22-19Z" fill="#ffd84c" stroke="#7c4d00" strokeWidth="5" strokeLinejoin="round" />
          <path d="M25 73h50v12H25Z" fill="#ff9f2e" stroke="#7c4d00" strokeWidth="5" />
          <circle cx="50" cy="51" r="6" fill="#ff5b8a" />
        </svg>
      );
    case "comet":
      return (
        <svg viewBox="0 0 100 100" className={`h-[72%] w-[72%] ${common}`} aria-hidden="true">
          <path d="M13 25c24 8 37 17 46 36" fill="none" stroke="#ffb347" strokeWidth="9" strokeLinecap="round" />
          <path d="M20 44c18 3 27 10 35 24" fill="none" stroke="#ff5b8a" strokeWidth="8" strokeLinecap="round" />
          <circle cx="64" cy="64" r="20" fill="#76e2ff" stroke="#225e9c" strokeWidth="5" />
          <path d="M55 55c6-5 14-5 20 0" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
        </svg>
      );
    case "planet":
      return (
        <svg viewBox="0 0 100 100" className={`h-[74%] w-[74%] ${common}`} aria-hidden="true">
          <circle cx="51" cy="51" r="25" fill="#9b78ff" stroke="#3f267f" strokeWidth="5" />
          <ellipse cx="50" cy="52" rx="42" ry="13" fill="none" stroke="#ffd866" strokeWidth="7" transform="rotate(-18 50 52)" />
          <path d="M36 39c10 8 21 9 32 3" stroke="#cbbdff" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case "wand":
      return (
        <svg viewBox="0 0 100 100" className={`h-[72%] w-[72%] ${common}`} aria-hidden="true">
          <path d="M30 76 72 34" stroke="#4b2b91" strokeWidth="10" strokeLinecap="round" />
          <path d="M30 76 72 34" stroke="#ffd54a" strokeWidth="5" strokeLinecap="round" />
          <path d="m74 10 5 12 13 2-10 8 3 13-11-7-12 7 4-13-10-8 13-2Z" fill="#ff6cb3" stroke="#7d1540" strokeWidth="4" strokeLinejoin="round" />
        </svg>
      );
    case "trophy":
      return (
        <svg viewBox="0 0 100 100" className={`h-[72%] w-[72%] ${common}`} aria-hidden="true">
          <path d="M32 15h36v27c0 15-8 24-18 24S32 57 32 42Z" fill="#ffd54a" stroke="#765300" strokeWidth="5" />
          <path d="M32 25H15c0 17 8 25 21 25M68 25h17c0 17-8 25-21 25" fill="none" stroke="#765300" strokeWidth="5" strokeLinecap="round" />
          <path d="M44 66h12v13h18v10H26V79h18Z" fill="#ff9f2e" stroke="#765300" strokeWidth="5" strokeLinejoin="round" />
        </svg>
      );
    case "fire":
      return (
        <svg viewBox="0 0 100 100" className={`h-[72%] w-[72%] ${common}`} aria-hidden="true">
          <path d="M53 8c8 18-3 24 11 36 7 6 12 15 12 25 0 15-12 24-27 24S22 84 22 68c0-16 12-25 21-36 4 12 8 15 10 19 7-13 4-25 0-43Z" fill="#ff6438" stroke="#8b1f14" strokeWidth="5" />
          <path d="M49 55c9 10 11 26 0 33-11-7-10-20 0-33Z" fill="#ffd84c" />
        </svg>
      );
    case "shell":
      return (
        <svg viewBox="0 0 100 100" className={`h-[72%] w-[72%] ${common}`} aria-hidden="true">
          <path d="M18 73c4-29 17-50 32-50s28 21 32 50Z" fill="#ff9fc4" stroke="#8c2851" strokeWidth="5" />
          <path d="M50 23v50M34 34l8 39M66 34l-8 39M25 52l17 21M75 52 58 73" stroke="#fff3a8" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case "balloon":
      return (
        <svg viewBox="0 0 100 100" className={`h-[72%] w-[72%] ${common}`} aria-hidden="true">
          <ellipse cx="50" cy="35" rx="24" ry="29" fill="#ff5b8a" stroke="#7d1540" strokeWidth="5" />
          <path d="M42 62h16l-8 10Z" fill="#ff5b8a" stroke="#7d1540" strokeWidth="4" />
          <path d="M50 72c-10 8 10 9 0 18" fill="none" stroke="#4b2b91" strokeWidth="4" strokeLinecap="round" />
          <path d="M41 20c6-6 17-5 23 2" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".65" />
        </svg>
      );
    case "dice":
      return (
        <svg viewBox="0 0 100 100" className={`h-[72%] w-[72%] ${common}`} aria-hidden="true">
          <rect x="20" y="20" width="60" height="60" rx="14" fill="#ffffff" stroke="#33406f" strokeWidth="6" />
          {[["36", "36"], ["64", "36"], ["50", "50"], ["36", "64"], ["64", "64"]].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" fill="#33406f" />
          ))}
        </svg>
      );
    case "key":
      return (
        <svg viewBox="0 0 100 100" className={`h-[72%] w-[72%] ${common}`} aria-hidden="true">
          <circle cx="34" cy="42" r="17" fill="#ffd54a" stroke="#765300" strokeWidth="6" />
          <circle cx="34" cy="42" r="6" fill="#fff7c4" />
          <path d="M48 52 79 83M64 68l8-8M71 75l8-8" stroke="#765300" strokeWidth="8" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 100 100" className={`h-[72%] w-[72%] ${common}`} aria-hidden="true">
          <path d="M32 26h36v34c0 13-8 22-18 22S32 73 32 60Z" fill="#8ee7ff" stroke="#225e9c" strokeWidth="5" />
          <path d="M68 33h11v19H68M42 26v41" fill="none" stroke="#225e9c" strokeWidth="5" strokeLinecap="round" />
          <circle cx="47" cy="67" r="8" fill="#ff5b8a" />
        </svg>
      );
  }
}

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
  const boardTheme =
    mode === "two-player" && turn === "red"
      ? "from-[#ffe0e8] via-[#ffeff3] to-[#ffd7a8]"
      : mode === "two-player"
        ? "from-[#dbeeff] via-[#eff7ff] to-[#c8f4ff]"
        : mode === "cpu"
          ? "from-[#fff1bb] via-[#fff7db] to-[#dff8ff]"
          : "from-[#fff2b8] via-[#ffd3ef] to-[#bdeeff]";
  const boardRing =
    mode === "two-player" && turn === "red"
      ? "border-[#ff3e62] shadow-[0_0_0_6px_rgba(255,62,98,0.16),inset_0_4px_0_rgba(255,255,255,0.72)]"
      : mode === "two-player"
        ? "border-[#228cff] shadow-[0_0_0_6px_rgba(34,140,255,0.16),inset_0_4px_0_rgba(255,255,255,0.72)]"
        : "border-[#7f4df2] shadow-[inset_0_4px_0_rgba(255,255,255,0.7)]";

  return (
    <GamePanel>
      <style>{`
        .memory-card-art {
          width: 78%;
          height: 78%;
          display: block;
        }
      `}</style>
      <GameHud
        items={hudItems}
        actions={
          <GameButton variant="primary" onClick={() => reset()}>
            New Board
          </GameButton>
        }
      />
      <GamePlayfield className={`mx-auto aspect-[1/1] w-full max-w-[min(38rem,62dvh)] border-0 bg-gradient-to-br ${boardTheme} p-3 transition-colors duration-300`}>
        <div className={`flex h-full flex-col gap-2 rounded-[1.25rem] border-4 bg-white/58 p-2 transition duration-300 ${boardRing}`}>
          <div className="grid grid-cols-3 gap-1.5">
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => reset(item.id, size)}
                className={`rounded-[0.8rem] border-2 px-2 py-1.5 text-left transition ${
                  mode === item.id
                    ? "border-[#4425b6] bg-gradient-to-br from-[#7d5cff] to-[#4f7dff] text-white shadow-[0_4px_0_#4425b6]"
                    : "border-white/80 bg-white/72 text-[#5534bd] hover:-translate-y-0.5 hover:bg-white"
                }`}
              >
                <span className="block text-[0.66rem] font-black uppercase leading-none tracking-[0.08em]">{item.label}</span>
                <span className={`mt-1 block text-[0.54rem] font-black uppercase leading-none tracking-[0.06em] ${mode === item.id ? "text-white/72" : "text-[#6c59a8]"}`}>
                  {item.detail}
                </span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5 rounded-[0.95rem] bg-white/45 p-1">
            {(Object.keys(BOARD_SIZES) as BoardSize[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => reset(mode, item)}
                className={`rounded-[0.75rem] px-2 py-1.5 text-center transition ${
                  size === item
                    ? "bg-gradient-to-br from-[#ffae3d] to-[#ff7a2f] text-white shadow-[0_4px_0_#b65312]"
                    : "bg-white/72 text-[#9c4b12] hover:bg-white"
                }`}
              >
                <span className="block text-[0.7rem] font-black uppercase leading-none tracking-[0.1em]">{BOARD_SIZES[item].label}</span>
                <span className={`mt-1 block text-[0.52rem] font-black uppercase leading-none ${size === item ? "text-white/78" : "text-[#b96a2a]"}`}>
                  {BOARD_SIZES[item].pairs} pairs
                </span>
              </button>
            ))}
          </div>
          {mode === "two-player" ? (
            <div className={`grid place-items-center rounded-[0.9rem] px-3 py-1.5 text-center text-[0.68rem] font-black uppercase tracking-[0.16em] text-white shadow-[0_4px_0_rgba(0,0,0,0.16)] ${turn === "red" ? "bg-[#ff3e62]" : "bg-[#228cff]"}`}>
              {turn === "red" ? "Red Turn" : "Blue Turn"}
            </div>
          ) : null}
          <div
            className={`grid min-h-0 flex-1 gap-1.5 rounded-[1rem] p-2 transition-colors duration-300 ${
              mode === "two-player" && turn === "red"
                ? "bg-gradient-to-br from-[#ff6b88] to-[#ff9c42]"
                : mode === "two-player"
                  ? "bg-gradient-to-br from-[#348cff] to-[#38d5ff]"
                  : "bg-gradient-to-br from-[#7d60ff] to-[#2fa1ff]"
            }`}
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
                  className={`relative rounded-[clamp(0.55rem,1.7dvh,1rem)] border-[3px] font-black shadow-[0_5px_0_rgba(59,33,130,0.22)] transition duration-200 focus:outline-none focus:ring-4 focus:ring-[#fff56e] ${
                    visible
                      ? "scale-[1.015] border-[#ff9f35] bg-gradient-to-br from-white via-[#fff7bf] to-[#ffd6f1] text-[#3c246f]"
                      : "border-[#4b2bb2] bg-gradient-to-br from-[#a38dff] via-[#6b7dff] to-[#2fb6ff] hover:-translate-y-0.5"
                  } ${matchedClass}`}
                >
                  <span className={`absolute inset-0 grid place-items-center transition ${visible ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}>
                    <CardArt symbol={card.symbol} />
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
