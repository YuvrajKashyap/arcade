"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { GamePlayer } from "@/components/games/game-player";

/**
 * Play Design 2 — "Neon Frame"
 *
 * Electric precision. Game container has an animated neon border that
 * traces around the edges continuously. Background has a subtle animated
 * dot grid. Top bar fades in from top on hover. Sharp and geometric.
 */

export function PlayDesign2() {
  const [showUI, setShowUI] = useState(false);
  const [entered, setEntered] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Particle background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.15 + 0.05,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${p.alpha})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <style>{`
        body { background: #050510 !important; }
        @keyframes neon-trace {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
        .neon-frame {
          position: relative;
          padding: 2px;
          border-radius: 8px;
        }
        .neon-frame::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 8px;
          padding: 2px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            #8b5cf6 20%,
            #c084fc 30%,
            transparent 50%,
            transparent 70%,
            #8b5cf6 80%,
            #c084fc 90%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: neon-trace 3s linear infinite;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .neon-frame::after {
          content: "";
          position: absolute;
          inset: -8px;
          border-radius: 12px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(139,92,246,0.15) 25%,
            transparent 50%,
            transparent 75%,
            rgba(139,92,246,0.15) 100%
          );
          background-size: 200% 100%;
          animation: neon-trace 3s linear infinite;
          filter: blur(12px);
          pointer-events: none;
          z-index: -1;
        }
        .neon-corner {
          position: absolute;
          width: 12px;
          height: 12px;
          border-color: rgba(139,92,246,0.4);
          pointer-events: none;
        }
        .neon-corner--tl { top: -4px; left: -4px; border-top: 1px solid; border-left: 1px solid; }
        .neon-corner--tr { top: -4px; right: -4px; border-top: 1px solid; border-right: 1px solid; }
        .neon-corner--bl { bottom: -4px; left: -4px; border-bottom: 1px solid; border-left: 1px solid; }
        .neon-corner--br { bottom: -4px; right: -4px; border-bottom: 1px solid; border-right: 1px solid; }
      `}</style>

      <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} className="pointer-events-none fixed inset-0" />

        {/* Top bar */}
        <div
          className="fixed left-0 right-0 top-0 z-50 h-16"
          onMouseEnter={() => setShowUI(true)}
          onMouseLeave={() => setShowUI(false)}
        >
          <AnimatePresence>
            {showUI && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex h-16 items-center justify-between px-8"
                style={{ background: "linear-gradient(to bottom, rgba(5,5,16,0.9), transparent)" }}
              >
                <Link
                  href="/play-design"
                  className="flex items-center gap-2 text-xs font-medium text-white/40 transition-colors hover:text-[#c4b5fd]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  BACK
                </Link>
                <div className="flex items-center gap-6">
                  <button className="text-xs font-medium text-white/30 transition-colors hover:text-[#c4b5fd]">
                    RESTART
                  </button>
                  <button className="text-xs font-medium text-white/30 transition-colors hover:text-[#c4b5fd]">
                    FULLSCREEN
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Game container */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={entered ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          {/* Corner brackets */}
          <div className="neon-corner neon-corner--tl" />
          <div className="neon-corner neon-corner--tr" />
          <div className="neon-corner neon-corner--bl" />
          <div className="neon-corner neon-corner--br" />

          <div className="neon-frame">
            <div className="relative overflow-hidden rounded-md bg-[#0a0a18]" style={{ width: 800, height: 600 }}>
              <GamePlayer slug="snake" />
            </div>
          </div>

          {/* Title + meta */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={entered ? { opacity: 1 } : {}}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-5 flex items-center justify-between px-1"
          >
            <span className="text-[10px] font-semibold tracking-[0.25em] text-[#8b5cf6]/40">
              SNAKE
            </span>
            <span className="text-[10px] font-medium text-white/10">
              ARCADE &bull; SNK-01
            </span>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
