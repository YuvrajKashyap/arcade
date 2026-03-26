"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { designShowcaseGames } from "@/components/designs/design-showcase-games";

/**
 * Design 2 — "Prism"
 *
 * Glassmorphism done with restraint. Frosted glass surfaces, blurred
 * background orbs, prismatic gradient title. Search is a frosted pill
 * that glows on focus. Cards have translucent borders with subtle
 * light-sweep on hover. Deep, layered, atmospheric.
 */

const genres = ["All", ...new Set(designShowcaseGames.map((g) => g.genre))];

export function Design2() {
  const [activeGenre, setActiveGenre] = useState("All");

  const filtered =
    activeGenre === "All"
      ? designShowcaseGames
      : designShowcaseGames.filter((g) => g.genre === activeGenre);

  return (
    <>
      <style>{`
        body {
          background: #07060e !important;
          color: #e4ddf5;
          overflow-x: hidden;
        }
        .prism-orb-1 {
          position: fixed;
          top: -10%;
          left: 20%;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%);
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }
        .prism-orb-2 {
          position: fixed;
          bottom: -15%;
          right: 10%;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 70%);
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }
        .prism-glass {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .prism-card {
          position: relative;
          overflow: hidden;
        }
        .prism-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
          transition: left 0.6s ease;
          pointer-events: none;
          z-index: 1;
        }
        .prism-card:hover::before {
          left: 120%;
        }
        .prism-search {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 9999px;
          outline: none;
          color: #e4ddf5;
          font-size: 15px;
          width: 100%;
          padding: 14px 20px 14px 48px;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
          font-family: inherit;
        }
        .prism-search:focus {
          border-color: rgba(139,92,246,0.4);
          box-shadow: 0 0 30px rgba(139,92,246,0.12);
        }
        .prism-search::placeholder {
          color: rgba(255,255,255,0.22);
        }
      `}</style>

      <div className="prism-orb-1" />
      <div className="prism-orb-2" />

      <div className="relative z-10 min-h-screen">
        {/* Nav */}
        <nav className="flex items-center justify-between px-8 py-5 lg:px-14">
          <span className="text-xs font-medium tracking-[0.3em] text-white/40">
            ARCADE
          </span>
          <div className="flex gap-6 text-sm text-white/35">
            <span className="cursor-default transition-colors hover:text-white/70">Browse</span>
            <span className="cursor-default transition-colors hover:text-white/70">About</span>
          </div>
        </nav>

        {/* ARCADE title */}
        <motion.div
          className="px-8 pt-14 text-center lg:pt-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <h1 className="text-6xl font-bold tracking-tight sm:text-7xl lg:text-8xl">
            <span className="bg-gradient-to-r from-[#c4b5fd] via-[#a78bfa] to-[#818cf8] bg-clip-text text-transparent">
              ARCADE
            </span>
          </h1>
          <p className="mt-4 text-sm text-white/30">
            Keyboard-first games, instant play
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          className="mx-auto mt-10 max-w-lg px-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="relative">
            <svg
              className="absolute left-5 top-1/2 -translate-y-1/2 text-white/25"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              className="prism-search"
              placeholder="Search games..."
            />
          </div>
        </motion.div>

        {/* Filters + Sort */}
        <div className="mx-auto mt-14 flex max-w-5xl items-center justify-between px-8 lg:px-14">
          <div className="flex gap-2">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setActiveGenre(genre)}
                className={`rounded-full px-4 py-1.5 text-xs transition-all ${
                  activeGenre === genre
                    ? "prism-glass border-white/[0.12] text-white/80"
                    : "text-white/30 hover:text-white/50"
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
          <select className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-white/40 outline-none backdrop-blur-xl">
            <option>Newest</option>
            <option>A-Z</option>
          </select>
        </div>

        {/* Game grid */}
        <div className="mx-auto mt-8 grid max-w-5xl gap-4 px-8 sm:grid-cols-2 lg:grid-cols-3 lg:px-14">
          {filtered.map((game, i) => (
            <motion.div
              key={game.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.08, duration: 0.5 }}
            >
              <Link
                href={game.href}
                className="prism-card prism-glass group block rounded-2xl p-1 transition-all duration-300 hover:border-white/[0.12] hover:shadow-[0_8px_40px_rgba(0,0,0,0.3)]"
              >
                {/* Thumbnail */}
                <div
                  className="relative flex h-36 items-center justify-center rounded-xl transition-all"
                  style={{
                    background: `radial-gradient(ellipse 70% 60% at 50% 40%, ${game.accent}18 0%, transparent 70%), rgba(255,255,255,0.02)`,
                  }}
                >
                  <span
                    className="text-4xl font-bold opacity-20 transition-opacity group-hover:opacity-35"
                    style={{ color: game.accent }}
                  >
                    {game.title.charAt(0)}
                  </span>
                </div>

                <div className="relative z-10 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white/85 transition-colors group-hover:text-white">
                      {game.title}
                    </h3>
                    <span className="text-[10px] text-white/20">{game.genre}</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/30">
                    {game.blurb}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-[10px] text-white/20">
                    <span>{game.metric}</span>
                    <span className="text-[#a78bfa] opacity-0 transition-opacity group-hover:opacity-100">
                      Play &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-24 border-t border-white/[0.04] px-8 py-6 lg:px-14">
          <div className="mx-auto flex max-w-5xl items-center justify-between text-xs text-white/15">
            <span>arcade.yuvrajkashyap.com</span>
            <span>Built for the browser</span>
          </div>
        </footer>
      </div>
    </>
  );
}
