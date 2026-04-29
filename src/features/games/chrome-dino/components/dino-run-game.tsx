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

const CANVAS_WIDTH = 760;
const CANVAS_HEIGHT = 300;
const GAME_WIDTH = 600;
const SCALE = 1.16;
const GAME_X = Math.round((CANVAS_WIDTH - GAME_WIDTH * SCALE) / 2);
const GAME_Y = 58;
const GROUND_Y = 127;
const TREX_X = 50;
const TREX_WIDTH = 44;
const TREX_HEIGHT = 47;
const TREX_DUCK_WIDTH = 59;
const STORAGE_KEY = "arcade.dinoRun.bestScore";
const SPRITE_SRC = "/vendor/chrome-dino/200-offline-sprite.png";

const SPRITE = {
  CLOUD: { x: 166, y: 2, w: 92, h: 28, dw: 46, dh: 14 },
  HORIZON: { x: 2, y: 104, w: 1200, h: 24, dw: 600, dh: 12 },
  CACTUS_SMALL: { x: 446, y: 2, w: 34, h: 70, dw: 17, dh: 35 },
  CACTUS_LARGE: { x: 652, y: 2, w: 50, h: 100, dw: 25, dh: 50 },
  PTERODACTYL: { x: 260, y: 2, w: 92, h: 80, dw: 46, dh: 40 },
  RESTART: { x: 2, y: 130, w: 72, h: 64, dw: 36, dh: 32 },
  TEXT: { x: 1294, y: 28, w: 382, h: 26, dw: 191, dh: 13 },
  TREX: { x: 1678, y: 2, w: 88, h: 94, dw: 44, dh: 47 },
};

const TREX_FRAMES = {
  WAITING_1: 88,
  WAITING_2: 0,
  RUNNING_1: 176,
  RUNNING_2: 264,
  CRASHED: 440,
  DUCKING_1: 528,
  DUCKING_2: 646,
};

type Phase = "idle" | "playing" | "paused" | "game-over";
type ObstacleKind = "small-cactus" | "large-cactus" | "pterodactyl";
type Obstacle = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: ObstacleKind;
  count: number;
  passed: boolean;
};
type State = {
  phase: Phase;
  trexY: number;
  velocityY: number;
  ducking: boolean;
  obstacles: Obstacle[];
  score: number;
  bestScore: number;
  speed: number;
  nextId: number;
  spawnTimer: number;
  horizonOffset: number;
};

type RectLike = { x: number; y: number; width: number; height: number };

function createState(bestScore = 0): State {
  return {
    phase: "idle",
    trexY: GROUND_Y - TREX_HEIGHT,
    velocityY: 0,
    ducking: false,
    obstacles: [],
    score: 0,
    bestScore,
    speed: 360,
    nextId: 4,
    spawnTimer: 0.85,
    horizonOffset: 0,
  };
}

function toCanvasX(x: number) {
  return GAME_X + x * SCALE;
}

function toCanvasY(y: number) {
  return GAME_Y + y * SCALE;
}

function drawSprite(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  source: { x: number; y: number; w: number; h: number; dw: number; dh: number },
  x: number,
  y: number,
  width = source.dw,
  height = source.dh,
) {
  context.drawImage(
    image,
    source.x,
    source.y,
    source.w,
    source.h,
    toCanvasX(x),
    toCanvasY(y),
    Math.round(width * SCALE),
    Math.round(height * SCALE),
  );
}

function drawTrexSprite(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  frameOffset: number,
  width = TREX_WIDTH,
  height = TREX_HEIGHT,
) {
  context.drawImage(
    image,
    SPRITE.TREX.x + frameOffset,
    SPRITE.TREX.y,
    width * 2,
    TREX_HEIGHT * 2,
    toCanvasX(x),
    toCanvasY(y),
    Math.round(width * SCALE),
    Math.round(height * SCALE),
  );
}

function isGrounded(state: State) {
  return state.trexY >= GROUND_Y - TREX_HEIGHT - 0.5;
}

function trexRect(state: State): RectLike {
  if (state.ducking && isGrounded(state)) {
    return {
      x: TREX_X + 2,
      y: GROUND_Y - 28,
      width: TREX_DUCK_WIDTH - 5,
      height: 24,
    };
  }

  return {
    x: TREX_X + 3,
    y: state.trexY + 2,
    width: TREX_WIDTH - 8,
    height: TREX_HEIGHT - 4,
  };
}

function obstacleRects(obstacle: Obstacle): RectLike[] {
  if (obstacle.kind === "pterodactyl") {
    return [
      { x: obstacle.x + 15, y: obstacle.y + 15, width: 16, height: 5 },
      { x: obstacle.x + 18, y: obstacle.y + 21, width: 24, height: 6 },
      { x: obstacle.x + 7, y: obstacle.y + 10, width: 9, height: 10 },
    ];
  }

  const boxes: RectLike[] = [];
  const unitWidth = obstacle.kind === "small-cactus" ? 17 : 25;
  const unitHeight = obstacle.kind === "small-cactus" ? 35 : 50;
  for (let index = 0; index < obstacle.count; index += 1) {
    const x = obstacle.x + index * unitWidth;
    const y = GROUND_Y - unitHeight;
    if (obstacle.kind === "small-cactus") {
      boxes.push(
        { x, y: y + 7, width: 5, height: 27 },
        { x: x + 4, y, width: 6, height: 34 },
        { x: x + 10, y: y + 4, width: 7, height: 14 },
      );
    } else {
      boxes.push(
        { x, y: y + 12, width: 7, height: 38 },
        { x: x + 8, y, width: 7, height: 49 },
        { x: x + 13, y: y + 10, width: 10, height: 38 },
      );
    }
  }
  return boxes;
}

function intersects(a: RectLike, b: RectLike) {
  return a.x + a.width > b.x && a.x < b.x + b.width && a.y + a.height > b.y && a.y < b.y + b.height;
}

function createObstacle(id: number, score: number): Obstacle {
  if (score > 700 && id % 5 === 0) {
    const altitude = id % 2 === 0 ? 74 : 99;
    return {
      id,
      x: GAME_WIDTH + 18,
      y: altitude,
      width: 46,
      height: 40,
      kind: "pterodactyl",
      count: 1,
      passed: false,
    };
  }

  const large = score > 250 && id % 3 === 0;
  const maxCount = large ? 2 : 3;
  const count = 1 + (id % maxCount);
  const unitWidth = large ? 25 : 17;
  const unitHeight = large ? 50 : 35;

  return {
    id,
    x: GAME_WIDTH + 18,
    y: GROUND_Y - unitHeight,
    width: unitWidth * count,
    height: unitHeight,
    kind: large ? "large-cactus" : "small-cactus",
    count,
    passed: false,
  };
}

function updateState(state: State, delta: number, holdingDown: boolean): State {
  if (state.phase !== "playing") {
    return state;
  }

  const grounded = isGrounded(state);
  const gravity = holdingDown && !grounded ? 3200 : 1720;
  const velocityY = grounded && state.velocityY >= 0 ? 0 : state.velocityY + gravity * delta;
  const trexY = Math.min(GROUND_Y - TREX_HEIGHT, state.trexY + velocityY * delta);
  const speed = Math.min(720, state.speed + delta * 8.5);
  let spawnTimer = state.spawnTimer - delta;
  let nextId = state.nextId;
  const score = state.score + delta * 65;
  let obstacles = state.obstacles
    .map((obstacle) => ({
      ...obstacle,
      x: obstacle.x - speed * delta,
      passed: obstacle.passed || obstacle.x + obstacle.width < TREX_X,
    }))
    .filter((obstacle) => obstacle.x + obstacle.width > -30);

  if (spawnTimer <= 0) {
    obstacles = [...obstacles, createObstacle(nextId, score)];
    nextId += 1;
    spawnTimer = Math.max(0.58, 1.05 - speed / 1500) + Math.random() * 0.28;
  }

  const nextState = {
    ...state,
    trexY,
    velocityY,
    ducking: holdingDown && grounded,
    obstacles,
    score,
    speed,
    nextId,
    spawnTimer,
    horizonOffset: state.horizonOffset + speed * delta,
  };
  const playerRect = trexRect(nextState);
  const hit = obstacles.some((obstacle) => obstacleRects(obstacle).some((rect) => intersects(playerRect, rect)));

  return {
    ...nextState,
    phase: hit ? "game-over" : "playing",
    bestScore: Math.max(nextState.bestScore, nextState.score),
  };
}

function drawPixelSun(context: CanvasRenderingContext2D) {
  const cx = 552;
  const cy = 28;
  const cell = Math.round(5.5 * SCALE);
  const x0 = Math.round(toCanvasX(cx));
  const y0 = Math.round(toCanvasY(cy));

  context.fillStyle = "rgba(255, 184, 35, 0.2)";
  context.fillRect(x0 - cell * 7, y0 - cell * 7, cell * 14, cell * 14);

  context.fillStyle = "#f59f1b";
  [
    [-1, -7, 2, 3],
    [-1, 4, 2, 3],
    [-7, -1, 3, 2],
    [4, -1, 3, 2],
    [-5, -5, 2, 2],
    [3, -5, 2, 2],
    [-5, 3, 2, 2],
    [3, 3, 2, 2],
  ].forEach(([x, y, width, height]) => {
    context.fillRect(x0 + x * cell, y0 + y * cell, width * cell, height * cell);
  });

  context.fillStyle = "#ffc63b";
  context.fillRect(x0 - cell * 3, y0 - cell * 3, cell * 6, cell * 6);
  context.fillStyle = "#ffda66";
  context.fillRect(x0 - cell * 2, y0 - cell * 2, cell * 4, cell * 4);
}

function seededUnit(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function drawRepeatingClouds(context: CanvasRenderingContext2D, image: HTMLImageElement, distance: number) {
  const spacing = 155;
  const parallaxDistance = distance * 0.055;
  const start = Math.floor(parallaxDistance / spacing) - 1;

  for (let index = start; index < start + 8; index += 1) {
    const jitter = seededUnit(index + 31) * 54;
    const y = 30 + seededUnit(index + 91) * 34;
    const width = seededUnit(index + 17) > 0.7 ? 36 : SPRITE.CLOUD.dw;
    const height = width === SPRITE.CLOUD.dw ? SPRITE.CLOUD.dh : 11;
    const x = index * spacing - parallaxDistance + jitter;
    drawSprite(context, image, SPRITE.CLOUD, x, y, width, height);
  }
}

function drawRepeatingMesas(context: CanvasRenderingContext2D, distance: number) {
  const spacing = 128;
  const parallaxDistance = distance * 0.14;
  const start = Math.floor(parallaxDistance / spacing) - 2;
  context.fillStyle = "rgba(160, 98, 55, 0.24)";
  for (let index = start; index < start + 9; index += 1) {
    const width = 32 + seededUnit(index + 4) * 40;
    const height = 10 + seededUnit(index + 9) * 19;
    const top = seededUnit(index + 13) > 0.45;
    const x = index * spacing - parallaxDistance + seededUnit(index + 23) * 35;
    const canvasX = toCanvasX(x);
    context.fillRect(canvasX, toCanvasY(GROUND_Y - height), width * SCALE, height * SCALE);
    if (top) {
      context.fillRect(canvasX + width * 0.25 * SCALE, toCanvasY(GROUND_Y - height - 11), width * 0.42 * SCALE, 11 * SCALE);
    }
  }
}

function drawBackground(context: CanvasRenderingContext2D, image: HTMLImageElement, state: State) {
  const sky = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  sky.addColorStop(0, "#fff0b0");
  sky.addColorStop(0.58, "#ffe1a0");
  sky.addColorStop(1, "#e8b06d");
  context.fillStyle = sky;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawPixelSun(context);
  drawRepeatingClouds(context, image, state.horizonOffset);
  drawRepeatingMesas(context, state.horizonOffset);

  const horizonWidth = Math.round(GAME_WIDTH * SCALE);
  const horizonOffset = (state.horizonOffset * SCALE) % horizonWidth;
  for (let index = -1; index <= 2; index += 1) {
    context.drawImage(
      image,
      SPRITE.HORIZON.x,
      SPRITE.HORIZON.y,
      SPRITE.HORIZON.w,
      SPRITE.HORIZON.h,
      GAME_X - horizonOffset + index * horizonWidth,
      toCanvasY(GROUND_Y),
      horizonWidth,
      Math.round(SPRITE.HORIZON.dh * SCALE),
    );
  }

  const ground = context.createLinearGradient(0, toCanvasY(GROUND_Y + 10), 0, CANVAS_HEIGHT);
  ground.addColorStop(0, "rgba(232, 174, 102, 0.62)");
  ground.addColorStop(1, "rgba(190, 130, 76, 0.68)");
  context.fillStyle = ground;
  context.fillRect(0, toCanvasY(GROUND_Y + 10), CANVAS_WIDTH, CANVAS_HEIGHT - toCanvasY(GROUND_Y + 10));
}

function drawObstacle(context: CanvasRenderingContext2D, image: HTMLImageElement, obstacle: Obstacle, elapsed: number) {
  if (obstacle.kind === "pterodactyl") {
    const frame = Math.floor(elapsed * 6) % 2;
    context.drawImage(
      image,
      SPRITE.PTERODACTYL.x + frame * SPRITE.PTERODACTYL.w,
      SPRITE.PTERODACTYL.y,
      SPRITE.PTERODACTYL.w,
      SPRITE.PTERODACTYL.h,
      toCanvasX(obstacle.x),
      toCanvasY(obstacle.y),
      Math.round(SPRITE.PTERODACTYL.dw * SCALE),
      Math.round(SPRITE.PTERODACTYL.dh * SCALE),
    );
    return;
  }

  const sprite = obstacle.kind === "small-cactus" ? SPRITE.CACTUS_SMALL : SPRITE.CACTUS_LARGE;
  context.drawImage(
    image,
    sprite.x,
    sprite.y,
    sprite.w * obstacle.count,
    sprite.h,
    toCanvasX(obstacle.x),
    toCanvasY(GROUND_Y - sprite.dh),
    Math.round(sprite.dw * obstacle.count * SCALE),
    Math.round(sprite.dh * SCALE),
  );
}

function drawTrex(context: CanvasRenderingContext2D, image: HTMLImageElement, state: State, elapsed: number) {
  const grounded = isGrounded(state);
  const running = state.phase === "playing" && grounded;
  const waiting = state.phase === "idle";
  const ducking = state.ducking && grounded;

  if (ducking) {
    const frame = Math.floor(elapsed * 10) % 2 === 0 ? TREX_FRAMES.DUCKING_1 : TREX_FRAMES.DUCKING_2;
    drawTrexSprite(context, image, TREX_X, GROUND_Y - TREX_HEIGHT, frame, TREX_DUCK_WIDTH, TREX_HEIGHT);
    return;
  }

  let frame = TREX_FRAMES.WAITING_2;
  if (state.phase === "game-over") {
    frame = TREX_FRAMES.CRASHED;
  } else if (running) {
    frame = Math.floor(elapsed * 12) % 2 === 0 ? TREX_FRAMES.RUNNING_1 : TREX_FRAMES.RUNNING_2;
  } else if (waiting) {
    frame = Math.floor(elapsed * 1.7) % 2 === 0 ? TREX_FRAMES.WAITING_1 : TREX_FRAMES.WAITING_2;
  }

  drawTrexSprite(context, image, TREX_X, state.trexY, frame);
}

function drawScore(context: CanvasRenderingContext2D, state: State) {
  context.fillStyle = "#535353";
  context.font = `${Math.round(16 * SCALE)}px 'Courier New', monospace`;
  context.textAlign = "right";
  context.textBaseline = "top";
  context.fillText(
    `HI ${String(Math.floor(state.bestScore)).padStart(5, "0")}  ${String(Math.floor(state.score)).padStart(5, "0")}`,
    toCanvasX(GAME_WIDTH - 120),
    toCanvasY(13),
  );
}

function drawGameOver(context: CanvasRenderingContext2D, image: HTMLImageElement, state: State) {
  if (state.phase === "playing") {
    return;
  }

  if (state.phase === "idle") {
    context.fillStyle = "#4f4f4f";
    context.font = `900 ${Math.round(17 * SCALE)}px 'Courier New', monospace`;
    context.textAlign = "center";
    context.fillText("PRESS SPACE TO START", toCanvasX(GAME_WIDTH / 2), toCanvasY(70));
    return;
  }

  if (state.phase === "paused") {
    context.fillStyle = "#4f4f4f";
    context.font = `900 ${Math.round(18 * SCALE)}px 'Courier New', monospace`;
    context.textAlign = "center";
    context.fillText("PAUSED", toCanvasX(GAME_WIDTH / 2), toCanvasY(69));
    return;
  }

  context.drawImage(
    image,
    SPRITE.TEXT.x,
    SPRITE.TEXT.y,
    SPRITE.TEXT.w,
    SPRITE.TEXT.h,
    Math.round(toCanvasX(GAME_WIDTH / 2 - SPRITE.TEXT.dw / 2)),
    Math.round(toCanvasY(52)),
    Math.round(SPRITE.TEXT.dw * SCALE),
    Math.round(SPRITE.TEXT.dh * SCALE),
  );
  context.drawImage(
    image,
    SPRITE.RESTART.x,
    SPRITE.RESTART.y,
    SPRITE.RESTART.w,
    SPRITE.RESTART.h,
    Math.round(toCanvasX(GAME_WIDTH / 2 - SPRITE.RESTART.dw / 2)),
    Math.round(toCanvasY(78)),
    Math.round(SPRITE.RESTART.dw * SCALE),
    Math.round(SPRITE.RESTART.dh * SCALE),
  );
}

function drawScene(context: CanvasRenderingContext2D, image: HTMLImageElement | null, state: State, elapsed: number) {
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.imageSmoothingEnabled = false;

  if (!image) {
    context.fillStyle = "#f7f7f7";
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.fillStyle = "#555555";
    context.font = "900 22px 'Courier New', monospace";
    context.textAlign = "center";
    context.fillText("LOADING CHROME DINO", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    return;
  }

  context.save();
  drawBackground(context, image, state);
  state.obstacles.forEach((obstacle) => drawObstacle(context, image, obstacle, elapsed));
  drawTrex(context, image, state, elapsed);
  drawScore(context, state);
  drawGameOver(context, image, state);
  context.restore();
}

export function DinoRunGame() {
  const initialState = createState(readStoredNumber(STORAGE_KEY));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef(initialState);
  const spriteRef = useRef<HTMLImageElement | null>(null);
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
    const nextScoreBucket = Math.floor(nextState.score / 10);
    const previousScoreBucket = Math.floor(previousHud.score / 10);
    const nextBestBucket = Math.floor(nextState.bestScore / 10);
    const previousBestBucket = Math.floor(previousHud.bestScore / 10);
    if (
      forceHud ||
      nextState.phase !== previousHud.phase ||
      nextScoreBucket !== previousScoreBucket ||
      nextBestBucket !== previousBestBucket
    ) {
      const nextHud = {
        score: nextState.score,
        bestScore: nextState.bestScore,
        phase: nextState.phase,
      };
      hudRef.current = nextHud;
      setHud(nextHud);
    }
    if (nextBestBucket !== previousBestBucket || nextState.phase === "game-over") {
      writeStoredNumber(STORAGE_KEY, nextState.bestScore);
    }
  }

  function jump() {
    const current = stateRef.current.phase === "game-over" ? createState(stateRef.current.bestScore) : stateRef.current;
    if (current.phase !== "playing") {
      sync({ ...current, phase: "playing", velocityY: -660 }, true);
    } else if (isGrounded(current)) {
      sync({ ...current, velocityY: -660, ducking: false }, true);
    }
  }

  function restart() {
    sync({ ...createState(stateRef.current.bestScore), phase: "playing", velocityY: -660 }, true);
  }

  const handleGameKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const key = event.key.toLowerCase();
    const code = event.code.toLowerCase();
    const jumpKey = key === " " || code === "space" || key === "arrowup" || key === "w";
    const duckKey = key === "arrowdown" || key === "s";

    if (jumpKey) {
      event.preventDefault();
      event.stopPropagation();
      jump();
    } else if (duckKey) {
      event.preventDefault();
      event.stopPropagation();
      downRef.current = true;
    } else if (key === "p") {
      event.preventDefault();
      event.stopPropagation();
      const current = stateRef.current;
      sync({ ...current, phase: current.phase === "playing" ? "paused" : "playing" }, true);
    } else if (key === "r") {
      event.preventDefault();
      event.stopPropagation();
      restart();
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const context = configureHiDPICanvas(canvas, CANVAS_WIDTH, CANVAS_HEIGHT);
      if (context) {
        context.imageSmoothingEnabled = false;
        contextRef.current = context;
      }
    }

    const image = new Image();
    image.onload = () => {
      spriteRef.current = image;
      if (contextRef.current) {
        drawScene(contextRef.current, spriteRef.current, stateRef.current, 0);
      }
    };
    image.src = SPRITE_SRC;

    if (contextRef.current) {
      drawScene(contextRef.current, null, stateRef.current, 0);
    }

    const handleKeyDown = (event: KeyboardEvent) => handleGameKey(event);
    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const code = event.code.toLowerCase();
      if (key === "arrowdown" || key === "s" || code === "arrowdown") {
        event.preventDefault();
        event.stopPropagation();
        downRef.current = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
    };
  }, []);

  useAnimationFrameLoop((delta, elapsed) => {
    const nextState = updateState(stateRef.current, Math.min(delta, 0.032), downRef.current);
    if (nextState !== stateRef.current) {
      sync(nextState);
    }
    if (contextRef.current) {
      drawScene(contextRef.current, spriteRef.current, stateRef.current, elapsed);
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
          <GameButton variant="primary" onClick={restart}>
            Start
          </GameButton>
        }
      />
      <GamePlayfield className="mx-auto aspect-[38/15] w-full max-w-[min(48rem,86dvh)] touch-none overflow-hidden border-0 bg-[#ffe5a1]">
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
            onPointerLeave={() => {
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
