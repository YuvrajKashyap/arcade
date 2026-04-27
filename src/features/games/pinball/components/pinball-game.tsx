"use client";

import { useEffect, useRef, useState } from "react";
import {
  GameButton,
  GamePanel,
  GamePlayfield,
  GameStatus,
} from "@/features/games/shared/components/game-ui";

const FLUTTER_PINBALL_URL = "/vendor/flutter-pinball/index.html";
const FLUTTER_PINBALL_SOURCE = "https://github.com/flutter/pinball";
const PINBALL_KEYS = new Set([
  " ",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyA",
  "KeyD",
  "Space",
]);

export function PinballGame() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const gameFocusedRef = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  function focusGame() {
    gameFocusedRef.current = true;
    iframeRef.current?.focus();
    iframeRef.current?.contentWindow?.focus();
  }

  function reloadGame() {
    setIsLoaded(false);
    setReloadKey((current) => current + 1);
    window.setTimeout(focusGame, 250);
  }

  useEffect(() => {
    function forwardKeyboardEvent(event: KeyboardEvent) {
      if (!gameFocusedRef.current || !PINBALL_KEYS.has(event.code)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: "arcade-pinball-key",
          eventType: event.type,
          key: event.key,
          code: event.code,
          location: event.location,
          repeat: event.repeat,
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
        },
        window.location.origin,
      );
    }

    function blurGame(event: PointerEvent) {
      if (
        iframeRef.current &&
        event.target instanceof Node &&
        !iframeRef.current.contains(event.target)
      ) {
        gameFocusedRef.current = false;
      }
    }

    window.addEventListener("keydown", forwardKeyboardEvent, true);
    window.addEventListener("keyup", forwardKeyboardEvent, true);
    window.addEventListener("pointerdown", blurGame, true);

    return () => {
      window.removeEventListener("keydown", forwardKeyboardEvent, true);
      window.removeEventListener("keyup", forwardKeyboardEvent, true);
      window.removeEventListener("pointerdown", blurGame, true);
    };
  }, []);

  return (
    <GamePanel>
      <div className="rounded-[1.35rem] border border-line bg-surface px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full border border-line bg-background-strong px-3 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-foreground-muted">
              Engine{" "}
              <span className="ml-1 normal-case tracking-normal text-foreground">
                Flutter
              </span>
            </div>
            <div className="rounded-full border border-line bg-background-strong px-3 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-foreground-muted">
              Build{" "}
              <span className="ml-1 normal-case tracking-normal text-foreground">
                Offline
              </span>
            </div>
            <div className="rounded-full border border-line bg-background-strong px-3 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-foreground-muted">
              Source{" "}
              <span className="ml-1 normal-case tracking-normal text-foreground">
                MIT
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <GameButton variant="primary" onClick={reloadGame}>
              Restart
            </GameButton>
            <GameButton
              onClick={() => {
                focusGame();
              }}
            >
              Focus Game
            </GameButton>
            <GameButton
              onClick={() => {
                window.open(FLUTTER_PINBALL_URL, "_blank", "noreferrer");
              }}
            >
              Open Game
            </GameButton>
          </div>
        </div>
      </div>

      <GamePlayfield className="relative mx-auto aspect-[10/16] min-h-[38rem] w-full max-w-[28rem] md:aspect-[16/10] md:max-h-[78vh] md:max-w-6xl">
        {!isLoaded ? (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-background-strong text-center">
            <div>
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground-muted">
                Loading Pinball
              </p>
            </div>
          </div>
        ) : null}
        <iframe
          ref={iframeRef}
          key={reloadKey}
          title="Pinball"
          src={FLUTTER_PINBALL_URL}
          className="h-full w-full border-0 outline-none"
          allow="fullscreen; autoplay"
          allowFullScreen
          tabIndex={0}
          onLoad={() => {
            setIsLoaded(true);
            window.setTimeout(focusGame, 150);
          }}
          onPointerDown={focusGame}
          onPointerEnter={focusGame}
        />
      </GamePlayfield>

      <GameStatus>
        Click the table once to focus controls. Source:{" "}
        <a
          href={FLUTTER_PINBALL_SOURCE}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-accent hover:text-accent-strong"
        >
          flutter/pinball
        </a>
        , MIT licensed.
      </GameStatus>
    </GamePanel>
  );
}
