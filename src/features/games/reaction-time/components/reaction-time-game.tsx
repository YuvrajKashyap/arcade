"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import {
  REACTION_HISTORY_LIMIT,
  REACTION_STORAGE_KEY,
} from "@/features/games/reaction-time/config/constants";
import { getRandomDelay } from "@/features/games/reaction-time/logic/game";
import type { ReactionPhase } from "@/features/games/reaction-time/types";
import {
  readStoredNumber,
  writeStoredNumber,
} from "@/features/games/shared/utils/local-storage";
import {
  GameButton,
  GameHud,
  GamePanel,
  GameStatus,
} from "@/features/games/shared/components/game-ui";

function getPhaseCopy(phase: ReactionPhase) {
  if (phase === "waiting") {
    return "Wait for green.";
  }

  if (phase === "ready") {
    return "Click now.";
  }

  if (phase === "too-soon") {
    return "Too early.";
  }

  if (phase === "result") {
    return "Saved.";
  }

  return "Start a run.";
}

function getStageClasses(phase: ReactionPhase) {
  if (phase === "ready") {
    return "border-emerald-300/70 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.9),rgba(6,95,70,0.96)_45%,rgba(3,45,36,0.98))] shadow-[0_0_80px_rgba(16,185,129,0.45)]";
  }

  if (phase === "too-soon") {
    return "border-red-300/70 bg-[radial-gradient(circle_at_center,rgba(248,113,113,0.95),rgba(127,29,29,0.96)_48%,rgba(45,8,18,0.98))] shadow-[0_0_80px_rgba(248,113,113,0.38)]";
  }

  if (phase === "waiting") {
    return "border-amber-200/35 bg-[radial-gradient(circle_at_center,rgba(84,63,20,0.9),rgba(31,26,13,0.98)_52%,rgba(9,9,13,0.98))]";
  }

  if (phase === "result") {
    return "border-cyan-200/45 bg-[radial-gradient(circle_at_center,rgba(14,116,144,0.55),rgba(17,24,39,0.98)_55%,rgba(8,9,18,0.98))]";
  }

  return "border-line bg-[radial-gradient(circle_at_center,rgba(38,25,75,0.68),rgba(15,12,26,0.98)_55%,rgba(8,8,14,0.98))]";
}

function getStageEyebrow(phase: ReactionPhase) {
  if (phase === "waiting") {
    return "wait";
  }

  if (phase === "ready") {
    return "green";
  }

  if (phase === "too-soon") {
    return "early";
  }

  if (phase === "result") {
    return "recorded";
  }

  return "reaction test";
}

function getStageTitle(phase: ReactionPhase, lastResult: number | null) {
  if (phase === "ready") {
    return "Click now";
  }

  if (phase === "waiting") {
    return "Wait for green";
  }

  if (phase === "too-soon") {
    return "Too early";
  }

  if (phase === "result") {
    return lastResult ? `${lastResult} ms` : "Saved";
  }

  return "Ready?";
}

function getAttemptAverage(attempts: number[], count: number) {
  if (attempts.length < count) {
    return null;
  }

  const attemptsToAverage = attempts.slice(0, count);
  return Math.round(
    attemptsToAverage.reduce((sum, attempt) => sum + attempt, 0) /
      attemptsToAverage.length,
  );
}

export function ReactionTimeGame() {
  const timeoutRef = useRef<number | null>(null);
  const readyAtRef = useRef(0);
  const skipNextClickRef = useRef(false);
  const [phase, setPhase] = useState<ReactionPhase>("idle");
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [bestTime, setBestTime] = useState(() =>
    readStoredNumber(REACTION_STORAGE_KEY),
  );
  const [attempts, setAttempts] = useState<number[]>([]);
  const deferredAttempts = useDeferredValue(attempts);

  function clearPendingRound() {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  function beginRound() {
    clearPendingRound();
    setPhase("waiting");
    setLastResult(null);

    timeoutRef.current = window.setTimeout(() => {
      readyAtRef.current = performance.now();
      setPhase("ready");
    }, getRandomDelay());
  }

  function recordResult(value: number) {
    const roundedValue = Math.round(value);
    const nextBestTime =
      bestTime === 0 ? roundedValue : Math.min(bestTime, roundedValue);

    setLastResult(roundedValue);
    setBestTime(nextBestTime);
    setPhase("result");
    writeStoredNumber(REACTION_STORAGE_KEY, nextBestTime);

    startTransition(() => {
      setAttempts((currentAttempts) =>
        [roundedValue, ...currentAttempts].slice(0, REACTION_HISTORY_LIMIT),
      );
    });
  }

  function handlePrimaryAction() {
    if (phase === "idle" || phase === "result" || phase === "too-soon") {
      beginRound();
      return;
    }

    if (phase === "waiting") {
      clearPendingRound();
      setPhase("too-soon");
      return;
    }

    if (phase === "ready") {
      recordResult(performance.now() - readyAtRef.current);
    }
  }

  function handleStageClick() {
    if (skipNextClickRef.current) {
      skipNextClickRef.current = false;
      return;
    }

    handlePrimaryAction();
  }

  function resetSession() {
    clearPendingRound();
    readyAtRef.current = 0;
    setPhase("idle");
    setLastResult(null);

    startTransition(() => {
      setAttempts([]);
    });
  }

  const handleKeyboardInput = useEffectEvent((event: KeyboardEvent) => {
    const normalizedKey = event.key.toLowerCase();

    if (normalizedKey === " " || normalizedKey === "enter") {
      event.preventDefault();
      handlePrimaryAction();
      return;
    }

    if (normalizedKey === "r") {
      event.preventDefault();
      resetSession();
    }
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      handleKeyboardInput(event);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    return () => {
      clearPendingRound();
    };
  }, []);

  const averageTime =
    deferredAttempts.length > 0
      ? Math.round(
          deferredAttempts.reduce((sum, attempt) => sum + attempt, 0) /
            deferredAttempts.length,
        )
      : null;
  const threeRunAverage = getAttemptAverage(deferredAttempts, 3);
  const runsUntilAverage = Math.max(3 - deferredAttempts.length, 0);

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "Best", value: bestTime > 0 ? `${bestTime} ms` : "None" },
          { label: "Last", value: lastResult ? `${lastResult} ms` : "Waiting" },
          { label: "Avg", value: averageTime ? `${averageTime} ms` : "None" },
          { label: "Runs", value: deferredAttempts.length },
          { label: "Status", value: phase },
        ]}
        actions={
          <>
            <GameButton variant="primary" onClick={handlePrimaryAction}>
              {phase === "idle" ? "Start" : "Next"}
            </GameButton>
            <GameButton onClick={resetSession}>Reset</GameButton>
          </>
        }
      />

      <button
        type="button"
        onClick={handleStageClick}
        onPointerUp={(event) => {
          if (event.pointerType !== "touch" || !event.isPrimary) {
            return;
          }

          event.preventDefault();
          skipNextClickRef.current = true;
          handlePrimaryAction();
        }}
        className={`arcade-game-playfield relative min-h-0 flex-1 overflow-hidden rounded-[1.4rem] border px-6 py-8 text-center text-foreground shadow-[0_28px_80px_rgba(0,0,0,0.3)] transition duration-300 ${getStageClasses(phase)}`}
      >
        <span className="pointer-events-none absolute inset-x-12 top-10 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.16),transparent_32%)]" />
        <div className="relative z-10 flex h-full min-h-0 flex-col items-center justify-center">
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-white/70">
            {getStageEyebrow(phase)}
          </p>
          <p className="mt-6 text-4xl font-black tracking-tight text-white sm:text-6xl">
            {getStageTitle(phase, lastResult)}
          </p>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/78 sm:text-base">
            {getPhaseCopy(phase)}
          </p>
        </div>
      </button>

      <div
        className={`rounded-[1.35rem] border px-4 py-3 ${
          threeRunAverage
            ? "border-emerald-300/35 bg-emerald-300/10"
            : "border-line bg-surface"
        }`}
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-foreground-muted">
              3-run average
            </p>
            <p className="mt-1 text-sm leading-6 text-foreground-soft">
              {threeRunAverage
                ? "Last three valid runs."
                : `${runsUntilAverage} more valid ${
                    runsUntilAverage === 1 ? "run" : "runs"
                  } to unlock your average.`}
            </p>
          </div>
          <p className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {threeRunAverage ? `${threeRunAverage} ms` : "--"}
          </p>
        </div>
      </div>

      <GameStatus>
        Click, tap, or press Space/Enter. Press R to reset.
      </GameStatus>

      <div className="arcade-reaction-history flex max-h-[4rem] flex-wrap gap-2 overflow-hidden">
        {deferredAttempts.length > 0 ? (
          deferredAttempts.map((attempt, index) => (
            <div
              key={`${attempt}-${index}`}
              className="surface-subtle rounded-full px-3 py-1.5 text-sm"
            >
              Attempt {index + 1}: <span className="font-semibold text-foreground">{attempt} ms</span>
            </div>
          ))
        ) : (
          <div className="surface-subtle rounded-[1.25rem] px-4 py-3 text-sm leading-6 text-foreground-soft">
            Run a few rounds to build a local session history.
          </div>
        )}
      </div>
    </GamePanel>
  );
}
