"use client";

import Matter from "matter-js";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import {
  PINBALL_BALL_RADIUS,
  PINBALL_BALL_SAVE_SECONDS,
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
  targets: Matter.Body[];
  slingshots: Matter.Body[];
  lanes: Matter.Body[];
};

type ImpactKind = "bumper" | "target" | "lane" | "slingshot" | "flipper";

const LAUNCH_X = 474;
const LAUNCH_Y = 610;
const LEFT_FLIPPER_REST = 0.22;
const LEFT_FLIPPER_ACTIVE = -0.72;
const RIGHT_FLIPPER_REST = -0.22;
const RIGHT_FLIPPER_ACTIVE = 0.72;

function getStatusCopy(phase: PinballPhase, ballSave: number) {
  if (phase === "playing") {
    if (ballSave > 0) {
      return `Ball save is live for ${Math.ceil(ballSave)}s. Launch hard and aim for bumpers, lanes, and drop targets.`;
    }

    return "Keep the ball above the flippers. Late flips send it up the ramps; lane and target chains build combo.";
  }

  if (phase === "paused") {
    return "Paused. Resume without losing the current ball.";
  }

  if (phase === "game-over") {
    return "Last ball drained. Restart for another table run.";
  }

  return "Hold Space or Plunge to charge. Release to launch, then use A/D or arrows for flippers.";
}

function createWall(
  x: number,
  y: number,
  width: number,
  height: number,
  angle = 0,
  label = "wall",
) {
  return Matter.Bodies.rectangle(x, y, width, height, {
    isStatic: true,
    angle,
    restitution: 0.72,
    friction: 0.01,
    label,
  });
}

function createPinballWorld(onImpact: (kind: ImpactKind) => void): PinballWorld {
  const engine = Matter.Engine.create({
    gravity: { x: 0, y: 0.72 },
  });

  const walls = [
    createWall(PINBALL_WIDTH / 2, -12, PINBALL_WIDTH, 24),
    createWall(11, PINBALL_HEIGHT / 2, 22, PINBALL_HEIGHT),
    createWall(PINBALL_WIDTH + 11, PINBALL_HEIGHT / 2, 22, PINBALL_HEIGHT),
    createWall(252, 28, 355, 18, 0.05),
    createWall(96, 88, 118, 16, 0.52),
    createWall(338, 88, 118, 16, -0.52),
    createWall(70, 366, 16, 420, -0.08),
    createWall(386, 368, 16, 430, 0.08),
    createWall(462, 450, 16, 520),
    createWall(432, 116, 100, 16, -0.58),
    createWall(116, 600, 154, 18, 0.62, "return"),
    createWall(336, 600, 154, 18, -0.62, "return"),
    createWall(30, 668, 116, 18, 0.86, "outlane"),
    createWall(420, 668, 116, 18, -0.86, "outlane"),
  ];

  const bumpers = [
    Matter.Bodies.circle(158, 184, 30, {
      isStatic: true,
      restitution: 1.72,
      label: "bumper",
    }),
    Matter.Bodies.circle(292, 206, 32, {
      isStatic: true,
      restitution: 1.72,
      label: "bumper",
    }),
    Matter.Bodies.circle(224, 328, 36, {
      isStatic: true,
      restitution: 1.62,
      label: "bumper",
    }),
  ];

  const lanes = [
    createWall(126, 116, 58, 10, 0.28, "lane"),
    createWall(220, 103, 58, 10, 0, "lane"),
    createWall(314, 116, 58, 10, -0.28, "lane"),
  ];

  const targets = [
    createWall(116, 438, 18, 60, 0.2, "target"),
    createWall(342, 438, 18, 60, -0.2, "target"),
    createWall(244, 474, 72, 14, 0, "target"),
  ];

  const slingshots = [
    createWall(128, 548, 92, 18, 0.48, "slingshot"),
    createWall(326, 548, 92, 18, -0.48, "slingshot"),
  ];

  const leftFlipper = Matter.Bodies.rectangle(
    170,
    666,
    PINBALL_FLIPPER_WIDTH,
    PINBALL_FLIPPER_HEIGHT,
    {
      isStatic: true,
      angle: LEFT_FLIPPER_REST,
      restitution: 1.08,
      friction: 0,
      label: "flipper",
    },
  );
  const rightFlipper = Matter.Bodies.rectangle(
    322,
    666,
    PINBALL_FLIPPER_WIDTH,
    PINBALL_FLIPPER_HEIGHT,
    {
      isStatic: true,
      angle: RIGHT_FLIPPER_REST,
      restitution: 1.08,
      friction: 0,
      label: "flipper",
    },
  );
  const plunger = Matter.Bodies.rectangle(474, 694, 42, 20, {
    isStatic: true,
    restitution: 1.2,
    friction: 0,
    label: "plunger",
  });
  const ball = Matter.Bodies.circle(LAUNCH_X, LAUNCH_Y, PINBALL_BALL_RADIUS, {
    density: 0.0022,
    restitution: 0.86,
    friction: 0,
    frictionAir: 0.0026,
    label: "ball",
  });

  Matter.Composite.add(engine.world, [
    ...walls,
    ...bumpers,
    ...lanes,
    ...targets,
    ...slingshots,
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
        onImpact("bumper");
      } else if (labels.includes("target")) {
        onImpact("target");
      } else if (labels.includes("lane")) {
        onImpact("lane");
      } else if (labels.includes("slingshot")) {
        onImpact("slingshot");
      } else if (labels.includes("flipper")) {
        onImpact("flipper");
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
    targets,
    slingshots,
    lanes,
  };
}

function resetBall(world: PinballWorld) {
  Matter.Body.setPosition(world.ball, { x: LAUNCH_X, y: LAUNCH_Y });
  Matter.Body.setVelocity(world.ball, { x: 0, y: 0 });
  Matter.Body.setAngularVelocity(world.ball, 0);
  Matter.Body.setAngle(world.ball, 0);
}

function drawBody(
  context: CanvasRenderingContext2D,
  body: Matter.Body,
  fill: string,
  stroke = "rgba(255,255,255,0.08)",
) {
  context.beginPath();
  const firstVertex = body.vertices[0];
  context.moveTo(firstVertex.x, firstVertex.y);
  for (const vertex of body.vertices.slice(1)) {
    context.lineTo(vertex.x, vertex.y);
  }
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = stroke;
  context.lineWidth = 1.5;
  context.stroke();
}

function drawCircleTarget(
  context: CanvasRenderingContext2D,
  body: Matter.Body,
  fill: string,
  ring: string,
) {
  context.beginPath();
  context.fillStyle = fill;
  context.arc(body.position.x, body.position.y, body.circleRadius ?? 28, 0, Math.PI * 2);
  context.fill();
  context.lineWidth = 4;
  context.strokeStyle = ring;
  context.stroke();
  context.beginPath();
  context.arc(body.position.x, body.position.y, (body.circleRadius ?? 28) * 0.42, 0, Math.PI * 2);
  context.fillStyle = ring;
  context.fill();
}

function drawPinballScene(
  context: CanvasRenderingContext2D,
  world: PinballWorld,
  hud: PinballHudState,
) {
  context.clearRect(0, 0, PINBALL_WIDTH, PINBALL_HEIGHT);

  const tableGradient = context.createLinearGradient(0, 0, 0, PINBALL_HEIGHT);
  tableGradient.addColorStop(0, "#120a21");
  tableGradient.addColorStop(0.52, "#08111f");
  tableGradient.addColorStop(1, "#05040b");
  context.fillStyle = tableGradient;
  context.fillRect(0, 0, PINBALL_WIDTH, PINBALL_HEIGHT);

  context.strokeStyle = "rgba(207,181,255,0.18)";
  context.lineWidth = 2;
  context.strokeRect(18, 18, PINBALL_WIDTH - 36, PINBALL_HEIGHT - 36);

  context.fillStyle = "rgba(0,166,166,0.12)";
  context.fillRect(452, 78, 44, 650);
  context.fillStyle = "rgba(207,181,255,0.18)";
  context.fillRect(456, 704 - hud.charge * 84, 36, Math.max(5, hud.charge * 84));

  for (const body of Matter.Composite.allBodies(world.engine.world)) {
    if (body.label === "ball" || body.label === "bumper") {
      continue;
    }

    const fill =
      body.label === "lane"
        ? "#ffd166"
        : body.label === "target"
          ? "#00a6a6"
          : body.label === "slingshot"
            ? "#ff6b35"
            : body.label === "flipper"
              ? "#cfb5ff"
              : body.label === "plunger"
                ? "#00a6a6"
                : "rgba(248,250,252,0.2)";
    drawBody(context, body, fill);
  }

  for (const bumper of world.bumpers) {
    drawCircleTarget(context, bumper, "#ff6b35", "#ffd166");
  }

  context.beginPath();
  context.fillStyle = "#f8fafc";
  context.shadowColor = "rgba(248,250,252,0.55)";
  context.shadowBlur = 14;
  context.arc(world.ball.position.x, world.ball.position.y, PINBALL_BALL_RADIUS, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;

  context.fillStyle = "rgba(248,250,252,0.72)";
  context.font = "700 12px sans-serif";
  context.textAlign = "center";
  context.fillText("LANE", 474, 64);
  context.fillText("DROP TARGETS", 244, 512);

  if (hud.ballSave > 0 && hud.phase === "playing") {
    context.fillStyle = "rgba(0,166,166,0.18)";
    context.fillRect(132, 704, 250, 10);
    context.fillStyle = "#00a6a6";
    context.fillRect(132, 704, 250 * clamp(hud.ballSave / PINBALL_BALL_SAVE_SECONDS, 0, 1), 10);
  }

  if (hud.phase !== "playing") {
    context.fillStyle = "rgba(5,4,11,0.66)";
    context.fillRect(0, 0, PINBALL_WIDTH, PINBALL_HEIGHT);
    context.textAlign = "center";
    context.fillStyle = "#f8fafc";
    context.font = "700 34px sans-serif";
    context.fillText(
      hud.phase === "game-over" ? "Run over" : hud.phase === "paused" ? "Paused" : "Pinball",
      PINBALL_WIDTH / 2,
      PINBALL_HEIGHT / 2 - 14,
    );
    context.font = "500 15px sans-serif";
    context.fillStyle = "rgba(248,250,252,0.78)";
    context.fillText("Charge the plunger, then keep the combo alive", PINBALL_WIDTH / 2, PINBALL_HEIGHT / 2 + 20);
  }
}

export function PinballGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const worldRef = useRef<PinballWorld | null>(null);
  const chargeRef = useRef(0);
  const leftFlipLockRef = useRef(false);
  const rightFlipLockRef = useRef(false);
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

  const commitHud = useCallback((nextHud: PinballHudState) => {
    hudRef.current = nextHud;
    setHudState(nextHud);
    writeStoredNumber(PINBALL_STORAGE_KEY, nextHud.bestScore);
  }, []);

  const addScore = useCallback((kind: ImpactKind) => {
    const current = hudRef.current;
    if (current.phase !== "playing") {
      return;
    }

    const basePoints =
      kind === "bumper"
        ? 120
        : kind === "target"
          ? 180
          : kind === "lane"
            ? 250
            : kind === "slingshot"
              ? 80
              : 10;
    const nextCombo = kind === "flipper" ? current.combo : Math.min(current.combo + 1, 9);
    const nextScore = current.score + basePoints * current.combo;
    commitHud({
      ...current,
      score: nextScore,
      bestScore: Math.max(current.bestScore, nextScore),
      combo: nextCombo,
    });
  }, [commitHud]);

  function renderCurrentState() {
    const context = contextRef.current;
    const world = worldRef.current;
    if (context && world) {
      drawPinballScene(context, world, hudRef.current);
    }
  }

  function serveBall(resetScore: boolean) {
    const world = worldRef.current;
    if (!world) {
      return;
    }

    resetBall(world);
    chargeRef.current = 0;
    leftFlipLockRef.current = false;
    rightFlipLockRef.current = false;
    commitHud({
      phase: "playing",
      score: resetScore ? 0 : hudRef.current.score,
      bestScore: hudRef.current.bestScore,
      lives: resetScore ? PINBALL_LIVES : hudRef.current.lives,
      charge: 0,
      ballSave: PINBALL_BALL_SAVE_SECONDS,
      combo: 1,
    });
    renderCurrentState();
  }

  function startGame() {
    serveBall(hudRef.current.phase === "game-over");
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

    Matter.Body.setVelocity(world.ball, {
      x: -5.5 - chargeRef.current * 4.5,
      y: -28 - chargeRef.current * 20,
    });
    Matter.Body.setPosition(world.ball, { x: LAUNCH_X, y: LAUNCH_Y - 16 });
    chargeRef.current = 0;
    commitHud({ ...hudRef.current, charge: 0 });
  }

  function applyFlipperKick(leftActive: boolean, rightActive: boolean) {
    const world = worldRef.current;
    if (!world || hudRef.current.phase !== "playing") {
      return;
    }

    const ball = world.ball;
    const leftDistance = Matter.Vector.magnitude(
      Matter.Vector.sub(ball.position, { x: 170, y: 656 }),
    );
    const rightDistance = Matter.Vector.magnitude(
      Matter.Vector.sub(ball.position, { x: 322, y: 656 }),
    );

    if (leftActive && !leftFlipLockRef.current && leftDistance < 98) {
      Matter.Body.setVelocity(ball, {
        x: Math.max(ball.velocity.x + 9, 7),
        y: Math.min(ball.velocity.y - 20, -16),
      });
      Matter.Body.setPosition(ball, {
        x: Math.max(ball.position.x, 132),
        y: Math.min(ball.position.y, 648),
      });
      addScore("flipper");
    }

    if (rightActive && !rightFlipLockRef.current && rightDistance < 98) {
      Matter.Body.setVelocity(ball, {
        x: Math.min(ball.velocity.x - 9, -7),
        y: Math.min(ball.velocity.y - 20, -16),
      });
      Matter.Body.setPosition(ball, {
        x: Math.min(ball.position.x, 360),
        y: Math.min(ball.position.y, 648),
      });
      addScore("flipper");
    }

    leftFlipLockRef.current = leftActive;
    rightFlipLockRef.current = rightActive;
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
  }, [addScore]);

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
    Matter.Body.setAngle(world.leftFlipper, leftActive ? LEFT_FLIPPER_ACTIVE : LEFT_FLIPPER_REST);
    Matter.Body.setAngle(world.rightFlipper, rightActive ? RIGHT_FLIPPER_ACTIVE : RIGHT_FLIPPER_REST);
    applyFlipperKick(leftActive, rightActive);

    if (hudRef.current.phase === "playing") {
      if (charging && world.ball.position.x > 438 && world.ball.position.y > 536) {
        chargeRef.current = clamp(chargeRef.current + deltaSeconds * 0.92, 0, 1);
        if (Math.abs(chargeRef.current - hudRef.current.charge) > 0.01) {
          commitHud({ ...hudRef.current, charge: chargeRef.current });
        }
      } else if (chargeRef.current > 0) {
        releasePlunger();
      }

      Matter.Body.setPosition(world.plunger, {
        x: LAUNCH_X,
        y: 694 + chargeRef.current * 54,
      });
      Matter.Engine.update(world.engine, deltaSeconds * 1000);

      const nextBallSave = Math.max(0, hudRef.current.ballSave - deltaSeconds);
      if (Math.floor(nextBallSave * 10) !== Math.floor(hudRef.current.ballSave * 10)) {
        commitHud({ ...hudRef.current, ballSave: nextBallSave });
      }

      if (world.ball.position.y > PINBALL_HEIGHT + 28) {
        if (hudRef.current.ballSave > 0) {
          resetBall(world);
          chargeRef.current = 0;
          commitHud({
            ...hudRef.current,
            charge: 0,
            combo: 1,
            ballSave: Math.max(3, hudRef.current.ballSave),
          });
        } else {
          const nextLives = hudRef.current.lives - 1;
          resetBall(world);
          chargeRef.current = 0;
          commitHud({
            ...hudRef.current,
            lives: Math.max(0, nextLives),
            phase: nextLives <= 0 ? "game-over" : "playing",
            charge: 0,
            combo: 1,
            ballSave: nextLives <= 0 ? 0 : PINBALL_BALL_SAVE_SECONDS * 0.65,
          });
        }
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
          { label: "Combo", value: `${hudState.combo}x` },
          { label: "Save", value: hudState.ballSave > 0 ? `${Math.ceil(hudState.ballSave)}s` : "Off" },
          { label: "Charge", value: `${Math.round(hudState.charge * 100)}%` },
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
