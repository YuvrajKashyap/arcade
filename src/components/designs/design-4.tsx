"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { designShowcaseGames } from "@/components/designs/design-showcase-games";

const sortOptions = ["Newest", "A-Z", "Duration"] as const;

function getMetricDuration(metric: string) {
  const values = metric.match(/\d+/g);
  if (!values?.length) return Number.POSITIVE_INFINITY;
  return Number(values.at(-1));
}

export function Design4() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSort, setActiveSort] =
    useState<(typeof sortOptions)[number]>("Newest");
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const visibleGames = [...designShowcaseGames]
    .filter((game) => {
      if (!normalizedSearchQuery) {
        return true;
      }

      return game.title.toLowerCase().startsWith(normalizedSearchQuery);
    })
    .sort((left, right) => {
      if (activeSort === "A-Z") return left.title.localeCompare(right.title);
      if (activeSort === "Duration")
        return getMetricDuration(left.metric) - getMetricDuration(right.metric);
      return 0;
    });

  return (
    <>
      <style>{`
        body {
          background: #06050c !important;
          color: #dbd4ee;
          overflow-x: hidden;
        }
        .vapor-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background:
            radial-gradient(ellipse 62% 52% at 30% 20%, rgba(124,58,237,0.08) 0%, transparent 72%),
            radial-gradient(ellipse 54% 42% at 72% 70%, rgba(88,28,135,0.06) 0%, transparent 72%),
            linear-gradient(180deg, #06050c 0%, #080611 100%);
          overflow: hidden;
        }
        .vapor-bg::before,
        .vapor-bg::after {
          content: "";
          position: absolute;
          inset: -18%;
          background-repeat: no-repeat;
          filter: blur(32px);
          mix-blend-mode: screen;
          will-change: transform, opacity;
        }
        .vapor-bg::before {
          background:
            radial-gradient(ellipse 34% 28% at 16% 20%, rgba(167,139,250,0.2) 0%, transparent 70%),
            radial-gradient(ellipse 26% 22% at 72% 24%, rgba(56,189,248,0.12) 0%, transparent 72%);
          animation: vapor-float-one 24s ease-in-out infinite alternate;
          opacity: 0.9;
        }
        .vapor-bg::after {
          background:
            radial-gradient(ellipse 30% 25% at 82% 72%, rgba(124,58,237,0.18) 0%, transparent 70%),
            radial-gradient(ellipse 24% 20% at 28% 82%, rgba(139,92,246,0.17) 0%, rgba(99,102,241,0.1) 40%, rgba(56,189,248,0.02) 62%, transparent 74%);
          animation: vapor-float-two 30s ease-in-out infinite alternate;
          opacity: 0.82;
        }
        @keyframes vapor-float-one {
          0% { opacity: 0.58; transform: translate3d(-2%, 1%, 0) scale(1) rotate(-2deg); }
          50% { opacity: 0.82; transform: translate3d(4%, -3%, 0) scale(1.08) rotate(1deg); }
          100% { opacity: 0.66; transform: translate3d(9%, -7%, 0) scale(1.14) rotate(4deg); }
        }
        @keyframes vapor-float-two {
          0% { opacity: 0.45; transform: translate3d(3%, -1%, 0) scale(1.01) rotate(2deg); }
          50% { opacity: 0.78; transform: translate3d(-4%, 4%, 0) scale(1.08) rotate(-2deg); }
          100% { opacity: 0.62; transform: translate3d(-10%, 8%, 0) scale(1.16) rotate(-5deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .vapor-bg::before, .vapor-bg::after { animation: none; }
          .pulse-ring { animation: none !important; }
          .vapor-portal-orb::before, .vapor-portal-orb::after { animation: none !important; }
        }
        .vapor-title {
          filter:
            drop-shadow(0 0 18px rgba(139,92,246,0.24))
            drop-shadow(0 0 42px rgba(139,92,246,0.12));
          text-shadow:
            0 0 40px rgba(139,92,246,0.2),
            0 0 80px rgba(139,92,246,0.08);
        }
        .vapor-search {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          outline: none;
          color: #dbd4ee;
          font-size: 15px;
          width: 100%;
          padding: 14px 20px 14px 48px;
          transition: border-color 0.4s ease, box-shadow 0.4s ease;
          font-family: inherit;
          animation: vapor-pulse 4s ease-in-out infinite;
        }
        @keyframes vapor-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(139,92,246,0); }
          50% { box-shadow: 0 0 20px 0 rgba(139,92,246,0.04); }
        }
        .vapor-search:focus {
          border-color: rgba(139,92,246,0.35);
          box-shadow: 0 0 30px rgba(139,92,246,0.1);
          animation: none;
        }
        .vapor-search::placeholder { color: rgba(255,255,255,0.18); }
        .vapor-select {
          appearance: none;
          background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)), rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 9999px;
          color: #dbd4ee;
          font-size: 11px;
          letter-spacing: 0.06em;
          min-width: 112px;
          outline: none;
          padding: 8px 32px 8px 12px;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .vapor-select:focus {
          border-color: rgba(139,92,246,0.35);
          box-shadow: 0 0 24px rgba(139,92,246,0.1);
        }
        .vapor-select option { background: #0c0915; color: #dbd4ee; }

        .vapor-portal-link {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 4px 0;
          color: rgba(255,255,255,0.34);
          text-decoration: none;
          transition: transform 0.3s ease, color 0.3s ease;
        }
        .vapor-portal-link:hover {
          color: rgba(255,255,255,0.78);
          transform: translateX(2px);
        }
        .vapor-portal-link:focus-visible {
          outline: none;
          color: rgba(255,255,255,0.84);
        }
        .vapor-portal-label {
          position: relative;
          font-size: 11px;
          letter-spacing: 0.24em;
          line-height: 1;
          text-transform: uppercase;
          transition: letter-spacing 0.35s ease;
        }
        .vapor-portal-label::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: -8px;
          height: 1px;
          background: linear-gradient(90deg, rgba(167,139,250,0.78), rgba(129,140,248,0.14));
          opacity: 0.55;
          transform: scaleX(0.72);
          transform-origin: left center;
          transition: transform 0.35s ease, opacity 0.35s ease;
        }
        .vapor-portal-link:hover .vapor-portal-label,
        .vapor-portal-link:focus-visible .vapor-portal-label {
          letter-spacing: 0.28em;
        }
        .vapor-portal-link:hover .vapor-portal-label::after,
        .vapor-portal-link:focus-visible .vapor-portal-label::after {
          opacity: 1;
          transform: scaleX(1);
        }
        .vapor-portal-orb {
          position: relative;
          width: 26px;
          height: 26px;
          flex-shrink: 0;
          overflow: hidden;
          border-radius: 9999px;
          isolation: isolate;
          background: radial-gradient(circle at 50% 50%, rgba(8,6,17,1) 18%, rgba(18,10,36,0.95) 52%, rgba(8,6,17,0.7) 72%, transparent 73%);
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.06),
            0 0 18px rgba(139,92,246,0.12);
          transition: transform 0.4s ease, box-shadow 0.4s ease;
        }
        .vapor-portal-orb::before {
          content: "";
          position: absolute;
          inset: -30%;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            rgba(167,139,250,0.82) 82deg,
            rgba(56,189,248,0.65) 150deg,
            rgba(167,139,250,0.16) 210deg,
            transparent 290deg,
            rgba(236,72,153,0.55) 340deg,
            transparent 360deg
          );
          animation: portal-spin 5.5s linear infinite;
          opacity: 0.85;
        }
        .vapor-portal-orb::after {
          content: "";
          position: absolute;
          inset: 27%;
          border-radius: inherit;
          background: radial-gradient(circle, rgba(244,240,255,0.96) 0%, rgba(167,139,250,0.58) 34%, rgba(12,8,22,0.96) 68%, rgba(12,8,22,1) 100%);
          box-shadow: 0 0 16px rgba(167,139,250,0.24);
          animation: portal-core 2.8s ease-in-out infinite;
        }
        .vapor-portal-link:hover .vapor-portal-orb,
        .vapor-portal-link:focus-visible .vapor-portal-orb {
          transform: scale(1.08);
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.08),
            0 0 24px rgba(139,92,246,0.22),
            0 0 42px rgba(56,189,248,0.08);
        }
        .vapor-portal-link:hover .vapor-portal-orb::before,
        .vapor-portal-link:focus-visible .vapor-portal-orb::before {
          animation-duration: 2.8s;
          opacity: 1;
        }
        .vapor-portal-link:hover .vapor-portal-orb::after,
        .vapor-portal-link:focus-visible .vapor-portal-orb::after {
          animation-duration: 1.9s;
          box-shadow: 0 0 22px rgba(167,139,250,0.34);
        }
        @keyframes portal-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes portal-core {
          0%, 100% { transform: scale(0.9); opacity: 0.72; }
          50% { transform: scale(1.12); opacity: 1; }
        }

        /* Pulse rings */
        .pulse-ring {
          animation: ring-expand 2s ease-out infinite;
        }
        @keyframes ring-expand {
          0% { transform: scale(0.85); opacity: 0.5; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>

      <div className="vapor-bg" />

      <div className="relative z-10 min-h-screen">
        {/* Nav */}
        <nav className="flex items-center justify-between px-8 py-6 lg:px-14">
          <span className="text-xs tracking-[0.25em] text-white/30">ARCADE</span>
          <a
            href="https://yuvrajkashyap.com"
            className="vapor-portal-link"
          >
            <span className="vapor-portal-orb" aria-hidden="true" />
            <span className="vapor-portal-label">Meet the developer</span>
          </a>
        </nav>

        {/* ARCADE title */}
        <motion.div
          className="px-8 pt-12 text-center lg:pt-20"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
        >
          <h1 className="vapor-title text-6xl font-bold tracking-tight sm:text-7xl lg:text-8xl">
            <span className="bg-gradient-to-r from-[#c4b5fd] via-[#a78bfa] to-[#818cf8] bg-clip-text text-transparent">
              ARCADE
            </span>
          </h1>
          <p className="mt-5 text-sm text-white/25">
            Games that live in your browser
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          className="mx-auto mt-10 max-w-2xl px-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
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
              className="vapor-search"
              placeholder="Find a game..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        </motion.div>

        {/* Sort */}
        <div className="mx-auto mt-14 flex max-w-6xl items-center justify-end gap-4 px-8 lg:px-14">
          <div className="relative shrink-0">
            <select
              className="vapor-select"
              value={activeSort}
              onChange={(e) =>
                setActiveSort(e.target.value as (typeof sortOptions)[number])
              }
              aria-label="Sort games"
            >
              {sortOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/35"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>

        {/* Game grid — 4 columns */}
        <div className="mx-auto mt-6 max-w-6xl px-8 lg:px-14">
          {visibleGames.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {visibleGames.map((game, i) => (
            <motion.div
              key={game.title}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.06, duration: 0.5 }}
            >
              <Link href={game.href} className="group block">
                <motion.div
                  className="relative flex aspect-[4/3] flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0a14]"
                  whileHover={{
                    y: -6,
                    borderColor: `${game.accent}50`,
                    boxShadow: `0 20px 50px ${game.accent}18, 0 0 0 1px ${game.accent}30`,
                  }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.35 }}
                >
                  {/* Thumbnail */}
                  <div className="relative flex-1 overflow-hidden">
                    <Image
                      src={game.thumbnail}
                      alt={game.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                    {/* Darken overlay */}
                    <div className="absolute inset-0 bg-black/30 transition-opacity duration-400 group-hover:bg-black/15" />
                  </div>

                  {/* Ambient accent glow */}
                  <div
                    className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{
                      background: `radial-gradient(ellipse 70% 50% at 50% 30%, ${game.accent}10 0%, transparent 70%)`,
                    }}
                  />

                  {/* Pulse rings — centered, visible on hover */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-400 group-hover:opacity-100">
                    {[40, 64, 88].map((size, ri) => (
                      <div
                        key={size}
                        className="pulse-ring absolute rounded-full border"
                        style={{
                          width: size,
                          height: size,
                          borderColor: `${game.accent}22`,
                          animationDelay: `${ri * 300}ms`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Title bar */}
                  <div className="relative z-10 px-4 py-3 text-center">
                    <h3 className="text-sm font-semibold text-white/80 transition-colors duration-300 group-hover:text-white">
                      {game.title}
                    </h3>
                  </div>
                </motion.div>
              </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-10 text-center text-sm text-white/30"
            >
              No games start with &quot;{searchQuery.trim()}&quot;.
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-40 border-t border-white/[0.03] px-8 py-8 lg:px-14">
          <div className="mx-auto flex max-w-6xl items-center justify-between text-xs text-white/12">
            <span>YUVRAJ KASHYAP</span>
            <span>Have fun!</span>
          </div>
        </footer>
      </div>
    </>
  );
}
