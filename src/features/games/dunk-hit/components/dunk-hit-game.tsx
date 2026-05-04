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

const WIDTH = 430;
const HEIGHT = 720;
const BALL_RADIUS = 22;
const HOOP_WIDTH = 120;
const RIM_HEIGHT = 12;
const STORAGE_KEY = "arcade.dunkHit.bestScore";
const SKIN_KEY = "arcade.dunkHit.skin";

type Phase = "idle" | "playing" | "paused" | "game-over";
type Side = "left" | "right";

type Skin = {
  id: string;
  label: string;
  unlockAt: number;
  base: string;
  seam: string;
  glow: string;
};

type Ball = {
  x: number;
  y: number;
  previousY: number;
  vx: number;
  vy: number;
  rotation: number;
  rimTouched: boolean;
};

type Hoop = {
  side: Side;
  x: number;
  y: number;
  flash: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
};

type State = {
  phase: Phase;
  ball: Ball;
  hoop: Hoop;
  score: number;
  bestScore: number;
  timeLeft: number;
  timeMax: number;
  streak: number;
  fire: number;
  shake: number;
  particles: Particle[];
  message: string;
};

const SKINS: readonly Skin[] = [
  {
    id: "classic",
    label: "Classic",
    unlockAt: 0,
    base: "#f08322",
    seam: "#5f2a12",
    glow: "#ffcf4a",
  },
  {
    id: "ice",
    label: "Ice",
    unlockAt: 12,
    base: "#67d9ff",
    seam: "#135d8b",
    glow: "#c8f6ff",
  },
  {
    id: "lime",
    label: "Lime",
    unlockAt: 24,
    base: "#a9f23f",
    seam: "#356717",
    glow: "#e5ff72",
  },
  {
    id: "void",
    label: "Void",
    unlockAt: 40,
    base: "#7047ff",
    seam: "#21145c",
    glow: "#ff73d5",
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getTimerMax(score: number) {
  return clamp(4.2 - score * 0.045, 2.05, 4.2);
}

function createHoop(side: Side, score: number): Hoop {
  const x = side === "left" ? 94 : WIDTH - 94;
  const y = clamp(250 + Math.sin(score * 1.7) * 54, 184, 332);
  return { side, x, y, flash: 0 };
}

function createBall(x = WIDTH / 2, y = HEIGHT - 118): Ball {
  return {
    x,
    y,
    previousY: y,
    vx: 0,
    vy: -210,
    rotation: 0,
    rimTouched: false,
  };
}

function createState(bestScore = 0): State {
  return {
    phase: "idle",
    ball: createBall(),
    hoop: createHoop("right", 0),
    score: 0,
    bestScore,
    timeLeft: getTimerMax(0),
    timeMax: getTimerMax(0),
    streak: 0,
    fire: 0,
    shake: 0,
    particles: [],
    message: "Tap to bounce.",
  };
}

function spawnBurst(x: number, y: number, color: string, count: number, power = 1): Particle[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.35;
    const speed = (90 + Math.random() * 190) * power;
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 70,
      radius: 3 + Math.random() * 6,
      life: 0.45 + Math.random() * 0.34,
      maxLife: 0.8,
      color,
    };
  });
}

function startState(state: State): State {
  return {
    ...createState(state.bestScore),
    phase: "playing",
    message: "Dunk before the clock drains.",
  };
}

function tapBall(state: State, skin: Skin): State {
  if (state.phase === "idle" || state.phase === "game-over") {
    const started = startState(state);
    return tapBall(started, skin);
  }

  if (state.phase === "paused") {
    return { ...state, phase: "playing", message: "Back in rhythm." };
  }

  const targetX = state.hoop.x;
  const horizontalPull = clamp((targetX - state.ball.x) * 2.25, -280, 280);
  const lift = state.ball.vy > 0 ? -485 : -390;
  return {
    ...state,
    ball: {
      ...state.ball,
      vx: clamp(state.ball.vx * 0.38 + horizontalPull, -430, 430),
      vy: lift,
    },
    particles: [
      ...state.particles,
      ...spawnBurst(state.ball.x, state.ball.y + 18, skin.glow, 7, 0.48),
    ].slice(-80),
  };
}

function scoreDunk(state: State, skin: Skin): State {
  const nextScore = state.score + (state.fire > 0 ? 2 : 1);
  const nextTimer = getTimerMax(nextScore);
  const nextSide: Side = state.hoop.side === "left" ? "right" : "left";
  const perfect = !state.ball.rimTouched && Math.abs(state.ball.x - state.hoop.x) < 18;
  const nextStreak = perfect ? state.streak + 1 : 0;
  const nextFire = nextStreak >= 3 ? 3.8 : Math.max(0, state.fire - 0.4);
  const hoop = createHoop(nextSide, nextScore);

  return {
    ...state,
    ball: {
      ...state.ball,
      x: state.hoop.x,
      y: state.hoop.y + 48,
      previousY: state.hoop.y + 48,
      vx: state.hoop.side === "left" ? 170 : -170,
      vy: -305,
      rimTouched: false,
    },
    hoop: { ...hoop, flash: 1 },
    score: nextScore,
    bestScore: Math.max(state.bestScore, nextScore),
    timeLeft: nextTimer,
    timeMax: nextTimer,
    streak: nextStreak,
    fire: nextFire,
    shake: perfect ? 7 : 4,
    particles: [
      ...state.particles,
      ...spawnBurst(state.hoop.x, state.hoop.y + 4, perfect ? "#ffffff" : skin.glow, perfect ? 24 : 15, perfect ? 1.15 : 0.82),
    ].slice(-110),
    message: perfect ? "Perfect swish." : "Clean dunk.",
  };
}

function updateState(state: State, delta: number, skin: Skin): State {
  let next = state;

  if (state.phase === "playing") {
    const gravity = 1025;
    const ball = {
      ...state.ball,
      previousY: state.ball.y,
      x: state.ball.x + state.ball.vx * delta,
      y: state.ball.y + state.ball.vy * delta,
      vy: state.ball.vy + gravity * delta,
      vx: state.ball.vx * Math.pow(0.994, delta * 60),
      rotation: state.ball.rotation + state.ball.vx * delta * 0.035,
    };

    if (ball.x < BALL_RADIUS + 12) {
      ball.x = BALL_RADIUS + 12;
      ball.vx = Math.abs(ball.vx) * 0.74;
      ball.rimTouched = true;
    }

    if (ball.x > WIDTH - BALL_RADIUS - 12) {
      ball.x = WIDTH - BALL_RADIUS - 12;
      ball.vx = -Math.abs(ball.vx) * 0.74;
      ball.rimTouched = true;
    }

    const rimY = state.hoop.y;
    const leftRim = state.hoop.x - HOOP_WIDTH / 2;
    const rightRim = state.hoop.x + HOOP_WIDTH / 2;
    const crossedRim = ball.previousY < rimY && ball.y >= rimY && ball.vy > 0;
    const insideHoop = ball.x > leftRim + 18 && ball.x < rightRim - 18;

    if (crossedRim && insideHoop) {
      next = scoreDunk({ ...state, ball }, skin);
    } else {
      const hitLeftRim = Math.hypot(ball.x - leftRim, ball.y - rimY) < BALL_RADIUS + 8;
      const hitRightRim = Math.hypot(ball.x - rightRim, ball.y - rimY) < BALL_RADIUS + 8;
      if (hitLeftRim || hitRightRim) {
        const rimX = hitLeftRim ? leftRim : rightRim;
        const direction = ball.x < rimX ? -1 : 1;
        ball.vx = direction * Math.max(205, Math.abs(ball.vx) * 0.82);
        ball.vy = -Math.abs(ball.vy) * 0.38;
        ball.rimTouched = true;
      }

      const timeLeft = state.timeLeft - delta;
      next = {
        ...state,
        ball,
        timeLeft,
        fire: Math.max(0, state.fire - delta),
        message: timeLeft < 1.2 ? "Hurry." : state.message,
      };

      if (ball.y > HEIGHT + 74 || timeLeft <= 0) {
        next = {
          ...next,
          phase: "game-over",
          bestScore: Math.max(state.bestScore, state.score),
          shake: 10,
          streak: 0,
          fire: 0,
          message: timeLeft <= 0 ? "Clock ran out." : "Out of bounds.",
        };
      }
    }
  }

  const particles = next.particles
    .map((particle) => ({
      ...particle,
      x: particle.x + particle.vx * delta,
      y: particle.y + particle.vy * delta,
      vy: particle.vy + 520 * delta,
      life: particle.life - delta,
    }))
    .filter((particle) => particle.life > 0);

  return {
    ...next,
    hoop: { ...next.hoop, flash: Math.max(0, next.hoop.flash - delta * 3.2) },
    shake: Math.max(0, next.shake - delta * 24),
    particles,
  };
}

function drawBall(context: CanvasRenderingContext2D, ball: Ball, skin: Skin, fire: number) {
  context.save();
  context.translate(ball.x, ball.y);
  context.rotate(ball.rotation);
  context.shadowBlur = fire > 0 ? 30 : 14;
  context.shadowColor = fire > 0 ? "#ffdc3f" : "rgba(0,0,0,0.34)";
  context.fillStyle = skin.base;
  context.strokeStyle = skin.seam;
  context.lineWidth = 4;
  context.beginPath();
  context.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.strokeStyle = skin.seam;
  context.lineWidth = 3;
  context.beginPath();
  context.arc(0, 0, BALL_RADIUS * 0.72, -Math.PI / 2, Math.PI / 2);
  context.arc(0, 0, BALL_RADIUS * 0.72, Math.PI / 2, Math.PI * 1.5);
  context.moveTo(-BALL_RADIUS, 0);
  context.quadraticCurveTo(0, -7, BALL_RADIUS, 0);
  context.moveTo(-BALL_RADIUS, 0);
  context.quadraticCurveTo(0, 7, BALL_RADIUS, 0);
  context.stroke();

  context.fillStyle = "rgba(255,255,255,0.34)";
  context.beginPath();
  context.ellipse(-7, -10, 6, 4, -0.6, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawHoop(context: CanvasRenderingContext2D, hoop: Hoop) {
  const left = hoop.x - HOOP_WIDTH / 2;
  const right = hoop.x + HOOP_WIDTH / 2;
  const rimY = hoop.y;
  const backboardX = hoop.side === "left" ? left - 31 : right + 31;

  context.save();
  context.shadowBlur = 14 + hoop.flash * 18;
  context.shadowColor = "rgba(255,255,255,0.65)";
  context.fillStyle = "rgba(255,255,255,0.92)";
  context.strokeStyle = "#26376d";
  context.lineWidth = 5;
  context.beginPath();
  context.roundRect(backboardX - 14, rimY - 72, 28, 86, 7);
  context.fill();
  context.stroke();

  context.strokeStyle = "#f45b2b";
  context.lineWidth = 8;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(left, rimY);
  context.lineTo(right, rimY);
  context.stroke();

  context.strokeStyle = "rgba(255,255,255,0.78)";
  context.lineWidth = 3;
  for (let index = 0; index <= 5; index += 1) {
    const x = left + (HOOP_WIDTH / 5) * index;
    context.beginPath();
    context.moveTo(x, rimY + RIM_HEIGHT);
    context.lineTo(hoop.x + (index - 2.5) * 12, rimY + 76);
    context.stroke();
  }
  context.beginPath();
  context.moveTo(left + 8, rimY + 33);
  context.quadraticCurveTo(hoop.x, rimY + 48, right - 8, rimY + 33);
  context.stroke();

  context.fillStyle = "#f45b2b";
  context.beginPath();
  context.arc(left, rimY, 8, 0, Math.PI * 2);
  context.arc(right, rimY, 8, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawBackground(context: CanvasRenderingContext2D, elapsed: number) {
  const gradient = context.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, "#2f44f1");
  gradient.addColorStop(0.52, "#fa466f");
  gradient.addColorStop(1, "#ffb347");
  context.fillStyle = gradient;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.save();
  context.globalAlpha = 0.18;
  context.fillStyle = "#fff";
  for (let index = 0; index < 11; index += 1) {
    const x = ((index * 58 + elapsed * 18) % (WIDTH + 90)) - 45;
    const y = 94 + ((index * 83) % 420);
    context.beginPath();
    context.roundRect(x, y, 58, 8, 4);
    context.fill();
  }
  context.restore();

  context.save();
  context.globalAlpha = 0.18;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 4;
  for (let index = 0; index < 8; index += 1) {
    context.beginPath();
    context.arc(WIDTH / 2, HEIGHT + 12, 105 + index * 52, Math.PI * 1.08, Math.PI * 1.92);
    context.stroke();
  }
  context.restore();
}

function drawParticles(context: CanvasRenderingContext2D, particles: Particle[]) {
  for (const particle of particles) {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.radius * alpha, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

function drawTimer(context: CanvasRenderingContext2D, state: State) {
  const progress = clamp(state.timeLeft / state.timeMax, 0, 1);
  context.save();
  context.fillStyle = "rgba(255,255,255,0.28)";
  context.beginPath();
  context.roundRect(50, 26, WIDTH - 100, 12, 8);
  context.fill();
  context.fillStyle = progress < 0.28 ? "#ffe04a" : "#ffffff";
  context.beginPath();
  context.roundRect(50, 26, (WIDTH - 100) * progress, 12, 8);
  context.fill();
  context.restore();
}

function drawScore(context: CanvasRenderingContext2D, state: State) {
  context.save();
  context.textAlign = "center";
  context.lineWidth = 8;
  context.strokeStyle = "rgba(29,20,76,0.28)";
  context.fillStyle = "#ffffff";
  context.font = "900 82px sans-serif";
  context.strokeText(String(state.score), WIDTH / 2, 118);
  context.fillText(String(state.score), WIDTH / 2, 118);

  if (state.fire > 0) {
    context.font = "900 18px sans-serif";
    context.fillStyle = "#fff2a5";
    context.fillText("ON FIRE", WIDTH / 2, 148);
  } else if (state.streak > 0) {
    context.font = "900 16px sans-serif";
    context.fillStyle = "rgba(255,255,255,0.86)";
    context.fillText(`${state.streak} PERFECT`, WIDTH / 2, 146);
  }
  context.restore();
}

function drawOverlay(context: CanvasRenderingContext2D, state: State) {
  if (state.phase === "playing") {
    return;
  }

  context.fillStyle = "rgba(23,20,56,0.3)";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.save();
  context.textAlign = "center";
  context.fillStyle = "#ffffff";
  context.font = "900 48px sans-serif";
  const title = state.phase === "paused" ? "PAUSED" : state.phase === "game-over" ? "GAME OVER" : "DUNK HIT";
  context.fillText(title, WIDTH / 2, HEIGHT / 2 - 18);
  context.font = "800 18px sans-serif";
  context.fillText(state.phase === "game-over" ? state.message : "Tap to bounce. Swish before time runs out.", WIDTH / 2, HEIGHT / 2 + 22);
  context.restore();
}

function drawScene(context: CanvasRenderingContext2D, state: State, skin: Skin, elapsed: number) {
  context.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground(context, elapsed);
  context.save();
  if (state.shake > 0) {
    context.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawHoop(context, state.hoop);
  drawParticles(context, state.particles);
  if (state.fire > 0) {
    drawParticles(context, spawnBurst(state.ball.x, state.ball.y + 10, "#ffdf42", 5, 0.2));
  }
  drawBall(context, state.ball, skin, state.fire);
  context.restore();
  drawTimer(context, state);
  drawScore(context, state);
  drawOverlay(context, state);
}

function readStoredSkin(bestScore: number): string {
  if (typeof window === "undefined") {
    return "classic";
  }

  const stored = window.localStorage.getItem(SKIN_KEY) ?? "classic";
  return SKINS.some((skin) => skin.id === stored && bestScore >= skin.unlockAt)
    ? stored
    : "classic";
}

export function DunkHitGame() {
  const initialBest = readStoredNumber(STORAGE_KEY);
  const initialState = createState(initialBest);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef(initialState);
  const elapsedRef = useRef(0);
  const [skinId, setSkinId] = useState(() => readStoredSkin(initialBest));
  const [hud, setHud] = useState({
    score: initialState.score,
    bestScore: initialState.bestScore,
    timeLeft: initialState.timeLeft,
    phase: initialState.phase,
    streak: initialState.streak,
    message: initialState.message,
  });

  const selectedSkin = SKINS.find((skin) => skin.id === skinId) ?? SKINS[0]!;

  function sync(nextState: State) {
    stateRef.current = nextState;
    setHud({
      score: nextState.score,
      bestScore: nextState.bestScore,
      timeLeft: nextState.timeLeft,
      phase: nextState.phase,
      streak: nextState.streak,
      message: nextState.message,
    });
    writeStoredNumber(STORAGE_KEY, nextState.bestScore);
  }

  function render() {
    const context = contextRef.current;
    if (context) {
      const skin = SKINS.find((item) => item.id === skinId) ?? SKINS[0]!;
      drawScene(context, stateRef.current, skin, elapsedRef.current);
    }
  }

  function bounce() {
    sync(tapBall(stateRef.current, selectedSkin));
    render();
  }

  function restart() {
    sync(startState(stateRef.current));
    render();
  }

  function togglePause() {
    const current = stateRef.current;
    if (current.phase === "playing") {
      sync({ ...current, phase: "paused", message: "Paused." });
    } else if (current.phase === "paused") {
      sync({ ...current, phase: "playing", message: "Back in rhythm." });
    }
  }

  function chooseSkin(nextSkin: Skin) {
    if (hud.bestScore < nextSkin.unlockAt) {
      return;
    }

    setSkinId(nextSkin.id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SKIN_KEY, nextSkin.id);
    }
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (key === " " || key === "arrowup" || key === "w" || key === "enter") {
      event.preventDefault();
      bounce();
    } else if (key === "r") {
      event.preventDefault();
      restart();
    } else if (key === "p") {
      event.preventDefault();
      togglePause();
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      contextRef.current = configureHiDPICanvas(canvas, WIDTH, HEIGHT);
      if (contextRef.current) {
        drawScene(contextRef.current, stateRef.current, SKINS[0]!, elapsedRef.current);
      }
    }

    const handler = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useAnimationFrameLoop((delta, elapsed) => {
    elapsedRef.current = elapsed;
    const next = updateState(stateRef.current, delta, selectedSkin);
    if (next !== stateRef.current) {
      sync(next);
    }
    render();
  });

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "Score", value: hud.score },
          { label: "Best", value: hud.bestScore },
          { label: "Timer", value: `${Math.max(0, hud.timeLeft).toFixed(1)}s` },
          { label: "Perfect", value: hud.streak },
          { label: "Status", value: hud.phase },
        ]}
        actions={
          <>
            <GameButton variant="primary" onClick={bounce}>
              Bounce
            </GameButton>
            <GameButton onClick={restart}>Restart</GameButton>
            <GameButton onClick={togglePause}>
              {hud.phase === "paused" ? "Resume" : "Pause"}
            </GameButton>
          </>
        }
      />

      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 md:flex-row md:items-start md:justify-center">
        <GamePlayfield className="mx-0 aspect-[43/72] w-full max-w-[min(25rem,68dvh)] touch-none border-0 bg-[#f25b70]">
          <canvas
            ref={canvasRef}
            className="h-full w-full"
            aria-label="Dunk Hit basketball field"
            onPointerDown={(event) => {
              event.preventDefault();
              bounce();
            }}
          />
        </GamePlayfield>

        <div className="grid w-full max-w-[25rem] grid-cols-4 gap-2 rounded-[1.1rem] border border-line bg-surface px-3 py-2 shadow-[0_18px_60px_rgba(0,0,0,0.2)] md:w-32 md:grid-cols-1">
          {SKINS.map((skin) => {
            const locked = hud.bestScore < skin.unlockAt;
            return (
              <GameButton
                key={skin.id}
                variant={skin.id === skinId ? "primary" : "secondary"}
                className="px-2 py-1.5 text-[0.68rem]"
                disabled={locked}
                onClick={() => chooseSkin(skin)}
              >
                {locked ? `${skin.unlockAt}` : skin.label}
              </GameButton>
            );
          })}
        </div>
      </div>

      <GameStatus>
        {hud.message} Tap, click, Space, Enter, or W to bounce toward the next hoop. R restarts and P pauses.
      </GameStatus>

      <TouchControls className="max-w-[18rem]">
        <GameButton variant="touch" className="w-full" onPointerDown={bounce}>
          Bounce
        </GameButton>
      </TouchControls>
    </GamePanel>
  );
}
