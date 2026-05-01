"use client";

import { useEffect, useRef, useState } from "react";
import {
  GameButton,
  GameHud,
  GamePanel,
  GamePlayfield,
  GameStatus,
} from "@/features/games/shared/components/game-ui";
import { readStoredNumber, writeStoredNumber } from "@/features/games/shared/utils/local-storage";

const STORAGE_KEY = "arcade.memoryMatch.bestTime";
const SYMBOLS = ["rocket", "star", "heart", "bolt", "gem", "sun", "moon", "crown"];
const ICONS: Record<string, string> = {
  rocket: "🚀",
  star: "⭐",
  heart: "💖",
  bolt: "⚡",
  gem: "💎",
  sun: "☀️",
  moon: "🌙",
  crown: "👑",
};

type Phase = "idle" | "playing" | "won";

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function createDeck() {
  return shuffle(SYMBOLS.flatMap((symbol) => [0, 1].map((copy) => ({ id: `${symbol}-${copy}`, symbol, matched: false }))));
}

export function MemoryMatchGame() {
  const [cards, setCards] = useState(createDeck);
  const [open, setOpen] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [moves, setMoves] = useState(0);
  const [streak, setStreak] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [bestTime, setBestTime] = useState(() => readStoredNumber(STORAGE_KEY, 0));
  const lockRef = useRef(false);

  const matches = cards.filter((card) => card.matched).length / 2;
  const status = phase === "won" ? "Perfect match board cleared." : phase === "idle" ? "Flip a card to start." : "Find every matching pair.";

  function restart() {
    setCards(createDeck());
    setOpen([]);
    setMoves(0);
    setStreak(0);
    setSeconds(0);
    setPhase("idle");
    lockRef.current = false;
  }

  function chooseCard(index: number) {
    if (lockRef.current || cards[index].matched || open.includes(index) || phase === "won") return;
    if (phase === "idle") setPhase("playing");
    const nextOpen = [...open, index];
    setOpen(nextOpen);
    if (nextOpen.length !== 2) return;
    setMoves((value) => value + 1);
    const [first, second] = nextOpen;
    if (cards[first].symbol === cards[second].symbol) {
      window.setTimeout(() => {
        setCards((current) => {
          const nextCards = current.map((card, cardIndex) => (cardIndex === first || cardIndex === second ? { ...card, matched: true } : card));
          if (nextCards.every((card) => card.matched)) {
            setPhase("won");
            setBestTime((currentBest) => {
              const nextBest = currentBest === 0 ? seconds : Math.min(currentBest, seconds);
              writeStoredNumber(STORAGE_KEY, nextBest);
              return nextBest;
            });
          }
          return nextCards;
        });
        setOpen([]);
        setStreak((value) => value + 1);
      }, 260);
    } else {
      lockRef.current = true;
      setStreak(0);
      window.setTimeout(() => {
        setOpen([]);
        lockRef.current = false;
      }, 720);
    }
  }

  useEffect(() => {
    if (phase !== "playing") return undefined;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        restart();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "Time", value: `${seconds}s` },
          { label: "Best", value: bestTime ? `${bestTime}s` : "-" },
          { label: "Moves", value: moves },
          { label: "Pairs", value: `${matches}/8` },
          { label: "Streak", value: streak },
        ]}
        actions={<GameButton variant="primary" onClick={restart}>New Board</GameButton>}
      />
      <GamePlayfield className="mx-auto aspect-[1/1] w-full max-w-[min(34rem,60dvh)] border-0 bg-gradient-to-br from-[#fff2b8] via-[#ffd6e9] to-[#bfe8ff] p-3">
        <div className="grid h-full grid-cols-4 gap-2 rounded-[1.15rem] border-4 border-[#7f4df2] bg-white/45 p-3 shadow-[inset_0_4px_0_rgba(255,255,255,0.65)]">
          {cards.map((card, index) => {
            const visible = card.matched || open.includes(index);
            return (
              <button
                key={card.id}
                type="button"
                aria-label={visible ? `${card.symbol} card` : "Hidden card"}
                onClick={() => chooseCard(index)}
                className={`relative rounded-2xl border-4 text-[clamp(1.4rem,5dvh,3rem)] font-black shadow-[0_8px_0_rgba(91,62,151,0.18)] transition duration-200 focus:outline-none focus:ring-4 focus:ring-[#2f99ff] ${
                  visible
                    ? "scale-[1.02] border-[#ff8c2b] bg-gradient-to-br from-white to-[#fff0aa]"
                    : "border-[#5d39c8] bg-gradient-to-br from-[#8f70ff] to-[#3c8dff] hover:-translate-y-1"
                } ${card.matched ? "opacity-80 ring-4 ring-[#3be67f]" : ""}`}
              >
                <span className={`grid h-full place-items-center transition ${visible ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}>
                  {ICONS[card.symbol]}
                </span>
                {!visible ? <span className="absolute inset-3 rounded-xl border-2 border-white/40" /> : null}
              </button>
            );
          })}
        </div>
      </GamePlayfield>
      <GameStatus>{status} Click or tab through cards. Press R for a fresh board.</GameStatus>
    </GamePanel>
  );
}
