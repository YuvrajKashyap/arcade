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
const HEIGHT = 420;
const FLOOR = 328;
const STORAGE_KEY = "arcade.arcadeFighter.bestWins";

type Phase = "idle" | "playing" | "paused" | "round-over";
type Fighter = { x: number; y: number; vx: number; vy: number; health: number; facing: 1 | -1; attackTimer: number; hitTimer: number };
type State = { phase: Phase; player: Fighter; rival: Fighter; timer: number; wins: number; bestWins: number; message: string };

function createFighter(x: number, facing: 1 | -1): Fighter {
  return { x, y: FLOOR - 92, vx: 0, vy: 0, health: 100, facing, attackTimer: 0, hitTimer: 0 };
}

function createState(bestWins = 0): State {
  return { phase: "idle", player: createFighter(190, 1), rival: createFighter(560, -1), timer: 60, wins: 0, bestWins, message: "Press Space to start the round." };
}

function attackHits(attacker: Fighter, defender: Fighter) {
  const reachX = attacker.x + attacker.facing * 58;
  return attacker.attackTimer > 0.18 && attacker.attackTimer < 0.32 && Math.abs(reachX - defender.x) < 44 && Math.abs(attacker.y - defender.y) < 60;
}

function updateState(state: State, delta: number, keys: Set<string>): State {
  if (state.phase !== "playing") return state;
  const player = { ...state.player };
  const rival = { ...state.rival };
  const left = keys.has("a") || keys.has("arrowleft");
  const right = keys.has("d") || keys.has("arrowright");
  player.vx = (Number(right) - Number(left)) * 230;
  if ((keys.has("w") || keys.has("arrowup")) && player.y >= FLOOR - 92) player.vy = -620;
  player.vy += 1500 * delta;
  player.x = Math.max(35, Math.min(WIDTH - 35, player.x + player.vx * delta));
  player.y = Math.min(FLOOR - 92, player.y + player.vy * delta);
  player.facing = player.x <= rival.x ? 1 : -1;
  rival.facing = rival.x <= player.x ? 1 : -1;
  rival.vx = Math.abs(rival.x - player.x) > 95 ? rival.facing * 150 : 0;
  rival.x = Math.max(35, Math.min(WIDTH - 35, rival.x + rival.vx * delta));
  if (Math.abs(rival.x - player.x) < 82 && rival.attackTimer <= 0) rival.attackTimer = 0.38;
  player.attackTimer = Math.max(0, player.attackTimer - delta);
  rival.attackTimer = Math.max(0, rival.attackTimer - delta);
  player.hitTimer = Math.max(0, player.hitTimer - delta);
  rival.hitTimer = Math.max(0, rival.hitTimer - delta);
  if (attackHits(player, rival) && rival.hitTimer <= 0) {
    rival.health = Math.max(0, rival.health - 8);
    rival.hitTimer = 0.22;
  }
  if (attackHits(rival, player) && player.hitTimer <= 0) {
    player.health = Math.max(0, player.health - 6);
    player.hitTimer = 0.22;
  }
  const timer = Math.max(0, state.timer - delta);
  const playerWon = rival.health <= 0 || (timer <= 0 && player.health >= rival.health);
  const rivalWon = player.health <= 0 || (timer <= 0 && rival.health > player.health);
  const wins = playerWon ? state.wins + 1 : state.wins;
  return {
    ...state,
    phase: playerWon || rivalWon ? "round-over" : "playing",
    player,
    rival,
    timer,
    wins,
    bestWins: Math.max(state.bestWins, wins),
    message: playerWon ? "You win the round. Space starts another." : rivalWon ? "Rival wins. Space starts another." : "Fight.",
  };
}

function drawFighter(context: CanvasRenderingContext2D, fighter: Fighter, color: string) {
  context.save();
  context.translate(fighter.x, fighter.y);
  context.scale(fighter.facing, 1);
  if (fighter.hitTimer > 0) context.globalAlpha = 0.62;
  context.fillStyle = color;
  context.strokeStyle = "#161616";
  context.lineWidth = 5;
  context.beginPath();
  context.roundRect(-20, 22, 40, 48, 8);
  context.roundRect(-16, 0, 32, 28, 10);
  context.fill();
  context.stroke();
  context.fillStyle = "#f5c28c";
  context.beginPath();
  context.roundRect(-14, -18, 28, 24, 8);
  context.fill();
  context.stroke();
  context.strokeStyle = "#161616";
  context.lineWidth = 7;
  context.beginPath();
  context.moveTo(-18, 35);
  context.lineTo(-42, 48);
  context.moveTo(18, 35);
  context.lineTo(fighter.attackTimer > 0 ? 62 : 40, 32);
  context.moveTo(-10, 70);
  context.lineTo(-18, 92);
  context.moveTo(12, 70);
  context.lineTo(24, 92);
  context.stroke();
  context.restore();
}

function drawScene(context: CanvasRenderingContext2D, state: State) {
  context.clearRect(0, 0, WIDTH, HEIGHT);
  const gradient = context.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, "#35207a");
  gradient.addColorStop(0.58, "#e36a52");
  gradient.addColorStop(1, "#40251d");
  context.fillStyle = gradient;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = "#313131";
  context.fillRect(0, FLOOR, WIDTH, HEIGHT - FLOOR);
  context.fillStyle = "#fff";
  context.font = "900 22px sans-serif";
  context.textAlign = "center";
  context.fillText(String(Math.ceil(state.timer)).padStart(2, "0"), WIDTH / 2, 38);
  const bar = (x: number, y: number, value: number, flip = false) => {
    context.fillStyle = "#141414";
    context.fillRect(x, y, 260, 24);
    context.fillStyle = value > 35 ? "#ffe14a" : "#f14c4c";
    const width = 252 * (value / 100);
    context.fillRect(flip ? x + 256 - width : x + 4, y + 4, width, 16);
  };
  bar(28, 22, state.player.health);
  bar(WIDTH - 288, 22, state.rival.health, true);
  drawFighter(context, state.player, "#2e78ff");
  drawFighter(context, state.rival, "#f14c4c");
  if (state.phase !== "playing") {
    context.fillStyle = "rgba(0,0,0,0.42)";
    context.fillRect(0, 0, WIDTH, HEIGHT);
    context.fillStyle = "#fff3a8";
    context.font = "900 34px sans-serif";
    context.fillText(state.phase === "paused" ? "PAUSED" : state.phase === "round-over" ? state.message : "ARCADE FIGHTER", WIDTH / 2, 180);
    context.font = "800 16px sans-serif";
    context.fillText("A/D move  W jump  J punch  K kick", WIDTH / 2, 214);
  }
}

export function ArcadeFighterGame() {
  const initialState = createState(readStoredNumber(STORAGE_KEY));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef(initialState);
  const keysRef = useRef(new Set<string>());
  const [hud, setHud] = useState({ phase: initialState.phase, wins: 0, bestWins: initialState.bestWins, timer: initialState.timer });

  function sync(nextState: State) {
    stateRef.current = nextState;
    setHud({ phase: nextState.phase, wins: nextState.wins, bestWins: nextState.bestWins, timer: nextState.timer });
    writeStoredNumber(STORAGE_KEY, nextState.bestWins);
  }

  function start() {
    sync({ ...createState(stateRef.current.bestWins), phase: "playing", wins: stateRef.current.wins });
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (["a", "d", "w", "arrowleft", "arrowright", "arrowup"].includes(key)) {
      event.preventDefault();
      keysRef.current.add(key);
    } else if (key === "j" || key === "k") {
      event.preventDefault();
      const damageTimer = key === "j" ? 0.36 : 0.46;
      sync({ ...stateRef.current, player: { ...stateRef.current.player, attackTimer: damageTimer } });
    } else if (key === " " || key === "r") {
      event.preventDefault();
      start();
    } else if (key === "p") {
      event.preventDefault();
      const current = stateRef.current;
      sync({ ...current, phase: current.phase === "playing" ? "paused" : "playing" });
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      contextRef.current = configureHiDPICanvas(canvas, WIDTH, HEIGHT);
      drawScene(contextRef.current!, stateRef.current);
    }
    const down = (event: KeyboardEvent) => onKeyDown(event);
    const up = (event: KeyboardEvent) => keysRef.current.delete(event.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useAnimationFrameLoop((delta) => {
    const nextState = updateState(stateRef.current, delta, keysRef.current);
    if (nextState !== stateRef.current) sync(nextState);
    if (contextRef.current) drawScene(contextRef.current, stateRef.current);
  });

  return (
    <GamePanel>
      <GameHud
        items={[{ label: "Wins", value: hud.wins }, { label: "Best", value: hud.bestWins }, { label: "Timer", value: Math.ceil(hud.timer) }, { label: "Status", value: hud.phase }]}
        actions={<GameButton variant="primary" onClick={start}>Fight</GameButton>}
      />
      <GamePlayfield className="mx-auto aspect-[19/10] w-full max-w-[min(48rem,86dvh)] touch-none border-0 bg-black">
        <canvas ref={canvasRef} className="h-full w-full" aria-label="Arcade Fighter field" />
      </GamePlayfield>
      <GameStatus>A/D move, W jumps, J punches, K kicks. Space starts and R restarts.</GameStatus>
      <TouchControls className="max-w-[24rem]">
        <div className="grid grid-cols-4 gap-2">
          <GameButton variant="touch" onPointerDown={() => keysRef.current.add("a")} onPointerUp={() => keysRef.current.delete("a")}>Left</GameButton>
          <GameButton variant="touch" onPointerDown={() => keysRef.current.add("d")} onPointerUp={() => keysRef.current.delete("d")}>Right</GameButton>
          <GameButton variant="touch" onClick={() => sync({ ...stateRef.current, player: { ...stateRef.current.player, attackTimer: 0.36 } })}>Punch</GameButton>
          <GameButton variant="touch" onClick={start}>Start</GameButton>
        </div>
      </TouchControls>
    </GamePanel>
  );
}
