"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  PINBALL_BALL_RADIUS,
  PINBALL_BALL_SAVE_SECONDS,
  PINBALL_HEIGHT,
  PINBALL_LIVES,
  PINBALL_STORAGE_KEY,
  PINBALL_WIDTH,
} from "@/features/games/pinball/config/constants";
import type { PinballHudState, PinballPhase } from "@/features/games/pinball/types";
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
import { clamp } from "@/features/games/shared/utils/math";

type Vector = { x: number; y: number };
type Segment = { a: Vector; b: Vector; bounce?: number; color?: string };
type Bumper = { x: number; y: number; radius: number; points: number; color: string };
type Target = { x: number; y: number; width: number; height: number; points: number };
type FlipperSide = "left" | "right";
type Ball = Vector & { vx: number; vy: number };

const LAUNCH_X = 472;
const LAUNCH_Y = 640;
const GRAVITY = 680;
const MAX_SPEED = 980;
const TABLE: Segment[] = [
  { a: { x: 42, y: 52 }, b: { x: 42, y: 704 }, bounce: 0.88 },
  { a: { x: 420, y: 52 }, b: { x: 420, y: 704 }, bounce: 0.88 },
  { a: { x: 42, y: 52 }, b: { x: 420, y: 52 }, bounce: 0.9 },
  { a: { x: 420, y: 52 }, b: { x: 494, y: 126 }, bounce: 0.9 },
  { a: { x: 42, y: 188 }, b: { x: 132, y: 98 }, bounce: 1.05, color: "#ffd166" },
  { a: { x: 420, y: 188 }, b: { x: 330, y: 98 }, bounce: 1.05, color: "#ffd166" },
  { a: { x: 74, y: 560 }, b: { x: 172, y: 620 }, bounce: 1.1, color: "#ff6b35" },
  { a: { x: 388, y: 560 }, b: { x: 290, y: 620 }, bounce: 1.1, color: "#ff6b35" },
  { a: { x: 42, y: 704 }, b: { x: 130, y: 704 }, bounce: 0.92 },
  { a: { x: 332, y: 704 }, b: { x: 420, y: 704 }, bounce: 0.92 },
  { a: { x: 452, y: 112 }, b: { x: 452, y: 704 }, bounce: 0.86, color: "#00a6a6" },
  { a: { x: 496, y: 96 }, b: { x: 496, y: 704 }, bounce: 0.86, color: "#00a6a6" },
  { a: { x: 452, y: 112 }, b: { x: 496, y: 96 }, bounce: 0.86, color: "#00a6a6" },
];
const BUMPERS: Bumper[] = [
  { x: 160, y: 210, radius: 31, points: 120, color: "#ff6b35" },
  { x: 300, y: 230, radius: 31, points: 120, color: "#ff6b35" },
  { x: 230, y: 350, radius: 36, points: 160, color: "#ff6b35" },
];
const TARGETS: Target[] = [
  { x: 112, y: 450, width: 18, height: 64, points: 220 },
  { x: 332, y: 450, width: 18, height: 64, points: 220 },
  { x: 190, y: 490, width: 82, height: 16, points: 300 },
];

function length(vector: Vector) {
  return Math.hypot(vector.x, vector.y);
}

function normalize(vector: Vector) {
  const value = length(vector) || 1;
  return { x: vector.x / value, y: vector.y / value };
}

function dot(left: Vector, right: Vector) {
  return left.x * right.x + left.y * right.y;
}

function getFlipper(side: FlipperSide, active: boolean): Segment {
  if (side === "left") {
    return active
      ? { a: { x: 142, y: 662 }, b: { x: 242, y: 630 }, bounce: 1.08, color: "#cfb5ff" }
      : { a: { x: 142, y: 662 }, b: { x: 232, y: 682 }, bounce: 1.02, color: "#cfb5ff" };
  }

  return active
    ? { a: { x: 320, y: 662 }, b: { x: 220, y: 630 }, bounce: 1.08, color: "#cfb5ff" }
    : { a: { x: 320, y: 662 }, b: { x: 230, y: 682 }, bounce: 1.02, color: "#cfb5ff" };
}

function getStatusCopy(phase: PinballPhase, ballSave: number) {
  if (phase === "playing") {
    return ballSave > 0
      ? `Ball save is live for ${Math.ceil(ballSave)}s. Hit bumpers, slingshots, and drop targets.`
      : "Keep the ball above the flippers. Clean late flips send it back into the top field.";
  }

  if (phase === "paused") {
    return "Paused. Resume without losing the current ball.";
  }

  if (phase === "game-over") {
    return "Last ball drained. Restart for another run.";
  }

  return "Hold Space or Plunge to charge. Release to launch, then use A/D or arrows for flippers.";
}

function createBall(): Ball {
  return { x: LAUNCH_X, y: LAUNCH_Y, vx: 0, vy: 0 };
}

function collideSegment(ball: Ball, segment: Segment, activeKick = 0) {
  const ab = { x: segment.b.x - segment.a.x, y: segment.b.y - segment.a.y };
  const ap = { x: ball.x - segment.a.x, y: ball.y - segment.a.y };
  const t = clamp(dot(ap, ab) / Math.max(dot(ab, ab), 1), 0, 1);
  const closest = { x: segment.a.x + ab.x * t, y: segment.a.y + ab.y * t };
  const delta = { x: ball.x - closest.x, y: ball.y - closest.y };
  const distance = length(delta);

  if (distance >= PINBALL_BALL_RADIUS || distance === 0) {
    return false;
  }

  const normal = normalize(delta);
  const velocity = { x: ball.vx, y: ball.vy };
  const normalVelocity = dot(velocity, normal);

  ball.x = closest.x + normal.x * PINBALL_BALL_RADIUS;
  ball.y = closest.y + normal.y * PINBALL_BALL_RADIUS;

  if (normalVelocity < 0) {
    const bounce = segment.bounce ?? 0.9;
    ball.vx = velocity.x - (1 + bounce) * normalVelocity * normal.x;
    ball.vy = velocity.y - (1 + bounce) * normalVelocity * normal.y;
    ball.vy -= activeKick;
    ball.vx += normal.x * activeKick * 0.26;
  }

  return true;
}

function collideBumper(ball: Ball, bumper: Bumper) {
  const delta = { x: ball.x - bumper.x, y: ball.y - bumper.y };
  const distance = length(delta);
  const minimumDistance = PINBALL_BALL_RADIUS + bumper.radius;

  if (distance >= minimumDistance || distance === 0) {
    return false;
  }

  const normal = normalize(delta);
  ball.x = bumper.x + normal.x * minimumDistance;
  ball.y = bumper.y + normal.y * minimumDistance;
  ball.vx = normal.x * 560 + ball.vx * 0.2;
  ball.vy = normal.y * 560 + ball.vy * 0.2;
  return true;
}

function collideTarget(ball: Ball, target: Target) {
  const nearestX = clamp(ball.x, target.x, target.x + target.width);
  const nearestY = clamp(ball.y, target.y, target.y + target.height);
  const delta = { x: ball.x - nearestX, y: ball.y - nearestY };

  if (length(delta) >= PINBALL_BALL_RADIUS) {
    return false;
  }

  const normal = normalize(delta.x === 0 && delta.y === 0 ? { x: 0, y: -1 } : delta);
  ball.x = nearestX + normal.x * PINBALL_BALL_RADIUS;
  ball.y = nearestY + normal.y * PINBALL_BALL_RADIUS;
  const normalVelocity = dot({ x: ball.vx, y: ball.vy }, normal);
  if (normalVelocity < 0) {
    ball.vx -= 1.9 * normalVelocity * normal.x;
    ball.vy -= 1.9 * normalVelocity * normal.y;
  }
  return true;
}

function clampSpeed(ball: Ball) {
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed <= MAX_SPEED) {
    return;
  }

  const ratio = MAX_SPEED / speed;
  ball.vx *= ratio;
  ball.vy *= ratio;
}

function drawSegment(context: CanvasRenderingContext2D, segment: Segment, width = 16) {
  context.strokeStyle = segment.color ?? "rgba(248,250,252,0.22)";
  context.lineWidth = width;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(segment.a.x, segment.a.y);
  context.lineTo(segment.b.x, segment.b.y);
  context.stroke();
}

function drawPinballScene(
  context: CanvasRenderingContext2D,
  ball: Ball,
  hud: PinballHudState,
  leftActive: boolean,
  rightActive: boolean,
) {
  const gradient = context.createLinearGradient(0, 0, 0, PINBALL_HEIGHT);
  gradient.addColorStop(0, "#120a21");
  gradient.addColorStop(0.5, "#08111f");
  gradient.addColorStop(1, "#05040b");
  context.fillStyle = gradient;
  context.fillRect(0, 0, PINBALL_WIDTH, PINBALL_HEIGHT);

  context.strokeStyle = "rgba(207,181,255,0.2)";
  context.lineWidth = 2;
  context.strokeRect(24, 24, PINBALL_WIDTH - 48, PINBALL_HEIGHT - 48);

  context.fillStyle = "rgba(0,166,166,0.12)";
  context.fillRect(452, 96, 44, 608);
  context.fillStyle = "#00a6a6";
  context.fillRect(452, 686, 44, 18);
  context.fillStyle = "rgba(248,250,252,0.74)";
  context.font = "700 12px sans-serif";
  context.textAlign = "center";
  context.fillText("LANE", 474, 86);

  for (const segment of TABLE) {
    drawSegment(context, segment, segment.color ? 14 : 16);
  }

  for (const bumper of BUMPERS) {
    context.beginPath();
    context.fillStyle = bumper.color;
    context.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
    context.fill();
    context.lineWidth = 4;
    context.strokeStyle = "#ffd166";
    context.stroke();
    context.beginPath();
    context.fillStyle = "#ffd166";
    context.arc(bumper.x, bumper.y, bumper.radius * 0.38, 0, Math.PI * 2);
    context.fill();
  }

  for (const target of TARGETS) {
    context.fillStyle = "#00a6a6";
    context.fillRect(target.x, target.y, target.width, target.height);
  }
  context.fillStyle = "rgba(248,250,252,0.7)";
  context.fillText("DROP TARGETS", 231, 536);

  drawSegment(context, getFlipper("left", leftActive), 18);
  drawSegment(context, getFlipper("right", rightActive), 18);

  if (hud.ballSave > 0 && hud.phase === "playing") {
    context.fillStyle = "rgba(0,166,166,0.18)";
    context.fillRect(132, 718, 198, 10);
    context.fillStyle = "#00a6a6";
    context.fillRect(132, 718, 198 * clamp(hud.ballSave / PINBALL_BALL_SAVE_SECONDS, 0, 1), 10);
  }

  context.beginPath();
  context.shadowColor = "rgba(248,250,252,0.58)";
  context.shadowBlur = 14;
  context.fillStyle = "#f8fafc";
  context.arc(ball.x, ball.y, PINBALL_BALL_RADIUS, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;

  if (hud.phase !== "playing") {
    context.fillStyle = "rgba(5,4,11,0.66)";
    context.fillRect(0, 0, PINBALL_WIDTH, PINBALL_HEIGHT);
    context.fillStyle = "#f8fafc";
    context.font = "700 34px sans-serif";
    context.fillText(
      hud.phase === "game-over" ? "Run over" : hud.phase === "paused" ? "Paused" : "Pinball",
      PINBALL_WIDTH / 2,
      PINBALL_HEIGHT / 2 - 12,
    );
    context.font = "500 15px sans-serif";
    context.fillStyle = "rgba(248,250,252,0.78)";
    context.fillText("Charge the plunger, launch, then keep it alive", PINBALL_WIDTH / 2, PINBALL_HEIGHT / 2 + 20);
  }
}

export function PinballGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const ballRef = useRef<Ball>(createBall());
  const chargeRef = useRef(0);
  const leftWasActiveRef = useRef(false);
  const rightWasActiveRef = useRef(false);
  const touchRef = useRef({ left: false, right: false, plunger: false });
  const pressedKeysRef = useKeyboardState({
    preventDefaultKeys: ["a", "d", "arrowleft", "arrowright", " ", "arrowdown", "s"],
  });
  const [hudState, setHudState] = useState<PinballHudState>(() => ({
    phase: "idle",
    score: 0,
    bestScore: readStoredNumber(PINBALL_STORAGE_KEY),
    lives: PINBALL_LIVES,
    charge: 0,
    ballSave: 0,
    combo: 1,
  }));
  const hudRef = useRef(hudState);

  function commitHud(nextHud: PinballHudState) {
    hudRef.current = nextHud;
    setHudState(nextHud);
    writeStoredNumber(PINBALL_STORAGE_KEY, nextHud.bestScore);
  }

  function score(points: number) {
    const current = hudRef.current;
    if (current.phase !== "playing") {
      return;
    }

    const nextScore = current.score + points * current.combo;
    commitHud({
      ...current,
      score: nextScore,
      bestScore: Math.max(current.bestScore, nextScore),
      combo: Math.min(current.combo + 1, 9),
    });
  }

  function serve(resetScore: boolean) {
    ballRef.current = createBall();
    chargeRef.current = 0;
    leftWasActiveRef.current = false;
    rightWasActiveRef.current = false;
    commitHud({
      phase: "playing",
      score: resetScore ? 0 : hudRef.current.score,
      bestScore: hudRef.current.bestScore,
      lives: resetScore ? PINBALL_LIVES : hudRef.current.lives,
      charge: 0,
      ballSave: PINBALL_BALL_SAVE_SECONDS,
      combo: 1,
    });
  }

  function startGame() {
    const current = hudRef.current;
    if (current.phase === "playing") {
      return;
    }

    if (current.phase === "paused") {
      commitHud({ ...current, phase: "playing" });
      return;
    }

    serve(current.phase === "game-over");
  }

  function togglePause() {
    const current = hudRef.current;
    if (current.phase === "playing") {
      commitHud({ ...current, phase: "paused" });
    } else if (current.phase === "paused") {
      commitHud({ ...current, phase: "playing" });
    }
  }

  function releasePlunger() {
    const ball = ballRef.current;
    if (hudRef.current.phase !== "playing" || chargeRef.current <= 0) {
      return;
    }

    ball.x = 386;
    ball.y = 142;
    ball.vx = -300 - chargeRef.current * 180;
    ball.vy = -120 - chargeRef.current * 180;
    chargeRef.current = 0;
    commitHud({ ...hudRef.current, charge: 0 });
  }

  const handleKeyboardInput = useEffectEvent((event: KeyboardEvent) => {
    const normalizedKey = event.key.toLowerCase();
    if (normalizedKey === "s") {
      event.preventDefault();
      startGame();
      return;
    }

    if (normalizedKey === "p") {
      event.preventDefault();
      togglePause();
      return;
    }

    if ((normalizedKey === " " || normalizedKey === "arrowdown") && event.type === "keyup") {
      releasePlunger();
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = configureHiDPICanvas(canvas, PINBALL_WIDTH, PINBALL_HEIGHT);
    if (!context) {
      return;
    }

    contextRef.current = context;
    drawPinballScene(context, ballRef.current, hudRef.current, false, false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => handleKeyboardInput(event);
    const handleKeyUp = (event: KeyboardEvent) => handleKeyboardInput(event);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useAnimationFrameLoop((deltaSeconds) => {
    const context = contextRef.current;
    if (!context) {
      return;
    }

    const keys = pressedKeysRef.current;
    const leftActive = keys.has("a") || keys.has("arrowleft") || touchRef.current.left;
    const rightActive = keys.has("d") || keys.has("arrowright") || touchRef.current.right;
    const charging = keys.has(" ") || keys.has("arrowdown") || touchRef.current.plunger;
    const ball = ballRef.current;

    if (hudRef.current.phase === "playing") {
      if (charging && ball.x > 438 && ball.y > 540) {
        chargeRef.current = clamp(chargeRef.current + deltaSeconds * 0.95, 0, 1);
        if (Math.abs(chargeRef.current - hudRef.current.charge) > 0.01) {
          commitHud({ ...hudRef.current, charge: chargeRef.current });
        }
      } else if (chargeRef.current > 0) {
        releasePlunger();
      }

      const steps = 4;
      const stepSeconds = deltaSeconds / steps;
      for (let step = 0; step < steps; step += 1) {
        ball.vy += GRAVITY * stepSeconds;
        ball.x += ball.vx * stepSeconds;
        ball.y += ball.vy * stepSeconds;

        for (const segment of TABLE) {
          if (collideSegment(ball, segment)) {
            if (segment.color === "#ffd166") {
              score(80);
            } else if (segment.color === "#ff6b35") {
              score(60);
            }
          }
        }

        const flipperKick = 430;
        if (collideSegment(ball, getFlipper("left", leftActive), leftActive ? flipperKick : 0)) {
          if (leftActive && !leftWasActiveRef.current) score(20);
        }
        if (collideSegment(ball, getFlipper("right", rightActive), rightActive ? flipperKick : 0)) {
          if (rightActive && !rightWasActiveRef.current) score(20);
        }

        for (const bumper of BUMPERS) {
          if (collideBumper(ball, bumper)) {
            score(bumper.points);
          }
        }

        for (const target of TARGETS) {
          if (collideTarget(ball, target)) {
            score(target.points);
          }
        }

        if (ball.x > 496 - PINBALL_BALL_RADIUS && ball.x < PINBALL_WIDTH) {
          ball.x = 496 - PINBALL_BALL_RADIUS;
          ball.vx = -Math.abs(ball.vx) * 0.82;
        }
        if (ball.x < PINBALL_BALL_RADIUS) {
          ball.x = PINBALL_BALL_RADIUS;
          ball.vx = Math.abs(ball.vx) * 0.82;
        }
        if (ball.y < PINBALL_BALL_RADIUS) {
          ball.y = PINBALL_BALL_RADIUS;
          ball.vy = Math.abs(ball.vy) * 0.82;
        }

        clampSpeed(ball);
      }

      leftWasActiveRef.current = leftActive;
      rightWasActiveRef.current = rightActive;

      const nextBallSave = Math.max(0, hudRef.current.ballSave - deltaSeconds);
      if (Math.floor(nextBallSave * 10) !== Math.floor(hudRef.current.ballSave * 10)) {
        commitHud({ ...hudRef.current, ballSave: nextBallSave });
      }

      if (ball.y > PINBALL_HEIGHT + 18) {
        if (hudRef.current.ballSave > 0) {
          ballRef.current = createBall();
          chargeRef.current = 0;
          commitHud({ ...hudRef.current, charge: 0, combo: 1, ballSave: 4 });
        } else {
          const nextLives = hudRef.current.lives - 1;
          ballRef.current = createBall();
          chargeRef.current = 0;
          commitHud({
            ...hudRef.current,
            lives: Math.max(0, nextLives),
            phase: nextLives <= 0 ? "game-over" : "playing",
            charge: 0,
            combo: 1,
            ballSave: nextLives <= 0 ? 0 : 6,
          });
        }
      }
    }

    drawPinballScene(context, ballRef.current, hudRef.current, leftActive, rightActive);
  });

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "Score", value: hudState.score },
          { label: "Best", value: hudState.bestScore },
          { label: "Balls", value: hudState.lives },
          { label: "Combo", value: `${hudState.combo}x` },
          { label: "Save", value: hudState.ballSave > 0 ? `${Math.ceil(hudState.ballSave)}s` : "Off" },
          { label: "Charge", value: `${Math.round(hudState.charge * 100)}%` },
        ]}
        actions={
          <>
            <GameButton variant="primary" onClick={startGame}>
              {hudState.phase === "playing"
                ? "Playing"
                : hudState.phase === "paused"
                  ? "Resume"
                  : hudState.phase === "game-over"
                    ? "Restart"
                    : "Start"}
            </GameButton>
            <GameButton onClick={togglePause}>
              {hudState.phase === "paused" ? "Resume" : "Pause"}
            </GameButton>
          </>
        }
      />

      <GamePlayfield className="mx-auto aspect-[13/19] w-full max-w-[25rem]">
        <canvas ref={canvasRef} className="h-full w-full" aria-label="Pinball table" />
      </GamePlayfield>

      <GameStatus>{getStatusCopy(hudState.phase, hudState.ballSave)}</GameStatus>

      <TouchControls className="max-w-[26rem]">
        <div className="grid grid-cols-3 gap-2">
          <GameButton
            variant="touch"
            className="rounded-2xl"
            onPointerDown={() => {
              touchRef.current.left = true;
            }}
            onPointerUp={() => {
              touchRef.current.left = false;
            }}
            onPointerLeave={() => {
              touchRef.current.left = false;
            }}
          >
            Left
          </GameButton>
          <GameButton
            variant="touch"
            className="rounded-2xl"
            onPointerDown={() => {
              touchRef.current.plunger = true;
              startGame();
            }}
            onPointerUp={() => {
              touchRef.current.plunger = false;
              releasePlunger();
            }}
            onPointerLeave={() => {
              touchRef.current.plunger = false;
              releasePlunger();
            }}
          >
            Plunge
          </GameButton>
          <GameButton
            variant="touch"
            className="rounded-2xl"
            onPointerDown={() => {
              touchRef.current.right = true;
            }}
            onPointerUp={() => {
              touchRef.current.right = false;
            }}
            onPointerLeave={() => {
              touchRef.current.right = false;
            }}
          >
            Right
          </GameButton>
        </div>
      </TouchControls>
    </GamePanel>
  );
}
