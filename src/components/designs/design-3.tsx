"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { designShowcaseGames } from "@/components/designs/design-showcase-games";

/**
 * Design 3 — "Signal"
 *
 * Technical, precise, elevated. ARCADE in a mono-spaced stencil style
 * with bracket markers. Search has a blinking cursor and terminal feel
 * but refined. Cards show corner brackets and data readouts. Background
 * has a faint structural grid. Hover adds a scan-line sweep.
 */

const genres = ["All", ...new Set(designShowcaseGames.map((g) => g.genre))];
const sortOptions = ["Default", "A-Z", "Duration"];

export function Design3() {
  const [activeGenre, setActiveGenre] = useState("All");
  const [activeSort, setActiveSort] = useState("Default");

  const filtered =
    activeGenre === "All"
      ? designShowcaseGames
      : designShowcaseGames.filter((g) => g.genre === activeGenre);

  return (
    <>
      <style>{`
        body {
          background: #06080a !important;
          color: #c8cdd3;
        }
        .signal-grid-bg {
          background-image:
            linear-gradient(rgba(139,92,246,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        .signal-card {
          position: relative;
          overflow: hidden;
        }
        .signal-card::before {
          content: "";
          position: absolute;
          top: -100%;
          left: 0;
          width: 100%;
          height: 40px;
          background: linear-gradient(180deg, transparent, rgba(139,92,246,0.06), transparent);
          transition: top 0.5s ease;
          pointer-events: none;
          z-index: 1;
        }
        .signal-card:hover::before {
          top: 120%;
        }
        .signal-search {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 4px;
          outline: none;
          color: #c8cdd3;
          font-size: 14px;
          font-family: var(--font-jetbrains-mono), monospace;
          width: 100%;
          padding: 13px 16px 13px 44px;
          transition: border-color 0.25s ease;
        }
        .signal-search:focus {
          border-color: rgba(139,92,246,0.5);
        }
        .signal-search::placeholder {
          color: rgba(255,255,255,0.18);
        }
        .signal-cursor {
          animation: signal-blink 1s step-end infinite;
        }
        @keyframes signal-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>

      <div className="signal-grid-bg min-h-screen">
        {/* Nav */}
        <nav className="flex items-center justify-between border-b border-white/[0.06] px-8 py-4 font-mono lg:px-14">
          <div className="flex items-center gap-3 text-xs text-white/30">
            <span className="text-[#8b5cf6]">{"//"}</span>
            <span className="tracking-[0.2em]">SYS.ARCADE</span>
          </div>
          <div className="flex gap-6 text-xs text-white/25">
            <span className="cursor-default transition-colors hover:text-white/60">catalog</span>
            <span className="cursor-default transition-colors hover:text-white/60">about</span>
          </div>
        </nav>

        {/* ARCADE title */}
        <motion.div
          className="px-8 pt-16 text-center lg:pt-24"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-3 font-mono text-white/10">
            <span className="text-sm">[</span>
            <h1 className="text-5xl font-bold tracking-[0.25em] text-white/90 sm:text-6xl lg:text-7xl">
              ARCADE
            </h1>
            <span className="text-sm">]</span>
          </div>
          <p className="mt-3 font-mono text-xs tracking-[0.3em] text-white/20">
            SIGNAL_ACTIVE <span className="signal-cursor text-[#8b5cf6]">_</span>
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          className="mx-auto mt-10 max-w-xl px-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
        >
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-xs text-[#8b5cf6]/50">
              &gt;
            </span>
            <input
              type="text"
              className="signal-search"
              placeholder="search --query"
            />
          </div>
        </motion.div>

        {/* Controls bar */}
        <div className="mx-auto mt-12 flex max-w-5xl items-center justify-between px-8 font-mono lg:px-14">
          {/* Genre filters */}
          <div className="flex gap-1">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setActiveGenre(genre)}
                className={`rounded px-3 py-1.5 text-[11px] tracking-[0.08em] transition-all ${
                  activeGenre === genre
                    ? "bg-[#8b5cf6]/12 text-[#c4b5fd]"
                    : "text-white/20 hover:bg-white/[0.03] hover:text-white/40"
                }`}
              >
                {genre}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-white/15">sort:</span>
            {sortOptions.map((s) => (
              <button
                key={s}
                onClick={() => setActiveSort(s)}
                className={`px-2 py-1 transition-colors ${
                  activeSort === s ? "text-[#c4b5fd]" : "text-white/20 hover:text-white/40"
                }`}
              >
                {s.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Game grid */}
        <div className="mx-auto mt-6 grid max-w-5xl gap-3 px-8 sm:grid-cols-2 lg:grid-cols-3 lg:px-14">
          {filtered.map((game, i) => (
            <motion.div
              key={game.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.08, duration: 0.4 }}
            >
              <Link
                href={game.href}
                className="signal-card group block rounded-lg border border-white/[0.06] bg-white/[0.015] transition-all hover:border-[#8b5cf6]/25 hover:bg-white/[0.03]"
              >
                {/* Thumbnail */}
                <div className="relative flex h-32 items-center justify-center border-b border-white/[0.04]">
                  {/* Corner brackets */}
                  <span className="absolute left-2 top-2 font-mono text-[10px] text-white/10">[</span>
                  <span className="absolute right-2 top-2 font-mono text-[10px] text-white/10">]</span>
                  <span className="absolute bottom-2 left-2 font-mono text-[10px] text-white/10">[</span>
                  <span className="absolute bottom-2 right-2 font-mono text-[10px] text-white/10">]</span>

                  <span
                    className="font-mono text-2xl font-bold opacity-15 transition-opacity group-hover:opacity-30"
                    style={{ color: game.accent }}
                  >
                    {game.code}
                  </span>
                </div>

                <div className="relative z-10 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white/80 transition-colors group-hover:text-white">
                      {game.title}
                    </h3>
                    <span className="font-mono text-[10px] text-[#8b5cf6]/40">{game.mode}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-white/25">
                    {game.blurb}
                  </p>

                  {/* Data readout */}
                  <div className="mt-3 flex items-center gap-4 border-t border-white/[0.04] pt-3 font-mono text-[10px] text-white/15">
                    <span>genre: {game.genre.toLowerCase()}</span>
                    <span>time: {game.metric.toLowerCase()}</span>
                    <span className="ml-auto text-[#8b5cf6]/60 opacity-0 transition-opacity group-hover:opacity-100">
                      launch &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-20 border-t border-white/[0.04] px-8 py-6 lg:px-14">
          <div className="mx-auto flex max-w-5xl items-center justify-between font-mono text-[10px] text-white/12">
            <span>{"// arcade.yuvrajkashyap.com"}</span>
            <span>signal_end</span>
          </div>
        </footer>
      </div>
    </>
  );
}
