"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { GamePlayer } from "@/components/games/game-player";

/**
 * Play Design 5 — "Ember"
 *
 * Warm kinetic glow. Floating ember particles drift upward. The game
 * container has a warm-shifting border that breathes between purple
 * and amber. Alive, magnetic, premium.
 */

export function PlayDesign5() {
  const [showUI, setShowUI] = useState(false);
  const [entered, setEntered] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Ember particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    type Ember = { x: number; y: number; vy: number; vx: number; size: number; life: number; maxLife: number; hue: number };
    const embers: Ember[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const spawn = () => {
      if (embers.length < 40) {
        embers.push({
          x: Math.random() * canvas.width,
          y: canvas.height + 10,
          vy: -(Math.random() * 0.8 + 0.3),
          vx: (Math.random() - 0.5) * 0.4,
          size: Math.random() * 2.5 + 1,
          life: 0,
          maxLife: Math.random() * 400 + 200,
          hue: Math.random() > 0.5 ? 270 : 30, // purple or amber
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.x += e.vx;
        e.y += e.vy;
        e.vx += (Math.random() - 0.5) * 0.02;
        e.life++;

        const progress = e.life / e.maxLife;
        const alpha = progress < 0.1 ? progress * 10 : progress > 0.7 ? (1 - progress) / 0.3 : 1;

        if (e.life >= e.maxLife) {
          embers.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * (1 - progress * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${e.hue}, 80%, 60%, ${alpha * 0.25})`;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${e.hue}, 80%, 60%, ${alpha * 0.05})`;
        ctx.fill();
      }

      if (Math.random() < 0.15) spawn();
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
        body { background: #0a0808 !important; }
        @keyframes ember-border-shift {
          0%, 100% {
            border-color: rgba(139,92,246,0.2);
            box-shadow: 0 0 30px rgba(139,92,246,0.06), inset 0 0 30px rgba(139,92,246,0.02);
          }
          50% {
            border-color: rgba(245,158,11,0.2);
            box-shadow: 0 0 30px rgba(245,158,11,0.06), inset 0 0 30px rgba(245,158,11,0.02);
          }
        }
        .ember-container {
          border: 1px solid rgba(139,92,246,0.2);
          border-radius: 10px;
          animation: ember-border-shift 8s ease-in-out infinite;
          position: relative;
          overflow: hidden;
        }
        .ember-container::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse at 50% 100%,
            rgba(245,158,11,0.04) 0%,
            transparent 50%
          );
          pointer-events: none;
          z-index: 1;
        }
        @keyframes ember-accent-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .ember-sweep {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 50%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(245,158,11,0.4), transparent);
          animation: ember-accent-sweep 6s ease-in-out infinite;
          pointer-events: none;
        }
        .ember-haze {
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 800px;
          height: 400px;
          background: radial-gradient(ellipse at bottom, rgba(245,158,11,0.03), transparent 60%);
          pointer-events: none;
        }
      `}</style>

      <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} className="pointer-events-none fixed inset-0" />
        <div className="ember-haze" />

        {/* Top bar */}
        <div
          className="fixed left-0 right-0 top-0 z-50 h-16"
          onMouseEnter={() => setShowUI(true)}
          onMouseLeave={() => setShowUI(false)}
        >
          <AnimatePresence>
            {showUI && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="flex h-16 items-center justify-between px-8"
                style={{
                  background: "linear-gradient(to bottom, rgba(10,8,8,0.85), transparent)",
                }}
              >
                <Link
                  href="/play-design"
                  className="flex items-center gap-2 text-xs font-medium text-white/40 transition-colors hover:text-amber-400/70"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  BACK
                </Link>
                <span className="text-[10px] font-semibold tracking-[0.25em] text-white/15">
                  SNAKE
                </span>
                <div className="flex items-center gap-6">
                  <button className="text-xs font-medium text-white/30 transition-colors hover:text-amber-400/60">
                    RESTART
                  </button>
                  <button className="text-xs font-medium text-white/30 transition-colors hover:text-amber-400/60">
                    FULLSCREEN
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Game container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={entered ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="ember-container" style={{ width: 802, height: 602 }}>
            <div className="ember-sweep" />
            <div className="relative" style={{ width: 800, height: 600 }}>
              <GamePlayer slug="snake" />
            </div>
          </div>

          {/* Subtle label */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={entered ? { opacity: 1 } : {}}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="mt-5 flex items-center justify-center gap-3"
          >
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-amber-500/20" />
            <span className="text-[10px] font-medium tracking-[0.3em] text-white/15">SNAKE</span>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#8b5cf6]/20" />
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
