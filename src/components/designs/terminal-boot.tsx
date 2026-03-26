"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type TerminalBootProps = {
  onComplete: () => void;
  gameTitles?: string[];
};

function formatLoadedGames(gameTitles: string[]) {
  if (gameTitles.length === 0) {
    return "3 games loaded: snake, pong, reaction-time";
  }

  const normalizedTitles = gameTitles.map((title) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
  );
  const visibleTitles = normalizedTitles.slice(0, 3).join(", ");
  const overflow =
    normalizedTitles.length > 3 ? `, +${normalizedTitles.length - 3} more` : "";

  return `${gameTitles.length} games loaded: ${visibleTitles}${overflow}`;
}

export function TerminalBoot({
  onComplete,
  gameTitles = [],
}: TerminalBootProps) {
  const [lines, setLines] = useState<{ text: string; done: boolean }[]>([]);
  const [dots, setDots] = useState(0);
  const [phase, setPhase] = useState<"typing" | "loading" | "done">("typing");
  const gameCatalogSummary = formatLoadedGames(gameTitles);

  useEffect(() => {
    const ids: ReturnType<typeof setTimeout>[] = [];
    const bootSequence = [
      { text: "$ connect arcade.yuvrajkashyap.com", delay: 0, speed: 28 },
      { text: "", delay: 850, speed: 0 },
      { text: "> connection established.", delay: 950, speed: 22 },
      { text: `> ${gameCatalogSummary}`, delay: 1700, speed: 16 },
      { text: "", delay: 2800, speed: 0 },
      { text: "> loading arcade", delay: 2900, speed: 30 },
    ];

    bootSequence.forEach((line, idx) => {
      if (!line.text) {
        ids.push(
          setTimeout(
            () => setLines((previous) => [...previous, { text: "", done: true }]),
            line.delay,
          ),
        );
        return;
      }

      ids.push(
        setTimeout(() => {
          setLines((previous) => [...previous, { text: "", done: false }]);

          line.text.split("").forEach((character, characterIndex) => {
            ids.push(
              setTimeout(() => {
                setLines((previous) => {
                  const updated = [...previous];
                  if (updated[idx]) {
                    updated[idx] = {
                      text: updated[idx].text + character,
                      done: characterIndex === line.text.length - 1,
                    };
                  }
                  return updated;
                });
              }, line.delay + characterIndex * line.speed),
            );
          });
        }, line.delay),
      );
    });

    const lastSequenceLine = bootSequence[bootSequence.length - 1];
    const loadingPhaseDelay =
      lastSequenceLine.delay + lastSequenceLine.text.length * lastSequenceLine.speed;

    ids.push(setTimeout(() => setPhase("loading"), loadingPhaseDelay + 150));

    return () => ids.forEach(clearTimeout);
  }, [gameCatalogSummary]);

  useEffect(() => {
    if (phase !== "loading") {
      return;
    }

    let dotCount = 0;
    const intervalId = setInterval(() => {
      dotCount += 1;
      setDots(dotCount);

      if (dotCount >= 6) {
        clearInterval(intervalId);
        setPhase("done");
        setTimeout(() => onComplete(), 550);
      }
    }, 320);

    return () => clearInterval(intervalId);
  }, [phase, onComplete]);

  const loadingLine =
    phase === "loading" || phase === "done"
      ? `> loading arcade${".".repeat(Math.min(dots, 3))}${dots > 3 ? " ready." : ""}`
      : null;

  return (
    <AnimatePresence>
      {phase !== "done" ? (
        <motion.div
          key="boot"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: "#000" }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "repeating-linear-gradient(0deg, rgba(0,0,0,0.14) 0px, rgba(0,0,0,0.14) 1px, transparent 1px, transparent 3px)",
              zIndex: 1,
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.65) 100%)",
              zIndex: 1,
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(51,255,51,0.015) 0%, transparent 70%)",
              zIndex: 1,
            }}
          />

          <div
            className="relative z-10 w-full max-w-[560px] px-6 font-mono"
            style={{
              color: "#33ff33",
              fontSize: "13px",
              lineHeight: 2,
              textShadow: "0 0 8px rgba(51,255,51,0.4), 0 0 2px rgba(51,255,51,0.2)",
            }}
          >
            {lines.map((line, index) => (
              <div key={index} style={{ minHeight: "2em" }}>
                {line.text}
                {!line.done && line.text.length > 0 ? <span className="tb-cursor">_</span> : null}
              </div>
            ))}
            {loadingLine ? (
              <div>
                {loadingLine}
                {dots <= 3 ? <span className="tb-cursor">_</span> : null}
              </div>
            ) : null}
          </div>

          <style>{`
            .tb-cursor {
              animation: tb-blink 0.65s step-end infinite;
              margin-left: 1px;
            }
            @keyframes tb-blink {
              0%, 100% { opacity: 1; }
              50% { opacity: 0; }
            }
          `}</style>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
