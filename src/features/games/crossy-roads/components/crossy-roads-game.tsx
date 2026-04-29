"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  CROSSY_COLUMNS,
  CROSSY_HEIGHT,
  CROSSY_STORAGE_KEY,
  CROSSY_TILE,
  CROSSY_WIDTH,
} from "@/features/games/crossy-roads/config/constants";
import {
  createCrossyState,
  moveCrossy,
  startCrossy,
  updateCrossy,
} from "@/features/games/crossy-roads/logic/game";
import type { CrossyDirection, CrossyLane, CrossyPhase, CrossyState, CrossyVehicle } from "@/features/games/crossy-roads/types";
import { configureHiDPICanvas } from "@/features/games/shared/canvas/configure-canvas";
import {
  GameButton,
  GameHud,
  GamePanel,
  GamePlayfield,
  GameStatus,
} from "@/features/games/shared/components/game-ui";
import { useAnimationFrameLoop } from "@/features/games/shared/hooks/use-animation-frame-loop";
import {
  readStoredNumber,
  writeStoredNumber,
} from "@/features/games/shared/utils/local-storage";

const directionByKey: Record<string, CrossyDirection | undefined> = {
  " ": "up",
  arrowup: "up",
  w: "up",
  arrowdown: "down",
  s: "down",
  arrowleft: "left",
  a: "left",
  arrowright: "right",
  d: "right",
};

function getStatusCopy(phase: CrossyPhase) {
  if (phase === "playing") {
    return "Hop forward, dodge traffic, and keep climbing lanes.";
  }

  if (phase === "paused") {
    return "Paused. Resume when the road clears.";
  }

  if (phase === "game-over") {
    return "Traffic got you. Restart and time the next hop.";
  }

  return "Press Space, an arrow key, or WASD to start hopping.";
}

function laneY(row: number, cameraRow: number) {
  return CROSSY_HEIGHT - 72 - (row - cameraRow) * CROSSY_TILE;
}

function drawGrassLane(context: CanvasRenderingContext2D, lane: CrossyLane, y: number) {
  context.fillStyle = lane.row % 3 === 0 ? "#7cda5b" : "#69c94f";
  context.fillRect(0, y - CROSSY_TILE, CROSSY_WIDTH, CROSSY_TILE);
  context.fillStyle = "rgba(255,255,255,0.16)";
  for (let x = 12 + ((lane.row * 23) % 38); x < CROSSY_WIDTH; x += 82) {
    context.beginPath();
    context.ellipse(x, y - 20, 12, 5, -0.2, 0, Math.PI * 2);
    context.fill();
  }
}

function drawRoadLane(context: CanvasRenderingContext2D, y: number) {
  context.fillStyle = "#5d6573";
  context.fillRect(0, y - CROSSY_TILE, CROSSY_WIDTH, CROSSY_TILE);
  context.fillStyle = "rgba(255,255,255,0.72)";
  for (let x = 14; x < CROSSY_WIDTH; x += 72) {
    context.fillRect(x, y - CROSSY_TILE / 2 - 3, 34, 6);
  }
}

function drawVehicle(context: CanvasRenderingContext2D, vehicle: CrossyVehicle, y: number) {
  context.save();
  context.translate(vehicle.x, y - CROSSY_TILE + 8);
  context.shadowColor = "rgba(24,27,39,0.24)";
  context.shadowBlur = 8;
  context.shadowOffsetY = 5;
  context.fillStyle = vehicle.color;
  context.strokeStyle = "#263140";
  context.lineWidth = 4;
  context.beginPath();
  context.roundRect(0, 0, vehicle.width, 33, 8);
  context.fill();
  context.stroke();
  context.fillStyle = "rgba(255,255,255,0.55)";
  context.beginPath();
  context.roundRect(vehicle.width * 0.18, 6, vehicle.width * 0.24, 12, 4);
  context.roundRect(vehicle.width * 0.56, 6, vehicle.width * 0.22, 12, 4);
  context.fill();
  context.fillStyle = "#202838";
  context.beginPath();
  context.arc(17, 33, 6, 0, Math.PI * 2);
  context.arc(vehicle.width - 17, 33, 6, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawPlayer(context: CanvasRenderingContext2D, state: CrossyState) {
  const t = state.player.hopProgress;
  const column = state.player.fromColumn + (state.player.column - state.player.fromColumn) * t;
  const row = state.player.fromRow + (state.player.row - state.player.fromRow) * t;
  const x = 35 + column * CROSSY_TILE + CROSSY_TILE / 2;
  const y = laneY(row, state.cameraRow) - CROSSY_TILE / 2 - Math.sin(t * Math.PI) * 12;
  const squash = 1 - Math.sin(t * Math.PI) * 0.08;

  context.save();
  context.translate(x, y);
  context.scale(1, squash);
  context.shadowColor = "rgba(25,31,35,0.24)";
  context.shadowBlur = 9;
  context.shadowOffsetY = 6;
  context.lineJoin = "round";

  context.fillStyle = "#fffdf1";
  context.strokeStyle = "#202837";
  context.lineWidth = 4.5;
  context.beginPath();
  context.roundRect(-16, -11, 32, 30, 5);
  context.fill();
  context.stroke();

  context.fillStyle = "#ffffff";
  context.beginPath();
  context.roundRect(-9, -31, 25, 24, 5);
  context.fill();
  context.stroke();

  context.fillStyle = "#e94435";
  context.beginPath();
  context.roundRect(-10, -43, 8, 13, 3);
  context.roundRect(-3, -48, 8, 18, 3);
  context.roundRect(4, -43, 8, 13, 3);
  context.fill();
  context.stroke();

  context.fillStyle = "#ff9f25";
  context.beginPath();
  context.moveTo(15, -24);
  context.lineTo(30, -18);
  context.lineTo(15, -12);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = "#141925";
  context.fillRect(7, -25, 5, 5);

  context.fillStyle = "#f04f3e";
  context.strokeStyle = "#202837";
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(8, -10, 8, 11, 3);
  context.fill();
  context.stroke();

  context.fillStyle = "#f5f1df";
  context.strokeStyle = "#202837";
  context.lineWidth = 3.5;
  context.beginPath();
  context.roundRect(-25, -5, 12, 20, 4);
  context.roundRect(13, -5, 12, 20, 4);
  context.fill();
  context.stroke();

  context.strokeStyle = "#c16a1d";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(-7, 17);
  context.lineTo(-12, 26);
  context.moveTo(-17, 26);
  context.lineTo(-8, 26);
  context.moveTo(7, 17);
  context.lineTo(12, 26);
  context.moveTo(7, 26);
  context.lineTo(17, 26);
  context.stroke();
  context.restore();
}

function drawScore(context: CanvasRenderingContext2D, score: number) {
  context.save();
  context.translate(78, 42);
  context.fillStyle = "#fff0a8";
  context.strokeStyle = "#21406b";
  context.lineWidth = 4;
  context.beginPath();
  context.roundRect(-56, -22, 112, 44, 13);
  context.fill();
  context.stroke();
  context.textAlign = "center";
  context.fillStyle = "#21406b";
  context.font = "900 13px sans-serif";
  context.fillText("SCORE", 0, -3);
  context.font = "900 20px sans-serif";
  context.fillText(String(score), 0, 18);
  context.restore();
}

function drawOverlay(context: CanvasRenderingContext2D, phase: CrossyPhase) {
  if (phase === "playing") {
    return;
  }

  context.fillStyle = "rgba(118,213,91,0.28)";
  context.fillRect(0, 0, CROSSY_WIDTH, CROSSY_HEIGHT);
  context.save();
  context.translate(CROSSY_WIDTH / 2, CROSSY_HEIGHT / 2);
  context.fillStyle = "#fff0a8";
  context.strokeStyle = "#21406b";
  context.lineWidth = 5;
  context.beginPath();
  context.roundRect(-150, -62, 300, 124, 22);
  context.fill();
  context.stroke();
  context.textAlign = "center";
  context.fillStyle = "#21406b";
  context.font = "900 28px sans-serif";
  context.fillText(phase === "paused" ? "Paused" : phase === "game-over" ? "Roadkill" : "Crossy Roads", 0, -10);
  context.font = "800 14px sans-serif";
  context.fillStyle = "#42658c";
  context.fillText("Space, arrows, WASD, or swipe to hop", 0, 24);
  context.restore();
}

function drawScene(context: CanvasRenderingContext2D, state: CrossyState) {
  context.clearRect(0, 0, CROSSY_WIDTH, CROSSY_HEIGHT);
  context.fillStyle = "#7cda5b";
  context.fillRect(0, 0, CROSSY_WIDTH, CROSSY_HEIGHT);

  const visibleLanes = state.lanes
    .map((lane) => ({ lane, y: laneY(lane.row, state.cameraRow) }))
    .filter(({ y }) => y > -CROSSY_TILE && y < CROSSY_HEIGHT + CROSSY_TILE)
    .sort((a, b) => a.y - b.y);

  visibleLanes.forEach(({ lane, y }) => {
    if (lane.type === "road") {
      drawRoadLane(context, y);
    } else {
      drawGrassLane(context, lane, y);
    }
  });

  visibleLanes.forEach(({ lane, y }) => {
    lane.vehicles.forEach((vehicle) => drawVehicle(context, vehicle, y));
  });

  for (let column = 0; column <= CROSSY_COLUMNS; column += 1) {
    context.strokeStyle = "rgba(255,255,255,0.08)";
    context.beginPath();
    context.moveTo(35 + column * CROSSY_TILE, 0);
    context.lineTo(35 + column * CROSSY_TILE, CROSSY_HEIGHT);
    context.stroke();
  }

  drawPlayer(context, state);
  drawScore(context, state.score);
  drawOverlay(context, state.phase);
}

export function CrossyRoadsGame() {
  const initialState = createCrossyState(readStoredNumber(CROSSY_STORAGE_KEY));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef<CrossyState>(initialState);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [hudState, setHudState] = useState(() => ({
    score: initialState.score,
    bestScore: initialState.bestScore,
    phase: initialState.phase,
  }));

  function syncState(nextState: CrossyState) {
    stateRef.current = nextState;
    setHudState({
      score: nextState.score,
      bestScore: nextState.bestScore,
      phase: nextState.phase,
    });
    writeStoredNumber(CROSSY_STORAGE_KEY, nextState.bestScore);
  }

  function renderCurrentState() {
    const context = contextRef.current;
    if (context) {
      drawScene(context, stateRef.current);
    }
  }

  function restart() {
    syncState(startCrossy(createCrossyState(stateRef.current.bestScore)));
    renderCurrentState();
  }

  function move(direction: CrossyDirection) {
    syncState(moveCrossy(stateRef.current, direction));
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
    const direction = directionByKey[normalizedKey];
    if (direction) {
      event.preventDefault();
      move(direction);
      return;
    }

    if (normalizedKey === "p") {
      event.preventDefault();
      togglePause();
      return;
    }

    if (normalizedKey === "r") {
      event.preventDefault();
      restart();
    }
  });

  function handleTouchEnd(x: number, y: number) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) {
      return;
    }

    const dx = x - start.x;
    const dy = y - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) {
      return;
    }

    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    contextRef.current = configureHiDPICanvas(canvas, CROSSY_WIDTH, CROSSY_HEIGHT);
    renderCurrentState();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => handleKeyboardInput(event);
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useAnimationFrameLoop((deltaSeconds) => {
    const nextState = updateCrossy(stateRef.current, deltaSeconds);
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
          { label: "Status", value: hudState.phase },
        ]}
        actions={
          <>
            <GameButton variant="primary" onClick={restart}>
              {hudState.phase === "game-over" ? "Restart" : "Start"}
            </GameButton>
            <GameButton onClick={togglePause}>{hudState.phase === "paused" ? "Resume" : "Pause"}</GameButton>
          </>
        }
      />

      <GamePlayfield className="mx-auto aspect-[13/14] w-full max-w-[min(30rem,54dvh)] touch-none border-0 bg-[#7cda5b]">
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          aria-label="Crossy Roads field"
          onPointerDown={(event) => {
            touchStartRef.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => handleTouchEnd(event.clientX, event.clientY)}
          onPointerCancel={() => {
            touchStartRef.current = null;
          }}
        />
      </GamePlayfield>

      <GameStatus>{getStatusCopy(hudState.phase)} R restarts and P pauses.</GameStatus>
    </GamePanel>
  );
}
