"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { designShowcaseGames } from "@/components/designs/design-showcase-games";

/**
 * Design 5 — "Carbon"
 *
 * Industrial premium. ARCADE in heavy bold with tight tracking and a
 * subtle micro-texture. Search bar has sharp geometric corners with an
 * accent notch. Cards use sharp edges, accent-colored top notches, and
 * precise border reveals on hover. Structured, engineered, confident.
 */

const genres = ["All", ...new Set(designShowcaseGames.map((g) => g.genre))];

export function Design5() {
  const [activeGenre, setActiveGenre] = useState("All");

  const filtered =
    activeGenre === "All"
      ? designShowcaseGames
      : designShowcaseGames.filter((g) => g.genre === activeGenre);

  return (
    <>
      <style>{`
        body {
          background: #0a0a0c !important;
          color: #d0cdd8;
          overflow-x: hidden;
        }
        .carbon-texture {
          background-image: radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 4px 4px;
        }
        .carbon-search {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 2px;
          outline: none;
          color: #d0cdd8;
          font-size: 14px;
          width: 100%;
          padding: 13px 16px 13px 44px;
          transition: border-color 0.2s ease;
          font-family: inherit;
          clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%);
        }
        .carbon-search:focus {
          border-color: rgba(139,92,246,0.6);
        }
        .carbon-search::placeholder {
          color: rgba(255,255,255,0.18);
        }
        .carbon-card {
          position: relative;
          clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px));
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          transition: all 0.25s ease;
        }
        .carbon-card:hover {
          border-color: rgba(139,92,246,0.3);
          background: rgba(255,255,255,0.04);
        }
        .carbon-card::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 40px;
          height: 2px;
          transition: width 0.3s ease, background 0.3s ease;
        }
        .carbon-card:hover::after {
          width: 80px;
        }
        .carbon-notch {
          position: absolute;
          top: -1px;
          right: -1px;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 0 17px 17px 0;
          border-color: transparent #0a0a0c transparent transparent;
          z-index: 2;
        }
      `}</style>

      <div className="carbon-texture min-h-screen">
        {/* Nav */}
        <nav className="flex items-center justify-between px-8 py-5 lg:px-14">
          <div className="flex items-center gap-3">
            <div className="h-4 w-1 bg-[#8b5cf6]" />
            <span className="text-xs font-bold tracking-[0.2em] text-white/50">
              ARCADE
            </span>
          </div>
          <div className="flex gap-6 text-xs font-medium text-white/25">
            <span className="cursor-default transition-colors hover:text-white/60">CATALOG</span>
            <span className="cursor-default transition-colors hover:text-white/60">ABOUT</span>
          </div>
        </nav>

        {/* ARCADE title */}
        <motion.div
          className="px-8 pt-14 text-center lg:pt-20"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-6xl font-black tracking-[-0.02em] text-white sm:text-7xl lg:text-8xl">
            ARCADE
          </h1>
          <div className="mx-auto mt-4 flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-[#8b5cf6]/30" />
            <p className="text-xs font-medium tracking-[0.3em] text-white/22">
              BROWSER GAMES
            </p>
            <div className="h-px w-12 bg-[#8b5cf6]/30" />
          </div>
        </motion.div>

        {/* Search */}
        <motion.div
          className="mx-auto mt-10 max-w-lg px-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/22"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              className="carbon-search"
              placeholder="Search games"
            />
            {/* Notch accent */}
            <div className="absolute right-0 top-0 h-px w-3 bg-[#8b5cf6]/60" style={{ transform: "rotate(-45deg)", transformOrigin: "right top" }} />
          </div>
        </motion.div>

        {/* Controls bar */}
        <div className="mx-auto mt-14 flex max-w-5xl items-center justify-between px-8 lg:px-14">
          {/* Genre filters */}
          <div className="flex gap-1">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setActiveGenre(genre)}
                className={`px-3 py-1.5 text-[11px] font-medium tracking-[0.06em] transition-all ${
                  activeGenre === genre
                    ? "bg-[#8b5cf6]/15 text-[#c4b5fd]"
                    : "text-white/22 hover:bg-white/[0.03] hover:text-white/45"
                }`}
                style={{ clipPath: "polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)" }}
              >
                {genre.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            className="bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-white/30 outline-none"
            style={{ clipPath: "polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)" }}
          >
            <option>NEWEST</option>
            <option>A-Z</option>
            <option>DURATION</option>
          </select>
        </div>

        {/* Game grid */}
        <div className="mx-auto mt-6 grid max-w-5xl gap-4 px-8 sm:grid-cols-2 lg:grid-cols-3 lg:px-14">
          {filtered.map((game, i) => (
            <motion.div
              key={game.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
            >
              <Link
                href={game.href}
                className="carbon-card group block"
                style={
                  { "--card-accent": game.accent } as React.CSSProperties
                }
              >
                {/* Top accent bar via ::after uses CSS var */}
                <div
                  className="absolute left-0 top-0 h-0.5 w-10 transition-all group-hover:w-20"
                  style={{ background: game.accent }}
                />
                <div className="carbon-notch" />

                {/* Thumbnail */}
                <div className="flex h-32 items-center justify-center border-b border-white/[0.04]">
                  <span
                    className="text-3xl font-black opacity-10 transition-opacity group-hover:opacity-20"
                    style={{ color: game.accent }}
                  >
                    {game.title.toUpperCase()}
                  </span>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white/80 transition-colors group-hover:text-white">
                      {game.title}
                    </h3>
                    <span className="text-[10px] font-medium text-white/15">{game.code}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-white/25">
                    {game.blurb}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-[10px] font-medium text-white/15">
                    <div className="flex gap-4">
                      <span>{game.genre.toUpperCase()}</span>
                      <span>{game.metric}</span>
                    </div>
                    <span
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      style={{ color: game.accent }}
                    >
                      LAUNCH &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-20 border-t border-white/[0.04] px-8 py-6 lg:px-14">
          <div className="mx-auto flex max-w-5xl items-center justify-between text-[10px] font-medium text-white/12">
            <span>GAMES.YUVRAJKASHYAP.COM</span>
            <span>DESKTOP-FIRST PLATFORM</span>
          </div>
        </footer>
      </div>
    </>
  );
}
