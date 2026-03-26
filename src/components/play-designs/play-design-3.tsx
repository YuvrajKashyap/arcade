"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { GamePlayer } from "@/components/games/game-player";

/**
 * Play Design 3 — "Nebula"
 *
 * Atmospheric depth. Slow-moving color nebula clouds drift in the
 * background. Game container has frosted glass edge treatment with
 * soft color accents. Ambient floating orbs add depth.
 */

export function PlayDesign3() {
  const [showUI, setShowUI] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        body { background: #06050e !important; }
        .nebula-bg {
          position: fixed;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .nebula-cloud {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          animation: nebula-drift 25s ease-in-out infinite alternate;
        }
        .nebula-cloud--1 {
          width: 600px;
          height: 600px;
          top: -10%;
          left: -5%;
          background: rgba(139, 92, 246, 0.06);
          animation-duration: 25s;
        }
        .nebula-cloud--2 {
          width: 500px;
          height: 500px;
          bottom: -15%;
          right: -10%;
          background: rgba(56, 189, 248, 0.04);
          animation-duration: 30s;
          animation-delay: -8s;
        }
        .nebula-cloud--3 {
          width: 400px;
          height: 400px;
          top: 40%;
          left: 50%;
          background: rgba(244, 114, 182, 0.03);
          animation-duration: 20s;
          animation-delay: -15s;
        }
        @keyframes nebula-drift {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
          100% { transform: translate(30px, 10px) scale(1.05); }
        }
        .frost-frame {
          position: relative;
          padding: 1px;
          border-radius: 12px;
          background: linear-gradient(
            135deg,
            rgba(139,92,246,0.15),
            rgba(255,255,255,0.05) 30%,
            rgba(56,189,248,0.1) 70%,
            rgba(139,92,246,0.1)
          );
        }
        .frost-frame::after {
          content: "";
          position: absolute;
          inset: -1px;
          border-radius: 13px;
          background: linear-gradient(
            135deg,
            rgba(139,92,246,0.08),
            transparent 40%,
            transparent 60%,
            rgba(56,189,248,0.06)
          );
          filter: blur(20px);
          pointer-events: none;
          z-index: -1;
        }
        .frost-inner {
          border-radius: 11px;
          overflow: hidden;
          backdrop-filter: blur(1px);
        }
        @keyframes float-orb {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.5; }
          50% { transform: translateY(-20px) scale(1.1); opacity: 0.8; }
        }
        .ambient-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          animation: float-orb 8s ease-in-out infinite;
        }
      `}</style>

      <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
        {/* Nebula background */}
        <div className="nebula-bg">
          <div className="nebula-cloud nebula-cloud--1" />
          <div className="nebula-cloud nebula-cloud--2" />
          <div className="nebula-cloud nebula-cloud--3" />
        </div>

        {/* Ambient floating orbs */}
        <div
          className="ambient-orb"
          style={{
            width: 6, height: 6,
            top: "25%", left: "15%",
            background: "rgba(139,92,246,0.4)",
            animationDelay: "0s", animationDuration: "7s",
          }}
        />
        <div
          className="ambient-orb"
          style={{
            width: 4, height: 4,
            top: "60%", right: "20%",
            background: "rgba(56,189,248,0.3)",
            animationDelay: "-3s", animationDuration: "9s",
          }}
        />
        <div
          className="ambient-orb"
          style={{
            width: 5, height: 5,
            bottom: "30%", left: "25%",
            background: "rgba(244,114,182,0.3)",
            animationDelay: "-6s", animationDuration: "11s",
          }}
        />

        {/* Top bar */}
        <div
          className="fixed left-0 right-0 top-0 z-50 h-16"
          onMouseEnter={() => setShowUI(true)}
          onMouseLeave={() => setShowUI(false)}
        >
          <AnimatePresence>
            {showUI && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex h-16 items-center justify-between px-8"
                style={{
                  background: "linear-gradient(to bottom, rgba(6,5,14,0.85), transparent)",
                  backdropFilter: "blur(12px)",
                }}
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
                <span className="text-[10px] font-medium tracking-[0.2em] text-white/20">
                  SNAKE
                </span>
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
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={entered ? { opacity: 1, scale: 1, y: 0 } : {}}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="frost-frame">
            <div className="frost-inner" style={{ width: 800, height: 600 }}>
              <GamePlayer slug="snake" />
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
