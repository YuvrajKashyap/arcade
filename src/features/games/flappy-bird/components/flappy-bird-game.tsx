"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  FLAPPY_BIRD_RADIUS,
  FLAPPY_BIRD_X,
  FLAPPY_GROUND_HEIGHT,
  FLAPPY_HARD_PIPE_GAP,
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
import type {
  FlappyBirdDifficulty,
  FlappyBirdPhase,
  FlappyBirdState,
  FlappyPipe,
} from "@/features/games/flappy-bird/types";
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

const FLAPPY_DIFFICULTY_OPTIONS = [
  { id: "easy", label: "Easy", pipeGap: FLAPPY_PIPE_GAP },
  { id: "hard", label: "Hard", pipeGap: FLAPPY_HARD_PIPE_GAP },
] as const satisfies ReadonlyArray<{
  id: FlappyBirdDifficulty;
  label: string;
  pipeGap: number;
}>;

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

function drawPipe(
  context: CanvasRenderingContext2D,
  pipe: FlappyPipe,
  pipeGap: number,
) {
  const topHeight = pipe.gapY;
  const bottomY = pipe.gapY + pipeGap;
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
  const wingAngle = flapFrame === 0 ? -0.72 : flapFrame === 1 ? -0.08 : 0.62;
  const wingOffsetY = flapFrame === 0 ? -8 : flapFrame === 1 ? 0 : 8;

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

  context.fillStyle = "#ffe35a";
  context.beginPath();
  context.ellipse(-9, -5, 12, 9, -0.25, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.translate(-15, 4);
  context.rotate(wingAngle);
  context.fillStyle = "#f08b2b";
  context.strokeStyle = "#4b321c";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(2, -10 + wingOffsetY * 0.25);
  context.quadraticCurveTo(-20, -12 + wingOffsetY, -28, 0 + wingOffsetY);
  context.quadraticCurveTo(-18, 16 + wingOffsetY * 0.35, 6, 10);
  context.quadraticCurveTo(12, 0, 2, -10 + wingOffsetY * 0.25);
  context.closePath();
  context.fill();
  context.stroke();
  context.strokeStyle = "#ffe29a";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(-5, -4 + wingOffsetY * 0.45);
  context.quadraticCurveTo(-14, 1 + wingOffsetY * 0.55, -21, 5 + wingOffsetY * 0.65);
  context.stroke();
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

function drawScene(
  context: CanvasRenderingContext2D,
  state: FlappyBirdState,
  elapsedSeconds: number,
  pipeGap: number,
) {
  context.clearRect(0, 0, FLAPPY_WIDTH, FLAPPY_HEIGHT);
  drawBackground(context, state.scroll);
  state.pipes.forEach((pipe) => drawPipe(context, pipe, pipeGap));
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
  const [difficulty, setDifficulty] = useState<FlappyBirdDifficulty>("easy");
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
      drawScene(
        context,
        stateRef.current,
        elapsedSecondsRef.current,
        getPipeGap(difficulty),
      );
    }
  }

  function getPipeGap(nextDifficulty: FlappyBirdDifficulty) {
    return (
      FLAPPY_DIFFICULTY_OPTIONS.find((option) => option.id === nextDifficulty)
        ?.pipeGap ?? FLAPPY_PIPE_GAP
    );
  }

  function restart() {
    const pipeGap = getPipeGap(difficulty);
    syncState(
      startFlappyBird(
        createFlappyBirdState(stateRef.current.bestScore, pipeGap),
        pipeGap,
      ),
    );
    renderCurrentState();
  }

  function selectDifficulty(nextDifficulty: FlappyBirdDifficulty) {
    setDifficulty(nextDifficulty);
    syncState(
      createFlappyBirdState(
        stateRef.current.bestScore,
        getPipeGap(nextDifficulty),
      ),
    );
  }

  function flap() {
    syncState(flapFlappyBird(stateRef.current, getPipeGap(difficulty)));
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
    const context = contextRef.current;
    if (context) {
      drawScene(
        context,
        stateRef.current,
        elapsedSecondsRef.current,
        FLAPPY_PIPE_GAP,
      );
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => handleKeyboardInput(event);
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useAnimationFrameLoop((deltaSeconds) => {
    elapsedSecondsRef.current += deltaSeconds;
    const nextState = updateFlappyBird(
      stateRef.current,
      deltaSeconds,
      getPipeGap(difficulty),
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
            <GameButton variant="primary" onClick={restart}>
              {hudState.phase === "game-over" ? "Restart" : "Start"}
            </GameButton>
            <GameButton onClick={togglePause}>{hudState.phase === "paused" ? "Resume" : "Pause"}</GameButton>
          </>
        }
      />

      <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-3 md:flex-row md:items-start">
        <GamePlayfield className="mx-0 aspect-[3/4] w-full max-w-[min(24rem,54dvh)] touch-none border-0 bg-[#83dcff]">
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

        <div className="flex shrink-0 gap-2 rounded-[1.1rem] border border-line bg-surface px-3 py-2 shadow-[0_18px_60px_rgba(0,0,0,0.2)] md:w-28 md:flex-col">
          {FLAPPY_DIFFICULTY_OPTIONS.map((option) => (
            <GameButton
              key={option.id}
              variant={difficulty === option.id ? "primary" : "secondary"}
              className="px-3 py-1.5 text-xs"
              onClick={() => selectDifficulty(option.id)}
            >
              {option.label}
            </GameButton>
          ))}
        </div>
      </div>

      <GameStatus>{getStatusCopy(hudState.phase)} R restarts and P pauses.</GameStatus>

      <TouchControls className="max-w-[18rem]">
        <GameButton variant="touch" className="w-full" onPointerDown={flap}>
          Flap
        </GameButton>
      </TouchControls>
    </GamePanel>
  );
}
