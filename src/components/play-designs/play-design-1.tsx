"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { GamePlayer } from "@/components/games/game-player";

/**
 * Play Design 1 — "Void"
 *
 * Total immersion. The game floats in absolute darkness with nothing
 * but a breathing radial glow behind it. The container has a hair-thin
 * border that slowly pulses in opacity. Top bar slides down on hover.
 * Everything else is void.
 */

export function PlayDesign1() {
  const [showUI, setShowUI] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        body { background: #000 !important; }
        .void-glow {
          position: fixed;
          top: 50%;
          left: 50%;
          width: 900px;
          height: 900px;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, rgba(139,92,246,0.08) 0%, rgba(139,92,246,0.03) 30%, transparent 60%);
          pointer-events: none;
          animation: void-breathe 6s ease-in-out infinite;
        }
        @keyframes void-breathe {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.08); }
        }
        .void-border {
          border: 1px solid rgba(139,92,246,0.12);
          animation: void-border-pulse 4s ease-in-out infinite;
        }
        @keyframes void-border-pulse {
          0%, 100% { border-color: rgba(139,92,246,0.12); }
          50% { border-color: rgba(139,92,246,0.25); }
        }
        .void-scanline {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(139,92,246,0.008) 2px,
            rgba(139,92,246,0.008) 4px
          );
        }
      `}</style>

      <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <div className="void-glow" />

        {/* Top bar — slides down on hover */}
        <div
          className="fixed left-0 right-0 top-0 z-50 h-16"
          onMouseEnter={() => setShowUI(true)}
          onMouseLeave={() => setShowUI(false)}
        >
          <AnimatePresence>
            {showUI && (
              <motion.div
                initial={{ y: -64, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -64, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex h-16 items-center justify-between px-8"
                style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)" }}
              >
                <Link
                  href="/play-design"
                  className="flex items-center gap-2 text-xs font-medium text-white/40 transition-colors hover:text-white/70"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  BACK
                </Link>
                <div className="flex items-center gap-6">
                  <button className="text-xs font-medium text-white/30 transition-colors hover:text-white/60">
                    RESTART
                  </button>
                  <button className="text-xs font-medium text-white/30 transition-colors hover:text-white/60">
                    FULLSCREEN
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Game container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={entered ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="void-border rounded-lg p-1">
            <div className="void-scanline rounded-lg" />
            <div className="relative overflow-hidden rounded-lg bg-black/80" style={{ width: 800, height: 600 }}>
              <GamePlayer slug="snake" />
            </div>
          </div>

          {/* Game title — very subtle below */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={entered ? { opacity: 1 } : {}}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-4 text-center text-[10px] font-medium tracking-[0.3em] text-white/12"
          >
            SNAKE
          </motion.p>
        </motion.div>
      </div>
    </>
  );
}
