"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { GamePlayer } from "@/components/games/game-player";

/**
 * Play Design 6 — "Theater"
 *
 * Cinema metaphor. The game has no frame — it sits raw on black.
 * A viewport vignette darkens the edges, pulling all focus inward.
 * The cursor hides after inactivity (like a video player). A slim
 * bottom control bar rises on mouse movement and auto-hides after
 * 2 seconds. Entrance is a circular iris-open clip-path reveal.
 */

export function PlayDesign6() {
  const [controlsVisible, setControlsVisible] = useState(false);
  const [cursorHidden, setCursorHidden] = useState(false);
  const [irisOpen, setIrisOpen] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showControls = useCallback(() => {
    setCursorHidden(false);
    setControlsVisible(true);

    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 2500);

    if (cursorTimer.current) clearTimeout(cursorTimer.current);
    cursorTimer.current = setTimeout(() => setCursorHidden(true), 3000);
  }, []);

  useEffect(() => {
    // Trigger iris open
    const t = setTimeout(() => setIrisOpen(true), 150);

    const onMove = () => showControls();
    window.addEventListener("mousemove", onMove);

    // Start cursor hide timer
    cursorTimer.current = setTimeout(() => setCursorHidden(true), 3000);

    return () => {
      clearTimeout(t);
      window.removeEventListener("mousemove", onMove);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (cursorTimer.current) clearTimeout(cursorTimer.current);
    };
  }, [showControls]);

  return (
    <>
      <style>{`
        body {
          background: #000 !important;
          overflow: hidden !important;
        }
        .theater-root {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
        }
        .theater-root--hide-cursor {
          cursor: none;
        }
        .theater-vignette {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 10;
          background: radial-gradient(
            ellipse 70% 65% at 50% 50%,
            transparent 0%,
            transparent 55%,
            rgba(0,0,0,0.4) 80%,
            rgba(0,0,0,0.85) 100%
          );
        }
        .theater-game-wrap {
          position: relative;
          width: 840px;
          height: 630px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .theater-iris {
          width: 800px;
          height: 600px;
          overflow: hidden;
          clip-path: circle(0% at 50% 50%);
          transition: clip-path 1s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .theater-iris--open {
          clip-path: circle(75% at 50% 50%);
        }
        .theater-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 30;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          height: 52px;
          background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .theater-progress {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: rgba(255,255,255,0.06);
        }
        .theater-progress::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 100%;
          background: rgba(139,92,246,0.5);
          transform-origin: left;
          animation: theater-progress-fill 60s linear forwards;
        }
        @keyframes theater-progress-fill {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        .theater-btn {
          background: none;
          border: none;
          color: rgba(255,255,255,0.45);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.08em;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 4px;
          transition: color 0.2s, background 0.2s;
          font-family: inherit;
        }
        .theater-btn:hover {
          color: rgba(255,255,255,0.85);
          background: rgba(255,255,255,0.06);
        }
      `}</style>

      <div className={`theater-root${cursorHidden ? " theater-root--hide-cursor" : ""}`}>
        <div className="theater-vignette" />

        {/* Game — iris reveal, no border, no frame */}
        <div className="theater-game-wrap">
          <div className={`theater-iris${irisOpen ? " theater-iris--open" : ""}`}>
            <GamePlayer slug="snake" />
          </div>
        </div>

        {/* Bottom control bar — auto-hides */}
        <AnimatePresence>
          {controlsVisible && (
            <motion.div
              className="theater-bar"
              initial={{ y: 52, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 52, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="theater-progress" />

              <Link href="/play-design" className="theater-btn" style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                BACK
              </Link>

              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)" }}>
                SNAKE
              </span>

              <div style={{ display: "flex", gap: 4 }}>
                <button className="theater-btn">RESTART</button>
                <button className="theater-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
                  </svg>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
