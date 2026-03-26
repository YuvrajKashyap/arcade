"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { GamePlayer } from "@/components/games/game-player";

/**
 * Play Design 7 — "Split"
 *
 * Editorial asymmetry. The viewport is divided: a narrow left panel
 * holds the game title written vertically, a back link, and minimal
 * controls. The right side holds the game, filling as much vertical
 * space as possible. A single thin line divides the two zones.
 * Entrance: the divider draws itself, then both sides reveal.
 */

export function PlayDesign7() {
  const [phase, setPhase] = useState<"line" | "content" | "done">("line");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("content"), 100);
    const t2 = setTimeout(() => setPhase("done"), 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <>
      <style>{`
        body {
          background: #09090b !important;
          overflow: hidden !important;
        }
        .split-root {
          position: fixed;
          inset: 0;
          display: flex;
        }

        /* Left panel */
        .split-panel {
          position: relative;
          width: 72px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 28px 0;
          flex-shrink: 0;
        }

        /* Divider line */
        .split-divider {
          position: absolute;
          top: 0;
          right: 0;
          width: 1px;
          height: 0%;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            rgba(139,92,246,0.25) 15%,
            rgba(139,92,246,0.12) 50%,
            rgba(139,92,246,0.25) 85%,
            transparent 100%
          );
          transition: height 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .split-divider--drawn {
          height: 100%;
        }

        /* Vertical title */
        .split-title {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.25em;
          color: rgba(255,255,255,0.14);
          white-space: nowrap;
          user-select: none;
          transform: rotate(180deg);
        }

        /* Back button */
        .split-back {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          color: rgba(255,255,255,0.25);
          transition: color 0.2s, background 0.2s;
          text-decoration: none;
        }
        .split-back:hover {
          color: rgba(255,255,255,0.6);
          background: rgba(255,255,255,0.04);
        }

        /* Control icon buttons */
        .split-ctrl {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 5px;
          border: none;
          background: none;
          color: rgba(255,255,255,0.15);
          cursor: pointer;
          transition: color 0.2s, background 0.2s;
        }
        .split-ctrl:hover {
          color: rgba(255,255,255,0.5);
          background: rgba(255,255,255,0.04);
        }

        /* Right — game area */
        .split-game-area {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 40px 32px 24px;
        }
        .split-game-container {
          position: relative;
          background: #0c0c0e;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.03);
        }
      `}</style>

      <div className="split-root">
        {/* Left panel */}
        <motion.div
          className="split-panel"
          initial={{ opacity: 0 }}
          animate={phase !== "line" ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Back */}
          <Link href="/play-design" className="split-back" aria-label="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>

          {/* Vertical title — centered */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="split-title">SNAKE</span>
          </div>

          {/* Bottom controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button className="split-ctrl" aria-label="Restart" title="Restart">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6" />
                <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
              </svg>
            </button>
            <button className="split-ctrl" aria-label="Fullscreen" title="Fullscreen">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
              </svg>
            </button>
          </div>

          {/* Divider */}
          <div className={`split-divider${phase !== "line" ? " split-divider--drawn" : ""}`} />
        </motion.div>

        {/* Right — game */}
        <motion.div
          className="split-game-area"
          initial={{ opacity: 0, x: 20 }}
          animate={phase !== "line" ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="split-game-container" style={{ width: 800, height: 600 }}>
            <GamePlayer slug="snake" />
          </div>
        </motion.div>
      </div>
    </>
  );
}
