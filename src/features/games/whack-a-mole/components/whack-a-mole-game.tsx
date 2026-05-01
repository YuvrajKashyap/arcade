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

const STORAGE_KEY = "arcade.whackAMole.bestScore";
const HOLES = 9;
const ROUND_SECONDS = 45;

type Mole = { hole: number; kind: "mole" | "gold" | "decoy"; born: number; life: number };
type Burst = { hole: number; text: string; born: number };

function now() {
  return performance.now();
}

export function WhackAMoleGame() {
  const [phase, setPhase] = useState<"idle" | "playing" | "game-over">("idle");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => readStoredNumber(STORAGE_KEY));
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [moles, setMoles] = useState<Mole[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const spawnTimer = useRef<number | null>(null);
  const tickTimer = useRef<number | null>(null);
  const startTime = useRef(0);
  const scoreRef = useRef(0);

  const status = phase === "game-over" ? "Round over. Start again to chase the high score." : phase === "idle" ? "Start the round and hit only the real moles." : "Gold moles are worth more. Decoys break your combo.";

  function stopTimers() {
    if (spawnTimer.current) window.clearInterval(spawnTimer.current);
    if (tickTimer.current) window.clearInterval(tickTimer.current);
    spawnTimer.current = null;
    tickTimer.current = null;
  }

  function start() {
    stopTimers();
    setPhase("playing");
    setScore(0);
    scoreRef.current = 0;
    setCombo(0);
    setTimeLeft(ROUND_SECONDS);
    setMoles([]);
    setBursts([]);
    startTime.current = now();
    spawnTimer.current = window.setInterval(() => {
      setMoles((current) => {
        const age = now();
        const active = current.filter((mole) => age - mole.born < mole.life);
        const free = Array.from({ length: HOLES }, (_, index) => index).filter((hole) => !active.some((mole) => mole.hole === hole));
        if (!free.length) return active;
        const hole = free[Math.floor(Math.random() * free.length)];
        const elapsed = (age - startTime.current) / 1000;
        const kind = Math.random() < 0.14 ? "gold" : Math.random() < 0.25 ? "decoy" : "mole";
        return [...active, { hole, kind, born: age, life: Math.max(620, 1160 - elapsed * 12) }];
      });
    }, 420);
    tickTimer.current = window.setInterval(() => {
      const remaining = Math.max(0, ROUND_SECONDS - Math.floor((now() - startTime.current) / 1000));
      setTimeLeft(remaining);
      setBursts((current) => current.filter((burst) => now() - burst.born < 620));
      if (remaining <= 0) {
        const nextBest = Math.max(bestScore, scoreRef.current);
        setBestScore(nextBest);
        writeStoredNumber(STORAGE_KEY, nextBest);
        setPhase("game-over");
        stopTimers();
      }
    }, 160);
  }

  function hit(hole: number) {
    if (phase !== "playing") return;
    const target = moles.find((mole) => mole.hole === hole);
    if (!target) {
      setCombo(0);
      setBursts((current) => [...current, { hole, text: "miss", born: now() }]);
      return;
    }
    setMoles((current) => current.filter((mole) => mole !== target));
    if (target.kind === "decoy") {
      setCombo(0);
      setScore((value) => {
        const next = Math.max(0, value - 5);
        scoreRef.current = next;
        return next;
      });
      setBursts((current) => [...current, { hole, text: "oops", born: now() }]);
      return;
    }
    const value = target.kind === "gold" ? 25 : 10 + Math.min(20, combo * 2);
    setCombo((current) => current + 1);
    setScore((current) => {
      const next = current + value;
      scoreRef.current = next;
      return next;
    });
    setBursts((current) => [...current, { hole, text: `+${value}`, born: now() }]);
  }

  useEffect(() => stopTimers, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === " " || key === "r") {
        event.preventDefault();
        start();
      }
      const number = Number(key);
      if (number >= 1 && number <= 9) {
        event.preventDefault();
        hit(number - 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "Score", value: score },
          { label: "Best", value: bestScore },
          { label: "Time", value: `${timeLeft}s` },
          { label: "Combo", value: combo },
        ]}
        actions={<GameButton variant="primary" onClick={start}>Start</GameButton>}
      />
      <GamePlayfield className="mx-auto aspect-[4/3] w-full max-w-[min(42rem,60dvh)] border-0 bg-gradient-to-b from-[#9be7ff] via-[#b8f28d] to-[#5fc454] p-4">
        <div className="grid h-full grid-cols-3 gap-3 rounded-[1.4rem] border-4 border-[#3a8a35] bg-[#67c957]/45 p-4">
          {Array.from({ length: HOLES }, (_, hole) => {
            const mole = moles.find((item) => item.hole === hole);
            const burst = bursts.find((item) => item.hole === hole);
            return (
              <button key={hole} type="button" onClick={() => hit(hole)} className="relative overflow-hidden rounded-[2rem] bg-[#5b351f] shadow-[inset_0_10px_0_rgba(0,0,0,0.24),0_9px_0_rgba(31,75,26,0.32)] focus:outline-none focus:ring-4 focus:ring-[#fff36b]">
                <span className="absolute inset-x-3 bottom-2 h-5 rounded-full bg-black/25" />
                {mole ? (
                  <span className={`absolute inset-x-2 bottom-3 grid aspect-square place-items-center rounded-full border-4 text-[clamp(1.8rem,7dvh,4.3rem)] shadow-[0_8px_0_rgba(0,0,0,0.18)] transition ${mole.kind === "gold" ? "border-[#9b6a00] bg-[#ffd84f]" : mole.kind === "decoy" ? "border-[#6e1f2b] bg-[#ff6a82]" : "border-[#7a4a24] bg-[#b8783c]"}`}>
                    {mole.kind === "decoy" ? "🌷" : mole.kind === "gold" ? "✨" : "🐹"}
                  </span>
                ) : null}
                {burst ? <span className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-white px-2 py-1 text-sm font-black uppercase text-[#2b5c25]">{burst.text}</span> : null}
              </button>
            );
          })}
        </div>
      </GamePlayfield>
      <GameStatus>{status} Press 1-9 or click/tap holes. Space starts, R restarts.</GameStatus>
    </GamePanel>
  );
}
