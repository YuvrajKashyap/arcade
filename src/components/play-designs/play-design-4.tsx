"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { GamePlayer } from "@/components/games/game-player";

/**
 * Play Design 4 — "Monolith"
 *
 * Architectural minimalism. Game sits in a centered monolith container
 * with a precise dot-grid background. Top bar is integrated into the
 * container as a structured header strip. Sharp, clean, confident.
 */

export function PlayDesign4() {
  const [showUI, setShowUI] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        body { background: #08080c !important; }
        .mono-grid-bg {
          position: fixed;
          inset: 0;
          background-image:
            radial-gradient(circle, rgba(139,92,246,0.04) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
          mask-image: radial-gradient(ellipse at center, black 30%, transparent 70%);
          -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 70%);
        }
        .mono-container {
          position: relative;
          background: rgba(255,255,255,0.015);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .mono-container::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(139,92,246,0.3), transparent);
        }
        .mono-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          height: 40px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          background: rgba(255,255,255,0.01);
        }
        .mono-status {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .mono-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #8b5cf6;
          animation: mono-dot-pulse 2s ease-in-out infinite;
        }
        @keyframes mono-dot-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .mono-rule {
          position: absolute;
          background: rgba(139,92,246,0.08);
        }
        .mono-rule--left {
          top: 60px;
          left: -20px;
          width: 1px;
          height: 80px;
        }
        .mono-rule--right {
          top: 60px;
          right: -20px;
          width: 1px;
          height: 80px;
        }
        .mono-rule--bottom {
          bottom: -16px;
          left: 50%;
          transform: translateX(-50%);
          width: 120px;
          height: 1px;
        }
      `}</style>

      <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <div className="mono-grid-bg" />

        {/* Hover zone for floating controls */}
        <div
          className="fixed left-0 right-0 top-0 z-50 h-12"
          onMouseEnter={() => setShowUI(true)}
          onMouseLeave={() => setShowUI(false)}
        >
          <AnimatePresence>
            {showUI && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex h-12 items-center justify-between px-8"
              >
                <Link
                  href="/play-design"
                  className="text-[10px] font-medium tracking-[0.15em] text-white/30 transition-colors hover:text-white/60"
                >
                  &larr; DESIGNS
                </Link>
                <button className="text-[10px] font-medium tracking-[0.15em] text-white/30 transition-colors hover:text-white/60">
                  FULLSCREEN
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Monolith */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={entered ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          {/* Architectural rules */}
          <div className="mono-rule mono-rule--left" />
          <div className="mono-rule mono-rule--right" />
          <div className="mono-rule mono-rule--bottom" />

          <div className="mono-container">
            {/* Integrated header */}
            <div className="mono-header">
              <span className="text-[10px] font-semibold tracking-[0.2em] text-white/30">
                SNAKE
              </span>
              <div className="mono-status">
                <div className="mono-dot" />
                <span className="text-[9px] font-medium text-white/20">LIVE</span>
              </div>
              <div className="flex gap-4">
                <button className="text-[10px] font-medium text-white/20 transition-colors hover:text-white/50">
                  RESTART
                </button>
              </div>
            </div>

            {/* Game area */}
            <div className="relative" style={{ width: 800, height: 600 }}>
              <GamePlayer slug="snake" />
            </div>

            {/* Bottom strip */}
            <div className="flex items-center justify-between border-t border-white/[0.04] bg-white/[0.005] px-5 py-2">
              <span className="text-[9px] font-medium text-white/12">SNK-01</span>
              <span className="text-[9px] font-medium text-white/12">ARCADE</span>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
