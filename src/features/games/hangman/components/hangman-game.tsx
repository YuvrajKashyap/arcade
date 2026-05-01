"use client";

import { useEffect, useState } from "react";
import {
  GameButton,
  GameHud,
  GamePanel,
  GamePlayfield,
  GameStatus,
} from "@/features/games/shared/components/game-ui";
import { readStoredNumber, writeStoredNumber } from "@/features/games/shared/utils/local-storage";

const WIN_KEY = "arcade.hangman.wins";
const STREAK_KEY = "arcade.hangman.bestStreak";
const MAX_MISSES = 6;
const WORDS = {
  easy: ["ARCADE", "PIXEL", "ROCKET", "BUTTON", "PUZZLE", "PLAYER"],
  medium: ["JAVASCRIPT", "KEYBOARD", "VICTORY", "ANIMATION", "BROWSER", "COMPONENT"],
  hard: ["TYPESCRIPT", "DEPLOYMENT", "ACCESSIBILITY", "REFRACTOR", "PORTFOLIO", "ARCHITECTURE"],
} as const;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
type Difficulty = keyof typeof WORDS;

function pickWord(difficulty: Difficulty) {
  const list = WORDS[difficulty];
  return list[Math.floor(Math.random() * list.length)];
}

export function HangmanGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [word, setWord] = useState(() => pickWord("medium"));
  const [guesses, setGuesses] = useState<string[]>([]);
  const [wins, setWins] = useState(() => readStoredNumber(WIN_KEY));
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(() => readStoredNumber(STREAK_KEY));

  const misses = guesses.filter((letter) => !word.includes(letter));
  const solved = word.split("").every((letter) => guesses.includes(letter));
  const lost = misses.length >= MAX_MISSES;
  const phase = solved ? "won" : lost ? "lost" : "playing";

  function restart(nextDifficulty = difficulty) {
    setDifficulty(nextDifficulty);
    setWord(pickWord(nextDifficulty));
    setGuesses([]);
  }

  function guess(letter: string) {
    if (phase !== "playing" || guesses.includes(letter)) return;
    const nextGuesses = [...guesses, letter];
    setGuesses(nextGuesses);
    const nextSolved = word.split("").every((wordLetter) => nextGuesses.includes(wordLetter));
    const nextLost = nextGuesses.filter((guessLetter) => !word.includes(guessLetter)).length >= MAX_MISSES;
    if (nextSolved) {
      setWins((value) => {
        writeStoredNumber(WIN_KEY, value + 1);
        return value + 1;
      });
      setStreak((value) => {
        const next = value + 1;
        setBestStreak((best) => {
          const updated = Math.max(best, next);
          writeStoredNumber(STREAK_KEY, updated);
          return updated;
        });
        return next;
      });
    } else if (nextLost) {
      setStreak(0);
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) {
        event.preventDefault();
        guess(key);
      } else if (event.key.toLowerCase() === "r" || event.key === " ") {
        event.preventDefault();
        restart();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "Misses", value: `${misses.length}/${MAX_MISSES}` },
          { label: "Wins", value: wins },
          { label: "Streak", value: streak },
          { label: "Best", value: bestStreak },
        ]}
        actions={<GameButton variant="primary" onClick={() => restart()}>New Word</GameButton>}
      />
      <GamePlayfield className="mx-auto w-full max-w-[min(48rem,64dvh)] border-0 bg-gradient-to-br from-[#fff6c7] via-[#e9fbff] to-[#d7f7c2] p-4">
        <div className="grid h-full min-h-[24rem] grid-cols-[0.9fr_1.1fr] gap-4 max-md:grid-cols-1 max-md:gap-3">
          <div className="relative rounded-[1.5rem] border-4 border-[#8b6335] bg-[#fff9df] shadow-[inset_0_4px_0_rgba(255,255,255,0.7),0_8px_0_rgba(83,50,19,0.2)]">
            <div className="absolute bottom-7 left-10 h-3 w-36 rounded-full bg-[#8b6335]" />
            <div className="absolute bottom-7 left-16 h-56 w-3 rounded-full bg-[#8b6335]" />
            <div className="absolute left-16 top-10 h-3 w-28 rounded-full bg-[#8b6335]" />
            <div className="absolute left-[10.5rem] top-10 h-14 w-2 rounded-full bg-[#8b6335]" />
            {misses.length > 0 ? <div className="absolute left-[8.85rem] top-24 h-14 w-14 rounded-full border-4 border-[#34405a] bg-[#ffd9a5]" /> : null}
            {misses.length > 1 ? <div className="absolute left-[10.35rem] top-38 h-24 w-4 rounded-full bg-[#34405a]" /> : null}
            {misses.length > 2 ? <div className="absolute left-[7.8rem] top-42 h-4 w-16 -rotate-35 rounded-full bg-[#34405a]" /> : null}
            {misses.length > 3 ? <div className="absolute left-[10.8rem] top-42 h-4 w-16 rotate-35 rounded-full bg-[#34405a]" /> : null}
            {misses.length > 4 ? <div className="absolute left-[8.6rem] top-58 h-4 w-16 -rotate-45 rounded-full bg-[#34405a]" /> : null}
            {misses.length > 5 ? <div className="absolute left-[10.7rem] top-58 h-4 w-16 rotate-45 rounded-full bg-[#34405a]" /> : null}
          </div>
          <div className="flex flex-col justify-center gap-4 rounded-[1.5rem] border-4 border-[#3f9bd8] bg-white/70 p-4">
            <div className="flex justify-center gap-2">
              {(["easy", "medium", "hard"] as Difficulty[]).map((level) => (
                <button key={level} type="button" onClick={() => restart(level)} className={`rounded-full px-3 py-2 text-xs font-black uppercase ${difficulty === level ? "bg-[#2f9cff] text-white" : "bg-[#e6f6ff] text-[#1d6ca8]"}`}>
                  {level}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {word.split("").map((letter, index) => (
                <span key={`${letter}-${index}`} className="grid h-12 w-10 place-items-center rounded-xl border-b-4 border-[#2e3b58] bg-[#fff3b0] text-2xl font-black text-[#2e3b58]">
                  {guesses.includes(letter) || lost ? letter : ""}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1 max-md:grid-cols-[repeat(9,minmax(0,1fr))]">
              {LETTERS.map((letter) => (
                <button key={letter} type="button" disabled={guesses.includes(letter) || phase !== "playing"} onClick={() => guess(letter)} className="aspect-square rounded-lg bg-[#7ad65f] text-sm font-black text-[#163c1e] shadow-[0_4px_0_#3c8b31] disabled:bg-[#d8d8d8] disabled:text-[#777] disabled:shadow-none">
                  {letter}
                </button>
              ))}
            </div>
          </div>
        </div>
      </GamePlayfield>
      <GameStatus>{phase === "won" ? "Solved. Press Space for another word." : phase === "lost" ? `The word was ${word}. Press Space to retry.` : "Guess letters before the drawing is complete."}</GameStatus>
    </GamePanel>
  );
}
