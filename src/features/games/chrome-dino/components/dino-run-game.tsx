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
const GROUND_Y = 232;
const DINO_X = 82;
const DINO_STAND_WIDTH = 60;
const DINO_STAND_HEIGHT = 68;
const DINO_DUCK_WIDTH = 82;
const DINO_DUCK_HEIGHT = 42;
const STORAGE_KEY = "arcade.dinoRun.bestScore";

type Phase = "idle" | "playing" | "paused" | "game-over";
type Obstacle = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: "cactus" | "bird";
  variant: number;
};
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
  flashTimer: number;
};

type RectLike = { x: number; y: number; width: number; height: number };

function createState(bestScore = 0): State {
  return {
    phase: "idle",
    dinoY: GROUND_Y - DINO_STAND_HEIGHT,
    velocityY: 0,
    ducking: false,
    obstacles: [],
    score: 0,
    bestScore,
    speed: 360,
    nextId: 1,
    spawnTimer: 0.7,
    groundOffset: 0,
    flashTimer: 0,
  };
}

function isGrounded(state: State) {
  return state.dinoY >= GROUND_Y - DINO_STAND_HEIGHT - 0.5;
}

function dinoRect(state: State): RectLike {
  if (state.ducking && isGrounded(state)) {
    return {
      x: DINO_X,
      y: GROUND_Y - DINO_DUCK_HEIGHT,
      width: DINO_DUCK_WIDTH,
      height: DINO_DUCK_HEIGHT,
    };
  }

  return {
    x: DINO_X + 3,
    y: state.dinoY,
    width: DINO_STAND_WIDTH - 8,
    height: DINO_STAND_HEIGHT,
  };
}

function intersects(a: RectLike, b: Obstacle) {
  const obstaclePad = b.kind === "bird" ? 9 : 7;
  return (
    a.x + a.width - 7 > b.x + obstaclePad &&
    a.x + 8 < b.x + b.width - obstaclePad &&
    a.y + a.height - 5 > b.y + obstaclePad &&
    a.y + 5 < b.y + b.height - obstaclePad
  );
}

function createObstacle(id: number, score: number): Obstacle {
  const bird = score > 650 && id % 5 === 0;
  if (bird) {
    const altitude = id % 2 === 0 ? GROUND_Y - 112 : GROUND_Y - 78;
    return {
      id,
      x: WIDTH + 26,
      y: altitude,
      width: 60,
      height: 34,
      kind: "bird",
      variant: id % 2,
    };
  }

  const cluster = 1 + (id % 3);
  const tall = id % 4 === 0;
  return {
    id,
    x: WIDTH + 24,
    y: GROUND_Y - (tall ? 66 : 52),
    width: cluster * 25 + (cluster - 1) * 7,
    height: tall ? 66 : 52,
    kind: "cactus",
    variant: cluster,
  };
}

function updateState(state: State, delta: number, holdingDown: boolean): State {
  if (state.phase !== "playing") {
    return state;
  }

  const grounded = isGrounded(state);
  const gravity = holdingDown && !grounded ? 3600 : 2300;
  const velocityY = grounded ? 0 : state.velocityY + gravity * delta;
  const dinoY = Math.min(GROUND_Y - DINO_STAND_HEIGHT, state.dinoY + velocityY * delta);
  const speed = Math.min(700, state.speed + delta * 8.2);
  let spawnTimer = state.spawnTimer - delta;
  let nextId = state.nextId;
  let obstacles = state.obstacles
    .map((obstacle) => ({ ...obstacle, x: obstacle.x - speed * delta }))
    .filter((obstacle) => obstacle.x + obstacle.width > -35);

  if (spawnTimer <= 0) {
    obstacles = [...obstacles, createObstacle(nextId, state.score)];
    nextId += 1;
    spawnTimer = Math.max(0.56, 1.02 - speed / 1300) + Math.random() * 0.38;
  }

  const nextState = {
    ...state,
    dinoY,
    velocityY,
    ducking: holdingDown && grounded,
    obstacles,
    score: state.score + delta * 62,
    speed,
    nextId,
    spawnTimer,
    groundOffset: (state.groundOffset + speed * delta) % 44,
    flashTimer: Math.max(0, state.flashTimer - delta),
  };
  const hit = obstacles.some((obstacle) => intersects(dinoRect(nextState), obstacle));

  return {
    ...nextState,
    phase: hit ? "game-over" : "playing",
    bestScore: Math.max(nextState.bestScore, nextState.score),
    flashTimer: hit ? 0.16 : nextState.flashTimer,
  };
}

function block(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  outline = "#111111",
) {
  context.fillStyle = outline;
  context.fillRect(Math.round(x - 2), Math.round(y - 2), Math.round(width + 4), Math.round(height + 4));
  context.fillStyle = fill;
  context.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

function drawPixelSun(context: CanvasRenderingContext2D, elapsed: number) {
  const cx = 640;
  const cy = 64;
  const pulse = Math.sin(elapsed * 1.6) * 2;
  context.fillStyle = "rgba(255, 172, 31, 0.22)";
  context.fillRect(cx - 52, cy - 52, 104, 104);
  block(context, cx - 28, cy - 28, 56 + pulse, 56 + pulse, "#ffbf31", "rgba(219, 127, 14, 0.42)");
  block(context, cx - 8, cy - 62, 16, 26, "#f7a421", "rgba(219, 127, 14, 0.3)");
  block(context, cx - 8, cy + 39, 16, 26, "#f7a421", "rgba(219, 127, 14, 0.3)");
  block(context, cx - 67, cy - 8, 26, 16, "#f7a421", "rgba(219, 127, 14, 0.3)");
  block(context, cx + 42, cy - 8, 26, 16, "#f7a421", "rgba(219, 127, 14, 0.3)");
  block(context, cx - 42, cy - 42, 16, 16, "#f7a421", "rgba(219, 127, 14, 0.3)");
  block(context, cx + 28, cy + 28, 16, 16, "#f7a421", "rgba(219, 127, 14, 0.3)");
}

function drawCloud(context: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  const color = "rgba(255,255,255,0.82)";
  context.fillStyle = color;
  context.fillRect(x, y + 16 * scale, 92 * scale, 13 * scale);
  context.fillRect(x + 22 * scale, y + 6 * scale, 26 * scale, 10 * scale);
  context.fillRect(x + 43 * scale, y, 24 * scale, 16 * scale);
  context.fillRect(x + 63 * scale, y + 9 * scale, 20 * scale, 12 * scale);
}

function drawBackground(context: CanvasRenderingContext2D, state: State, elapsed: number) {
  const sky = context.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, "#fff0ad");
  sky.addColorStop(0.52, "#ffe6a1");
  sky.addColorStop(1, "#f2be77");
  context.fillStyle = sky;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  drawPixelSun(context, elapsed);
  drawCloud(context, 64 - (state.groundOffset * 0.18) % 170, 58, 0.9);
  drawCloud(context, 390 - (state.groundOffset * 0.13) % 210, 91, 0.72);
  drawCloud(context, 666 - (state.groundOffset * 0.1) % 170, 142, 0.62);

  context.fillStyle = "rgba(177, 112, 62, 0.38)";
  const mesaOffset = (state.groundOffset * 0.22) % 240;
  for (let x = -mesaOffset - 70; x < WIDTH + 120; x += 240) {
    context.fillRect(x, GROUND_Y - 34, 54, 34);
    context.fillRect(x + 12, GROUND_Y - 50, 28, 16);
    context.fillRect(x + 132, GROUND_Y - 19, 62, 19);
    context.fillRect(x + 145, GROUND_Y - 31, 26, 12);
  }

  const ground = context.createLinearGradient(0, GROUND_Y, 0, HEIGHT);
  ground.addColorStop(0, "#f0bc75");
  ground.addColorStop(1, "#d99f60");
  context.fillStyle = ground;
  context.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);

  context.fillStyle = "#111111";
  context.fillRect(0, GROUND_Y - 2, WIDTH, 5);

  const rockOffset = state.groundOffset % 44;
  for (let x = -rockOffset; x < WIDTH + 44; x += 44) {
    const y = GROUND_Y + 16 + ((x / 44) % 3) * 10;
    context.fillStyle = "rgba(95, 67, 48, 0.42)";
    context.fillRect(Math.round(x + 7), Math.round(y), 15, 5);
    context.fillStyle = "rgba(36, 33, 30, 0.82)";
    context.fillRect(Math.round(x + 30), Math.round(GROUND_Y - 9), 6, 7);
  }
}

function drawCactusStem(context: CanvasRenderingContext2D, x: number, y: number, height: number, scale: number) {
  const green = "#80bc1c";
  const dark = "#20340e";
  block(context, x + 9 * scale, y, 15 * scale, height, green, dark);
  block(context, x + 13 * scale, y + 5 * scale, 4 * scale, Math.max(10, height - 11 * scale), "#a4d339", "transparent");
  block(context, x - 1 * scale, y + height * 0.38, 11 * scale, 13 * scale, green, dark);
  block(context, x - 1 * scale, y + height * 0.25, 8 * scale, height * 0.22, green, dark);
  block(context, x + 23 * scale, y + height * 0.5, 12 * scale, 13 * scale, green, dark);
  block(context, x + 28 * scale, y + height * 0.34, 8 * scale, height * 0.27, green, dark);
}

function drawCactus(context: CanvasRenderingContext2D, obstacle: Obstacle) {
  const count = obstacle.variant;
  for (let index = 0; index < count; index += 1) {
    const scale = index === 1 ? 0.92 : 0.82 + (obstacle.id % 2) * 0.16;
    const height = obstacle.height * (index === 1 ? 1 : 0.78);
    drawCactusStem(
      context,
      obstacle.x + index * 31,
      GROUND_Y - height,
      height,
      scale,
    );
  }
}

function drawBird(context: CanvasRenderingContext2D, obstacle: Obstacle, elapsed: number) {
  const flapUp = Math.sin(elapsed * 17 + obstacle.id) > 0;
  const x = obstacle.x;
  const y = obstacle.y;
  const dark = "#181818";
  block(context, x + 16, y + 12, 28, 12, "#3b3b3b", dark);
  block(context, x + 38, y + 9, 13, 10, "#3b3b3b", dark);
  block(context, x + 49, y + 13, 9, 5, "#3b3b3b", dark);
  if (flapUp) {
    block(context, x + 14, y - 2, 12, 18, "#333333", dark);
    block(context, x + 27, y + 1, 11, 13, "#333333", dark);
  } else {
    block(context, x + 14, y + 22, 13, 16, "#333333", dark);
    block(context, x + 27, y + 20, 11, 12, "#333333", dark);
  }
  context.fillStyle = "#f8f2df";
  context.fillRect(x + 43, y + 12, 4, 4);
}

function drawDino(context: CanvasRenderingContext2D, state: State, elapsed: number) {
  const ducking = state.ducking && isGrounded(state);
  const running = state.phase === "playing" && isGrounded(state);
  const frame = running ? Math.floor(elapsed * 13) % 2 : 0;
  const x = DINO_X;
  const y = ducking ? GROUND_Y - DINO_DUCK_HEIGHT : state.dinoY;
  const fill = "#4c5057";
  const light = "#666b73";
  const dark = "#111111";

  context.save();
  if (ducking) {
    block(context, x + 2, y + 14, 47, 24, fill, dark);
    block(context, x + 42, y + 3, 32, 24, fill, dark);
    block(context, x + 69, y + 11, 12, 8, fill, dark);
    block(context, x - 15, y + 20, 20, 10, fill, dark);
    block(context, x + 20, y + 29, 12, 14, fill, dark);
    block(context, x + 53, y + 27, 12, 14, fill, dark);
    block(context, x + 48, y + 8, 8, 8, "#fffdf0", dark);
    context.fillStyle = dark;
    context.fillRect(x + 52, y + 11, 4, 4);
    context.fillRect(x + 65, y + 25, 18, 4);
  } else {
    block(context, x + 9, y + 25, 33, 32, fill, dark);
    block(context, x + 30, y + 7, 30, 27, fill, dark);
    block(context, x + 54, y + 16, 18, 13, fill, dark);
    block(context, x - 7, y + 35, 18, 12, fill, dark);
    block(context, x + 14, y + 20, 10, 31, light, "transparent");
    block(context, x + 39, y + 36, 11, 13, fill, dark);
    block(context, x + 36, y + 13, 9, 9, "#fffdf0", dark);
    context.fillStyle = dark;
    context.fillRect(x + 40, y + 16, 4, 4);
    context.fillRect(x + 51, y + 31, 18, 4);
    if (running && frame === 0) {
      block(context, x + 13, y + 54, 11, 17, fill, dark);
      block(context, x + 38, y + 53, 13, 11, fill, dark);
    } else if (running) {
      block(context, x + 13, y + 53, 13, 11, fill, dark);
      block(context, x + 38, y + 54, 11, 17, fill, dark);
    } else {
      block(context, x + 13, y + 54, 11, 14, fill, dark);
      block(context, x + 38, y + 54, 11, 14, fill, dark);
    }
  }

  if (running) {
    context.fillStyle = "rgba(255,255,255,0.48)";
    const dustX = x - 26 - (elapsed * 150) % 22;
    context.fillRect(dustX, GROUND_Y - 16, 22, 4);
    context.fillRect(dustX - 22, GROUND_Y - 32, 18, 4);
    context.fillStyle = "#111111";
    context.fillRect(x - 24 - (elapsed * 110) % 28, GROUND_Y + 5, 7, 7);
  }
  context.restore();
}

function drawScore(context: CanvasRenderingContext2D, state: State) {
  context.fillStyle = "#242424";
  context.font = "900 21px 'Courier New', monospace";
  context.textAlign = "right";
  context.fillText(
    `HI ${String(Math.floor(state.bestScore)).padStart(5, "0")}  ${String(Math.floor(state.score)).padStart(5, "0")}`,
    WIDTH - 24,
    34,
  );
}

function drawOverlay(context: CanvasRenderingContext2D, state: State) {
  if (state.phase === "playing") {
    return;
  }

  context.fillStyle = "rgba(255, 238, 178, 0.7)";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = "#181818";
  context.textAlign = "center";
  context.font = "900 32px 'Courier New', monospace";
  context.fillText(state.phase === "game-over" ? "GAME OVER" : state.phase === "paused" ? "PAUSED" : "CHROME DINO", WIDTH / 2, 105);
  context.font = "800 16px 'Courier New', monospace";
  context.fillText("SPACE / W / UP TO JUMP", WIDTH / 2, 138);
  context.fillText("S / DOWN TO DUCK", WIDTH / 2, 160);

  if (state.phase === "game-over") {
    context.strokeStyle = "#181818";
    context.lineWidth = 4;
    context.strokeRect(WIDTH / 2 - 18, 182, 36, 30);
    context.beginPath();
    context.moveTo(WIDTH / 2 - 8, 190);
    context.lineTo(WIDTH / 2 + 8, 197);
    context.lineTo(WIDTH / 2 - 8, 204);
    context.stroke();
  }
}

function drawScene(context: CanvasRenderingContext2D, state: State, elapsed: number) {
  context.clearRect(0, 0, WIDTH, HEIGHT);
  context.imageSmoothingEnabled = false;
  drawBackground(context, state, elapsed);
  state.obstacles.forEach((obstacle) => {
    if (obstacle.kind === "bird") {
      drawBird(context, obstacle, elapsed);
    } else {
      drawCactus(context, obstacle);
    }
  });
  drawDino(context, state, elapsed);
  drawScore(context, state);
  if (state.flashTimer > 0) {
    context.fillStyle = `rgba(255, 255, 255, ${state.flashTimer * 2.4})`;
    context.fillRect(0, 0, WIDTH, HEIGHT);
  }
  drawOverlay(context, state);
}

export function DinoRunGame() {
  const initialState = createState(readStoredNumber(STORAGE_KEY));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef(initialState);
  const downRef = useRef(false);
  const [hud, setHud] = useState({
    score: initialState.score,
    bestScore: initialState.bestScore,
    phase: initialState.phase,
  });
  const hudRef = useRef(hud);

  function sync(nextState: State, forceHud = false) {
    const previousHud = hudRef.current;
    stateRef.current = nextState;
    if (
      forceHud ||
      nextState.phase !== previousHud.phase ||
      Math.floor(nextState.score) !== Math.floor(previousHud.score) ||
      Math.floor(nextState.bestScore) !== Math.floor(previousHud.bestScore)
    ) {
      const nextHud = {
        score: nextState.score,
        bestScore: nextState.bestScore,
        phase: nextState.phase,
      };
      hudRef.current = nextHud;
      setHud(nextHud);
    }
    if (Math.floor(nextState.bestScore) !== Math.floor(previousHud.bestScore)) {
      writeStoredNumber(STORAGE_KEY, nextState.bestScore);
    }
  }

  function jump() {
    const current = stateRef.current.phase === "game-over" ? createState(stateRef.current.bestScore) : stateRef.current;
    if (current.phase !== "playing") {
      sync({ ...current, phase: "playing", velocityY: -790, flashTimer: 0 }, true);
    } else if (isGrounded(current)) {
      sync({ ...current, velocityY: -790, ducking: false }, true);
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
      sync({ ...current, phase: current.phase === "playing" ? "paused" : "playing" }, true);
    } else if (key === "r") {
      event.preventDefault();
      sync({ ...createState(stateRef.current.bestScore), phase: "playing", velocityY: -790 }, true);
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const context = configureHiDPICanvas(canvas, WIDTH, HEIGHT);
      if (context) {
        context.imageSmoothingEnabled = false;
        contextRef.current = context;
        drawScene(context, stateRef.current, 0);
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => onKeyDown(event);
    const handleKeyUp = (event: KeyboardEvent) => {
      if (["arrowdown", "s"].includes(event.key.toLowerCase())) {
        downRef.current = false;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useAnimationFrameLoop((delta, elapsed) => {
    const nextState = updateState(stateRef.current, Math.min(delta, 0.032), downRef.current);
    if (nextState !== stateRef.current) {
      sync(nextState);
    }
    if (contextRef.current) {
      drawScene(contextRef.current, stateRef.current, elapsed);
    }
  });

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "Score", value: Math.floor(hud.score) },
          { label: "Best", value: Math.floor(hud.bestScore) },
          { label: "Status", value: hud.phase },
        ]}
        actions={
          <GameButton
            variant="primary"
            onClick={() => sync({ ...createState(stateRef.current.bestScore), phase: "playing", velocityY: -790 }, true)}
          >
            Start
          </GameButton>
        }
      />
      <GamePlayfield className="mx-auto aspect-[38/15] w-full max-w-[min(48rem,86dvh)] touch-none overflow-hidden border-0 bg-[#ffe8a1]">
        <canvas ref={canvasRef} className="h-full w-full" aria-label="Chrome Dino field" onPointerDown={jump} />
      </GamePlayfield>
      <GameStatus>Space jumps, Down ducks, P pauses, and R restarts.</GameStatus>
      <TouchControls className="max-w-[24rem]">
        <div className="grid grid-cols-2 gap-2">
          <GameButton variant="touch" onPointerDown={jump}>
            Jump
          </GameButton>
          <GameButton
            variant="touch"
            onPointerDown={() => {
              downRef.current = true;
            }}
            onPointerUp={() => {
              downRef.current = false;
            }}
          >
            Duck
          </GameButton>
        </div>
      </TouchControls>
    </GamePanel>
  );
}
