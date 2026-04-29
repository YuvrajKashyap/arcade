"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
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

const WIDTH = 760;
const HEIGHT = 300;
const GROUND_Y = 230;
const STORAGE_KEY = "arcade.dinoRun.bestScore";

type Phase = "idle" | "playing" | "paused" | "game-over";
type Obstacle = { id: number; x: number; y: number; width: number; height: number; kind: "cactus" | "bird" };
type State = {
  phase: Phase;
  dinoY: number;
  velocityY: number;
  ducking: boolean;
  obstacles: Obstacle[];
  score: number;
  bestScore: number;
  speed: number;
  nextId: number;
  spawnTimer: number;
  groundOffset: number;
};

function createState(bestScore = 0): State {
  return {
    phase: "idle",
    dinoY: GROUND_Y - 54,
    velocityY: 0,
    ducking: false,
    obstacles: [],
    score: 0,
    bestScore,
    speed: 330,
    nextId: 1,
    spawnTimer: 0.75,
    groundOffset: 0,
  };
}

function dinoRect(state: State) {
  return {
    x: 82,
    y: state.ducking && state.dinoY >= GROUND_Y - 56 ? GROUND_Y - 36 : state.dinoY,
    width: state.ducking && state.dinoY >= GROUND_Y - 56 ? 58 : 42,
    height: state.ducking && state.dinoY >= GROUND_Y - 56 ? 30 : 54,
  };
}

function intersects(a: { x: number; y: number; width: number; height: number }, b: Obstacle) {
  return a.x + a.width > b.x + 5 && a.x < b.x + b.width - 5 && a.y + a.height > b.y + 4 && a.y < b.y + b.height - 4;
}

function updateState(state: State, delta: number, holdingDown: boolean): State {
  if (state.phase !== "playing") {
    return state;
  }

  const onGround = state.dinoY >= GROUND_Y - 54;
  const velocityY = onGround ? 0 : state.velocityY + 1900 * delta;
  const dinoY = Math.min(GROUND_Y - 54, state.dinoY + velocityY * delta);
  const speed = state.speed + delta * 7;
  let spawnTimer = state.spawnTimer - delta;
  let nextId = state.nextId;
  let obstacles = state.obstacles
    .map((obstacle) => ({ ...obstacle, x: obstacle.x - speed * delta }))
    .filter((obstacle) => obstacle.x + obstacle.width > -20);

  if (spawnTimer <= 0) {
    const bird = state.score > 450 && nextId % 4 === 0;
    obstacles = [
      ...obstacles,
      {
        id: nextId,
        x: WIDTH + 20,
        y: bird ? GROUND_Y - 98 : GROUND_Y - 50,
        width: bird ? 48 : 26 + (nextId % 3) * 12,
        height: bird ? 28 : 50,
        kind: bird ? "bird" : "cactus",
      },
    ];
    nextId += 1;
    spawnTimer = 0.78 + Math.random() * 0.62;
  }

  const nextState = {
    ...state,
    dinoY,
    velocityY,
    ducking: holdingDown && onGround,
    obstacles,
    score: state.score + Math.floor(delta * 60),
    speed,
    nextId,
    spawnTimer,
    groundOffset: (state.groundOffset + speed * delta) % 38,
  };
  const hit = obstacles.some((obstacle) => intersects(dinoRect(nextState), obstacle));
  return {
    ...nextState,
    phase: hit ? "game-over" : "playing",
    bestScore: Math.max(nextState.bestScore, nextState.score),
  };
}

function drawDino(context: CanvasRenderingContext2D, state: State, elapsed: number) {
  const rect = dinoRect(state);
  const step = Math.sin(elapsed * 22) > 0 ? 1 : -1;
  context.save();
  context.strokeStyle = "#4d4d4d";
  context.fillStyle = "#565656";
  context.lineWidth = 4;
  context.beginPath();
  context.roundRect(rect.x, rect.y + 10, rect.width - 8, rect.height - 12, 5);
  context.roundRect(rect.x + rect.width - 20, rect.y, 26, 24, 4);
  context.fill();
  context.stroke();
  context.fillStyle = "#f8f8f8";
  context.fillRect(rect.x + rect.width - 4, rect.y + 7, 4, 4);
  context.strokeStyle = "#565656";
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(rect.x + 4, rect.y + rect.height - 6);
  context.lineTo(rect.x - 14, rect.y + rect.height - 16);
  context.moveTo(rect.x + 13, rect.y + rect.height - 1);
  context.lineTo(rect.x + 11 + step * 6, rect.y + rect.height + 10);
  context.moveTo(rect.x + 31, rect.y + rect.height - 1);
  context.lineTo(rect.x + 31 - step * 6, rect.y + rect.height + 10);
  context.stroke();
  context.restore();
}

function drawScene(context: CanvasRenderingContext2D, state: State, elapsed: number) {
  context.clearRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = "#fafafa";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.strokeStyle = "#6a6a6a";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(0, GROUND_Y);
  context.lineTo(WIDTH, GROUND_Y);
  context.stroke();
  context.fillStyle = "#8a8a8a";
  for (let x = -state.groundOffset; x < WIDTH; x += 38) {
    context.fillRect(x, GROUND_Y + 16, 18, 2);
  }
  state.obstacles.forEach((obstacle) => {
    context.save();
    context.fillStyle = "#555";
    context.strokeStyle = "#555";
    context.lineWidth = 5;
    if (obstacle.kind === "bird") {
      context.beginPath();
      context.ellipse(obstacle.x + 24, obstacle.y + 14, 21, 10, 0, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(obstacle.x + 13, obstacle.y + 11);
      context.lineTo(obstacle.x - 4, obstacle.y + (Math.sin(elapsed * 16) > 0 ? 2 : 25));
      context.moveTo(obstacle.x + 34, obstacle.y + 11);
      context.lineTo(obstacle.x + 52, obstacle.y + (Math.sin(elapsed * 16) > 0 ? 2 : 25));
      context.stroke();
    } else {
      context.fillRect(obstacle.x + obstacle.width * 0.38, obstacle.y, obstacle.width * 0.24, obstacle.height);
      context.fillRect(obstacle.x, obstacle.y + 20, obstacle.width, 10);
    }
    context.restore();
  });
  drawDino(context, state, elapsed);
  context.fillStyle = "#555";
  context.font = "800 20px monospace";
  context.textAlign = "right";
  context.fillText(`HI ${String(Math.floor(state.bestScore)).padStart(5, "0")}  ${String(Math.floor(state.score)).padStart(5, "0")}`, WIDTH - 22, 36);
  if (state.phase !== "playing") {
    context.fillStyle = "rgba(250,250,250,0.76)";
    context.fillRect(0, 0, WIDTH, HEIGHT);
    context.fillStyle = "#555";
    context.textAlign = "center";
    context.font = "900 30px monospace";
    context.fillText(state.phase === "game-over" ? "GAME OVER" : state.phase === "paused" ? "PAUSED" : "CHROME DINO", WIDTH / 2, 112);
    context.font = "700 16px monospace";
    context.fillText("SPACE JUMPS  DOWN DUCKS", WIDTH / 2, 144);
  }
}

export function DinoRunGame() {
  const initialState = createState(readStoredNumber(STORAGE_KEY));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef(initialState);
  const downRef = useRef(false);
  const [hud, setHud] = useState({ score: initialState.score, bestScore: initialState.bestScore, phase: initialState.phase });

  function sync(nextState: State) {
    stateRef.current = nextState;
    setHud({ score: nextState.score, bestScore: nextState.bestScore, phase: nextState.phase });
    writeStoredNumber(STORAGE_KEY, nextState.bestScore);
  }

  function jump() {
    const current = stateRef.current.phase === "game-over" ? createState(stateRef.current.bestScore) : stateRef.current;
    if (current.phase !== "playing") {
      sync({ ...current, phase: "playing", velocityY: -720 });
    } else if (current.dinoY >= GROUND_Y - 54) {
      sync({ ...current, velocityY: -720, ducking: false });
    }
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (key === " " || key === "arrowup" || key === "w") {
      event.preventDefault();
      jump();
    } else if (key === "arrowdown" || key === "s") {
      event.preventDefault();
      downRef.current = true;
    } else if (key === "p") {
      event.preventDefault();
      const current = stateRef.current;
      sync({ ...current, phase: current.phase === "playing" ? "paused" : "playing" });
    } else if (key === "r") {
      event.preventDefault();
      sync({ ...createState(stateRef.current.bestScore), phase: "playing" });
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      contextRef.current = configureHiDPICanvas(canvas, WIDTH, HEIGHT);
      drawScene(contextRef.current!, stateRef.current, 0);
    }
    const handleKeyDown = (event: KeyboardEvent) => onKeyDown(event);
    const handleKeyUp = (event: KeyboardEvent) => {
      if (["arrowdown", "s"].includes(event.key.toLowerCase())) downRef.current = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useAnimationFrameLoop((delta, elapsed) => {
    const nextState = updateState(stateRef.current, delta, downRef.current);
    if (nextState !== stateRef.current) sync(nextState);
    if (contextRef.current) drawScene(contextRef.current, stateRef.current, elapsed);
  });

  return (
    <GamePanel>
      <GameHud
        items={[{ label: "Score", value: Math.floor(hud.score) }, { label: "Best", value: Math.floor(hud.bestScore) }, { label: "Status", value: hud.phase }]}
        actions={<GameButton variant="primary" onClick={() => sync({ ...createState(stateRef.current.bestScore), phase: "playing" })}>Start</GameButton>}
      />
      <GamePlayfield className="mx-auto aspect-[38/15] w-full max-w-[min(48rem,86dvh)] touch-none border-0 bg-white">
        <canvas ref={canvasRef} className="h-full w-full" aria-label="Chrome Dino field" onPointerDown={jump} />
      </GamePlayfield>
      <GameStatus>Space jumps, Down ducks, P pauses, and R restarts.</GameStatus>
      <TouchControls className="max-w-[24rem]">
        <div className="grid grid-cols-2 gap-2">
          <GameButton variant="touch" onPointerDown={jump}>Jump</GameButton>
          <GameButton variant="touch" onPointerDown={() => (downRef.current = true)} onPointerUp={() => (downRef.current = false)}>Duck</GameButton>
        </div>
      </TouchControls>
    </GamePanel>
  );
}
