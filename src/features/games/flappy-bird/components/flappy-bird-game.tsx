"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  FLAPPY_BIRD_RADIUS,
  FLAPPY_BIRD_X,
  FLAPPY_GROUND_HEIGHT,
  FLAPPY_HEIGHT,
  FLAPPY_PIPE_GAP,
  FLAPPY_PIPE_WIDTH,
  FLAPPY_STORAGE_KEY,
  FLAPPY_WIDTH,
} from "@/features/games/flappy-bird/config/constants";
import {
  createFlappyBirdState,
  flapFlappyBird,
  startFlappyBird,
  updateFlappyBird,
} from "@/features/games/flappy-bird/logic/game";
import type { FlappyBirdPhase, FlappyBirdState, FlappyPipe } from "@/features/games/flappy-bird/types";
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

function getStatusCopy(phase: FlappyBirdPhase) {
  if (phase === "playing") {
    return "Tap, click, or press Space to flap through the pipes.";
  }

  if (phase === "paused") {
    return "Paused. Resume when the next pipe gap is lined up.";
  }

  if (phase === "game-over") {
    return "Bonk. Restart and thread the next run cleaner.";
  }

  return "Press Space, tap, or click to start flying.";
}

function drawCloud(context: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  context.fillStyle = "rgba(255,255,255,0.86)";
  context.strokeStyle = "rgba(90,158,210,0.28)";
  context.lineWidth = 3;
  context.beginPath();
  context.arc(-24, 8, 18, 0, Math.PI * 2);
  context.arc(-4, -4, 24, 0, Math.PI * 2);
  context.arc(22, 8, 17, 0, Math.PI * 2);
  context.roundRect(-42, 4, 82, 22, 12);
  context.fill();
  context.stroke();
  context.restore();
}

function drawBackground(context: CanvasRenderingContext2D, scroll: number) {
  const gradient = context.createLinearGradient(0, 0, 0, FLAPPY_HEIGHT);
  gradient.addColorStop(0, "#7ddaff");
  gradient.addColorStop(0.72, "#c8f3ff");
  gradient.addColorStop(1, "#f8e08b");
  context.fillStyle = gradient;
  context.fillRect(0, 0, FLAPPY_WIDTH, FLAPPY_HEIGHT);

  for (let index = 0; index < 4; index += 1) {
    const x = ((index * 150 - scroll * 0.18) % 600) - 90;
    drawCloud(context, x, 78 + (index % 2) * 74, index % 2 === 0 ? 0.82 : 0.58);
  }

  const groundY = FLAPPY_HEIGHT - FLAPPY_GROUND_HEIGHT;
  context.fillStyle = "#e6c65b";
  context.fillRect(0, groundY, FLAPPY_WIDTH, FLAPPY_GROUND_HEIGHT);
  context.fillStyle = "#67c54a";
  context.fillRect(0, groundY, FLAPPY_WIDTH, 18);
  context.strokeStyle = "#3f992e";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(0, groundY + 18);
  context.lineTo(FLAPPY_WIDTH, groundY + 18);
  context.stroke();

  context.fillStyle = "rgba(155,112,43,0.22)";
  for (let x = -40 + ((-scroll * 0.7) % 34); x < FLAPPY_WIDTH + 40; x += 34) {
    context.beginPath();
    context.moveTo(x, groundY + 28);
    context.lineTo(x + 16, groundY + 40);
    context.lineTo(x - 10, groundY + 48);
    context.closePath();
    context.fill();
  }
}

function drawPipe(context: CanvasRenderingContext2D, pipe: FlappyPipe) {
  const topHeight = pipe.gapY;
  const bottomY = pipe.gapY + FLAPPY_PIPE_GAP;
  const bottomHeight = FLAPPY_HEIGHT - FLAPPY_GROUND_HEIGHT - bottomY;

  const drawPipeBody = (x: number, y: number, width: number, height: number, capAtBottom: boolean) => {
    const gradient = context.createLinearGradient(x, 0, x + width, 0);
    gradient.addColorStop(0, "#359d2f");
    gradient.addColorStop(0.42, "#73dc47");
    gradient.addColorStop(1, "#24762b");
    context.fillStyle = gradient;
    context.strokeStyle = "#14501f";
    context.lineWidth = 4;
    context.beginPath();
    context.roundRect(x, y, width, height, 10);
    context.fill();
    context.stroke();

    const capY = capAtBottom ? y + height - 26 : y;
    context.fillStyle = "#82ef53";
    context.strokeStyle = "#14501f";
    context.beginPath();
    context.roundRect(x - 9, capY, width + 18, 26, 8);
    context.fill();
    context.stroke();
  };

  drawPipeBody(pipe.x, -18, FLAPPY_PIPE_WIDTH, topHeight + 18, true);
  drawPipeBody(pipe.x, bottomY, FLAPPY_PIPE_WIDTH, bottomHeight + 24, false);
}

function drawBird(context: CanvasRenderingContext2D, state: FlappyBirdState, elapsedSeconds: number) {
  const flapFrame = Math.floor(elapsedSeconds * 16) % 3;
  const wingTipY = flapFrame === 0 ? -20 : flapFrame === 1 ? -2 : 17;
  const wingRootY = flapFrame === 0 ? 1 : flapFrame === 1 ? 4 : 7;

  context.save();
  context.translate(FLAPPY_BIRD_X, state.bird.y);
  context.rotate(state.bird.rotation);
  context.shadowColor = "rgba(69,60,34,0.26)";
  context.shadowBlur = 10;
  context.shadowOffsetY = 5;

  context.lineJoin = "round";
  context.lineCap = "round";

  context.fillStyle = "#f7c62e";
  context.strokeStyle = "#4b321c";
  context.lineWidth = 5;
  context.beginPath();
  context.ellipse(-2, 1, FLAPPY_BIRD_RADIUS + 9, FLAPPY_BIRD_RADIUS + 7, 0.06, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.fillStyle = "#fff06b";
  context.beginPath();
  context.ellipse(-9, -5, 12, 9, -0.25, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.fillStyle = "#ffffff";
  context.strokeStyle = "#4b321c";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(-9, wingRootY - 8);
  context.quadraticCurveTo(-31, wingTipY, -34, wingRootY + 3);
  context.quadraticCurveTo(-26, wingRootY + 18, -6, wingRootY + 10);
  context.quadraticCurveTo(1, wingRootY + 1, -9, wingRootY - 8);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = "#f0782b";
  context.beginPath();
  context.ellipse(-20, wingRootY + 5, 9, 5.5, -0.15, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.fillStyle = "#fff9ef";
  context.strokeStyle = "#4b321c";
  context.lineWidth = 4;
  context.beginPath();
  context.arc(12, -9, 8.5, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.fillStyle = "#1b1f2f";
  context.beginPath();
  context.arc(15, -9, 3, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#ff8b24";
  context.strokeStyle = "#4b321c";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(20, -2);
  context.lineTo(41, 4);
  context.lineTo(20, 11);
  context.closePath();
  context.fill();
  context.stroke();

  context.strokeStyle = "#b74615";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(23, 5);
  context.lineTo(37, 5);
  context.stroke();
  context.restore();
}

function drawScore(context: CanvasRenderingContext2D, score: number) {
  context.save();
  context.textAlign = "center";
  context.lineWidth = 8;
  context.strokeStyle = "rgba(43,87,126,0.55)";
  context.fillStyle = "#ffffff";
  context.font = "900 58px sans-serif";
  context.strokeText(String(score), FLAPPY_WIDTH / 2, 78);
  context.fillText(String(score), FLAPPY_WIDTH / 2, 78);
  context.restore();
}

function drawOverlay(context: CanvasRenderingContext2D, phase: FlappyBirdPhase) {
  if (phase === "playing") {
    return;
  }

  context.fillStyle = "rgba(126,218,255,0.38)";
  context.fillRect(0, 0, FLAPPY_WIDTH, FLAPPY_HEIGHT);
  context.save();
  context.translate(FLAPPY_WIDTH / 2, FLAPPY_HEIGHT / 2);
  context.fillStyle = "#fff3a8";
  context.strokeStyle = "#2e5f92";
  context.lineWidth = 5;
  context.beginPath();
  context.roundRect(-134, -62, 268, 124, 22);
  context.fill();
  context.stroke();
  context.textAlign = "center";
  context.fillStyle = "#24446d";
  context.font = "900 29px sans-serif";
  context.fillText(phase === "paused" ? "Paused" : phase === "game-over" ? "Game Over" : "Flappy Bird", 0, -10);
  context.font = "800 14px sans-serif";
  context.fillStyle = "#46739a";
  context.fillText("Space, click, or tap to flap", 0, 24);
  context.restore();
}

function drawScene(context: CanvasRenderingContext2D, state: FlappyBirdState, elapsedSeconds: number) {
  context.clearRect(0, 0, FLAPPY_WIDTH, FLAPPY_HEIGHT);
  drawBackground(context, state.scroll);
  state.pipes.forEach((pipe) => drawPipe(context, pipe));
  drawBird(context, state, elapsedSeconds);
  drawScore(context, state.score);
  drawOverlay(context, state.phase);
}

export function FlappyBirdGame() {
  const initialState = createFlappyBirdState(readStoredNumber(FLAPPY_STORAGE_KEY));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef<FlappyBirdState>(initialState);
  const elapsedSecondsRef = useRef(0);
  const [hudState, setHudState] = useState(() => ({
    score: initialState.score,
    bestScore: initialState.bestScore,
    phase: initialState.phase,
  }));

  function syncState(nextState: FlappyBirdState) {
    stateRef.current = nextState;
    setHudState({
      score: nextState.score,
      bestScore: nextState.bestScore,
      phase: nextState.phase,
    });
    writeStoredNumber(FLAPPY_STORAGE_KEY, nextState.bestScore);
  }

  function renderCurrentState() {
    const context = contextRef.current;
    if (context) {
      drawScene(context, stateRef.current, elapsedSecondsRef.current);
    }
  }

  function restart() {
    syncState(startFlappyBird(createFlappyBirdState(stateRef.current.bestScore)));
    renderCurrentState();
  }

  function flap() {
    syncState(flapFlappyBird(stateRef.current));
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
    if (normalizedKey === " " || normalizedKey === "arrowup" || normalizedKey === "w") {
      event.preventDefault();
      flap();
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    contextRef.current = configureHiDPICanvas(canvas, FLAPPY_WIDTH, FLAPPY_HEIGHT);
    renderCurrentState();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => handleKeyboardInput(event);
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useAnimationFrameLoop((deltaSeconds) => {
    elapsedSecondsRef.current += deltaSeconds;
    const nextState = updateFlappyBird(stateRef.current, deltaSeconds);
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

      <GamePlayfield className="mx-auto aspect-[3/4] w-full max-w-[min(24rem,54dvh)] touch-none border-0 bg-[#83dcff]">
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          aria-label="Flappy Bird field"
          onPointerDown={(event) => {
            event.preventDefault();
            flap();
          }}
        />
      </GamePlayfield>

      <GameStatus>{getStatusCopy(hudState.phase)} R restarts and P pauses.</GameStatus>

      <TouchControls className="max-w-[18rem]">
        <GameButton variant="touch" className="w-full" onPointerDown={flap}>
          Flap
        </GameButton>
      </TouchControls>
    </GamePanel>
  );
}
