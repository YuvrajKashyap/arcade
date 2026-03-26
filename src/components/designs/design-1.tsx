"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { designShowcaseGames } from "@/components/designs/design-showcase-games";

/**
 * Design 1 — "Obsidian"
 *
 * Ultra-minimal, near-monochrome. ARCADE in thin ultra-wide-tracked
 * letters. Search is a single expanding underline. Cards are borderless
 * flat surfaces with hover-reveal bottom glow. Everything is reduced
 * to essential form. The restraint IS the design.
 */

const genres = ["All", ...new Set(designShowcaseGames.map((g) => g.genre))];

export function Design1() {
  const [activeGenre, setActiveGenre] = useState("All");
  const [searchFocused, setSearchFocused] = useState(false);

  const filtered =
    activeGenre === "All"
      ? designShowcaseGames
      : designShowcaseGames.filter((g) => g.genre === activeGenre);

  return (
    <>
      <style>{`
        body {
          background: #050505 !important;
          color: #e0e0e0;
        }
        .obsidian-dot-grid {
          background-image: radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 32px 32px;
        }
        .obsidian-card::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 10%;
          right: 10%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent);
          opacity: 0;
          transition: opacity 0.4s ease;
        }
        .obsidian-card:hover::after {
          opacity: 1;
        }
        .obsidian-search {
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          outline: none;
          color: #e0e0e0;
          font-size: 15px;
          width: 100%;
          padding: 12px 0 12px 32px;
          transition: border-color 0.3s ease;
          font-family: inherit;
        }
        .obsidian-search:focus {
          border-bottom-color: rgba(139,92,246,0.5);
        }
        .obsidian-search::placeholder {
          color: rgba(255,255,255,0.2);
        }
      `}</style>

      <div className="obsidian-dot-grid min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 lg:px-16">
          <span className="text-xs tracking-[0.2em] text-white/30">
            arcade.yuvrajkashyap.com
          </span>
          <div className="flex gap-8 text-xs tracking-[0.15em] text-white/25">
            <span className="cursor-default transition-colors hover:text-white/60">Library</span>
            <span className="cursor-default transition-colors hover:text-white/60">About</span>
          </div>
        </div>

        {/* ARCADE title */}
        <motion.div
          className="px-8 pb-6 pt-16 text-center lg:px-16 lg:pt-24"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <h1
            className="text-5xl font-extralight tracking-[0.5em] text-white/90 sm:text-6xl lg:text-7xl"
            style={{ fontVariantLigatures: "none" }}
          >
            ARCADE
          </h1>
          <p className="mt-4 text-xs tracking-[0.3em] text-white/20">
            BROWSER-FIRST GAMES
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          className="mx-auto mt-10 max-w-xl px-8 lg:px-16"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="relative">
            <svg
              className="absolute left-0 top-1/2 -translate-y-1/2 text-white/20"
              width="16"
              height="16"
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
              className="obsidian-search"
              placeholder="Search games"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            <motion.div
              className="absolute bottom-0 left-0 h-px bg-[#8b5cf6]/50"
              initial={false}
              animate={{ width: searchFocused ? "100%" : "0%" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </motion.div>

        {/* Filters + Sort */}
        <div className="mx-auto mt-14 flex max-w-5xl items-center justify-between px-8 lg:px-16">
          <div className="flex gap-6">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setActiveGenre(genre)}
                className={`text-xs tracking-[0.15em] transition-colors ${
                  activeGenre === genre
                    ? "text-white/80"
                    : "text-white/20 hover:text-white/40"
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
          <span className="text-xs tracking-[0.1em] text-white/15">
            {filtered.length} title{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Game grid */}
        <div className="mx-auto mt-8 grid max-w-5xl gap-px px-8 sm:grid-cols-2 lg:grid-cols-3 lg:px-16">
          {filtered.map((game, i) => (
            <motion.div
              key={game.title}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.08, duration: 0.5 }}
            >
              <Link
                href={game.href}
                className="obsidian-card group relative block bg-white/[0.02] p-7 transition-all duration-300 hover:bg-white/[0.04]"
              >
                {/* Thumbnail area */}
                <div className="mb-5 h-32 rounded-sm bg-white/[0.03] transition-colors group-hover:bg-white/[0.05]">
                  <div className="flex h-full items-center justify-center">
                    <span
                      className="text-3xl font-extralight tracking-[0.3em] transition-colors"
                      style={{ color: `${game.accent}40` }}
                    >
                      {game.title.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-medium text-white/80 transition-colors group-hover:text-white">
                  {game.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-white/25">
                  {game.blurb}
                </p>
                <div className="mt-4 flex items-center justify-between text-[10px] tracking-[0.15em] text-white/15">
                  <span>{game.genre}</span>
                  <span>{game.metric}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-20 border-t border-white/[0.04] px-8 py-8 text-center text-[10px] tracking-[0.2em] text-white/15 lg:px-16">
          Desktop-first browser arcade
        </footer>
      </div>
    </>
  );
}
