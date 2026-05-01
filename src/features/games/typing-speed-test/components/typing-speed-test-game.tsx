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

const BEST_KEY = "arcade.typingSpeed.bestWpm";
const QUOTES = [
  "polished games feel alive because every input gets a crisp response",
  "great software is built from small details that work together",
  "arcade builders care about motion sound timing and flow",
  "fast fingers steady focus and clean code win the round",
];

function pickQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

export function TypingSpeedTestGame() {
  const [duration, setDuration] = useState<30 | 60>(30);
  const [text, setText] = useState(pickQuote);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [timeLeft, setTimeLeft] = useState<number>(duration);
  const [bestWpm, setBestWpm] = useState(() => readStoredNumber(BEST_KEY));
  const inputRef = useRef<HTMLInputElement>(null);

  const correctChars = input.split("").filter((char, index) => char === text[index]).length;
  const errors = input.split("").filter((char, index) => char !== text[index]).length;
  const elapsed = Math.max(1, duration - timeLeft);
  const wpm = Math.round((correctChars / 5 / elapsed) * 60);
  const accuracy = input.length ? Math.round((correctChars / input.length) * 100) : 100;

  function restart(nextDuration = duration) {
    setDuration(nextDuration);
    setText(pickQuote());
    setInput("");
    setPhase("idle");
    setTimeLeft(nextDuration);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function update(value: string) {
    if (phase === "done") return;
    if (phase === "idle") setPhase("playing");
    const nextInput = value.slice(0, text.length);
    setInput(nextInput);
    if (nextInput.length >= text.length) {
      const nextCorrect = nextInput.split("").filter((char, index) => char === text[index]).length;
      const nextWpm = Math.round((nextCorrect / 5 / elapsed) * 60);
      setBestWpm((current) => {
        const next = Math.max(current, nextWpm);
        writeStoredNumber(BEST_KEY, next);
        return next;
      });
      setPhase("done");
    }
  }

  useEffect(() => {
    if (phase !== "playing") return undefined;
    const timer = window.setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          setBestWpm((current) => {
            const next = Math.max(current, wpm);
            writeStoredNumber(BEST_KEY, next);
            return next;
          });
          setPhase("done");
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, wpm]);

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "WPM", value: wpm },
          { label: "Best", value: bestWpm },
          { label: "Accuracy", value: `${accuracy}%` },
          { label: "Time", value: `${timeLeft}s` },
          { label: "Errors", value: errors },
        ]}
        actions={<GameButton variant="primary" onClick={() => restart()}>Restart</GameButton>}
      />
      <GamePlayfield className="mx-auto w-full max-w-[min(52rem,62dvh)] border-0 bg-gradient-to-br from-[#14192c] via-[#1f3561] to-[#0da1a8] p-4">
        <div className="flex h-full min-h-[24rem] flex-col justify-center gap-5 rounded-[1.4rem] border border-white/20 bg-white/10 p-5 shadow-[inset_0_3px_0_rgba(255,255,255,0.16)]">
          <div className="flex justify-center gap-2">
            {[30, 60].map((seconds) => (
              <button key={seconds} type="button" onClick={() => restart(seconds as 30 | 60)} className={`rounded-full px-4 py-2 text-sm font-black ${duration === seconds ? "bg-[#ffe66a] text-[#172039]" : "bg-white/15 text-white"}`}>
                {seconds}s
              </button>
            ))}
          </div>
          <div className="rounded-2xl bg-[#f8fbff] p-5 text-center text-[clamp(1.1rem,2.8dvh,1.8rem)] font-black leading-relaxed text-[#172039]">
            {text.split("").map((char, index) => {
              const typed = input[index];
              const active = index === input.length;
              return (
                <span key={`${char}-${index}`} className={typed == null ? (active ? "rounded bg-[#ffe66a] px-0.5" : "") : typed === char ? "text-[#11a35c]" : "rounded bg-[#ff667d] text-white"}>
                  {char}
                </span>
              );
            })}
          </div>
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => update(event.target.value)}
            onFocus={() => phase === "done" && restart()}
            className="rounded-2xl border-4 border-[#55d6ff] bg-white px-4 py-4 text-center text-xl font-black text-[#172039] outline-none focus:ring-4 focus:ring-[#ffe66a]"
            placeholder="Start typing here"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>
      </GamePlayfield>
      <GameStatus>{phase === "done" ? "Run complete. Restart to try another sentence." : "Type the sentence as quickly and accurately as possible."}</GameStatus>
    </GamePanel>
  );
}
