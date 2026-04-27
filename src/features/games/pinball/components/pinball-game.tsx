"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Matter from "matter-js";
import {
  PINBALL_BALL_RADIUS,
  PINBALL_BALL_SAVE_SECONDS,
  PINBALL_HEIGHT,
  PINBALL_LIVES,
  PINBALL_STORAGE_KEY,
  PINBALL_WIDTH,
  PINBALL_GRAVITY_Y,
  PINBALL_FLIPPER_LENGTH,
  PINBALL_FLIPPER_THICKNESS,
  PINBALL_FLIPPER_MAX_ANGLE,
  PINBALL_FLIPPER_MIN_ANGLE,
  PINBALL_PLUNGER_MAX_FORCE,
  PINBALL_BUMPER_RESTITUTION,
} from "@/features/games/pinball/config/constants";
import type { PinballHudState } from "@/features/games/pinball/types";
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

export function PinballGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const ballRef = useRef<Matter.Body | null>(null);
  const leftFlipperRef = useRef<Matter.Body | null>(null);
  const rightFlipperRef = useRef<Matter.Body | null>(null);
  const chargingRef = useRef(false);
  const chargeAmountRef = useRef(0);
  const touchRef = useRef({ left: false, right: false, plunger: false });
  const bumperHitsRef = useRef<Map<number, number>>(new Map()); // id -> flash intensity

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

  const score = useCallback((points: number) => {
    const current = hudRef.current;
    if (current.phase !== "playing") return;

    const nextScore = current.score + points * current.combo;
    commitHud({
      ...current,
      score: nextScore,
      bestScore: Math.max(current.bestScore, nextScore),
      combo: Math.min(current.combo + 1, 15),
    });
  }, [commitHud]);

  const drawScene = useCallback((context: CanvasRenderingContext2D, engine: Matter.Engine, hud: PinballHudState) => {
    const world = engine.world;
    
    // Background
    const gradient = context.createLinearGradient(0, 0, 0, PINBALL_HEIGHT);
    gradient.addColorStop(0, "#120a21");
    gradient.addColorStop(0.5, "#08111f");
    gradient.addColorStop(1, "#05040b");
    context.fillStyle = gradient;
    context.fillRect(0, 0, PINBALL_WIDTH, PINBALL_HEIGHT);

    // Subtle grid/pattern
    context.strokeStyle = "rgba(207,181,255,0.03)";
    context.lineWidth = 1;
    for (let x = 0; x < PINBALL_WIDTH; x += 40) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, PINBALL_HEIGHT);
      context.stroke();
    }
    for (let y = 0; y < PINBALL_HEIGHT; y += 40) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(PINBALL_WIDTH, y);
      context.stroke();
    }

    // Render bodies
    const bodies = Matter.Composite.allBodies(world);
    bodies.forEach(body => {
      if (body.label === "ball") {
        context.beginPath();
        context.shadowColor = "#f8fafc";
        context.shadowBlur = 10;
        context.fillStyle = "#f8fafc";
        context.arc(body.position.x, body.position.y, PINBALL_BALL_RADIUS, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
      } else if (body.label === "bumper") {
        const flashIntensity = bumperHitsRef.current.get(body.id) || 0;
        const radius = (body as Matter.Body & { circleRadius: number }).circleRadius;
        
        context.beginPath();
        context.fillStyle = flashIntensity > 0.5 ? "#ffd166" : "#ff6b35";
        context.arc(body.position.x, body.position.y, radius, 0, Math.PI * 2);
        context.fill();
        
        context.strokeStyle = "#ffd166";
        context.lineWidth = 3 + flashIntensity * 5;
        context.stroke();
        
        // Inner detail
        context.beginPath();
        context.fillStyle = flashIntensity > 0.2 ? "#ffffff" : "#ffd166";
        context.arc(body.position.x, body.position.y, radius * 0.4, 0, Math.PI * 2);
        context.fill();

        if (flashIntensity > 0) {
          context.beginPath();
          context.strokeStyle = `rgba(255, 209, 102, ${flashIntensity})`;
          context.arc(body.position.x, body.position.y, radius + flashIntensity * 20, 0, Math.PI * 2);
          context.stroke();
        }
      } else if (body.label.includes("Flipper")) {
        context.save();
        context.translate(body.position.x, body.position.y);
        context.rotate(body.angle);
        context.fillStyle = "#cfb5ff";
        context.beginPath();
        if (context.roundRect) {
          context.roundRect(-PINBALL_FLIPPER_LENGTH/2, -PINBALL_FLIPPER_THICKNESS/2, PINBALL_FLIPPER_LENGTH, PINBALL_FLIPPER_THICKNESS, 9);
        } else {
          context.rect(-PINBALL_FLIPPER_LENGTH/2, -PINBALL_FLIPPER_THICKNESS/2, PINBALL_FLIPPER_LENGTH, PINBALL_FLIPPER_THICKNESS);
        }
        context.fill();
        context.strokeStyle = "#ffffff";
        context.lineWidth = 1;
        context.stroke();
        context.restore();
      } else if (body.label === "wall") {
        context.save();
        context.translate(body.position.x, body.position.y);
        context.rotate(body.angle);
        context.fillStyle = "rgba(248,250,252,0.15)";
        const { min, max } = body.bounds;
        const w = max.x - min.x;
        const h = max.y - min.y;
        context.fillRect(-w/2, -h/2, w, h);
        context.restore();
      }
    });

    // Plunger charging effect
    if (chargingRef.current) {
      context.fillStyle = `rgba(255, 107, 53, ${chargeAmountRef.current})`;
      context.fillRect(PINBALL_WIDTH - 45, PINBALL_HEIGHT - 60, 35, 60 * chargeAmountRef.current);
    }

    // Ball save bar
    if (hud.ballSave > 0 && hud.phase === "playing") {
      context.fillStyle = "rgba(0,166,166,0.15)";
      context.fillRect(140, 715, 180, 6);
      context.fillStyle = "#00a6a6";
      context.shadowColor = "#00a6a6";
      context.shadowBlur = 5;
      context.fillRect(140, 715, 180 * (hud.ballSave / PINBALL_BALL_SAVE_SECONDS), 6);
      context.shadowBlur = 0;
    }

    // Overlays
    if (hud.phase !== "playing") {
      context.fillStyle = "rgba(5,4,11,0.75)";
      context.fillRect(0, 0, PINBALL_WIDTH, PINBALL_HEIGHT);
      context.fillStyle = "#f8fafc";
      context.textAlign = "center";
      context.font = "bold 36px sans-serif";
      context.fillText(
        hud.phase === "game-over" ? "GAME OVER" : hud.phase === "paused" ? "PAUSED" : "PINBALL",
        PINBALL_WIDTH / 2,
        PINBALL_HEIGHT / 2 - 20
      );
      context.font = "500 14px sans-serif";
      context.fillStyle = "rgba(248,250,252,0.7)";
      context.fillText(
        hud.phase === "game-over" ? "YOUR SCORE: " + hud.score : "READY FOR A RUN?",
        PINBALL_WIDTH / 2,
        PINBALL_HEIGHT / 2 + 15
      );
      context.font = "400 12px sans-serif";
      context.fillText(
        "SPACE to Plunge • A/D for Flippers",
        PINBALL_WIDTH / 2,
        PINBALL_HEIGHT / 2 + 45
      );
    }
  }, []);

  // Initialize Matter.js Engine and Table
  useEffect(() => {
    const engine = Matter.Engine.create();
    engine.gravity.y = PINBALL_GRAVITY_Y;
    engineRef.current = engine;

    const world = engine.world;

    // Table boundaries
    const wallOptions = { isStatic: true, restitution: 0.4, friction: 0.02, label: "wall" };
    
    const walls = [
      // Outer left
      Matter.Bodies.rectangle(10, PINBALL_HEIGHT / 2, 20, PINBALL_HEIGHT, wallOptions),
      // Outer right
      Matter.Bodies.rectangle(PINBALL_WIDTH - 10, PINBALL_HEIGHT / 2, 20, PINBALL_HEIGHT, wallOptions),
      // Plunger lane wall
      Matter.Bodies.rectangle(PINBALL_WIDTH - 50, PINBALL_HEIGHT - 300, 10, 600, wallOptions),
      // Top dome (approximated with segments)
      ...Array.from({ length: 12 }).map((_, i) => {
        const angle = (Math.PI * i) / 11;
        const x = PINBALL_WIDTH / 2 + Math.cos(angle + Math.PI) * (PINBALL_WIDTH / 2 - 10);
        const y = 180 + Math.sin(angle + Math.PI) * 160;
        return Matter.Bodies.rectangle(x, y, 60, 30, { 
          ...wallOptions, 
          angle: angle + Math.PI / 2 
        });
      }),
      // Bottom angled walls
      Matter.Bodies.rectangle(80, 660, 160, 20, { ...wallOptions, angle: 0.65 }),
      Matter.Bodies.rectangle(PINBALL_WIDTH - 130, 660, 160, 20, { ...wallOptions, angle: -0.65 }),
      // Side "slingshots" or guides
      Matter.Bodies.rectangle(40, 450, 60, 20, { ...wallOptions, angle: 0.8 }),
      Matter.Bodies.rectangle(PINBALL_WIDTH - 90, 450, 60, 20, { ...wallOptions, angle: -0.8 }),
    ];

    // Bumpers
    const bumperOptions = { 
      isStatic: true, 
      restitution: PINBALL_BUMPER_RESTITUTION, 
      label: "bumper",
      friction: 0
    };
    const bumpers = [
      Matter.Bodies.circle(160, 220, 32, bumperOptions),
      Matter.Bodies.circle(320, 220, 32, bumperOptions),
      Matter.Bodies.circle(240, 340, 38, bumperOptions),
    ];

    // Flippers
    const createFlipper = (x: number, y: number, isRight: boolean) => {
      const flipper = Matter.Bodies.rectangle(
        x + (isRight ? -PINBALL_FLIPPER_LENGTH/2 + 10 : PINBALL_FLIPPER_LENGTH/2 - 10), 
        y, 
        PINBALL_FLIPPER_LENGTH, 
        PINBALL_FLIPPER_THICKNESS, 
        {
          label: isRight ? "rightFlipper" : "leftFlipper",
          restitution: 0.1,
          friction: 0.01,
          chamfer: { radius: 9 },
          mass: 10
        }
      );
      
      const pivot = Matter.Bodies.circle(x, y, 5, { isStatic: true, isSensor: true });
      const constraint = Matter.Constraint.create({
        bodyA: flipper,
        pointA: { x: isRight ? PINBALL_FLIPPER_LENGTH/2 - 10 : -PINBALL_FLIPPER_LENGTH/2 + 10, y: 0 },
        bodyB: pivot,
        stiffness: 1,
        length: 0
      });

      return { flipper, pivot, constraint };
    };

    const left = createFlipper(135, 695, false);
    const right = createFlipper(345, 695, true);
    leftFlipperRef.current = left.flipper;
    rightFlipperRef.current = right.flipper;

    // Scoring and collision handling
    Matter.Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach((pair) => {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        if (labels.includes("bumper")) {
          const bumper = pair.bodyA.label === "bumper" ? pair.bodyA : pair.bodyB;
          bumperHitsRef.current.set(bumper.id, 1.0);
          score(150);
        } else if (labels.includes("leftFlipper") || labels.includes("rightFlipper")) {
          score(20);
        } else if (labels.includes("wall")) {
          score(10);
        }
      });
    });

    Matter.Composite.add(world, [
      ...walls,
      ...bumpers,
      left.flipper, left.pivot, left.constraint,
      right.flipper, right.pivot, right.constraint
    ]);

    // Canvas setup
    const canvas = canvasRef.current;
    if (canvas) {
      contextRef.current = configureHiDPICanvas(canvas, PINBALL_WIDTH, PINBALL_HEIGHT);
    }

    return () => {
      Matter.Engine.clear(engine);
    };
  }, [score]);

  const createBall = useCallback(() => {
    if (engineRef.current && !ballRef.current) {
      const ball = Matter.Bodies.circle(PINBALL_WIDTH - 30, PINBALL_HEIGHT - 60, PINBALL_BALL_RADIUS, {
        restitution: 0.5,
        friction: 0.005,
        label: "ball",
        density: 0.001
      });
      ballRef.current = ball;
      Matter.Composite.add(engineRef.current.world, ball);
      return ball;
    }
    return ballRef.current;
  }, []);

  const serve = useCallback((resetScore: boolean) => {
    if (ballRef.current && engineRef.current) {
      Matter.Composite.remove(engineRef.current.world, ballRef.current);
      ballRef.current = null;
    }

    createBall();
    commitHud({
      phase: "playing",
      score: resetScore ? 0 : hudRef.current.score,
      bestScore: hudRef.current.bestScore,
      lives: resetScore ? PINBALL_LIVES : hudRef.current.lives,
      charge: 0,
      ballSave: PINBALL_BALL_SAVE_SECONDS,
      combo: 1,
    });
  }, [commitHud, createBall]);

  const startGame = useCallback(() => {
    if (hudRef.current.phase === "playing") return;
    if (hudRef.current.phase === "paused") {
      commitHud({ ...hudRef.current, phase: "playing" });
      return;
    }
    serve(hudRef.current.phase === "game-over" || hudRef.current.phase === "idle");
  }, [commitHud, serve]);

  const togglePause = useCallback(() => {
    const nextPhase = hudRef.current.phase === "playing" ? "paused" : "playing";
    if (hudRef.current.phase === "playing" || hudRef.current.phase === "paused") {
      commitHud({ ...hudRef.current, phase: nextPhase });
    }
  }, [commitHud]);

  const releasePlunger = useCallback(() => {
    if (ballRef.current && chargingRef.current) {
      const force = chargeAmountRef.current * PINBALL_PLUNGER_MAX_FORCE;
      Matter.Body.applyForce(ballRef.current, ballRef.current.position, { x: 0, y: -force });
      chargingRef.current = false;
      chargeAmountRef.current = 0;
      commitHud({ ...hudRef.current, charge: 0 });
    }
  }, [commitHud]);

  useAnimationFrameLoop((deltaSeconds) => {
    const engine = engineRef.current;
    const context = contextRef.current;
    if (!engine || !context) return;

    if (hudRef.current.phase === "playing") {
      const keys = pressedKeysRef.current;
      const leftActive = keys.has("a") || keys.has("arrowleft") || touchRef.current.left;
      const rightActive = keys.has("d") || keys.has("arrowright") || touchRef.current.right;
      const plungerActive = keys.has(" ") || keys.has("arrowdown") || touchRef.current.plunger;

      // Update flippers with punchy movement
      if (leftFlipperRef.current) {
        const targetAngle = leftActive ? PINBALL_FLIPPER_MIN_ANGLE : PINBALL_FLIPPER_MAX_ANGLE;
        const velocity = (targetAngle - leftFlipperRef.current.angle) * 0.55;
        Matter.Body.setAngularVelocity(leftFlipperRef.current, velocity);
      }
      if (rightFlipperRef.current) {
        const targetAngle = rightActive ? -PINBALL_FLIPPER_MIN_ANGLE : -PINBALL_FLIPPER_MAX_ANGLE;
        const velocity = (targetAngle - rightFlipperRef.current.angle) * 0.55;
        Matter.Body.setAngularVelocity(rightFlipperRef.current, velocity);
      }

      // Plunger logic
      const ball = ballRef.current;
      if (plungerActive && ball && ball.position.x > PINBALL_WIDTH - 60 && ball.position.y > PINBALL_HEIGHT - 120) {
        chargingRef.current = true;
        chargeAmountRef.current = Math.min(chargeAmountRef.current + deltaSeconds * 1.5, 1);
        commitHud({ ...hudRef.current, charge: chargeAmountRef.current });
      } else if (chargingRef.current) {
        releasePlunger();
      }

      // Step physics (multiple steps for accuracy)
      const steps = 4;
      for (let i = 0; i < steps; i++) {
        Matter.Engine.update(engine, (deltaSeconds * 1000) / steps);
      }

      // Update bumper hits (fade flash)
      bumperHitsRef.current.forEach((value, key) => {
        if (value > 0) {
          bumperHitsRef.current.set(key, Math.max(0, value - deltaSeconds * 5));
        }
      });

      // Drain check
      if (ball && ball.position.y > PINBALL_HEIGHT + 50) {
        if (hudRef.current.ballSave > 0) {
          Matter.Body.setPosition(ball, { x: PINBALL_WIDTH - 30, y: PINBALL_HEIGHT - 60 });
          Matter.Body.setVelocity(ball, { x: 0, y: 0 });
          commitHud({ ...hudRef.current, ballSave: 4, combo: 1 });
        } else {
          const nextLives = hudRef.current.lives - 1;
          if (nextLives <= 0) {
            commitHud({ ...hudRef.current, lives: 0, phase: "game-over", ballSave: 0 });
          } else {
            Matter.Composite.remove(engine.world, ball);
            ballRef.current = null;
            createBall();
            commitHud({ ...hudRef.current, lives: nextLives, ballSave: 6, combo: 1 });
          }
        }
      }

      // Update ball save timer
      if (hudRef.current.ballSave > 0) {
        commitHud({ ...hudRef.current, ballSave: Math.max(0, hudRef.current.ballSave - deltaSeconds) });
      }
    }

    // Render
    drawScene(context, engine, hudRef.current);
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
              {hudState.phase === "playing" ? "Playing" : "Start"}
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

      <GameStatus>
        {hudState.phase === "playing" 
          ? hudState.ballSave > 0 ? "BALL SAVE ACTIVE!" : "KEEP IT UP!"
          : "PLUNGE TO START"}
      </GameStatus>

      <TouchControls className="max-w-[26rem]">
        <div className="grid grid-cols-3 gap-2">
          <GameButton
            variant="touch"
            className="rounded-2xl"
            onPointerDown={() => { touchRef.current.left = true; }}
            onPointerUp={() => { touchRef.current.left = false; }}
            onPointerLeave={() => { touchRef.current.left = false; }}
          >
            Left
          </GameButton>
          <GameButton
            variant="touch"
            className="rounded-2xl"
            onPointerDown={() => { touchRef.current.plunger = true; startGame(); }}
            onPointerUp={() => { touchRef.current.plunger = false; releasePlunger(); }}
            onPointerLeave={() => { touchRef.current.plunger = false; releasePlunger(); }}
          >
            Plunge
          </GameButton>
          <GameButton
            variant="touch"
            className="rounded-2xl"
            onPointerDown={() => { touchRef.current.right = true; }}
            onPointerUp={() => { touchRef.current.right = false; }}
            onPointerLeave={() => { touchRef.current.right = false; }}
          >
            Right
          </GameButton>
        </div>
      </TouchControls>
    </GamePanel>
  );
}
