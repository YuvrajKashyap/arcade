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
import type {
  AsteroidsBullet,
  AsteroidsPhase,
  AsteroidsRock,
  AsteroidsState,
} from "@/features/games/asteroids/types";
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

type AsteroidsRenderInput = {
  thrust: boolean;
  turn: number;
};

type AsteroidsVisualBurst = {
  id: number;
  x: number;
  y: number;
  age: number;
  life: number;
  color: string;
  kind: "rock" | "ship";
};

const SPACE_STARS = Array.from({ length: 92 }, (_, index) => {
  const seed = Math.sin((index + 1) * 77.77) * 10000;
  const seedB = Math.sin((index + 1) * 31.31) * 10000;
  const seedC = Math.sin((index + 1) * 13.13) * 10000;

  return {
    x: (seed - Math.floor(seed)) * ASTEROIDS_WIDTH,
    y: (seedB - Math.floor(seedB)) * ASTEROIDS_HEIGHT,
    radius: 0.8 + (seedC - Math.floor(seedC)) * 2.2,
    twinkle: 0.45 + ((index * 17) % 23) / 40,
  };
});

function seededNoise(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function createRockPoints(rock: AsteroidsRock) {
  const points: Array<{ x: number; y: number }> = [];
  const count = 11 + (rock.id % 4);

  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count;
    const wobble = 0.78 + seededNoise(rock.id * 97 + index * 19) * 0.38;
    points.push({
      x: Math.cos(angle) * rock.radius * wobble,
      y: Math.sin(angle) * rock.radius * wobble,
    });
  }

  return points;
}

function drawBackground(context: CanvasRenderingContext2D, elapsedSeconds: number) {
  const background = context.createLinearGradient(0, 0, ASTEROIDS_WIDTH, ASTEROIDS_HEIGHT);
  background.addColorStop(0, "#17104f");
  background.addColorStop(0.42, "#122d78");
  background.addColorStop(1, "#06122f");
  context.fillStyle = background;
  context.fillRect(0, 0, ASTEROIDS_WIDTH, ASTEROIDS_HEIGHT);

  const nebulaA = context.createRadialGradient(126, 100, 12, 126, 100, 210);
  nebulaA.addColorStop(0, "rgba(255,132,214,0.34)");
  nebulaA.addColorStop(0.42, "rgba(155,95,255,0.18)");
  nebulaA.addColorStop(1, "rgba(155,95,255,0)");
  context.fillStyle = nebulaA;
  context.fillRect(0, 0, ASTEROIDS_WIDTH, ASTEROIDS_HEIGHT);

  const nebulaB = context.createRadialGradient(620, 388, 10, 620, 388, 230);
  nebulaB.addColorStop(0, "rgba(69,214,255,0.3)");
  nebulaB.addColorStop(0.48, "rgba(36,123,255,0.16)");
  nebulaB.addColorStop(1, "rgba(36,123,255,0)");
  context.fillStyle = nebulaB;
  context.fillRect(0, 0, ASTEROIDS_WIDTH, ASTEROIDS_HEIGHT);

  context.save();
  context.globalAlpha = 0.92;
  context.fillStyle = "#ffd76a";
  context.beginPath();
  context.arc(652, 96, 42, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(255,246,194,0.5)";
  context.beginPath();
  context.arc(636, 82, 12, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(122,77,255,0.34)";
  context.beginPath();
  context.ellipse(652, 96, 62, 13, -0.22, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#79e0ff";
  context.beginPath();
  context.arc(96, 414, 24, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(255,255,255,0.34)";
  context.beginPath();
  context.arc(87, 405, 8, 0, Math.PI * 2);
  context.fill();
  context.restore();

  for (const star of SPACE_STARS) {
    const pulse = 0.55 + Math.sin(elapsedSeconds * 2.4 + star.twinkle * 7) * 0.24;
    context.fillStyle = `rgba(255,255,255,${pulse})`;
    context.beginPath();
    context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    context.fill();
  }

  context.strokeStyle = "rgba(255,255,255,0.07)";
  context.lineWidth = 2;
  for (let y = 44; y < ASTEROIDS_HEIGHT; y += 118) {
    context.beginPath();
    context.moveTo(0, y + Math.sin(elapsedSeconds + y) * 2);
    context.bezierCurveTo(180, y - 36, 400, y + 42, ASTEROIDS_WIDTH, y - 10);
    context.stroke();
  }
}

function drawRock(context: CanvasRenderingContext2D, rock: AsteroidsRock) {
  const points = createRockPoints(rock);
  const fill =
    rock.tier === 3 ? "#b97943" : rock.tier === 2 ? "#8fa0aa" : "#c79263";
  const shade =
    rock.tier === 3 ? "#6c3f25" : rock.tier === 2 ? "#536a78" : "#7d4c32";
  const highlight =
    rock.tier === 3 ? "#ffd29b" : rock.tier === 2 ? "#d8f1ff" : "#ffd0a8";

  context.save();
  context.translate(rock.x, rock.y);
  context.rotate((rock.id * 0.37 + rock.x * 0.003) % (Math.PI * 2));
  context.lineJoin = "round";
  context.lineCap = "round";
  context.shadowColor = "rgba(0,0,0,0.35)";
  context.shadowBlur = 12;
  context.shadowOffsetY = 6;
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  });
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  context.shadowBlur = 0;
  context.strokeStyle = shade;
  context.lineWidth = Math.max(4, rock.radius * 0.12);
  context.stroke();

  context.strokeStyle = "rgba(255,255,255,0.28)";
  context.lineWidth = Math.max(2, rock.radius * 0.05);
  context.beginPath();
  context.moveTo(-rock.radius * 0.42, -rock.radius * 0.42);
  context.quadraticCurveTo(-rock.radius * 0.08, -rock.radius * 0.68, rock.radius * 0.32, -rock.radius * 0.34);
  context.stroke();

  for (let index = 0; index < 3; index += 1) {
    const angle = rock.id + index * 2.18;
    const craterRadius = rock.radius * (0.1 + index * 0.025);
    const x = Math.cos(angle) * rock.radius * (0.16 + index * 0.12);
    const y = Math.sin(angle * 1.4) * rock.radius * (0.13 + index * 0.1);
    context.fillStyle = "rgba(49,31,27,0.32)";
    context.beginPath();
    context.arc(x, y, craterRadius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = highlight;
    context.beginPath();
    context.arc(x - craterRadius * 0.28, y - craterRadius * 0.32, craterRadius * 0.24, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawBullet(context: CanvasRenderingContext2D, bullet: AsteroidsBullet) {
  const angle = Math.atan2(bullet.vy, bullet.vx);
  const length = 20 + bullet.life * 14;

  context.save();
  context.translate(bullet.x, bullet.y);
  context.rotate(angle);
  context.shadowColor = "#61f4ff";
  context.shadowBlur = 14;
  const gradient = context.createLinearGradient(-length, 0, 8, 0);
  gradient.addColorStop(0, "rgba(97,244,255,0)");
  gradient.addColorStop(0.55, "#61f4ff");
  gradient.addColorStop(1, "#fff8b5");
  context.strokeStyle = gradient;
  context.lineWidth = 5;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(-length, 0);
  context.lineTo(8, 0);
  context.stroke();
  context.restore();
}

function drawShip(
  context: CanvasRenderingContext2D,
  state: AsteroidsState,
  input: AsteroidsRenderInput,
  elapsedSeconds: number,
) {
  const { ship } = state;
  const invulnerablePulse =
    ship.invulnerableTimer > 0 ? 0.55 + Math.sin(elapsedSeconds * 18) * 0.28 : 0;
  const engineGlow = input.thrust ? 1 : Math.min(0.38, Math.hypot(ship.vx, ship.vy) / 360);

  context.save();
  context.translate(ship.x, ship.y);
  context.rotate(ship.angle);

  if (input.thrust) {
    context.save();
    context.shadowColor = "#ffb703";
    context.shadowBlur = 22;
    context.fillStyle = "#ff6b35";
    context.beginPath();
    context.moveTo(-ASTEROIDS_SHIP_RADIUS * 1.25, 0);
    context.quadraticCurveTo(-ASTEROIDS_SHIP_RADIUS * 2.15, -9, -ASTEROIDS_SHIP_RADIUS * 2.72, 0);
    context.quadraticCurveTo(-ASTEROIDS_SHIP_RADIUS * 2.15, 9, -ASTEROIDS_SHIP_RADIUS * 1.25, 0);
    context.fill();
    context.fillStyle = "#ffe66d";
    context.beginPath();
    context.moveTo(-ASTEROIDS_SHIP_RADIUS * 1.36, 0);
    context.quadraticCurveTo(-ASTEROIDS_SHIP_RADIUS * 1.9, -4, -ASTEROIDS_SHIP_RADIUS * 2.28, 0);
    context.quadraticCurveTo(-ASTEROIDS_SHIP_RADIUS * 1.9, 4, -ASTEROIDS_SHIP_RADIUS * 1.36, 0);
    context.fill();
    context.restore();
  }

  context.shadowColor = "rgba(0,0,0,0.38)";
  context.shadowBlur = 10;
  context.shadowOffsetY = 5;
  context.fillStyle = "#ff5d8f";
  context.beginPath();
  context.moveTo(-ASTEROIDS_SHIP_RADIUS * 0.72, -ASTEROIDS_SHIP_RADIUS * 0.9);
  context.lineTo(-ASTEROIDS_SHIP_RADIUS * 1.48, -ASTEROIDS_SHIP_RADIUS * 1.38);
  context.lineTo(-ASTEROIDS_SHIP_RADIUS * 0.98, -ASTEROIDS_SHIP_RADIUS * 0.18);
  context.lineTo(-ASTEROIDS_SHIP_RADIUS * 0.72, ASTEROIDS_SHIP_RADIUS * 0.9);
  context.lineTo(-ASTEROIDS_SHIP_RADIUS * 1.48, ASTEROIDS_SHIP_RADIUS * 1.38);
  context.lineTo(-ASTEROIDS_SHIP_RADIUS * 0.98, ASTEROIDS_SHIP_RADIUS * 0.18);
  context.closePath();
  context.fill();

  const body = context.createLinearGradient(-ASTEROIDS_SHIP_RADIUS, -14, ASTEROIDS_SHIP_RADIUS + 16, 14);
  body.addColorStop(0, "#edf8ff");
  body.addColorStop(0.55, "#87d8ff");
  body.addColorStop(1, "#2687ff");
  context.fillStyle = body;
  context.beginPath();
  context.moveTo(ASTEROIDS_SHIP_RADIUS + 11, 0);
  context.quadraticCurveTo(ASTEROIDS_SHIP_RADIUS * 0.22, -ASTEROIDS_SHIP_RADIUS * 1.08, -ASTEROIDS_SHIP_RADIUS * 1.15, -ASTEROIDS_SHIP_RADIUS * 0.62);
  context.quadraticCurveTo(-ASTEROIDS_SHIP_RADIUS * 1.56, 0, -ASTEROIDS_SHIP_RADIUS * 1.15, ASTEROIDS_SHIP_RADIUS * 0.62);
  context.quadraticCurveTo(ASTEROIDS_SHIP_RADIUS * 0.22, ASTEROIDS_SHIP_RADIUS * 1.08, ASTEROIDS_SHIP_RADIUS + 11, 0);
  context.closePath();
  context.fill();
  context.shadowBlur = 0;
  context.strokeStyle = "#10275f";
  context.lineWidth = 3;
  context.stroke();

  context.fillStyle = "#8effff";
  context.strokeStyle = "#10275f";
  context.lineWidth = 2.5;
  context.beginPath();
  context.ellipse(ASTEROIDS_SHIP_RADIUS * 0.3, 0, 8, 6.5, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.fillStyle = "rgba(255,255,255,0.78)";
  context.beginPath();
  context.arc(ASTEROIDS_SHIP_RADIUS * 0.05, -2.5, 2.3, 0, Math.PI * 2);
  context.fill();

  if (engineGlow > 0) {
    context.globalAlpha = engineGlow;
    context.strokeStyle = "#fff2a8";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(-ASTEROIDS_SHIP_RADIUS * 0.8, 0);
    context.lineTo(-ASTEROIDS_SHIP_RADIUS * 1.4, 0);
    context.stroke();
    context.globalAlpha = 1;
  }

  if (invulnerablePulse > 0) {
    context.globalAlpha = invulnerablePulse;
    context.strokeStyle = "#d9c7ff";
    context.lineWidth = 3;
    context.beginPath();
    context.ellipse(0, 0, ASTEROIDS_SHIP_RADIUS * 2.1, ASTEROIDS_SHIP_RADIUS * 1.65, 0, 0, Math.PI * 2);
    context.stroke();
  }

  context.restore();
}

function drawBurst(context: CanvasRenderingContext2D, burst: AsteroidsVisualBurst) {
  const progress = Math.min(1, burst.age / burst.life);
  const alpha = 1 - progress;
  const particleCount = burst.kind === "ship" ? 14 : 9;

  context.save();
  context.globalAlpha = alpha;
  context.lineWidth = burst.kind === "ship" ? 4 : 3;
  context.lineCap = "round";
  context.strokeStyle = burst.color;

  for (let index = 0; index < particleCount; index += 1) {
    const angle = (Math.PI * 2 * index) / particleCount + burst.id * 0.11;
    const inner = 8 + progress * 10;
    const outer = 18 + progress * (burst.kind === "ship" ? 48 : 34);
    context.beginPath();
    context.moveTo(burst.x + Math.cos(angle) * inner, burst.y + Math.sin(angle) * inner);
    context.lineTo(burst.x + Math.cos(angle) * outer, burst.y + Math.sin(angle) * outer);
    context.stroke();
  }

  context.restore();
}

function drawOverlay(context: CanvasRenderingContext2D, state: AsteroidsState) {
  context.fillStyle = "rgba(5,9,34,0.58)";
  context.fillRect(0, 0, ASTEROIDS_WIDTH, ASTEROIDS_HEIGHT);

  context.save();
  context.translate(ASTEROIDS_WIDTH / 2, ASTEROIDS_HEIGHT / 2);
  context.fillStyle = "rgba(255,255,255,0.94)";
  context.strokeStyle = "#15205c";
  context.lineWidth = 5;
  context.beginPath();
  context.roundRect(-178, -70, 356, 140, 28);
  context.fill();
  context.stroke();

  context.textAlign = "center";
  context.fillStyle = "#13205c";
  context.font = "800 34px sans-serif";
  context.fillText(
    state.phase === "game-over" ? "Fleet lost" : state.phase === "paused" ? "Paused" : "Asteroids",
    0,
    -14,
  );
  context.font = "700 15px sans-serif";
  context.fillStyle = "#4d5e9d";
  context.fillText("Press Space or Start", 0, 24);
  context.restore();
}

function drawAsteroidsScene(
  context: CanvasRenderingContext2D,
  state: AsteroidsState,
  input: AsteroidsRenderInput,
  elapsedSeconds: number,
  bursts: AsteroidsVisualBurst[],
) {
  context.clearRect(0, 0, ASTEROIDS_WIDTH, ASTEROIDS_HEIGHT);
  drawBackground(context, elapsedSeconds);

  for (const burst of bursts) {
    drawBurst(context, burst);
  }

  for (const rock of state.rocks) {
    drawRock(context, rock);
  }

  for (const bullet of state.bullets) {
    drawBullet(context, bullet);
  }

  drawShip(context, state, input, elapsedSeconds);

  if (state.phase !== "playing") {
    drawOverlay(context, state);
  }
}

function getRockBurstColor(rock: AsteroidsRock) {
  return rock.tier === 3 ? "#ffd29b" : rock.tier === 2 ? "#d8f1ff" : "#ffe0c2";
}

function createVisualBursts(
  previousState: AsteroidsState,
  nextState: AsteroidsState,
  nextBurstId: () => number,
) {
  const bursts: AsteroidsVisualBurst[] = [];
  const nextRockIds = new Set(nextState.rocks.map((rock) => rock.id));

  for (const rock of previousState.rocks) {
    if (!nextRockIds.has(rock.id)) {
      bursts.push({
        id: nextBurstId(),
        x: rock.x,
        y: rock.y,
        age: 0,
        life: 0.42,
        color: getRockBurstColor(rock),
        kind: "rock",
      });
    }
  }

  if (nextState.lives < previousState.lives) {
    bursts.push({
      id: nextBurstId(),
      x: previousState.ship.x,
      y: previousState.ship.y,
      age: 0,
      life: 0.66,
      color: "#ff7b9c",
      kind: "ship",
    });
  }

  return bursts;
}

export function AsteroidsGame() {
  const initialState = createAsteroidsState(readStoredNumber(ASTEROIDS_STORAGE_KEY));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef<AsteroidsState>(initialState);
  const elapsedSecondsRef = useRef(0);
  const visualBurstsRef = useRef<AsteroidsVisualBurst[]>([]);
  const nextBurstIdRef = useRef(1);
  const renderInputRef = useRef<AsteroidsRenderInput>({ thrust: false, turn: 0 });
  const touchInputRef = useRef({ turn: 0, thrust: false, shoot: false });
  const joystickRef = useRef<HTMLDivElement>(null);
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
      drawAsteroidsScene(
        context,
        stateRef.current,
        renderInputRef.current,
        elapsedSecondsRef.current,
        visualBurstsRef.current,
      );
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

  function updateJoystickInput(clientX: number, clientY: number) {
    const joystick = joystickRef.current;
    if (!joystick) {
      return;
    }

    const bounds = joystick.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const deadZone = bounds.width * 0.12;

    touchInputRef.current.turn =
      Math.abs(dx) < deadZone ? 0 : dx < 0 ? -1 : 1;
    touchInputRef.current.thrust = dy < -deadZone;
  }

  function clearJoystickInput() {
    touchInputRef.current.turn = 0;
    touchInputRef.current.thrust = false;
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
    elapsedSecondsRef.current += deltaSeconds;
    visualBurstsRef.current = visualBurstsRef.current
      .map((burst) => ({ ...burst, age: burst.age + deltaSeconds }))
      .filter((burst) => burst.age < burst.life);

    const keys = pressedKeysRef.current;
    const keyboardTurn =
      Number(keys.has("d") || keys.has("arrowright")) -
      Number(keys.has("a") || keys.has("arrowleft"));
    const input = {
      turn: keyboardTurn || touchInputRef.current.turn,
      thrust: keys.has("w") || keys.has("arrowup") || touchInputRef.current.thrust,
      shoot: keys.has(" ") || touchInputRef.current.shoot,
    };
    renderInputRef.current = input;
    const previousState = stateRef.current;
    const nextState = updateAsteroids(previousState, deltaSeconds, input);

    touchInputRef.current.shoot = false;

    if (nextState !== stateRef.current) {
      visualBurstsRef.current = [
        ...visualBurstsRef.current,
        ...createVisualBursts(previousState, nextState, () => {
          const id = nextBurstIdRef.current;
          nextBurstIdRef.current += 1;
          return id;
        }),
      ].slice(-24);
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
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          style={{ touchAction: "none" }}
          aria-label="Asteroids field"
          onTouchStart={(event) => {
            if (stateRef.current.phase !== "playing") {
              beginRun();
            }
            event.preventDefault();
          }}
        />
      </GamePlayfield>

      <GameStatus>{getStatusCopy(hudState.phase)}</GameStatus>

      <TouchControls className="fixed inset-x-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] z-40 max-w-none">
        <div className="flex items-end justify-between gap-6">
          <div
            ref={joystickRef}
            className="relative h-28 w-28 touch-none rounded-full border border-line bg-surface-muted shadow-[inset_0_0_0_2px_rgba(255,255,255,0.08),0_18px_42px_rgba(0,0,0,0.28)]"
            aria-label="Asteroids joystick"
            role="application"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              if (stateRef.current.phase !== "playing") {
                beginRun();
              }
              updateJoystickInput(event.clientX, event.clientY);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                updateJoystickInput(event.clientX, event.clientY);
              }
            }}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
              clearJoystickInput();
            }}
            onPointerCancel={clearJoystickInput}
          >
            <div className="absolute left-1/2 top-3 h-8 w-1 -translate-x-1/2 rounded-full bg-foreground-soft/55" />
            <div className="absolute left-3 top-1/2 h-1 w-8 -translate-y-1/2 rounded-full bg-foreground-soft/55" />
            <div className="absolute right-3 top-1/2 h-1 w-8 -translate-y-1/2 rounded-full bg-foreground-soft/55" />
            <div className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line-strong bg-accent-soft" />
          </div>
          <GameButton
            variant="touch"
            className="h-24 w-24 rounded-full text-base"
            onPointerDown={() => {
              touchInputRef.current.shoot = true;
              if (stateRef.current.phase !== "playing") {
                beginRun();
              }
            }}
          >
            Fire
          </GameButton>
        </div>
      </TouchControls>
    </GamePanel>
  );
}
