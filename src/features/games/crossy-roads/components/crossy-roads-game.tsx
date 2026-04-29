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
import type {
  CrossyDirection,
  CrossyLane,
  CrossyLog,
  CrossyPhase,
  CrossyScenery,
  CrossyState,
  CrossyVehicle,
} from "@/features/games/crossy-roads/types";
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

const boardLeft = (CROSSY_WIDTH - CROSSY_COLUMNS * CROSSY_TILE) / 2;
const horizonY = 78;
const laneOriginY = CROSSY_HEIGHT - 98;

function getStatusCopy(phase: CrossyPhase) {
  if (phase === "playing") {
    return "Hop through traffic, ride logs, dodge trains, and keep climbing.";
  }

  if (phase === "paused") {
    return "Paused. Resume when the lane opens.";
  }

  if (phase === "game-over") {
    return "Squashed. Restart and find a cleaner route.";
  }

  return "Use arrows, WASD, Space, swipe, or the buttons to hop.";
}

function laneY(row: number, cameraRow: number) {
  return laneOriginY - (row - cameraRow) * CROSSY_TILE;
}

function drawRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function drawIsoBlock(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  top: string,
  side: string,
  stroke = "rgba(31,45,38,0.28)",
) {
  context.fillStyle = side;
  context.fillRect(x, y + height * 0.74, width, height * 0.26);
  context.fillStyle = top;
  drawRoundRect(context, x, y, width, height * 0.82, 8);
  context.fill();
  context.strokeStyle = stroke;
  context.lineWidth = 2;
  context.stroke();
}

function drawBackground(context: CanvasRenderingContext2D) {
  const sky = context.createLinearGradient(0, 0, 0, CROSSY_HEIGHT);
  sky.addColorStop(0, "#8ddcff");
  sky.addColorStop(0.46, "#dff7ff");
  sky.addColorStop(1, "#81cf67");
  context.fillStyle = sky;
  context.fillRect(0, 0, CROSSY_WIDTH, CROSSY_HEIGHT);

  context.fillStyle = "rgba(255,255,255,0.74)";
  for (const cloud of [
    { x: 86, y: 48, s: 1.1 },
    { x: 430, y: 70, s: 0.9 },
    { x: 270, y: 34, s: 0.68 },
  ]) {
    context.beginPath();
    context.ellipse(cloud.x, cloud.y, 34 * cloud.s, 14 * cloud.s, 0, 0, Math.PI * 2);
    context.ellipse(cloud.x + 30 * cloud.s, cloud.y + 4 * cloud.s, 28 * cloud.s, 13 * cloud.s, 0, 0, Math.PI * 2);
    context.ellipse(cloud.x - 28 * cloud.s, cloud.y + 6 * cloud.s, 24 * cloud.s, 12 * cloud.s, 0, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = "rgba(49,150,83,0.42)";
  context.beginPath();
  context.moveTo(0, horizonY + 38);
  context.quadraticCurveTo(CROSSY_WIDTH * 0.3, horizonY - 18, CROSSY_WIDTH * 0.58, horizonY + 30);
  context.quadraticCurveTo(CROSSY_WIDTH * 0.83, horizonY + 68, CROSSY_WIDTH, horizonY + 6);
  context.lineTo(CROSSY_WIDTH, CROSSY_HEIGHT);
  context.lineTo(0, CROSSY_HEIGHT);
  context.closePath();
  context.fill();
}

function drawGrassLane(context: CanvasRenderingContext2D, lane: CrossyLane, y: number) {
  const top = lane.row % 2 === 0 ? "#72d95d" : "#66cc52";
  drawIsoBlock(context, 0, y - CROSSY_TILE, CROSSY_WIDTH, CROSSY_TILE, top, "#4ca83e");

  context.fillStyle = "rgba(255,255,255,0.16)";
  for (let x = 14 + ((lane.row * 29) % 54); x < CROSSY_WIDTH; x += 88) {
    context.beginPath();
    context.ellipse(x, y - 18, 15, 5, -0.18, 0, Math.PI * 2);
    context.fill();
  }
}

function drawRoadLane(context: CanvasRenderingContext2D, lane: CrossyLane, y: number) {
  drawIsoBlock(context, 0, y - CROSSY_TILE, CROSSY_WIDTH, CROSSY_TILE, "#59606e", "#3d4450", "rgba(20,24,31,0.42)");
  context.fillStyle = "rgba(255,255,255,0.7)";
  for (let x = ((lane.row * 31) % 82) - 32; x < CROSSY_WIDTH; x += 88) {
    drawRoundRect(context, x, y - CROSSY_TILE / 2 - 3, 42, 6, 3);
    context.fill();
  }
}

function drawRiverLane(context: CanvasRenderingContext2D, lane: CrossyLane, y: number, time: number) {
  drawIsoBlock(context, 0, y - CROSSY_TILE, CROSSY_WIDTH, CROSSY_TILE, "#2f9bd8", "#1f78b3", "rgba(13,70,116,0.34)");
  context.strokeStyle = "rgba(219,246,255,0.28)";
  context.lineWidth = 3;
  for (let x = -40 + ((lane.row * 17 + time * 30) % 90); x < CROSSY_WIDTH + 40; x += 90) {
    context.beginPath();
    context.moveTo(x, y - 20);
    context.quadraticCurveTo(x + 22, y - 28, x + 46, y - 20);
    context.stroke();
  }
}

function drawRailLane(context: CanvasRenderingContext2D, lane: CrossyLane, y: number) {
  drawIsoBlock(context, 0, y - CROSSY_TILE, CROSSY_WIDTH, CROSSY_TILE, "#6f7a81", "#505b62", "rgba(25,30,35,0.46)");
  context.strokeStyle = "#34383c";
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(0, y - 39);
  context.lineTo(CROSSY_WIDTH, y - 39);
  context.moveTo(0, y - 17);
  context.lineTo(CROSSY_WIDTH, y - 17);
  context.stroke();
  context.strokeStyle = "rgba(255,236,160,0.55)";
  context.lineWidth = 4;
  for (let x = 0; x < CROSSY_WIDTH; x += 34) {
    context.beginPath();
    context.moveTo(x, y - 46);
    context.lineTo(x + 18, y - 10);
    context.stroke();
  }

  if (lane.warning > 1.8) {
    context.fillStyle = "rgba(255,61,61,0.22)";
    context.fillRect(0, y - CROSSY_TILE, CROSSY_WIDTH, CROSSY_TILE);
  }
}

function drawLog(context: CanvasRenderingContext2D, log: CrossyLog, y: number) {
  context.save();
  context.translate(log.x, y - 43);
  context.shadowColor = "rgba(10,60,90,0.22)";
  context.shadowBlur = 8;
  context.shadowOffsetY = 5;

  if (log.kind === "lily") {
    context.translate(log.width / 2, 17);
    context.fillStyle = "#46bf61";
    context.strokeStyle = "#1f7d3b";
    context.lineWidth = 4;
    context.beginPath();
    context.ellipse(0, 0, 34, 19, 0, 0.18, Math.PI * 1.82);
    context.lineTo(4, 1);
    context.closePath();
    context.fill();
    context.stroke();
    context.fillStyle = "rgba(255,255,255,0.24)";
    context.beginPath();
    context.ellipse(-9, -5, 12, 4, -0.28, 0, Math.PI * 2);
    context.fill();
    context.restore();
    return;
  }

  drawRoundRect(context, 0, 5, log.width, 27, 14);
  context.fillStyle = "#9b5a27";
  context.fill();
  context.strokeStyle = "#633515";
  context.lineWidth = 4;
  context.stroke();
  context.strokeStyle = "rgba(255,226,164,0.38)";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(18, 13);
  context.lineTo(log.width - 18, 13);
  context.moveTo(24, 23);
  context.lineTo(log.width - 28, 23);
  context.stroke();
  context.restore();
}

function drawVehicle(context: CanvasRenderingContext2D, vehicle: CrossyVehicle, y: number) {
  context.save();
  context.translate(vehicle.x, y - CROSSY_TILE + 7);
  context.shadowColor = "rgba(16,20,30,0.28)";
  context.shadowBlur = 10;
  context.shadowOffsetY = 7;

  if (vehicle.kind === "train") {
    context.fillStyle = "rgba(255,255,255,0.38)";
    context.fillRect(-34, 6, 22, 34);
    drawRoundRect(context, 0, 2, vehicle.width, 42, 8);
    context.fillStyle = vehicle.color;
    context.fill();
    context.strokeStyle = "#2f353a";
    context.lineWidth = 4;
    context.stroke();
    context.fillStyle = vehicle.accent;
    context.fillRect(10, 9, vehicle.width - 20, 8);
    context.fillStyle = "#9bd6ff";
    for (let x = 24; x < vehicle.width - 26; x += 42) {
      drawRoundRect(context, x, 20, 22, 12, 3);
      context.fill();
    }
    context.restore();
    return;
  }

  const height = vehicle.kind === "car" ? 35 : 42;
  context.fillStyle = "rgba(15,20,28,0.24)";
  drawRoundRect(context, 3, height - 4, vehicle.width - 6, 10, 6);
  context.fill();
  drawRoundRect(context, 0, 0, vehicle.width, height, 9);
  context.fillStyle = vehicle.color;
  context.fill();
  context.strokeStyle = "#25303b";
  context.lineWidth = 4;
  context.stroke();

  context.fillStyle = vehicle.accent;
  drawRoundRect(context, vehicle.width * 0.18, 7, vehicle.width * 0.24, 13, 4);
  context.fill();
  drawRoundRect(context, vehicle.width * 0.58, 7, vehicle.width * 0.22, 13, 4);
  context.fill();

  context.fillStyle = "#1d2631";
  context.beginPath();
  context.arc(17, height, 7, 0, Math.PI * 2);
  context.arc(vehicle.width - 17, height, 7, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#ffec8a";
  context.fillRect(vehicle.speed > 0 ? vehicle.width - 4 : 0, 9, 4, 10);
  context.fillStyle = "rgba(255,255,255,0.34)";
  drawRoundRect(context, 10, 4, vehicle.width - 20, 5, 3);
  context.fill();
  context.restore();
}

function drawScenery(context: CanvasRenderingContext2D, item: CrossyScenery, y: number) {
  const x = boardLeft + item.column * CROSSY_TILE + CROSSY_TILE / 2;
  context.save();
  context.translate(x, y - CROSSY_TILE / 2);
  context.shadowColor = "rgba(20,80,30,0.24)";
  context.shadowBlur = 8;
  context.shadowOffsetY = 6;

  if (item.kind === "tree") {
    context.fillStyle = "#6a3e1f";
    drawRoundRect(context, -6, -6, 12, 24, 4);
    context.fill();
    context.fillStyle = "#2f9d42";
    context.beginPath();
    context.moveTo(0, -34);
    context.lineTo(-24, -2);
    context.lineTo(24, -2);
    context.closePath();
    context.fill();
    context.fillStyle = "#48bf4d";
    context.beginPath();
    context.moveTo(2, -44);
    context.lineTo(-18, -12);
    context.lineTo(25, -10);
    context.closePath();
    context.fill();
  } else if (item.kind === "rock") {
    context.fillStyle = "#9aa6a8";
    drawRoundRect(context, -17, -10, 34, 25, 9);
    context.fill();
    context.strokeStyle = "#667174";
    context.lineWidth = 3;
    context.stroke();
  } else {
    context.fillStyle = "#3baa43";
    context.beginPath();
    context.ellipse(0, 3, 22, 14, 0, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawPlayer(context: CanvasRenderingContext2D, state: CrossyState) {
  const t = state.player.hopProgress;
  const eased = 1 - Math.pow(1 - t, 3);
  const column = state.player.fromColumn + (state.player.column - state.player.fromColumn) * eased;
  const row = state.player.fromRow + (state.player.row - state.player.fromRow) * eased;
  const x = boardLeft + column * CROSSY_TILE + CROSSY_TILE / 2 + state.player.carryOffset;
  const y = laneY(row, state.cameraRow) - CROSSY_TILE / 2 - Math.sin(t * Math.PI) * 18;
  const squash = 1 - Math.sin(t * Math.PI) * 0.1;

  context.save();
  context.translate(x, y);
  const rotation =
    state.player.direction === "left"
      ? -0.12
      : state.player.direction === "right"
        ? 0.12
        : state.player.direction === "down"
          ? Math.PI
          : 0;
  context.rotate(rotation);
  context.scale(1, squash);
  context.shadowColor = "rgba(24,31,35,0.28)";
  context.shadowBlur = 11;
  context.shadowOffsetY = 8;
  context.lineJoin = "round";

  context.fillStyle = "#fff8df";
  context.strokeStyle = "#232b36";
  context.lineWidth = 4.5;
  drawRoundRect(context, -17, -10, 34, 31, 6);
  context.fill();
  context.stroke();

  context.fillStyle = "#fffef3";
  drawRoundRect(context, -12, -32, 28, 25, 6);
  context.fill();
  context.stroke();

  context.fillStyle = "#ef493e";
  drawRoundRect(context, -12, -43, 8, 13, 3);
  context.fill();
  drawRoundRect(context, -4, -49, 8, 19, 3);
  context.fill();
  drawRoundRect(context, 4, -43, 8, 13, 3);
  context.fill();
  context.stroke();

  context.fillStyle = "#f8a020";
  context.beginPath();
  context.moveTo(15, -25);
  context.lineTo(31, -18);
  context.lineTo(15, -12);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = "#151a23";
  context.fillRect(7, -25, 5, 5);

  context.fillStyle = "#f04f3e";
  drawRoundRect(context, 8, -9, 8, 11, 3);
  context.fill();
  context.stroke();

  context.fillStyle = "#f5f1df";
  drawRoundRect(context, -27, -5, 13, 21, 4);
  context.fill();
  context.stroke();
  drawRoundRect(context, 14, -5, 13, 21, 4);
  context.fill();
  context.stroke();

  context.strokeStyle = "#c16a1d";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(-7, 18);
  context.lineTo(-13, 27);
  context.moveTo(-18, 27);
  context.lineTo(-8, 27);
  context.moveTo(7, 18);
  context.lineTo(13, 27);
  context.moveTo(8, 27);
  context.lineTo(18, 27);
  context.stroke();
  context.restore();
}

function drawScore(context: CanvasRenderingContext2D, score: number) {
  context.save();
  context.translate(82, 46);
  context.fillStyle = "rgba(255,244,177,0.95)";
  context.strokeStyle = "#21406b";
  context.lineWidth = 4;
  drawRoundRect(context, -58, -24, 116, 48, 14);
  context.fill();
  context.stroke();
  context.textAlign = "center";
  context.fillStyle = "#21406b";
  context.font = "900 12px sans-serif";
  context.fillText("SCORE", 0, -4);
  context.font = "900 22px sans-serif";
  context.fillText(String(score), 0, 19);
  context.restore();
}

function drawOverlay(context: CanvasRenderingContext2D, phase: CrossyPhase) {
  if (phase === "playing") {
    return;
  }

  context.fillStyle = "rgba(41,117,70,0.22)";
  context.fillRect(0, 0, CROSSY_WIDTH, CROSSY_HEIGHT);
  context.save();
  context.translate(CROSSY_WIDTH / 2, CROSSY_HEIGHT / 2 - 6);
  context.fillStyle = "rgba(255,244,177,0.96)";
  context.strokeStyle = "#21406b";
  context.lineWidth = 5;
  drawRoundRect(context, -156, -66, 312, 132, 24);
  context.fill();
  context.stroke();
  context.textAlign = "center";
  context.fillStyle = "#21406b";
  context.font = "900 27px sans-serif";
  context.fillText(phase === "paused" ? "Paused" : phase === "game-over" ? "Try Again" : "Crossy Roads", 0, -13);
  context.font = "800 14px sans-serif";
  context.fillStyle = "#42658c";
  context.fillText(phase === "game-over" ? "Space or tap Restart to play again" : "Arrows, WASD, swipe, or tap controls", 0, 24);
  context.restore();
}

function drawScene(context: CanvasRenderingContext2D, state: CrossyState) {
  const time = performance.now() / 1000;
  context.clearRect(0, 0, CROSSY_WIDTH, CROSSY_HEIGHT);
  drawBackground(context);

  const visibleLanes = state.lanes
    .map((lane) => ({ lane, y: laneY(lane.row, state.cameraRow) }))
    .filter(({ y }) => y > -CROSSY_TILE && y < CROSSY_HEIGHT + CROSSY_TILE)
    .sort((a, b) => a.y - b.y);

  visibleLanes.forEach(({ lane, y }) => {
    if (lane.type === "road") {
      drawRoadLane(context, lane, y);
    } else if (lane.type === "river") {
      drawRiverLane(context, lane, y, time);
    } else if (lane.type === "rail") {
      drawRailLane(context, lane, y);
    } else {
      drawGrassLane(context, lane, y);
    }
  });

  visibleLanes.forEach(({ lane, y }) => {
    lane.logs.forEach((log) => drawLog(context, log, y));
    lane.vehicles.forEach((vehicle) => drawVehicle(context, vehicle, y));
  });

  visibleLanes.forEach(({ lane, y }) => {
    lane.scenery.forEach((item) => drawScenery(context, item, y));
  });

  for (let column = 0; column <= CROSSY_COLUMNS; column += 1) {
    context.strokeStyle = "rgba(255,255,255,0.07)";
    context.beginPath();
    context.moveTo(boardLeft + column * CROSSY_TILE, horizonY);
    context.lineTo(boardLeft + column * CROSSY_TILE, CROSSY_HEIGHT);
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
  const touchStartRef = useRef<{ id: number; x: number; y: number } | null>(null);
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
    if (normalizedKey === " " && stateRef.current.phase === "game-over") {
      event.preventDefault();
      restart();
      return;
    }

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

  function handleTouchEnd(id: number, x: number, y: number) {
    const start = touchStartRef.current;
    if (!start || start.id !== id) {
      return;
    }

    touchStartRef.current = null;
    const dx = x - start.x;
    const dy = y - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) {
      move("up");
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

      <GamePlayfield className="mx-auto aspect-[7/8] w-full max-w-[min(30rem,56dvh)] touch-none overflow-hidden border-0 bg-[#70d45a] shadow-[0_28px_80px_rgba(17,63,34,0.28)]">
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none"
          aria-label="Crossy Roads field"
          onPointerDown={(event) => {
            if (event.pointerType !== "touch" && event.pointerType !== "pen") {
              return;
            }

            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            touchStartRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
          }}
          onPointerMove={(event) => {
            if (touchStartRef.current?.id === event.pointerId) {
              event.preventDefault();
            }
          }}
          onPointerUp={(event) => {
            if (touchStartRef.current?.id === event.pointerId) {
              event.preventDefault();
            }

            handleTouchEnd(event.pointerId, event.clientX, event.clientY);
          }}
          onPointerCancel={(event) => {
            if (touchStartRef.current?.id === event.pointerId) {
              touchStartRef.current = null;
            }
          }}
        />
      </GamePlayfield>

      <GameStatus>{getStatusCopy(hudState.phase)} Space or R restarts after a crash. P pauses.</GameStatus>

      <TouchControls className="max-w-[18rem]">
        <div className="grid grid-cols-3 gap-2">
          <div />
          <GameButton variant="touch" className="rounded-2xl" onClick={() => move("up")}>
            Up
          </GameButton>
          <div />
          <GameButton variant="touch" className="rounded-2xl" onClick={() => move("left")}>
            Left
          </GameButton>
          <GameButton variant="touch" className="rounded-2xl" onClick={() => move("down")}>
            Down
          </GameButton>
          <GameButton variant="touch" className="rounded-2xl" onClick={() => move("right")}>
            Right
          </GameButton>
        </div>
      </TouchControls>
    </GamePanel>
  );
}
