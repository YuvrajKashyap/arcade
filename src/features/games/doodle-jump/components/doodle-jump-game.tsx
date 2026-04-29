"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  DOODLE_HEIGHT,
  DOODLE_PLAYER_HEIGHT,
  DOODLE_PLAYER_WIDTH,
  DOODLE_STORAGE_KEY,
  DOODLE_WIDTH,
} from "@/features/games/doodle-jump/config/constants";
import {
  createDoodleJumpState,
  startDoodleJump,
  updateDoodleJump,
} from "@/features/games/doodle-jump/logic/game";
import type { DoodleJumpPhase, DoodleJumpState, DoodlePlatform } from "@/features/games/doodle-jump/types";
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

function getStatusCopy(phase: DoodleJumpPhase) {
  if (phase === "playing") {
    return "Keep bouncing upward, steer onto platforms, and do not fall below the page.";
  }

  if (phase === "paused") {
    return "Paused. Resume before the next bounce.";
  }

  if (phase === "game-over") {
    return "You fell off the page. Restart for another climb.";
  }

  return "Press Space to start. A/D or arrows steer the jumper.";
}

function drawPaperBackground(context: CanvasRenderingContext2D, elapsedSeconds: number) {
  const gradient = context.createLinearGradient(0, 0, 0, DOODLE_HEIGHT);
  gradient.addColorStop(0, "#fffdf0");
  gradient.addColorStop(0.56, "#fff7d6");
  gradient.addColorStop(1, "#fff0bd");
  context.fillStyle = gradient;
  context.fillRect(0, 0, DOODLE_WIDTH, DOODLE_HEIGHT);

  context.strokeStyle = "rgba(81, 143, 216, 0.18)";
  context.lineWidth = 1;
  for (let y = 28; y < DOODLE_HEIGHT; y += 28) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(DOODLE_WIDTH, y);
    context.stroke();
  }

  context.strokeStyle = "rgba(255, 107, 107, 0.24)";
  context.beginPath();
  context.moveTo(48, 0);
  context.lineTo(48, DOODLE_HEIGHT);
  context.stroke();

  context.fillStyle = "rgba(107, 199, 255, 0.24)";
  context.beginPath();
  context.arc(340, 84 + Math.sin(elapsedSeconds) * 5, 32, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "rgba(255, 183, 3, 0.22)";
  context.beginPath();
  context.arc(96, 134 + Math.cos(elapsedSeconds * 0.8) * 4, 24, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.strokeStyle = "rgba(38, 53, 111, 0.22)";
  context.lineWidth = 3;
  context.lineCap = "round";
  for (let index = 0; index < 7; index += 1) {
    const x = 76 + ((index * 61 + elapsedSeconds * 9) % 318);
    const y = 68 + ((index * 83 + Math.sin(elapsedSeconds + index) * 8) % 420);
    const size = 4 + (index % 3);
    context.beginPath();
    context.moveTo(x - size, y);
    context.lineTo(x + size, y);
    context.moveTo(x, y - size);
    context.lineTo(x, y + size);
    context.stroke();
  }

  context.strokeStyle = "rgba(255, 112, 77, 0.28)";
  context.beginPath();
  context.arc(348, 426 + Math.sin(elapsedSeconds * 0.9) * 7, 18, 0, Math.PI * 2);
  context.moveTo(330, 426);
  context.lineTo(366, 426);
  context.moveTo(348, 408);
  context.lineTo(348, 444);
  context.stroke();
  context.restore();
}

function drawPlatform(context: CanvasRenderingContext2D, platform: DoodlePlatform, elapsedSeconds: number) {
  const isBreaking = platform.brokenAt !== undefined;
  const shake = isBreaking ? Math.sin(elapsedSeconds * 34 + platform.id) * 3 : 0;
  const color =
    platform.kind === "breakable"
      ? "#c77b39"
      : platform.kind === "pink"
        ? "#ff79b0"
        : platform.kind === "blue"
          ? "#62d6ff"
          : "#74d85c";
  const dark =
    platform.kind === "breakable"
      ? "#79431e"
      : platform.kind === "pink"
        ? "#b93c75"
        : platform.kind === "blue"
          ? "#2785ae"
          : "#3b912c";

  context.save();
  context.translate(shake, 0);
  context.shadowColor = "rgba(54, 45, 28, 0.22)";
  context.shadowBlur = 8;
  context.shadowOffsetY = 4;
  context.fillStyle = color;
  context.strokeStyle = dark;
  context.lineWidth = 4;
  context.beginPath();
  context.roundRect(platform.x, platform.y, platform.width, 15, 9);
  context.fill();
  context.stroke();
  context.strokeStyle = "rgba(255,255,255,0.58)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(platform.x + 12, platform.y + 4);
  context.lineTo(platform.x + platform.width - 14, platform.y + 4);
  context.stroke();

  if (platform.kind === "breakable") {
    context.strokeStyle = "#5d3017";
    context.lineWidth = isBreaking ? 3.5 : 2.5;
    context.beginPath();
    context.moveTo(platform.x + platform.width * 0.3, platform.y + 2);
    context.lineTo(platform.x + platform.width * 0.42 + (isBreaking ? 5 : 0), platform.y + 9);
    context.lineTo(platform.x + platform.width * 0.36, platform.y + 15);
    context.moveTo(platform.x + platform.width * 0.62, platform.y + 1);
    context.lineTo(platform.x + platform.width * 0.54 - (isBreaking ? 5 : 0), platform.y + 8);
    context.lineTo(platform.x + platform.width * 0.7, platform.y + 15);
    context.stroke();

    if (isBreaking) {
      context.fillStyle = "#8c5128";
      context.beginPath();
      context.arc(platform.x + platform.width * 0.28, platform.y + 22, 3.5, 0, Math.PI * 2);
      context.arc(platform.x + platform.width * 0.64, platform.y + 24, 2.8, 0, Math.PI * 2);
      context.fill();
    }
  } else if (platform.kind === "blue") {
    context.fillStyle = "rgba(255,255,255,0.62)";
    context.beginPath();
    context.arc(platform.x + platform.width - 12, platform.y + 7, 4, 0, Math.PI * 2);
    context.fill();
  } else if (platform.kind === "pink") {
    context.strokeStyle = "rgba(255,255,255,0.7)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(platform.x + 16, platform.y + 11);
    context.quadraticCurveTo(platform.x + platform.width / 2, platform.y - 3, platform.x + platform.width - 16, platform.y + 11);
    context.stroke();
  }
  context.restore();
}

function drawScoreLabel(context: CanvasRenderingContext2D, score: number) {
  context.save();
  context.translate(70, 42);
  context.rotate(-0.025);
  context.shadowColor = "rgba(55, 42, 18, 0.18)";
  context.shadowBlur = 8;
  context.shadowOffsetY = 4;
  context.fillStyle = "#fff1a8";
  context.strokeStyle = "#26356f";
  context.lineWidth = 4;
  context.beginPath();
  context.roundRect(-52, -22, 104, 44, 14);
  context.fill();
  context.stroke();
  context.textAlign = "center";
  context.fillStyle = "#26356f";
  context.font = "900 13px sans-serif";
  context.fillText("SCORE", 0, -3);
  context.font = "900 20px sans-serif";
  context.fillText(String(score), 0, 18);
  context.restore();
}

function drawPlayer(context: CanvasRenderingContext2D, state: DoodleJumpState, elapsedSeconds: number) {
  const { player } = state;
  const cx = player.x + DOODLE_PLAYER_WIDTH / 2;
  const cy = player.y + DOODLE_PLAYER_HEIGHT / 2;
  const squash = player.vy < -200 ? 1.05 : player.vy > 300 ? 0.94 : 1;

  if (player.vy < -280) {
    context.save();
    context.fillStyle = "rgba(107, 199, 255, 0.2)";
    for (let index = 0; index < 3; index += 1) {
      context.beginPath();
      context.ellipse(
        cx - 18 + index * 18,
        player.y + DOODLE_PLAYER_HEIGHT + 8 + Math.sin(elapsedSeconds * 8 + index) * 2,
        9 - index,
        4,
        0,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
    context.restore();
  }

  context.save();
  context.translate(cx, cy);
  context.scale(player.facing, 1);
  context.rotate(Math.sin(elapsedSeconds * 8) * 0.035);
  context.shadowColor = "rgba(66, 45, 18, 0.22)";
  context.shadowBlur = 10;
  context.shadowOffsetY = 5;

  context.fillStyle = "#a8e85b";
  context.strokeStyle = "#2d6f1f";
  context.lineWidth = 4;
  context.beginPath();
  context.roundRect(-17, -23 * squash, 34, 43 * squash, 14);
  context.fill();
  context.stroke();

  context.fillStyle = "#6bd7ff";
  context.strokeStyle = "#235783";
  context.lineWidth = 3;
  context.beginPath();
  context.ellipse(8, -9, 10, 8, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.fillStyle = "#10213a";
  context.beginPath();
  context.arc(11, -10, 2, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "#2d6f1f";
  context.lineWidth = 4;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(-14, 8);
  context.lineTo(-28, 14);
  context.moveTo(13, 9);
  context.lineTo(27, 14);
  context.stroke();

  context.fillStyle = "#ff704d";
  context.strokeStyle = "#9b3021";
  context.lineWidth = 3;
  context.beginPath();
  context.ellipse(-10, 23, 11, 5, 0.2, 0, Math.PI * 2);
  context.ellipse(12, 23, 11, 5, -0.2, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

function drawOverlay(context: CanvasRenderingContext2D, phase: DoodleJumpPhase) {
  if (phase === "playing") {
    return;
  }

  context.fillStyle = "rgba(255,249,221,0.62)";
  context.fillRect(0, 0, DOODLE_WIDTH, DOODLE_HEIGHT);
  context.save();
  context.translate(DOODLE_WIDTH / 2, DOODLE_HEIGHT / 2);
  context.fillStyle = "#ffffff";
  context.strokeStyle = "#273b7a";
  context.lineWidth = 5;
  context.beginPath();
  context.roundRect(-138, -68, 276, 136, 24);
  context.fill();
  context.stroke();
  context.textAlign = "center";
  context.fillStyle = "#26356f";
  context.font = "800 30px sans-serif";
  context.fillText(phase === "paused" ? "Paused" : phase === "game-over" ? "Fell off" : "Doodle Jump", 0, -12);
  context.font = "700 14px sans-serif";
  context.fillStyle = "#61709c";
  context.fillText("Press Space or Start", 0, 24);
  context.restore();
}

function drawScene(context: CanvasRenderingContext2D, state: DoodleJumpState, elapsedSeconds: number) {
  context.clearRect(0, 0, DOODLE_WIDTH, DOODLE_HEIGHT);
  drawPaperBackground(context, elapsedSeconds);
  state.platforms.forEach((platform) => drawPlatform(context, platform, elapsedSeconds));
  drawPlayer(context, state, elapsedSeconds);
  drawScoreLabel(context, state.score);
  drawOverlay(context, state.phase);
}

export function DoodleJumpGame() {
  const initialState = createDoodleJumpState(readStoredNumber(DOODLE_STORAGE_KEY));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef<DoodleJumpState>(initialState);
  const touchDirectionRef = useRef(0);
  const elapsedSecondsRef = useRef(0);
  const pressedKeysRef = useKeyboardState({
    preventDefaultKeys: ["a", "d", "arrowleft", "arrowright", " "],
  });
  const [hudState, setHudState] = useState(() => ({
    score: initialState.score,
    bestScore: initialState.bestScore,
    phase: initialState.phase,
  }));

  function syncState(nextState: DoodleJumpState) {
    stateRef.current = nextState;
    setHudState({
      score: nextState.score,
      bestScore: nextState.bestScore,
      phase: nextState.phase,
    });
    writeStoredNumber(DOODLE_STORAGE_KEY, nextState.bestScore);
  }

  function renderCurrentState() {
    const context = contextRef.current;
    if (context) {
      drawScene(context, stateRef.current, elapsedSecondsRef.current);
    }
  }

  function beginRun() {
    syncState(startDoodleJump(stateRef.current));
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

    contextRef.current = configureHiDPICanvas(canvas, DOODLE_WIDTH, DOODLE_HEIGHT);
    renderCurrentState();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => handleKeyboardInput(event);
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useAnimationFrameLoop((deltaSeconds) => {
    elapsedSecondsRef.current += deltaSeconds;
    const keys = pressedKeysRef.current;
    const keyboardDirection =
      Number(keys.has("d") || keys.has("arrowright")) -
      Number(keys.has("a") || keys.has("arrowleft"));
    const nextState = updateDoodleJump(
      stateRef.current,
      deltaSeconds,
      keyboardDirection || touchDirectionRef.current,
    );

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
            <GameButton variant="primary" onClick={beginRun}>
              {hudState.phase === "game-over" ? "Restart" : "Start"}
            </GameButton>
            <GameButton onClick={togglePause}>
              {hudState.phase === "paused" ? "Resume" : "Pause"}
            </GameButton>
          </>
        }
      />

      <GamePlayfield className="mx-auto aspect-[3/4] w-full max-w-[min(24rem,54dvh)] border-0 bg-[#fff9dd]">
        <canvas ref={canvasRef} className="h-full w-full" aria-label="Doodle Jump field" />
      </GamePlayfield>

      <GameStatus>{getStatusCopy(hudState.phase)}</GameStatus>

      <TouchControls className="max-w-[18rem]">
        <div className="grid grid-cols-2 gap-2">
          <GameButton
            variant="touch"
            onPointerDown={() => {
              touchDirectionRef.current = -1;
            }}
            onPointerUp={() => {
              touchDirectionRef.current = 0;
            }}
            onPointerLeave={() => {
              touchDirectionRef.current = 0;
            }}
          >
            Left
          </GameButton>
          <GameButton
            variant="touch"
            onPointerDown={() => {
              touchDirectionRef.current = 1;
            }}
            onPointerUp={() => {
              touchDirectionRef.current = 0;
            }}
            onPointerLeave={() => {
              touchDirectionRef.current = 0;
            }}
          >
            Right
          </GameButton>
        </div>
      </TouchControls>
    </GamePanel>
  );
}
