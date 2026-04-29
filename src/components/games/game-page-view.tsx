"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { GamePlayer } from "@/components/games/game-player";
import type { GamePageData } from "@/types/game";

type GamePageViewProps = {
  data: GamePageData;
};

const GAME_CONTROL_KEYS = new Set([
  " ",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "arrowup",
  "c",
  "enter",
  "f",
  "p",
  "r",
  "s",
  "w",
  "a",
  "d",
]);

function shouldAllowBrowserKeyHandling(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return true;
  }

  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function createGuideLine(data: GamePageData) {
  return data.game.controls.summary;
}

export function GamePageView({ data }: GamePageViewProps) {
  const { game } = data;
  const [controlsVisible, setControlsVisible] = useState(true);
  const [cursorHidden, setCursorHidden] = useState(false);
  const [irisOpen, setIrisOpen] = useState(false);
  const [instanceKey, setInstanceKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const hideTimer = useRef<number | null>(null);
  const cursorTimer = useRef<number | null>(null);
  const theaterRef = useRef<HTMLDivElement>(null);

  const clearActivityTimers = useCallback(() => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }

    if (cursorTimer.current !== null) {
      window.clearTimeout(cursorTimer.current);
      cursorTimer.current = null;
    }
  }, []);

  const showControls = useCallback(() => {
    setCursorHidden(false);
    setControlsVisible(true);

    clearActivityTimers();
    hideTimer.current = window.setTimeout(() => setControlsVisible(false), 2500);
    cursorTimer.current = window.setTimeout(() => setCursorHidden(true), 3000);
  }, [clearActivityTimers]);

  const restartGame = useCallback(() => {
    setInstanceKey((currentKey) => currentKey + 1);
    showControls();
  }, [showControls]);

  const toggleFullscreen = useCallback(async () => {
    const theaterElement = theaterRef.current;

    if (!theaterElement) {
      return;
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await theaterElement.requestFullscreen();
      }
    } catch {
      // Ignore fullscreen errors and leave the current state as-is.
    } finally {
      showControls();
    }
  }, [showControls]);

  useEffect(() => {
    const openTimer = window.setTimeout(() => setIrisOpen(true), 150);
    const handleActivity = () => {
      showControls();
    };
    const captureGameKeyboard = (event: KeyboardEvent) => {
      if (shouldAllowBrowserKeyHandling(event)) {
        return;
      }

      if (howToPlayOpen) {
        if (event.key === "Escape" || GAME_CONTROL_KEYS.has(event.key.toLowerCase())) {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (event.key === "Escape") {
            setHowToPlayOpen(false);
          }
        }
        return;
      }

      if (GAME_CONTROL_KEYS.has(event.key.toLowerCase())) {
        event.preventDefault();
      }
    };
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    showControls();
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("pointerdown", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("keydown", captureGameKeyboard, true);
    window.addEventListener("touchstart", handleActivity, { passive: true });
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      window.clearTimeout(openTimer);
      clearActivityTimers();
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("pointerdown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("keydown", captureGameKeyboard, true);
      window.removeEventListener("touchstart", handleActivity);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [clearActivityTimers, howToPlayOpen, showControls]);

  return (
    <>
      <style>{`
        body {
          background: #000 !important;
          overflow: hidden !important;
        }
        html {
          overflow: hidden !important;
        }
        .theater-root {
          --theater-bar-height: 64px;
          --theater-edge-gap: 24px;
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
          height: 100dvh;
          overflow: hidden;
        }
        .theater-root--hide-cursor {
          cursor: none;
        }
        .theater-vignette {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 10;
          background: radial-gradient(
            ellipse 72% 68% at 50% 46%,
            transparent 0%,
            transparent 52%,
            rgba(0, 0, 0, 0.38) 80%,
            rgba(0, 0, 0, 0.88) 100%
          );
        }
        .theater-stage {
          position: relative;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: center;
          width: min(1120px, calc(100vw - 32px));
          height: min(
            820px,
            calc(100dvh - var(--theater-bar-height) - var(--theater-edge-gap) - env(safe-area-inset-bottom, 0px))
          );
          margin-bottom: calc(var(--theater-bar-height) + env(safe-area-inset-bottom, 0px));
          min-height: 0;
        }
        .theater-iris {
          width: 100%;
          height: 100%;
          overflow: hidden;
          clip-path: circle(0% at 50% 50%);
          transition: clip-path 1s cubic-bezier(0.16, 1, 0.3, 1);
          scrollbar-width: none;
        }
        .theater-iris::-webkit-scrollbar {
          display: none;
        }
        .theater-iris--open {
          clip-path: circle(88% at 50% 50%);
        }
        .theater-content {
          box-sizing: border-box;
          height: 100%;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 10px;
        }
        .theater-content > * {
          width: 100%;
          height: 100%;
          max-width: 72rem;
        }
        .theater-content .arcade-game-panel {
          height: 100%;
          max-height: 100%;
          min-height: 0;
          gap: clamp(0.45rem, 1.1dvh, 1rem);
        }
        .theater-content .arcade-game-hud {
          flex: 0 0 auto;
          padding: clamp(0.45rem, 1.2dvh, 0.75rem) clamp(0.65rem, 1.4vw, 1rem);
        }
        .theater-content .arcade-game-hud [class*="tracking-\\[0\\.16em\\]"] {
          padding-block: clamp(0.22rem, 0.7dvh, 0.375rem);
        }
        .theater-content .arcade-game-playfield {
          flex: 0 1 auto;
          min-height: 0;
          max-height: min(100%, 62dvh);
        }
        .theater-content .arcade-game-status {
          flex: 0 0 auto;
          margin: 0;
          font-size: clamp(0.72rem, 1.4dvh, 0.875rem);
          line-height: 1.45;
        }
        .theater-content .arcade-touch-controls {
          flex: 0 0 auto;
        }
        .theater-content canvas,
        .theater-content iframe {
          display: block;
        }
        .theater-bar {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 30;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 16px;
          height: 64px;
          padding: 0 24px env(safe-area-inset-bottom, 0px);
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.82) 0%,
            rgba(0, 0, 0, 0.66) 45%,
            transparent 100%
          );
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .theater-progress {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: rgba(255, 255, 255, 0.06);
        }
        .theater-progress::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(139, 92, 246, 0.72), rgba(56, 189, 248, 0.42));
          transform-origin: left center;
          animation: theater-progress-fill 60s linear forwards;
        }
        @keyframes theater-progress-fill {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }
        .theater-btn {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 34px;
          padding: 0 10px;
          border: none;
          border-radius: 9999px;
          background: none;
          color: rgba(255, 255, 255, 0.48);
          cursor: pointer;
          font-family: inherit;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-decoration: none;
          transition: color 0.2s ease, background 0.2s ease, transform 0.2s ease;
        }
        .theater-btn:hover {
          color: rgba(255, 255, 255, 0.88);
          background: rgba(255, 255, 255, 0.06);
          transform: translateY(-1px);
        }
        .theater-btn--icon {
          width: 34px;
          padding: 0;
        }
        .theater-center {
          min-width: 0;
          text-align: center;
        }
        .theater-title {
          display: block;
          color: rgba(255, 255, 255, 0.36);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .theater-meta {
          display: block;
          margin-top: 4px;
          overflow: hidden;
          color: rgba(255, 255, 255, 0.3);
          font-size: 10px;
          letter-spacing: 0.04em;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .theater-actions {
          display: flex;
          justify-content: flex-end;
          gap: 6px;
        }
        .theater-help-button {
          position: fixed;
          z-index: 34;
          top: max(22px, env(safe-area-inset-top, 0px));
          right: 24px;
          border: 3px solid #0b5da8;
          border-radius: 9999px;
          background: linear-gradient(180deg, #89dbff 0%, #2e9cff 100%);
          color: #05274f;
          box-shadow: inset 0 3px 0 rgba(255,255,255,0.68), 0 8px 0 #0b5da8, 0 18px 34px rgba(0,0,0,0.28);
          cursor: pointer;
          font-family: inherit;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.08em;
          padding: 10px 14px;
          text-transform: uppercase;
          transition: transform 0.16s ease, box-shadow 0.16s ease;
        }
        .theater-help-button:hover {
          transform: translateY(-2px);
          box-shadow: inset 0 3px 0 rgba(255,255,255,0.72), 0 10px 0 #0b5da8, 0 20px 38px rgba(0,0,0,0.32);
        }
        .theater-help-backdrop {
          position: fixed;
          inset: 0;
          z-index: 42;
          display: grid;
          place-items: center;
          padding: 18px;
          background: rgba(0,0,0,0.42);
        }
        .theater-help-card {
          width: min(440px, calc(100vw - 32px));
          max-height: min(620px, calc(100dvh - 96px));
          overflow: auto;
          border: 4px solid #744616;
          border-radius: 28px;
          background: linear-gradient(180deg, #fff6aa 0%, #ffd65b 58%, #ffb13b 100%);
          color: #4b2b05;
          box-shadow: inset 0 4px 0 rgba(255,255,255,0.62), 0 12px 0 #9a5f1d, 0 30px 70px rgba(0,0,0,0.42);
          padding: 20px;
        }
        .theater-help-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }
        .theater-help-label {
          color: #0b72bd;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .theater-help-title {
          margin-top: 4px;
          color: #4b2b05;
          font-size: 28px;
          font-weight: 900;
          letter-spacing: 0;
        }
        .theater-help-close {
          display: grid;
          width: 36px;
          height: 36px;
          flex: 0 0 auto;
          place-items: center;
          border: 3px solid #744616;
          border-radius: 9999px;
          background: #fff9d9;
          color: #4b2b05;
          cursor: pointer;
          font-size: 18px;
          font-weight: 900;
          line-height: 1;
        }
        .theater-help-summary {
          margin-top: 12px;
          color: #684009;
          font-size: 14px;
          font-weight: 800;
          line-height: 1.55;
        }
        .theater-help-list {
          display: grid;
          gap: 8px;
          margin: 16px 0 0;
          padding: 0;
          list-style: none;
        }
        .theater-help-item {
          border: 2px solid rgba(116,70,22,0.22);
          border-radius: 16px;
          background: rgba(255,255,255,0.48);
          padding: 10px 12px;
        }
        .theater-help-item strong {
          display: block;
          color: #0a5f9e;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .theater-help-item span {
          display: block;
          margin-top: 4px;
          color: #4b2b05;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.35;
        }
        @media (max-width: 720px) {
          .theater-root {
            --theater-bar-height: 60px;
            --theater-edge-gap: 12px;
          }
          .theater-stage {
            width: calc(100vw - 24px);
            height: calc(100dvh - var(--theater-bar-height) - var(--theater-edge-gap) - env(safe-area-inset-bottom, 0px));
            margin-bottom: calc(var(--theater-bar-height) + env(safe-area-inset-bottom, 0px));
          }
          .theater-content {
            padding: 6px;
          }
          .theater-content .arcade-game-panel {
            gap: 0.45rem;
          }
          .theater-content .arcade-game-hud {
            border-radius: 1rem;
          }
          .theater-content .arcade-game-hud > div {
            gap: 0.45rem;
          }
          .theater-content .arcade-game-hud [class*="tracking-\\[0\\.16em\\]"] {
            font-size: 0.62rem;
            letter-spacing: 0.1em;
            padding: 0.25rem 0.45rem;
          }
          .theater-content .arcade-game-playfield {
            border-radius: 1rem;
            max-height: 52dvh;
          }
          .theater-content .arcade-game-status {
            font-size: 0.72rem;
            line-height: 1.3;
          }
          .theater-content .arcade-touch-controls button {
            min-height: 2.5rem;
            padding-block: 0.45rem;
          }
          .theater-bar {
            gap: 10px;
            height: 60px;
            padding: 0 12px;
          }
          .theater-title {
            font-size: 10px;
            letter-spacing: 0.14em;
          }
          .theater-meta {
            display: none;
          }
          .theater-btn {
            padding: 0 8px;
            font-size: 10px;
            letter-spacing: 0.08em;
          }
          .theater-help-button {
            top: 58px;
            right: 12px;
            max-width: 8.8rem;
            padding: 8px 10px;
            font-size: 10px;
            box-shadow: inset 0 2px 0 rgba(255,255,255,0.68), 0 6px 0 #0b5da8, 0 14px 28px rgba(0,0,0,0.3);
          }
          .theater-help-card {
            max-height: calc(100dvh - 112px);
            padding: 16px;
          }
          .theater-help-title {
            font-size: 23px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .theater-iris {
            transition: none;
          }
          .theater-progress::after {
            animation: none;
          }
        }
      `}</style>

      <div
        ref={theaterRef}
        className={`theater-root${cursorHidden ? " theater-root--hide-cursor" : ""}`}
      >
        <div className="theater-vignette" />

        <button
          type="button"
          className="theater-help-button"
          onClick={() => {
            setHowToPlayOpen(true);
            showControls();
          }}
        >
          How to Play
        </button>

        <div className="theater-stage">
          <div className={`theater-iris${irisOpen ? " theater-iris--open" : ""}`}>
            <div className="theater-content">
              <GamePlayer key={`${game.slug}-${instanceKey}`} slug={game.slug} />
            </div>
          </div>
        </div>

        <AnimatePresence>
          {controlsVisible ? (
            <motion.div
              className="theater-bar"
              initial={{ y: 52, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 52, opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <div key={`${game.slug}-${instanceKey}`} className="theater-progress" />

              <Link href="/#all-games" className="theater-btn">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                BACK
              </Link>

              <div className="theater-center">
                <span className="theater-title">{game.title}</span>
                <span className="theater-meta">{createGuideLine(data)}</span>
              </div>

              <div className="theater-actions">
                <button type="button" className="theater-btn" onClick={restartGame}>
                  RESTART
                </button>
                <button
                  type="button"
                  className="theater-btn theater-btn--icon"
                  onClick={toggleFullscreen}
                  aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {isFullscreen ? (
                      <>
                        <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                        <path d="M16 3h3a2 2 0 0 1 2 2v3" />
                        <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
                        <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                      </>
                    ) : (
                      <>
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3" />
                        <path d="M8 21H5a2 2 0 0 1-2-2v-3m18 0v3a2 2 0 0 1-2 2h-3" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {howToPlayOpen ? (
            <motion.div
              className="theater-help-backdrop"
              role="presentation"
              onPointerDown={() => setHowToPlayOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <motion.section
                className="theater-help-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="theater-help-title"
                onPointerDown={(event) => event.stopPropagation()}
                initial={{ y: 18, scale: 0.96 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: 18, scale: 0.96 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <div className="theater-help-card-header">
                  <div>
                    <div className="theater-help-label">How to play</div>
                    <h2 id="theater-help-title" className="theater-help-title">
                      {game.title}
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="theater-help-close"
                    aria-label="Close how to play"
                    onClick={() => setHowToPlayOpen(false)}
                  >
                    x
                  </button>
                </div>
                <p className="theater-help-summary">
                  {game.howToPlay?.summary ?? game.controls.summary}
                </p>
                <ul className="theater-help-list">
                  {(game.howToPlay?.tips ?? []).map((tip) => (
                    <li key={tip} className="theater-help-item">
                      <span>{tip}</span>
                    </li>
                  ))}
                  {game.controls.items.map((item) => (
                    <li key={`${item.label}-${item.action}`} className="theater-help-item">
                      <strong>{item.label}</strong>
                      <span>{item.action}</span>
                    </li>
                  ))}
                </ul>
              </motion.section>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}
