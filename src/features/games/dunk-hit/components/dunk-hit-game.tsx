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
const HOOP_WIDTH = 116;
const RIM_RADIUS = 7;
const STORAGE_KEY = "arcade.dunkHit.bestScore";
const SKIN_KEY = "arcade.dunkHit.skin";

type Phase = "idle" | "playing" | "paused" | "game-over";
type Side = "left" | "right";

type Skin = {
  id: string;
  label: string;
  unlockAt: number;
  base: string;
  dark: string;
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
  kind?: "spark" | "ring";
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
  scorePop: number;
  message: string;
};

type HudState = Pick<
  State,
  "score" | "bestScore" | "timeLeft" | "phase" | "streak" | "message"
>;

const SKINS: readonly Skin[] = [
  {
    id: "classic",
    label: "Classic",
    unlockAt: 0,
    base: "#f38122",
    dark: "#b84d16",
    seam: "#5a2a12",
    glow: "#ffd35a",
  },
  {
    id: "ice",
    label: "Ice",
    unlockAt: 12,
    base: "#6ddfff",
    dark: "#248cc7",
    seam: "#104f84",
    glow: "#d6fbff",
  },
  {
    id: "lime",
    label: "Lime",
    unlockAt: 24,
    base: "#acf13e",
    dark: "#5fad1f",
    seam: "#336416",
    glow: "#ecff73",
  },
  {
    id: "void",
    label: "Void",
    unlockAt: 40,
    base: "#764bff",
    dark: "#38208f",
    seam: "#180d55",
    glow: "#ff79dd",
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - clamp(value, 0, 1), 3);
}

function getTimerMax(score: number) {
  return clamp(4.85 - score * 0.044, 2.35, 4.85);
}

function createHoop(side: Side, score: number): Hoop {
  const x = side === "left" ? 100 : WIDTH - 100;
  const rhythm = Math.sin(score * 1.45) * 46 + Math.cos(score * 0.68) * 18;
  const y = clamp(258 + rhythm, 178, 338);
  return { side, x, y, flash: 0 };
}

function createBall(x = WIDTH / 2, y = HEIGHT - 118): Ball {
  return {
    x,
    y,
    previousY: y,
    vx: 0,
    vy: -185,
    rotation: 0,
    rimTouched: false,
  };
}

function createState(bestScore = 0): State {
  const timeMax = getTimerMax(0);
  return {
    phase: "idle",
    ball: createBall(),
    hoop: createHoop("right", 0),
    score: 0,
    bestScore,
    timeLeft: timeMax,
    timeMax,
    streak: 0,
    fire: 0,
    shake: 0,
    particles: [],
    scorePop: 0,
    message: "Tap to bounce.",
  };
}

function spawnBurst(
  x: number,
  y: number,
  color: string,
  count: number,
  power = 1,
  kind: Particle["kind"] = "spark",
): Particle[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.42;
    const speed = (95 + Math.random() * 205) * power;
    const life = 0.38 + Math.random() * 0.34;
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 76,
      radius: kind === "ring" ? 12 + Math.random() * 9 : 3 + Math.random() * 6,
      life,
      maxLife: life,
      color,
      kind,
    };
  });
}

function startState(state: State): State {
  return {
    ...createState(state.bestScore),
    phase: "playing",
    message: "Swish before the clock drains.",
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
  const distance = targetX - state.ball.x;
  const urgency = clamp((HEIGHT - state.ball.y) / HEIGHT, 0.25, 1);
  const horizontalPull = clamp(distance * (2.12 + urgency * 0.78), -385, 385);
  const upwardKick = state.ball.vy > 90 ? -630 : -545;

  return {
    ...state,
    ball: {
      ...state.ball,
      vx: clamp(state.ball.vx * 0.28 + horizontalPull, -455, 455),
      vy: upwardKick,
    },
    particles: [
      ...state.particles,
      ...spawnBurst(state.ball.x, state.ball.y + 20, skin.glow, 8, 0.42),
    ].slice(-100),
  };
}

function scoreDunk(state: State, skin: Skin): State {
  const perfect = !state.ball.rimTouched && Math.abs(state.ball.x - state.hoop.x) < 16;
  const nextStreak = perfect ? state.streak + 1 : 0;
  const fireReward = state.fire > 0 ? 2 : 1;
  const nextScore = state.score + fireReward;
  const nextTimer = getTimerMax(nextScore);
  const nextSide: Side = state.hoop.side === "left" ? "right" : "left";
  const nextFire = nextStreak >= 3 ? 4.25 : Math.max(0, state.fire - 0.3);
  const hoop = createHoop(nextSide, nextScore);

  return {
    ...state,
    ball: {
      ...state.ball,
      x: state.hoop.x,
      y: state.hoop.y + 56,
      previousY: state.hoop.y + 56,
      vx: state.hoop.side === "left" ? 188 : -188,
      vy: -340,
      rimTouched: false,
    },
    hoop: { ...hoop, flash: 1 },
    score: nextScore,
    bestScore: Math.max(state.bestScore, nextScore),
    timeLeft: nextTimer,
    timeMax: nextTimer,
    streak: nextStreak,
    fire: nextFire,
    shake: perfect ? 6 : 3,
    particles: [
      ...state.particles,
      ...spawnBurst(
        state.hoop.x,
        state.hoop.y + 6,
        perfect ? "#ffffff" : skin.glow,
        perfect ? 28 : 18,
        perfect ? 1.08 : 0.84,
      ),
      ...spawnBurst(state.hoop.x, state.hoop.y + 24, "#ffffff", perfect ? 3 : 2, 0.1, "ring"),
    ].slice(-130),
    scorePop: 0.52,
    message: perfect ? "Perfect swish." : "Dunk.",
  };
}

function updateState(state: State, delta: number, skin: Skin): State {
  let next = state;

  if (state.phase === "playing") {
    const gravity = 980;
    const ball = {
      ...state.ball,
      previousY: state.ball.y,
      x: state.ball.x + state.ball.vx * delta,
      y: state.ball.y + state.ball.vy * delta,
      vy: state.ball.vy + gravity * delta,
      vx: state.ball.vx * Math.pow(0.991, delta * 60),
      rotation: state.ball.rotation + state.ball.vx * delta * 0.032,
    };

    if (ball.x < BALL_RADIUS + 10) {
      ball.x = BALL_RADIUS + 10;
      ball.vx = Math.abs(ball.vx) * 0.72;
      ball.rimTouched = true;
    }

    if (ball.x > WIDTH - BALL_RADIUS - 10) {
      ball.x = WIDTH - BALL_RADIUS - 10;
      ball.vx = -Math.abs(ball.vx) * 0.72;
      ball.rimTouched = true;
    }

    if (ball.y < BALL_RADIUS + 44) {
      ball.y = BALL_RADIUS + 44;
      ball.vy = Math.abs(ball.vy) * 0.38;
      ball.rimTouched = true;
    }

    const rimY = state.hoop.y;
    const leftRim = state.hoop.x - HOOP_WIDTH / 2;
    const rightRim = state.hoop.x + HOOP_WIDTH / 2;
    const crossedRim = ball.previousY < rimY + 30 && ball.y >= rimY + 16 && ball.vy > 0;
    const insideHoop = ball.x > leftRim + 20 && ball.x < rightRim - 20;

    if (crossedRim && insideHoop) {
      next = scoreDunk({ ...state, ball }, skin);
    } else {
      const hitLeftRim = Math.hypot(ball.x - leftRim, ball.y - rimY) < BALL_RADIUS + RIM_RADIUS;
      const hitRightRim = Math.hypot(ball.x - rightRim, ball.y - rimY) < BALL_RADIUS + RIM_RADIUS;
      const hitBackboard =
        Math.abs(ball.x - (state.hoop.side === "left" ? leftRim - 24 : rightRim + 24)) < BALL_RADIUS + 7 &&
        ball.y > rimY - 82 &&
        ball.y < rimY + 12;

      if (hitLeftRim || hitRightRim) {
        const rimX = hitLeftRim ? leftRim : rightRim;
        const direction = ball.x < rimX ? -1 : 1;
        ball.vx = direction * Math.max(215, Math.abs(ball.vx) * 0.78);
        ball.vy = -Math.abs(ball.vy) * 0.34 - 24;
        ball.rimTouched = true;
        next = {
          ...state,
          particles: [
            ...state.particles,
            ...spawnBurst(rimX, rimY, "#ffdd62", 8, 0.48),
          ].slice(-110),
          shake: 3,
        };
      }

      if (hitBackboard) {
        ball.vx = state.hoop.side === "left" ? Math.abs(ball.vx) * 0.72 + 110 : -Math.abs(ball.vx) * 0.72 - 110;
        ball.vy = Math.min(ball.vy, -80);
        ball.rimTouched = true;
        next = {
          ...state,
          particles: [
            ...state.particles,
            ...spawnBurst(ball.x, ball.y, "#ffffff", 6, 0.34),
          ].slice(-110),
          shake: 2,
        };
      }

      const base = next === state ? state : next;
      const timeLeft = state.timeLeft - delta;
      next = {
        ...base,
        ball,
        timeLeft,
        fire: Math.max(0, state.fire - delta),
        message: timeLeft < 1.15 ? "Hurry." : base.message,
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
    hoop: { ...next.hoop, flash: Math.max(0, next.hoop.flash - delta * 3.4) },
    shake: Math.max(0, next.shake - delta * 25),
    scorePop: Math.max(0, next.scorePop - delta),
    particles,
  };
}

function drawBackground(context: CanvasRenderingContext2D, elapsed: number) {
  const gradient = context.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, "#3658ff");
  gradient.addColorStop(0.46, "#fb496e");
  gradient.addColorStop(1, "#ffb33e");
  context.fillStyle = gradient;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.save();
  context.globalAlpha = 0.28;
  context.fillStyle = "#ffffff";
  for (let index = 0; index < 10; index += 1) {
    const x = ((index * 74 - elapsed * 16) % (WIDTH + 120)) - 70;
    const y = 88 + ((index * 67) % 410);
    context.beginPath();
    context.roundRect(x, y, 54 + (index % 3) * 22, 7, 5);
    context.fill();
  }
  context.restore();

  context.save();
  context.globalAlpha = 0.16;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 4;
  for (let index = 0; index < 8; index += 1) {
    context.beginPath();
    context.arc(WIDTH / 2, HEIGHT + 16, 104 + index * 52, Math.PI * 1.07, Math.PI * 1.93);
    context.stroke();
  }
  context.restore();

  context.save();
  context.fillStyle = "rgba(71,40,126,0.2)";
  context.beginPath();
  context.moveTo(0, HEIGHT);
  for (let x = 0; x <= WIDTH; x += 44) {
    context.lineTo(x, HEIGHT - 32 - Math.sin(x * 0.04) * 12);
  }
  context.lineTo(WIDTH, HEIGHT);
  context.closePath();
  context.fill();
  context.restore();
}

function drawHoopBack(context: CanvasRenderingContext2D, hoop: Hoop) {
  const left = hoop.x - HOOP_WIDTH / 2;
  const right = hoop.x + HOOP_WIDTH / 2;
  const rimY = hoop.y;
  const backboardX = hoop.side === "left" ? left - 27 : right + 27;

  context.save();
  context.shadowBlur = 14 + hoop.flash * 18;
  context.shadowColor = "rgba(255,255,255,0.72)";
  context.fillStyle = "rgba(255,255,255,0.9)";
  context.strokeStyle = "#21306d";
  context.lineWidth = 5;
  context.beginPath();
  context.roundRect(backboardX - 15, rimY - 78, 30, 94, 7);
  context.fill();
  context.stroke();

  context.strokeStyle = "rgba(33,48,109,0.42)";
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(backboardX - 9, rimY - 52, 18, 33, 3);
  context.stroke();

  context.strokeStyle = "rgba(255,255,255,0.75)";
  context.lineWidth = 3;
  for (let index = 0; index <= 5; index += 1) {
    const x = left + (HOOP_WIDTH / 5) * index;
    context.beginPath();
    context.moveTo(x, rimY + 10);
    context.lineTo(hoop.x + (index - 2.5) * 12, rimY + 78);
    context.stroke();
  }
  context.beginPath();
  context.moveTo(left + 8, rimY + 34);
  context.quadraticCurveTo(hoop.x, rimY + 53, right - 8, rimY + 34);
  context.stroke();
  context.restore();
}

function drawHoopFront(context: CanvasRenderingContext2D, hoop: Hoop) {
  const left = hoop.x - HOOP_WIDTH / 2;
  const right = hoop.x + HOOP_WIDTH / 2;
  const rimY = hoop.y;

  context.save();
  context.shadowBlur = 10 + hoop.flash * 12;
  context.shadowColor = "#ffdf6e";
  context.strokeStyle = "#fa602d";
  context.lineWidth = 8;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(left, rimY);
  context.lineTo(right, rimY);
  context.stroke();

  context.strokeStyle = "#c83f20";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(left + 8, rimY + 5);
  context.lineTo(right - 8, rimY + 5);
  context.stroke();

  context.fillStyle = "#ff6a32";
  context.strokeStyle = "#a92d1b";
  context.lineWidth = 2;
  for (const x of [left, right]) {
    context.beginPath();
    context.arc(x, rimY, RIM_RADIUS + 1, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }
  context.restore();
}

function drawBall(context: CanvasRenderingContext2D, ball: Ball, skin: Skin, fire: number) {
  context.save();
  context.translate(ball.x, ball.y);
  context.rotate(ball.rotation);

  if (fire > 0) {
    const flame = context.createRadialGradient(0, 0, 8, 0, 0, 44);
    flame.addColorStop(0, "rgba(255,240,98,0.52)");
    flame.addColorStop(0.58, "rgba(255,102,35,0.24)");
    flame.addColorStop(1, "rgba(255,102,35,0)");
    context.fillStyle = flame;
    context.beginPath();
    context.arc(0, 0, 44, 0, Math.PI * 2);
    context.fill();
  }

  context.shadowBlur = fire > 0 ? 28 : 12;
  context.shadowColor = fire > 0 ? "#ffdc3f" : "rgba(0,0,0,0.38)";
  const gradient = context.createRadialGradient(-8, -10, 4, 0, 0, BALL_RADIUS);
  gradient.addColorStop(0, "#ffd28a");
  gradient.addColorStop(0.22, skin.base);
  gradient.addColorStop(1, skin.dark);
  context.fillStyle = gradient;
  context.strokeStyle = skin.seam;
  context.lineWidth = 4;
  context.beginPath();
  context.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.strokeStyle = skin.seam;
  context.lineWidth = 2.8;
  context.beginPath();
  context.arc(0, 0, BALL_RADIUS * 0.78, -Math.PI / 2, Math.PI / 2);
  context.arc(0, 0, BALL_RADIUS * 0.78, Math.PI / 2, Math.PI * 1.5);
  context.moveTo(-BALL_RADIUS, 0);
  context.quadraticCurveTo(0, -7, BALL_RADIUS, 0);
  context.moveTo(-BALL_RADIUS, 0);
  context.quadraticCurveTo(0, 7, BALL_RADIUS, 0);
  context.stroke();

  context.fillStyle = "rgba(255,255,255,0.38)";
  context.beginPath();
  context.ellipse(-7, -10, 6, 4, -0.62, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawParticles(context: CanvasRenderingContext2D, particles: Particle[]) {
  for (const particle of particles) {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    context.save();
    context.globalAlpha = alpha;
    context.strokeStyle = particle.color;
    context.fillStyle = particle.color;
    if (particle.kind === "ring") {
      context.lineWidth = 4 * alpha;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius * (1 + (1 - alpha) * 1.6), 0, Math.PI * 2);
      context.stroke();
    } else {
      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius * alpha, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }
}

function drawTimer(context: CanvasRenderingContext2D, state: State) {
  const progress = clamp(state.timeLeft / state.timeMax, 0, 1);
  context.save();
  context.fillStyle = "rgba(255,255,255,0.25)";
  context.beginPath();
  context.roundRect(42, 24, WIDTH - 84, 13, 9);
  context.fill();
  const timerGradient = context.createLinearGradient(42, 0, WIDTH - 42, 0);
  timerGradient.addColorStop(0, progress < 0.26 ? "#ffdf45" : "#ffffff");
  timerGradient.addColorStop(1, progress < 0.26 ? "#ff7a37" : "#dff5ff");
  context.fillStyle = timerGradient;
  context.beginPath();
  context.roundRect(42, 24, (WIDTH - 84) * progress, 13, 9);
  context.fill();
  context.restore();
}

function drawScore(context: CanvasRenderingContext2D, state: State) {
  context.save();
  context.textAlign = "center";
  const pop = easeOutCubic(state.scorePop / 0.52);
  const scale = 1 + pop * 0.13;
  context.translate(WIDTH / 2, 112);
  context.scale(scale, scale);
  context.lineWidth = 9;
  context.strokeStyle = "rgba(29,20,76,0.26)";
  context.fillStyle = "#ffffff";
  context.font = "900 82px Arial, sans-serif";
  context.strokeText(String(state.score), 0, 0);
  context.fillText(String(state.score), 0, 0);
  context.restore();

  context.save();
  context.textAlign = "center";
  if (state.fire > 0) {
    context.font = "900 18px Arial, sans-serif";
    context.fillStyle = "#fff1a6";
    context.fillText("FIRE x2", WIDTH / 2, 148);
  } else if (state.streak > 0) {
    context.font = "900 16px Arial, sans-serif";
    context.fillStyle = "rgba(255,255,255,0.9)";
    context.fillText(`${state.streak} PERFECT`, WIDTH / 2, 146);
  }
  context.restore();
}

function drawOverlay(context: CanvasRenderingContext2D, state: State) {
  if (state.phase === "playing") {
    return;
  }

  context.fillStyle = "rgba(22,18,55,0.34)";
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.save();
  context.translate(WIDTH / 2, HEIGHT / 2 - 8);
  context.fillStyle = "rgba(255,255,255,0.16)";
  context.beginPath();
  context.roundRect(-158, -88, 316, 166, 26);
  context.fill();
  context.strokeStyle = "rgba(255,255,255,0.34)";
  context.lineWidth = 2;
  context.stroke();

  context.textAlign = "center";
  context.fillStyle = "#ffffff";
  context.font = "900 47px Arial, sans-serif";
  const title = state.phase === "paused" ? "PAUSED" : state.phase === "game-over" ? "GAME OVER" : "DUNK HIT";
  context.fillText(title, 0, -18);
  context.font = "800 17px Arial, sans-serif";
  context.fillText(
    state.phase === "game-over" ? `${state.message} Tap to restart.` : "Tap to bounce. Drop through the rim.",
    0,
    22,
  );
  if (state.phase === "game-over") {
    context.font = "900 15px Arial, sans-serif";
    context.fillStyle = "#fff0a0";
    context.fillText(`Score ${state.score}  ·  Best ${state.bestScore}`, 0, 52);
  }
  context.restore();
}

function drawScene(context: CanvasRenderingContext2D, state: State, skin: Skin, elapsed: number) {
  context.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground(context, elapsed);

  context.save();
  if (state.shake > 0) {
    context.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawHoopBack(context, state.hoop);
  drawParticles(context, state.particles);
  drawBall(context, state.ball, skin, state.fire);
  drawHoopFront(context, state.hoop);
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

function hudFromState(state: State): HudState {
  return {
    score: state.score,
    bestScore: state.bestScore,
    timeLeft: state.timeLeft,
    phase: state.phase,
    streak: state.streak,
    message: state.message,
  };
}

function shouldPublishHud(previous: HudState, next: State) {
  return (
    previous.score !== next.score ||
    previous.bestScore !== next.bestScore ||
    previous.phase !== next.phase ||
    previous.streak !== next.streak ||
    previous.message !== next.message ||
    Math.abs(previous.timeLeft - next.timeLeft) >= 0.08
  );
}

export function DunkHitGame() {
  const initialBest = readStoredNumber(STORAGE_KEY);
  const initialState = createState(initialBest);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef(initialState);
  const elapsedRef = useRef(0);
  const hudRef = useRef<HudState>(hudFromState(initialState));
  const bestStoredRef = useRef(initialBest);
  const [skinId, setSkinId] = useState(() => readStoredSkin(initialBest));
  const skinRef = useRef<Skin>(SKINS.find((skin) => skin.id === skinId) ?? SKINS[0]!);
  const [hud, setHud] = useState<HudState>(hudFromState(initialState));

  const selectedSkin = SKINS.find((skin) => skin.id === skinId) ?? SKINS[0]!;

  function publish(nextState: State, force = false) {
    stateRef.current = nextState;

    if (nextState.bestScore > bestStoredRef.current) {
      bestStoredRef.current = nextState.bestScore;
      writeStoredNumber(STORAGE_KEY, nextState.bestScore);
    }

    if (force || shouldPublishHud(hudRef.current, nextState)) {
      const nextHud = hudFromState(nextState);
      hudRef.current = nextHud;
      setHud(nextHud);
    }
  }

  function render() {
    const context = contextRef.current;
    if (context) {
      drawScene(context, stateRef.current, skinRef.current, elapsedRef.current);
    }
  }

  function bounce() {
    publish(tapBall(stateRef.current, skinRef.current), true);
    render();
  }

  function restart() {
    publish(startState(stateRef.current), true);
    render();
  }

  function togglePause() {
    const current = stateRef.current;
    if (current.phase === "playing") {
      publish({ ...current, phase: "paused", message: "Paused." }, true);
    } else if (current.phase === "paused") {
      publish({ ...current, phase: "playing", message: "Back in rhythm." }, true);
    }
  }

  function chooseSkin(nextSkin: Skin) {
    if (hud.bestScore < nextSkin.unlockAt) {
      return;
    }

    setSkinId(nextSkin.id);
    skinRef.current = nextSkin;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SKIN_KEY, nextSkin.id);
    }
    render();
  }

  useEffect(() => {
    skinRef.current = selectedSkin;
    render();
  }, [selectedSkin]);

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
      render();
    }

    const handler = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useAnimationFrameLoop((delta, elapsed) => {
    elapsedRef.current = elapsed;
    const next = updateState(stateRef.current, Math.min(delta, 0.032), skinRef.current);
    publish(next);
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

        <div className="grid w-full max-w-[25rem] grid-cols-4 gap-2 rounded-[1.1rem] border border-white/20 bg-[#151638]/80 px-3 py-2 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur md:w-32 md:grid-cols-1">
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
        {hud.message} Tap, click, Space, Enter, W, or Arrow Up to bounce. R restarts and P pauses.
      </GameStatus>

      <TouchControls className="max-w-[18rem]">
        <GameButton variant="touch" className="w-full" onPointerDown={bounce}>
          Bounce
        </GameButton>
      </TouchControls>
    </GamePanel>
  );
}
