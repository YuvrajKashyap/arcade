"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { GamePlayer } from "@/components/games/game-player";

/**
 * Play Design 8 — "Zen"
 *
 * Japanese ma (間) — the beauty of emptiness. Nothing exists that
 * doesn't need to. No borders, no glow, no particles, no buttons.
 * The game simply is. Keyboard-only controls: Esc = back, R = restart,
 * F = fullscreen, ? = show shortcuts. A single slow fade-in is the
 * only entrance animation. The restraint is the design.
 */

export function PlayDesign8() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const navigateBack = useCallback(() => {
    setExiting(true);
    setTimeout(() => router.push("/play-design"), 500);
  }, [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't capture if game is focused on an input or if modifier keys held
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      switch (e.key) {
        case "Escape":
          navigateBack();
          break;
        case "?":
          setShowHelp((prev) => !prev);
          break;
        case "f":
        case "F":
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            document.documentElement.requestFullscreen?.();
          }
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigateBack]);

  // Auto-hide help after 4s
  useEffect(() => {
    if (!showHelp) return;
    const t = setTimeout(() => setShowHelp(false), 4000);
    return () => clearTimeout(t);
  }, [showHelp]);

  return (
    <>
      <style>{`
        body {
          background: #0d0b0f !important;
          overflow: hidden !important;
        }
        .zen-root {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 24px;
        }
        .zen-game {
          width: 800px;
          height: 600px;
          overflow: hidden;
        }
        .zen-label {
          font-size: 11px;
          font-weight: 300;
          letter-spacing: 0.35em;
          color: rgba(255,255,255,0.09);
          user-select: none;
        }
        .zen-help {
          position: fixed;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 28px;
          padding: 14px 24px;
          border-radius: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .zen-key {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: rgba(255,255,255,0.3);
        }
        .zen-kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 22px;
          padding: 0 6px;
          border-radius: 4px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          font-size: 10px;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
          font-family: inherit;
          line-height: 1;
        }
        .zen-hint {
          position: fixed;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          color: rgba(255,255,255,0.06);
          user-select: none;
        }
      `}</style>

      <motion.div
        className="zen-root"
        initial={{ opacity: 0 }}
        animate={{ opacity: exiting ? 0 : visible ? 1 : 0 }}
        transition={{ duration: exiting ? 0.4 : 1.4, ease: "easeOut" }}
      >
        <div className="zen-game">
          <GamePlayer slug="snake" />
        </div>

        <span className="zen-label">SNAKE</span>
      </motion.div>

      {/* Keyboard shortcuts overlay */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            className="zen-help"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
          >
            <div className="zen-key">
              <span className="zen-kbd">ESC</span>
              Back
            </div>
            <div className="zen-key">
              <span className="zen-kbd">F</span>
              Fullscreen
            </div>
            <div className="zen-key">
              <span className="zen-kbd">?</span>
              Toggle help
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barely-visible hint */}
      <AnimatePresence>
        {!showHelp && visible && !exiting && (
          <motion.span
            className="zen-hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 2, duration: 1 }}
          >
            press ? for controls
          </motion.span>
        )}
      </AnimatePresence>
    </>
  );
}
