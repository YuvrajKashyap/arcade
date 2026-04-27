"use client";

import Matter from "matter-js";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  PINBALL_BALL_RADIUS,
  PINBALL_FLIPPER_HEIGHT,
  PINBALL_FLIPPER_WIDTH,
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

type PinballWorld = {
  engine: Matter.Engine;
  ball: Matter.Body;
  leftFlipper: Matter.Body;
  rightFlipper: Matter.Body;
  plunger: Matter.Body;
  bumpers: Matter.Body[];
};

function getStatusCopy(phase: PinballPhase) {
  if (phase === "playing") {
    return "Hold Space or Plunge to charge the lane. Use A/D or arrows for flippers.";
  }

  if (phase === "paused") {
    return "Paused. Resume without losing the current ball.";
  }

  if (phase === "game-over") {
    return "Last ball drained. Restart for a higher table score.";
  }

  return "Start the table, charge the plunger, and keep the ball above the drain.";
}

function createPinballWorld(onScore: (points: number) => void): PinballWorld {
  const engine = Matter.Engine.create({
    gravity: { x: 0, y: 1.05 },
  });
  const wallOptions = { isStatic: true, restitution: 0.6, friction: 0.02 };

  const walls = [
    Matter.Bodies.rectangle(PINBALL_WIDTH / 2, -12, PINBALL_WIDTH, 24, wallOptions),
    Matter.Bodies.rectangle(-12, PINBALL_HEIGHT / 2, 24, PINBALL_HEIGHT, wallOptions),
    Matter.Bodies.rectangle(PINBALL_WIDTH + 12, PINBALL_HEIGHT / 2, 24, PINBALL_HEIGHT, wallOptions),
    Matter.Bodies.rectangle(86, 650, 165, 18, {
      ...wallOptions,
      angle: 0.48,
    }),
    Matter.Bodies.rectangle(334, 650, 165, 18, {
      ...wallOptions,
      angle: -0.48,
    }),
    Matter.Bodies.rectangle(474, 426, 16, 610, wallOptions),
    Matter.Bodies.rectangle(433, 152, 92, 16, {
      ...wallOptions,
      angle: -0.46,
    }),
  ];

  const bumpers = [
    Matter.Bodies.circle(165, 190, 30, {
      isStatic: true,
      restitution: 1.45,
      label: "bumper",
    }),
    Matter.Bodies.circle(305, 214, 30, {
      isStatic: true,
      restitution: 1.45,
      label: "bumper",
    }),
    Matter.Bodies.circle(236, 336, 34, {
      isStatic: true,
      restitution: 1.4,
      label: "bumper",
    }),
  ];

  const lanes = [
    Matter.Bodies.rectangle(126, 86, 58, 10, {
      isStatic: true,
      angle: 0.38,
      restitution: 1.25,
      label: "lane",
    }),
    Matter.Bodies.rectangle(314, 92, 58, 10, {
      isStatic: true,
      angle: -0.38,
      restitution: 1.25,
      label: "lane",
    }),
  ];

  const leftFlipper = Matter.Bodies.rectangle(
    176,
    646,
    PINBALL_FLIPPER_WIDTH,
    PINBALL_FLIPPER_HEIGHT,
    {
      isStatic: true,
      angle: 0.28,
      restitution: 0.9,
      label: "flipper",
    },
  );
  const rightFlipper = Matter.Bodies.rectangle(
    322,
    646,
    PINBALL_FLIPPER_WIDTH,
    PINBALL_FLIPPER_HEIGHT,
    {
      isStatic: true,
      angle: -0.28,
      restitution: 0.9,
      label: "flipper",
    },
  );
  const plunger = Matter.Bodies.rectangle(474, 690, 42, 18, {
    isStatic: true,
    restitution: 1,
    label: "plunger",
  });
  const ball = Matter.Bodies.circle(474, 604, PINBALL_BALL_RADIUS, {
    restitution: 0.74,
    friction: 0.004,
    frictionAir: 0.004,
    label: "ball",
  });

  Matter.Composite.add(engine.world, [
    ...walls,
    ...bumpers,
    ...lanes,
    leftFlipper,
    rightFlipper,
    plunger,
    ball,
  ]);

  Matter.Events.on(engine, "collisionStart", (event) => {
    for (const pair of event.pairs) {
      const labels = [pair.bodyA.label, pair.bodyB.label];
      if (!labels.includes("ball")) {
        continue;
      }

      if (labels.includes("bumper")) {
        onScore(75);
      } else if (labels.includes("lane")) {
        onScore(125);
      } else if (labels.includes("flipper")) {
        onScore(5);
      }
    }
  });

  return {
    engine,
    ball,
    leftFlipper,
    rightFlipper,
    plunger,
    bumpers,
  };
}

function resetBall(world: PinballWorld) {
  Matter.Body.setPosition(world.ball, { x: 474, y: 604 });
  Matter.Body.setVelocity(world.ball, { x: 0, y: 0 });
  Matter.Body.setAngularVelocity(world.ball, 0);
}

function drawBody(context: CanvasRenderingContext2D, body: Matter.Body, color: string) {
  context.beginPath();
  const firstVertex = body.vertices[0];
  context.moveTo(firstVertex.x, firstVertex.y);
  for (const vertex of body.vertices.slice(1)) {
    context.lineTo(vertex.x, vertex.y);
  }
  context.closePath();
  context.fillStyle = color;
  context.fill();
}

function drawPinballScene(context: CanvasRenderingContext2D, world: PinballWorld, hud: PinballHudState) {
  context.clearRect(0, 0, PINBALL_WIDTH, PINBALL_HEIGHT);
  context.fillStyle = "#070510";
  context.fillRect(0, 0, PINBALL_WIDTH, PINBALL_HEIGHT);

  context.strokeStyle = "rgba(207,181,255,0.18)";
  context.lineWidth = 2;
  context.strokeRect(18, 18, PINBALL_WIDTH - 36, PINBALL_HEIGHT - 36);

  for (const body of Matter.Composite.allBodies(world.engine.world)) {
    if (body.label === "ball") {
      continue;
    }

    drawBody(
      context,
      body,
      body.label === "bumper"
        ? "#ff6b35"
        : body.label === "lane"
          ? "#ffd166"
          : body.label === "flipper"
            ? "#cfb5ff"
            : body.label === "plunger"
              ? "#00a6a6"
              : "rgba(248,250,252,0.22)",
    );
  }

  context.beginPath();
  context.fillStyle = "#f8fafc";
  context.arc(world.ball.position.x, world.ball.position.y, PINBALL_BALL_RADIUS, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "rgba(207,181,255,0.16)";
  context.fillRect(452, 620, 44, 92);
  context.fillStyle = "#cfb5ff";
  context.fillRect(456, 706 - hud.charge * 68, 36, Math.max(4, hud.charge * 68));

  if (hud.phase !== "playing") {
    context.fillStyle = "rgba(7,5,16,0.62)";
    context.fillRect(0, 0, PINBALL_WIDTH, PINBALL_HEIGHT);
    context.textAlign = "center";
    context.fillStyle = "#f8fafc";
    context.font = "600 32px sans-serif";
    context.fillText(
      hud.phase === "game-over" ? "Table tilted" : hud.phase === "paused" ? "Paused" : "Pinball",
      PINBALL_WIDTH / 2,
      PINBALL_HEIGHT / 2 - 10,
    );
    context.font = "500 15px sans-serif";
    context.fillStyle = "rgba(248,250,252,0.76)";
    context.fillText("Press Start, then charge the plunger", PINBALL_WIDTH / 2, PINBALL_HEIGHT / 2 + 22);
  }
}

export function PinballGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const worldRef = useRef<PinballWorld | null>(null);
  const chargeRef = useRef(0);
  const touchRef = useRef({ left: false, right: false, plunger: false });
  const pressedKeysRef = useKeyboardState({
    preventDefaultKeys: ["a", "d", "arrowleft", "arrowright", " ", "arrowdown"],
  });
  const [hudState, setHudState] = useState<PinballHudState>(() => ({
    phase: "idle",
    score: 0,
    bestScore: readStoredNumber(PINBALL_STORAGE_KEY),
    lives: PINBALL_LIVES,
    charge: 0,
  }));
  const hudRef = useRef(hudState);

  function commitHud(nextHud: PinballHudState) {
    hudRef.current = nextHud;
    setHudState(nextHud);
    writeStoredNumber(PINBALL_STORAGE_KEY, nextHud.bestScore);
  }

  const addScore = useEffectEvent((points: number) => {
    const current = hudRef.current;
    if (current.phase !== "playing") {
      return;
    }

    const nextScore = current.score + points;
    commitHud({
      ...current,
      score: nextScore,
      bestScore: Math.max(current.bestScore, nextScore),
    });
  });

  function renderCurrentState() {
    const context = contextRef.current;
    const world = worldRef.current;
    if (context && world) {
      drawPinballScene(context, world, hudRef.current);
    }
  }

  function startGame() {
    const world = worldRef.current;
    if (!world) {
      return;
    }

    resetBall(world);
    commitHud({
      phase: "playing",
      score: hudRef.current.phase === "game-over" ? 0 : hudRef.current.score,
      bestScore: hudRef.current.bestScore,
      lives: hudRef.current.phase === "game-over" ? PINBALL_LIVES : hudRef.current.lives,
      charge: 0,
    });
    renderCurrentState();
  }

  function togglePause() {
    const current = hudRef.current;
    if (current.phase === "playing") {
      commitHud({ ...current, phase: "paused" });
    } else if (current.phase === "paused") {
      commitHud({ ...current, phase: "playing" });
    }
    renderCurrentState();
  }

  function releasePlunger() {
    const world = worldRef.current;
    if (!world || hudRef.current.phase !== "playing" || chargeRef.current <= 0) {
      return;
    }

    Matter.Body.applyForce(world.ball, world.ball.position, {
      x: -0.002 * chargeRef.current,
      y: -0.052 * chargeRef.current,
    });
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

    contextRef.current = configureHiDPICanvas(canvas, PINBALL_WIDTH, PINBALL_HEIGHT);
    worldRef.current = createPinballWorld(addScore);
    renderCurrentState();
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
    const world = worldRef.current;
    if (!world) {
      return;
    }

    const keys = pressedKeysRef.current;
    const leftActive = keys.has("a") || keys.has("arrowleft") || touchRef.current.left;
    const rightActive = keys.has("d") || keys.has("arrowright") || touchRef.current.right;
    const charging = keys.has(" ") || keys.has("arrowdown") || touchRef.current.plunger;
    Matter.Body.setAngle(world.leftFlipper, leftActive ? -0.58 : 0.28);
    Matter.Body.setAngle(world.rightFlipper, rightActive ? 0.58 : -0.28);

    if (hudRef.current.phase === "playing") {
      if (charging) {
        chargeRef.current = clamp(chargeRef.current + deltaSeconds * 0.88, 0, 1);
        if (chargeRef.current !== hudRef.current.charge) {
          commitHud({ ...hudRef.current, charge: chargeRef.current });
        }
      } else if (chargeRef.current > 0) {
        releasePlunger();
      }

      Matter.Body.setPosition(world.plunger, {
        x: 474,
        y: 690 + chargeRef.current * 52,
      });
      Matter.Engine.update(world.engine, deltaSeconds * 1000);

      if (world.ball.position.y > PINBALL_HEIGHT + 36) {
        const nextLives = hudRef.current.lives - 1;
        resetBall(world);
        chargeRef.current = 0;
        commitHud({
          ...hudRef.current,
          lives: Math.max(0, nextLives),
          phase: nextLives <= 0 ? "game-over" : "playing",
          charge: 0,
        });
      }
    }

    renderCurrentState();
  });

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "Score", value: hudState.score },
          { label: "Best", value: hudState.bestScore },
          { label: "Balls", value: hudState.lives },
          { label: "Charge", value: `${Math.round(hudState.charge * 100)}%` },
          { label: "Status", value: hudState.phase },
        ]}
        actions={
          <>
            <GameButton variant="primary" onClick={startGame}>
              {hudState.phase === "game-over" ? "Restart" : "Start"}
            </GameButton>
            <GameButton onClick={togglePause}>
              {hudState.phase === "paused" ? "Resume" : "Pause"}
            </GameButton>
          </>
        }
      />

      <GamePlayfield className="mx-auto aspect-[13/19] w-full max-w-[32rem]">
        <canvas ref={canvasRef} className="h-full w-full" aria-label="Pinball table" />
      </GamePlayfield>

      <GameStatus>{getStatusCopy(hudState.phase)}</GameStatus>

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
