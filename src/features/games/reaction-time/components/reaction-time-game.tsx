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

function getPhaseCopy(phase: ReactionPhase) {
  if (phase === "waiting") {
    return "Wait for the panel to turn ready. Jumping early fails the round.";
  }

  if (phase === "ready") {
    return "React now.";
  }

  if (phase === "too-soon") {
    return "Too early. Reset and hold until the ready state appears.";
  }

  if (phase === "result") {
    return "Round recorded. Run another attempt or reset the session.";
  }

  return "Press space, enter, click, or tap to begin a reflex check.";
}

function getStageClasses(phase: ReactionPhase) {
  if (phase === "ready") {
    return "border-line-strong bg-[linear-gradient(180deg,rgba(28,20,52,0.96),rgba(60,34,120,0.96))]";
  }

  if (phase === "too-soon") {
    return "border-line-strong bg-[linear-gradient(180deg,rgba(41,14,30,0.96),rgba(86,24,56,0.96))]";
  }

  if (phase === "waiting") {
    return "border-line bg-[linear-gradient(180deg,rgba(18,14,30,0.96),rgba(25,20,43,0.96))]";
  }

  return "border-line bg-[linear-gradient(180deg,rgba(15,12,26,0.96),rgba(12,10,22,0.98))]";
}

export function ReactionTimeGame() {
  const timeoutRef = useRef<number | null>(null);
  const readyAtRef = useRef(0);
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

  return (
    <div className="flex flex-col gap-6 text-foreground">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-foreground-soft">
        <span>
          Best <strong className="ml-1 text-foreground">{bestTime > 0 ? `${bestTime} ms` : "No best yet"}</strong>
        </span>
        <span>
          Last <strong className="ml-1 text-foreground">{lastResult ? `${lastResult} ms` : "Waiting"}</strong>
        </span>
        <span>
          Average <strong className="ml-1 text-foreground">{averageTime ? `${averageTime} ms` : "No rounds yet"}</strong>
        </span>
      </div>

      <button
        type="button"
        onClick={handlePrimaryAction}
        className={`min-h-[28rem] rounded-[1.75rem] border px-6 py-10 text-center text-foreground ${getStageClasses(phase)}`}
      >
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-foreground-muted">
          Reaction state
        </p>
        <p className="mt-8 text-4xl font-semibold tracking-tight sm:text-5xl">
          {phase === "ready"
            ? "Click"
            : phase === "waiting"
              ? "Hold"
              : phase === "too-soon"
                ? "Too soon"
                : phase === "result"
                  ? `${lastResult} ms`
                  : "Ready?"}
        </p>
        <p className="mx-auto mt-6 max-w-xl text-sm leading-8 text-foreground-soft sm:text-base">
          {getPhaseCopy(phase)}
        </p>
      </button>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="surface-subtle rounded-[1.5rem] px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-foreground-muted">
            Controls
          </p>
          <p className="mt-3 text-sm leading-7 text-foreground-soft">
            Space, Enter, click, or tap to start and react. Press R to reset the session.
          </p>
        </div>
        <button
          type="button"
          onClick={resetSession}
          className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-foreground hover:-translate-y-0.5 hover:bg-surface"
        >
          Reset session
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {deferredAttempts.length > 0 ? (
          deferredAttempts.map((attempt, index) => (
            <div
              key={`${attempt}-${index}`}
              className="surface-subtle rounded-full px-4 py-2 text-sm"
            >
              Attempt {index + 1}: <span className="font-semibold text-foreground">{attempt} ms</span>
            </div>
          ))
        ) : (
          <div className="surface-subtle rounded-[1.25rem] px-4 py-5 text-sm leading-7 text-foreground-soft">
            Run a few rounds to build a local session history.
          </div>
        )}
      </div>
    </div>
  );
}
