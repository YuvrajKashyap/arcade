"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  ASTEROIDS_HEIGHT,
  ASTEROIDS_SHIP_RADIUS,
  ASTEROIDS_STORAGE_KEY,
  ASTEROIDS_WIDTH,
} from "@/features/games/asteroids/config/constants";
import {
  createAsteroidsState,
  startAsteroids,
  updateAsteroids,
} from "@/features/games/asteroids/logic/game";
import type { AsteroidsPhase, AsteroidsState } from "@/features/games/asteroids/types";
import { configureHiDPICanvas } from "@/features/games/shared/canvas/configure-canvas";
import {
  GameButton,
  GameHud,
  GamePanel,
  GamePlayfield,
  GameStatus,
  TouchControls,
} from "@/features/games/shared/components/game-ui";
import { useAnimationFrameLoop } from "@/features/games/shared/hooks/use-animation-frame-loop";
import { useKeyboardState } from "@/features/games/shared/hooks/use-keyboard-state";
import {
  readStoredNumber,
  writeStoredNumber,
} from "@/features/games/shared/utils/local-storage";

function getStatusCopy(phase: AsteroidsPhase) {
  if (phase === "playing") {
    return "Rotate, thrust, shoot, and keep drifting space between the ship and the rock field.";
  }

  if (phase === "paused") {
    return "Paused. Resume with your current wave intact.";
  }

  if (phase === "game-over") {
    return "Ship destroyed. Restart from wave one.";
  }

  return "Press Space to start. Arrows or WASD fly, Space shoots.";
}

function drawShip(context: CanvasRenderingContext2D, state: AsteroidsState) {
  const { ship } = state;
  context.save();
  context.translate(ship.x, ship.y);
  context.rotate(ship.angle);
  context.strokeStyle = ship.invulnerableTimer > 0 ? "rgba(207,181,255,0.72)" : "#f8fafc";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(ASTEROIDS_SHIP_RADIUS + 6, 0);
  context.lineTo(-ASTEROIDS_SHIP_RADIUS, -ASTEROIDS_SHIP_RADIUS * 0.72);
  context.lineTo(-ASTEROIDS_SHIP_RADIUS * 0.62, 0);
  context.lineTo(-ASTEROIDS_SHIP_RADIUS, ASTEROIDS_SHIP_RADIUS * 0.72);
  context.closePath();
  context.stroke();
  context.restore();
}

function drawAsteroidsScene(context: CanvasRenderingContext2D, state: AsteroidsState) {
  context.clearRect(0, 0, ASTEROIDS_WIDTH, ASTEROIDS_HEIGHT);
  context.fillStyle = "#060914";
  context.fillRect(0, 0, ASTEROIDS_WIDTH, ASTEROIDS_HEIGHT);

  context.strokeStyle = "rgba(248,250,252,0.05)";
  for (let x = 20; x < ASTEROIDS_WIDTH; x += 92) {
    for (let y = 18; y < ASTEROIDS_HEIGHT; y += 88) {
      context.strokeRect(x, y, 1, 1);
    }
  }

  for (const rock of state.rocks) {
    context.beginPath();
    context.strokeStyle =
      rock.tier === 3 ? "#ffd166" : rock.tier === 2 ? "#00a6a6" : "#cfb5ff";
    context.lineWidth = 2;
    context.arc(rock.x, rock.y, rock.radius, 0, Math.PI * 2);
    context.stroke();
  }

  context.fillStyle = "#ff6b35";
  for (const bullet of state.bullets) {
    context.beginPath();
    context.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
    context.fill();
  }

  drawShip(context, state);

  if (state.phase !== "playing") {
    context.fillStyle = "rgba(6,9,20,0.62)";
    context.fillRect(0, 0, ASTEROIDS_WIDTH, ASTEROIDS_HEIGHT);
    context.textAlign = "center";
    context.fillStyle = "#f8fafc";
    context.font = "600 32px sans-serif";
    context.fillText(
      state.phase === "game-over" ? "Fleet lost" : state.phase === "paused" ? "Paused" : "Asteroids",
      ASTEROIDS_WIDTH / 2,
      ASTEROIDS_HEIGHT / 2 - 10,
    );
    context.font = "500 15px sans-serif";
    context.fillStyle = "rgba(248,250,252,0.76)";
    context.fillText("Press Space or Start", ASTEROIDS_WIDTH / 2, ASTEROIDS_HEIGHT / 2 + 22);
  }
}

export function AsteroidsGame() {
  const initialState = createAsteroidsState(readStoredNumber(ASTEROIDS_STORAGE_KEY));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef<AsteroidsState>(initialState);
  const touchInputRef = useRef({ turn: 0, thrust: false, shoot: false });
  const pressedKeysRef = useKeyboardState({
    preventDefaultKeys: ["a", "d", "w", "arrowleft", "arrowright", "arrowup", " "],
  });
  const [hudState, setHudState] = useState(() => ({
    score: initialState.score,
    bestScore: initialState.bestScore,
    lives: initialState.lives,
    wave: initialState.wave,
    phase: initialState.phase,
  }));

  function syncState(nextState: AsteroidsState) {
    stateRef.current = nextState;
    setHudState({
      score: nextState.score,
      bestScore: nextState.bestScore,
      lives: nextState.lives,
      wave: nextState.wave,
      phase: nextState.phase,
    });
    writeStoredNumber(ASTEROIDS_STORAGE_KEY, nextState.bestScore);
  }

  function renderCurrentState() {
    const context = contextRef.current;
    if (context) {
      drawAsteroidsScene(context, stateRef.current);
    }
  }

  function beginRun() {
    syncState(startAsteroids(stateRef.current));
    renderCurrentState();
  }

  function togglePause() {
    const current = stateRef.current;
    if (current.phase === "playing") {
      syncState({ ...current, phase: "paused" });
    } else if (current.phase === "paused") {
      syncState({ ...current, phase: "playing" });
    }
    renderCurrentState();
  }

  const handleKeyboardInput = useEffectEvent((event: KeyboardEvent) => {
    const normalizedKey = event.key.toLowerCase();
    if (normalizedKey === " " && stateRef.current.phase !== "playing") {
      event.preventDefault();
      beginRun();
      return;
    }

    if (normalizedKey === "p") {
      event.preventDefault();
      togglePause();
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    contextRef.current = configureHiDPICanvas(canvas, ASTEROIDS_WIDTH, ASTEROIDS_HEIGHT);
    renderCurrentState();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => handleKeyboardInput(event);
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useAnimationFrameLoop((deltaSeconds) => {
    const keys = pressedKeysRef.current;
    const keyboardTurn =
      Number(keys.has("d") || keys.has("arrowright")) -
      Number(keys.has("a") || keys.has("arrowleft"));
    const nextState = updateAsteroids(stateRef.current, deltaSeconds, {
      turn: keyboardTurn || touchInputRef.current.turn,
      thrust: keys.has("w") || keys.has("arrowup") || touchInputRef.current.thrust,
      shoot: keys.has(" ") || touchInputRef.current.shoot,
    });

    touchInputRef.current.shoot = false;

    if (nextState !== stateRef.current) {
      syncState(nextState);
    }
    renderCurrentState();
  });

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "Score", value: hudState.score },
          { label: "Best", value: hudState.bestScore },
          { label: "Lives", value: hudState.lives },
          { label: "Wave", value: hudState.wave },
          { label: "Status", value: hudState.phase },
        ]}
        actions={
          <>
            <GameButton variant="primary" onClick={beginRun}>
              {hudState.phase === "game-over" ? "Restart" : "Start"}
            </GameButton>
            <GameButton onClick={togglePause}>
              {hudState.phase === "paused" ? "Resume" : "Pause"}
            </GameButton>
          </>
        }
      />

      <GamePlayfield className="mx-auto aspect-[19/13] w-full max-w-[76dvh] md:max-w-[91dvh]">
        <canvas ref={canvasRef} className="h-full w-full" aria-label="Asteroids field" />
      </GamePlayfield>

      <GameStatus>{getStatusCopy(hudState.phase)}</GameStatus>

      <TouchControls className="max-w-[24rem]">
        <div className="grid grid-cols-4 gap-2">
          <GameButton
            variant="touch"
            className="rounded-2xl"
            onPointerDown={() => {
              touchInputRef.current.turn = -1;
            }}
            onPointerUp={() => {
              touchInputRef.current.turn = 0;
            }}
            onPointerLeave={() => {
              touchInputRef.current.turn = 0;
            }}
          >
            Left
          </GameButton>
          <GameButton
            variant="touch"
            className="rounded-2xl"
            onPointerDown={() => {
              touchInputRef.current.thrust = true;
            }}
            onPointerUp={() => {
              touchInputRef.current.thrust = false;
            }}
            onPointerLeave={() => {
              touchInputRef.current.thrust = false;
            }}
          >
            Thrust
          </GameButton>
          <GameButton
            variant="touch"
            className="rounded-2xl"
            onClick={() => {
              touchInputRef.current.shoot = true;
              beginRun();
            }}
          >
            Fire
          </GameButton>
          <GameButton
            variant="touch"
            className="rounded-2xl"
            onPointerDown={() => {
              touchInputRef.current.turn = 1;
            }}
            onPointerUp={() => {
              touchInputRef.current.turn = 0;
            }}
            onPointerLeave={() => {
              touchInputRef.current.turn = 0;
            }}
          >
            Right
          </GameButton>
        </div>
      </TouchControls>
    </GamePanel>
  );
}
