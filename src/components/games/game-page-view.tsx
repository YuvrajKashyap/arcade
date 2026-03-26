"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { GamePlayer } from "@/components/games/game-player";
import type { GamePageData } from "@/types/game";

type GamePageViewProps = {
  data: GamePageData;
};

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
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    showControls();
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("pointerdown", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("touchstart", handleActivity, { passive: true });
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      window.clearTimeout(openTimer);
      clearActivityTimers();
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("pointerdown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [clearActivityTimers, showControls]);

  return (
    <>
      <style>{`
        body {
          background: #000 !important;
          overflow: hidden !important;
        }
        .theater-root {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
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
          width: min(1120px, calc(100vw - 48px));
          height: min(820px, calc(100vh - 96px));
        }
        .theater-iris {
          width: 100%;
          height: 100%;
          overflow: auto;
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
          min-height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px 16px 88px;
        }
        .theater-content > * {
          width: 100%;
          max-width: 72rem;
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
          padding: 0 24px;
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
        @media (max-width: 720px) {
          .theater-stage {
            width: calc(100vw - 24px);
            height: calc(100vh - 84px);
          }
          .theater-content {
            padding: 12px 12px 80px;
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
      </div>
    </>
  );
}
