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

const WIDTH = 960;
const HEIGHT = 540;
const TILE = 48;
const PLAYER_SIZE = 38;
const SCREEN_X = 218;
const FLOOR_Y = 420;
const CEILING_Y = 92;
const LEVEL_LENGTH = 6200;
const STORAGE_KEY = "arcade.geometryDash.bestProgress";
const SPEED = 382;
const GRAVITY = 2440;
const JUMP_VELOCITY = -780;

type Phase = "idle" | "playing" | "paused" | "crashed" | "complete";
type GravityMode = 1 | -1;

type Player = {
  x: number;
  y: number;
  previousY: number;
  vy: number;
  rotation: number;
  grounded: boolean;
  gravity: GravityMode;
};

type Rect = { x: number; y: number; width: number; height: number };
type Platform = Rect & { kind?: "ground" | "block" | "ceiling" };
type Spike = Rect & { id: string; flip?: boolean };
type Pad = Rect & { id: string; used: boolean };
type Orb = { id: string; x: number; y: number; radius: number; used: boolean };
type Portal = Rect & { id: string; gravity: GravityMode; used: boolean };
type Coin = { id: string; x: number; y: number; collected: boolean };
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  color: string;
};

type State = {
  phase: Phase;
  player: Player;
  attempt: number;
  progress: number;
  bestProgress: number;
  practice: boolean;
  checkpointX: number;
  shake: number;
  message: string;
  pads: Pad[];
  orbs: Orb[];
  portals: Portal[];
  coins: Coin[];
  particles: Particle[];
};

const PLATFORMS: readonly Platform[] = [
  { x: 0, y: FLOOR_Y, width: 1120, height: 120, kind: "ground" },
  { x: 1230, y: FLOOR_Y, width: 1700, height: 120, kind: "ground" },
  { x: 1580, y: FLOOR_Y - TILE, width: TILE * 2, height: TILE, kind: "block" },
  { x: 1910, y: FLOOR_Y - TILE * 2, width: TILE * 2, height: TILE, kind: "block" },
  { x: 2360, y: FLOOR_Y - TILE, width: TILE * 3, height: TILE, kind: "block" },
  { x: 2920, y: FLOOR_Y, width: 360, height: 120, kind: "ground" },
  { x: 3250, y: CEILING_Y - TILE, width: 1110, height: TILE, kind: "ceiling" },
  { x: 3740, y: CEILING_Y, width: TILE * 2, height: TILE, kind: "block" },
  { x: 4400, y: FLOOR_Y, width: 1800, height: 120, kind: "ground" },
  { x: 4635, y: FLOOR_Y - TILE, width: TILE * 2, height: TILE, kind: "block" },
  { x: 4950, y: FLOOR_Y - TILE * 2, width: TILE * 2, height: TILE, kind: "block" },
  { x: 5290, y: FLOOR_Y - TILE, width: TILE * 3, height: TILE, kind: "block" },
];

const SPIKES: readonly Spike[] = [
  { id: "s1", x: 650, y: FLOOR_Y - 34, width: 42, height: 34 },
  { id: "s2", x: 865, y: FLOOR_Y - 34, width: 42, height: 34 },
  { id: "s3", x: 910, y: FLOOR_Y - 34, width: 42, height: 34 },
  { id: "s4", x: 1320, y: FLOOR_Y - 34, width: 42, height: 34 },
  { id: "s5", x: 1510, y: FLOOR_Y - 34, width: 42, height: 34 },
  { id: "s6", x: 2130, y: FLOOR_Y - 34, width: 42, height: 34 },
  { id: "s7", x: 2176, y: FLOOR_Y - 34, width: 42, height: 34 },
  { id: "s8", x: 2695, y: FLOOR_Y - 34, width: 42, height: 34 },
  { id: "s9", x: 3440, y: CEILING_Y, width: 42, height: 34, flip: true },
  { id: "s10", x: 3670, y: CEILING_Y, width: 42, height: 34, flip: true },
  { id: "s11", x: 4040, y: CEILING_Y, width: 42, height: 34, flip: true },
  { id: "s12", x: 4545, y: FLOOR_Y - 34, width: 42, height: 34 },
  { id: "s13", x: 4840, y: FLOOR_Y - 34, width: 42, height: 34 },
  { id: "s14", x: 5170, y: FLOOR_Y - 34, width: 42, height: 34 },
  { id: "s15", x: 5560, y: FLOOR_Y - 34, width: 42, height: 34 },
  { id: "s16", x: 5606, y: FLOOR_Y - 34, width: 42, height: 34 },
];

const BASE_PADS: readonly Pad[] = [
  { id: "p1", x: 1238, y: FLOOR_Y - 15, width: 58, height: 15, used: false },
  { id: "p2", x: 4410, y: FLOOR_Y - 15, width: 58, height: 15, used: false },
];

const BASE_ORBS: readonly Orb[] = [
  { id: "o1", x: 1820, y: FLOOR_Y - 150, radius: 23, used: false },
  { id: "o2", x: 2270, y: FLOOR_Y - 158, radius: 23, used: false },
  { id: "o3", x: 3860, y: CEILING_Y + 150, radius: 23, used: false },
  { id: "o4", x: 5090, y: FLOOR_Y - 158, radius: 23, used: false },
];

const BASE_PORTALS: readonly Portal[] = [
  { id: "g1", x: 3045, y: 152, width: 38, height: 208, gravity: -1, used: false },
  { id: "g2", x: 4290, y: 152, width: 38, height: 208, gravity: 1, used: false },
];

const BASE_COINS: readonly Coin[] = [
  { id: "c1", x: 1005, y: FLOOR_Y - 115, collected: false },
  { id: "c2", x: 2515, y: FLOOR_Y - 145, collected: false },
  { id: "c3", x: 3990, y: CEILING_Y + 124, collected: false },
  { id: "c4", x: 5750, y: FLOOR_Y - 165, collected: false },
];

function clonePads() {
  return BASE_PADS.map((pad) => ({ ...pad }));
}

function cloneOrbs() {
  return BASE_ORBS.map((orb) => ({ ...orb }));
}

function clonePortals() {
  return BASE_PORTALS.map((portal) => ({ ...portal }));
}

function cloneCoins() {
  return BASE_COINS.map((coin) => ({ ...coin }));
}

function createPlayer(x = 84, gravity: GravityMode = 1): Player {
  return {
    x,
    y: gravity === 1 ? FLOOR_Y - PLAYER_SIZE : CEILING_Y,
    previousY: gravity === 1 ? FLOOR_Y - PLAYER_SIZE : CEILING_Y,
    vy: 0,
    rotation: 0,
    grounded: true,
    gravity,
  };
}

function createState(bestProgress = 0): State {
  return {
    phase: "idle",
    player: createPlayer(),
    attempt: 1,
    progress: 0,
    bestProgress,
    practice: false,
    checkpointX: 84,
    shake: 0,
    message: "Press Space, click, or tap to jump.",
    pads: clonePads(),
    orbs: cloneOrbs(),
    portals: clonePortals(),
    coins: cloneCoins(),
    particles: [],
  };
}

function resetRun(state: State, practice = state.practice): State {
  return {
    ...createState(state.bestProgress),
    phase: "playing",
    attempt: state.attempt + 1,
    practice,
    message: practice ? "Practice run. Checkpoints are active." : "Normal mode. Hit every cue cleanly.",
  };
}

function respawnAtCheckpoint(state: State): State {
  const gravity: GravityMode = state.checkpointX >= 3045 && state.checkpointX < 4290 ? -1 : 1;
  return {
    ...state,
    phase: "playing",
    attempt: state.attempt + 1,
    player: createPlayer(Math.max(84, state.checkpointX - 80), gravity),
    checkpointX: Math.max(84, state.checkpointX - 80),
    shake: 0,
    message: "Checkpoint respawn.",
    particles: [],
  };
}

function intersects(a: Rect, b: Rect) {
  return a.x + a.width > b.x && a.x < b.x + b.width && a.y + a.height > b.y && a.y < b.y + b.height;
}

function playerRect(player: Player): Rect {
  return {
    x: player.x + 4,
    y: player.y + 4,
    width: PLAYER_SIZE - 8,
    height: PLAYER_SIZE - 8,
  };
}

function centerOf(rect: Rect) {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

function spawnBurst(x: number, y: number, color: string, count: number): Particle[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.35;
    const speed = 95 + Math.random() * 210;
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2.5 + Math.random() * 5,
      life: 0.42 + Math.random() * 0.34,
      color,
    };
  });
}

function crashState(state: State, reason: string): State {
  if (state.practice && state.checkpointX > 160) {
    return respawnAtCheckpoint({ ...state, message: reason });
  }

  return {
    ...state,
    phase: "crashed",
    shake: 12,
    message: reason,
    particles: [
      ...state.particles,
      ...spawnBurst(state.player.x + PLAYER_SIZE / 2, state.player.y + PLAYER_SIZE / 2, "#fffc65", 28),
      ...spawnBurst(state.player.x + PLAYER_SIZE / 2, state.player.y + PLAYER_SIZE / 2, "#ff4f7a", 18),
    ].slice(-120),
  };
}

function jumpOrTriggerOrb(state: State): State {
  if (state.phase === "idle" || state.phase === "crashed" || state.phase === "complete") {
    return resetRun(state);
  }

  if (state.phase === "paused") {
    return { ...state, phase: "playing", message: "Back on beat." };
  }

  const player = state.player;
  const playerCenter = centerOf(playerRect(player));
  const orbIndex = state.orbs.findIndex((orb) => {
    const distance = Math.hypot(playerCenter.x - orb.x, playerCenter.y - orb.y);
    return !orb.used && distance < orb.radius + 48;
  });

  if (orbIndex >= 0) {
    const orb = state.orbs[orbIndex]!;
    const orbs = state.orbs.map((item, index) => (index === orbIndex ? { ...item, used: true } : item));
    return {
      ...state,
      player: { ...player, vy: JUMP_VELOCITY * player.gravity, grounded: false },
      orbs,
      message: "Orb hit.",
      particles: [...state.particles, ...spawnBurst(orb.x, orb.y, "#fff25b", 18)].slice(-110),
    };
  }

  if (!player.grounded) {
    return state;
  }

  return {
    ...state,
    player: {
      ...player,
      vy: JUMP_VELOCITY * player.gravity,
      grounded: false,
    },
    particles: [
      ...state.particles,
      ...spawnBurst(player.x + PLAYER_SIZE / 2, player.gravity === 1 ? player.y + PLAYER_SIZE : player.y, "#4df4ff", 8),
    ].slice(-100),
  };
}

function updateParticles(particles: Particle[], delta: number) {
  return particles
    .map((particle) => ({
      ...particle,
      x: particle.x + particle.vx * delta,
      y: particle.y + particle.vy * delta,
      vy: particle.vy + 520 * delta,
      life: particle.life - delta,
    }))
    .filter((particle) => particle.life > 0)
    .slice(-120);
}

function updateState(state: State, delta: number): State {
  const particles = updateParticles(state.particles, delta);
  if (state.phase !== "playing") {
    return { ...state, particles, shake: Math.max(0, state.shake - delta * 26) };
  }

  let next: State = {
    ...state,
    particles,
    shake: Math.max(0, state.shake - delta * 30),
  };
  let player: Player = {
    ...next.player,
    previousY: next.player.y,
    x: next.player.x + SPEED * delta,
    vy: next.player.vy + GRAVITY * next.player.gravity * delta,
    grounded: false,
  };
  player.y += player.vy * delta;
  player.rotation += (player.grounded ? 0 : player.gravity) * delta * SPEED * 0.052;

  let rect = playerRect(player);
  for (const platform of PLATFORMS) {
    if (!intersects(rect, platform)) {
      continue;
    }

    if (player.gravity === 1 && player.previousY + PLAYER_SIZE <= platform.y + 7 && player.vy >= 0) {
      player = { ...player, y: platform.y - PLAYER_SIZE, vy: 0, grounded: true };
      rect = playerRect(player);
      continue;
    }

    if (player.gravity === -1 && player.previousY >= platform.y + platform.height - 7 && player.vy <= 0) {
      player = { ...player, y: platform.y + platform.height, vy: 0, grounded: true };
      rect = playerRect(player);
      continue;
    }

    return crashState({ ...next, player }, "Block hit. Restart and time the jump earlier.");
  }

  if (player.y > HEIGHT + 150 || player.y < -190) {
    return crashState({ ...next, player }, "Missed the platform.");
  }

  for (const spike of SPIKES) {
    const spikeHitbox = {
      x: spike.x + 8,
      y: spike.y + (spike.flip ? 0 : 8),
      width: spike.width - 16,
      height: spike.height - 8,
    };
    if (intersects(rect, spikeHitbox)) {
      return crashState({ ...next, player }, "Spike hit. One more attempt.");
    }
  }

  let pads = next.pads;
  for (const pad of pads) {
    if (!pad.used && intersects(rect, pad) && player.gravity === 1 && player.vy >= 0) {
      pads = pads.map((item) => (item.id === pad.id ? { ...item, used: true } : item));
      player = { ...player, y: pad.y - PLAYER_SIZE, vy: -1040, grounded: false };
      next = {
        ...next,
        pads,
        message: "Jump pad launched.",
        particles: [...next.particles, ...spawnBurst(pad.x + pad.width / 2, pad.y, "#ff5bd8", 22)].slice(-120),
      };
    }
  }

  let portals = next.portals;
  for (const portal of portals) {
    if (!portal.used && intersects(rect, portal)) {
      portals = portals.map((item) => (item.id === portal.id ? { ...item, used: true } : item));
      player = { ...player, gravity: portal.gravity, vy: 0, grounded: false };
      next = {
        ...next,
        portals,
        shake: 6,
        message: portal.gravity === -1 ? "Gravity portal." : "Gravity restored.",
        particles: [
          ...next.particles,
          ...spawnBurst(portal.x + portal.width / 2, portal.y + portal.height / 2, "#8cfffb", 28),
        ].slice(-120),
      };
    }
  }

  let coins = next.coins;
  const center = centerOf(rect);
  for (const coin of coins) {
    if (!coin.collected && Math.hypot(center.x - coin.x, center.y - coin.y) < 42) {
      coins = coins.map((item) => (item.id === coin.id ? { ...item, collected: true } : item));
      next = {
        ...next,
        coins,
        message: "Secret coin collected.",
        particles: [...next.particles, ...spawnBurst(coin.x, coin.y, "#ffe45c", 20)].slice(-120),
      };
    }
  }

  const progress = Math.min(100, (player.x / LEVEL_LENGTH) * 100);
  const bestProgress = Math.max(next.bestProgress, progress);
  const checkpointX =
    next.practice && player.x - next.checkpointX > 720 && player.grounded ? Math.floor(player.x / 120) * 120 : next.checkpointX;

  if (player.x >= LEVEL_LENGTH) {
    return {
      ...next,
      phase: "complete",
      player,
      progress: 100,
      bestProgress: 100,
      checkpointX,
      shake: 8,
      message: "Level complete.",
      particles: [...next.particles, ...spawnBurst(player.x, player.y, "#87ff4d", 40)].slice(-120),
    };
  }

  return {
    ...next,
    player,
    pads,
    portals,
    coins,
    checkpointX,
    progress,
    bestProgress,
  };
}

function cameraX(state: State) {
  return Math.max(0, Math.min(LEVEL_LENGTH - WIDTH + 160, state.player.x - SCREEN_X));
}

function drawBackground(context: CanvasRenderingContext2D, camera: number, elapsed: number) {
  const gradient = context.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, "#2420a8");
  gradient.addColorStop(0.48, "#2666ec");
  gradient.addColorStop(1, "#18d3d0");
  context.fillStyle = gradient;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.save();
  context.globalAlpha = 0.28;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 1;
  for (let x = -((camera * 0.28) % 72); x < WIDTH + 72; x += 72) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + 120, HEIGHT);
    context.stroke();
  }
  for (let y = 40; y < HEIGHT; y += 72) {
    context.beginPath();
    context.moveTo(0, y + Math.sin(elapsed + y) * 6);
    context.lineTo(WIDTH, y + Math.cos(elapsed + y) * 6);
    context.stroke();
  }
  context.restore();

  context.save();
  context.translate(-camera * 0.22, 0);
  for (let index = -1; index < 14; index += 1) {
    const x = index * 230;
    context.fillStyle = index % 2 === 0 ? "rgba(23,18,98,0.4)" : "rgba(14,99,153,0.34)";
    context.beginPath();
    context.moveTo(x, FLOOR_Y + 40);
    context.lineTo(x + 120, 170 + (index % 3) * 24);
    context.lineTo(x + 250, FLOOR_Y + 40);
    context.closePath();
    context.fill();
  }
  context.restore();
}

function drawPlatform(context: CanvasRenderingContext2D, platform: Platform, camera: number) {
  const x = platform.x - camera;
  if (x + platform.width < -80 || x > WIDTH + 80) return;

  const gradient = context.createLinearGradient(x, platform.y, x, platform.y + platform.height);
  gradient.addColorStop(0, platform.kind === "ceiling" ? "#1b103c" : "#33206b");
  gradient.addColorStop(1, "#080817");
  context.fillStyle = gradient;
  context.fillRect(x, platform.y, platform.width, platform.height);
  context.strokeStyle = "#000000";
  context.lineWidth = 4;
  context.strokeRect(x, platform.y, platform.width, platform.height);

  context.strokeStyle = platform.kind === "ceiling" ? "#ff47d7" : "#59f2ff";
  context.lineWidth = 3;
  const topY = platform.kind === "ceiling" ? platform.y + platform.height : platform.y;
  context.beginPath();
  context.moveTo(x, topY);
  context.lineTo(x + platform.width, topY);
  context.stroke();

  context.globalAlpha = 0.22;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 1;
  for (let tileX = Math.ceil(platform.x / TILE) * TILE; tileX < platform.x + platform.width; tileX += TILE) {
    context.strokeRect(tileX - camera, platform.y, TILE, platform.height);
  }
  context.globalAlpha = 1;
}

function drawSpike(context: CanvasRenderingContext2D, spike: Spike, camera: number) {
  const x = spike.x - camera;
  if (x + spike.width < -70 || x > WIDTH + 70) return;

  context.save();
  context.fillStyle = "#151015";
  context.strokeStyle = "#f7f8ff";
  context.lineWidth = 4;
  context.beginPath();
  if (spike.flip) {
    context.moveTo(x, spike.y);
    context.lineTo(x + spike.width / 2, spike.y + spike.height);
    context.lineTo(x + spike.width, spike.y);
  } else {
    context.moveTo(x, spike.y + spike.height);
    context.lineTo(x + spike.width / 2, spike.y);
    context.lineTo(x + spike.width, spike.y + spike.height);
  }
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}

function drawPad(context: CanvasRenderingContext2D, pad: Pad, camera: number, elapsed: number) {
  const x = pad.x - camera;
  if (x + pad.width < -70 || x > WIDTH + 70) return;

  context.save();
  context.shadowColor = "#ff4adf";
  context.shadowBlur = pad.used ? 0 : 18 + Math.sin(elapsed * 12) * 4;
  context.fillStyle = pad.used ? "#74426d" : "#ff41d4";
  context.strokeStyle = "#ffffff";
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(x, pad.y, pad.width, pad.height, 8);
  context.fill();
  context.stroke();
  context.restore();
}

function drawOrb(context: CanvasRenderingContext2D, orb: Orb, camera: number, elapsed: number) {
  const x = orb.x - camera;
  if (x + orb.radius < -70 || x - orb.radius > WIDTH + 70) return;

  context.save();
  context.globalAlpha = orb.used ? 0.32 : 1;
  context.shadowColor = "#fff560";
  context.shadowBlur = 22;
  context.strokeStyle = "#ffffff";
  context.fillStyle = "#ffe94a";
  context.lineWidth = 4;
  context.beginPath();
  context.arc(x, orb.y + Math.sin(elapsed * 7 + orb.x) * 4, orb.radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = "#ff9f2d";
  context.beginPath();
  context.arc(x, orb.y + Math.sin(elapsed * 7 + orb.x) * 4, orb.radius * 0.46, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawPortal(context: CanvasRenderingContext2D, portal: Portal, camera: number, elapsed: number) {
  const x = portal.x - camera;
  if (x + portal.width < -80 || x > WIDTH + 80) return;

  context.save();
  context.translate(x + portal.width / 2, portal.y + portal.height / 2);
  context.rotate(elapsed * (portal.gravity === -1 ? 1 : -1) * 1.5);
  context.shadowColor = portal.gravity === -1 ? "#ff4bd8" : "#58f3ff";
  context.shadowBlur = 24;
  context.strokeStyle = portal.gravity === -1 ? "#ff4bd8" : "#58f3ff";
  context.lineWidth = 7;
  context.beginPath();
  context.ellipse(0, 0, 25, 106, 0, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = "#ffffff";
  context.lineWidth = 2;
  context.beginPath();
  context.ellipse(0, 0, 13, 92, 0, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawCoin(context: CanvasRenderingContext2D, coin: Coin, camera: number, elapsed: number) {
  if (coin.collected) return;
  const x = coin.x - camera;
  if (x < -70 || x > WIDTH + 70) return;

  context.save();
  context.translate(x, coin.y);
  context.scale(Math.max(0.28, Math.cos(elapsed * 4 + coin.x) * 0.35 + 0.65), 1);
  context.shadowColor = "#ffe65a";
  context.shadowBlur = 18;
  context.fillStyle = "#ffe156";
  context.strokeStyle = "#8b5c0c";
  context.lineWidth = 4;
  context.beginPath();
  context.arc(0, 0, 18, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = "#fff9a8";
  context.font = "900 18px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("G", 0, 1);
  context.restore();
}

function drawParticles(context: CanvasRenderingContext2D, particles: Particle[], camera: number) {
  for (const particle of particles) {
    context.globalAlpha = Math.max(0, particle.life / 0.75);
    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(particle.x - camera, particle.y, particle.radius, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

function drawPlayer(context: CanvasRenderingContext2D, player: Player, camera: number, phase: Phase) {
  const x = player.x - camera + PLAYER_SIZE / 2;
  const y = player.y + PLAYER_SIZE / 2;

  context.save();
  context.translate(x, y);
  context.rotate(player.rotation);
  context.shadowColor = phase === "crashed" ? "#ff4778" : "#62f6ff";
  context.shadowBlur = 20;
  const gradient = context.createLinearGradient(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE / 2, PLAYER_SIZE / 2);
  gradient.addColorStop(0, "#ffef55");
  gradient.addColorStop(0.48, "#22e4ff");
  gradient.addColorStop(1, "#7e4bff");
  context.fillStyle = gradient;
  context.strokeStyle = "#07070d";
  context.lineWidth = 5;
  context.beginPath();
  context.roundRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE, 4);
  context.fill();
  context.stroke();
  context.fillStyle = "#071120";
  context.fillRect(-10, -7, 7, 7);
  context.fillRect(8, -7, 7, 7);
  context.fillRect(-9, 9, 24, 5);
  context.restore();
}

function drawProgress(context: CanvasRenderingContext2D, state: State) {
  const progress = Math.max(0, Math.min(1, state.progress / 100));
  context.save();
  context.fillStyle = "rgba(0,0,0,0.24)";
  context.beginPath();
  context.roundRect(210, 24, 540, 12, 7);
  context.fill();
  const gradient = context.createLinearGradient(210, 0, 750, 0);
  gradient.addColorStop(0, "#ffef51");
  gradient.addColorStop(0.5, "#50f4ff");
  gradient.addColorStop(1, "#ff52de");
  context.fillStyle = gradient;
  context.beginPath();
  context.roundRect(210, 24, 540 * progress, 12, 7);
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = "900 18px sans-serif";
  context.textAlign = "center";
  context.fillText(`${Math.floor(state.progress)}%`, WIDTH / 2, 58);
  context.restore();
}

function drawOverlay(context: CanvasRenderingContext2D, state: State) {
  if (state.phase === "playing") return;
  context.save();
  context.fillStyle = "rgba(5,6,20,0.34)";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.textAlign = "center";
  context.fillStyle = "#ffffff";
  context.strokeStyle = "rgba(0,0,0,0.45)";
  context.lineWidth = 10;
  context.font = "900 58px sans-serif";
  const title =
    state.phase === "idle"
      ? "GEOMETRY DASH"
      : state.phase === "paused"
        ? "PAUSED"
        : state.phase === "complete"
          ? "LEVEL COMPLETE"
          : "CRASHED";
  context.strokeText(title, WIDTH / 2, HEIGHT / 2 - 18);
  context.fillText(title, WIDTH / 2, HEIGHT / 2 - 18);
  context.font = "800 21px sans-serif";
  context.lineWidth = 5;
  context.strokeText(state.message, WIDTH / 2, HEIGHT / 2 + 24);
  context.fillText(state.message, WIDTH / 2, HEIGHT / 2 + 24);
  context.font = "800 16px sans-serif";
  const hint = state.phase === "idle" ? "Space / click / tap jumps. Yellow orbs need a timed tap." : "R restarts. P pauses.";
  context.strokeText(hint, WIDTH / 2, HEIGHT / 2 + 58);
  context.fillText(hint, WIDTH / 2, HEIGHT / 2 + 58);
  context.restore();
}

function drawScene(context: CanvasRenderingContext2D, state: State, elapsed: number) {
  const camera = cameraX(state);
  context.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground(context, camera, elapsed);
  context.save();
  if (state.shake > 0) {
    context.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  PLATFORMS.forEach((platform) => drawPlatform(context, platform, camera));
  state.portals.forEach((portal) => drawPortal(context, portal, camera, elapsed));
  state.coins.forEach((coin) => drawCoin(context, coin, camera, elapsed));
  state.pads.forEach((pad) => drawPad(context, pad, camera, elapsed));
  state.orbs.forEach((orb) => drawOrb(context, orb, camera, elapsed));
  SPIKES.forEach((spike) => drawSpike(context, spike, camera));
  drawParticles(context, state.particles, camera);
  drawPlayer(context, state.player, camera, state.phase);
  context.restore();
  drawProgress(context, state);
  drawOverlay(context, state);
}

export function GeometryDashGame() {
  const initialState = createState(readStoredNumber(STORAGE_KEY));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef(initialState);
  const elapsedRef = useRef(0);
  const [hud, setHud] = useState({
    progress: initialState.progress,
    bestProgress: initialState.bestProgress,
    phase: initialState.phase,
    attempt: initialState.attempt,
    practice: initialState.practice,
    coins: 0,
    message: initialState.message,
  });

  function sync(nextState: State, forceHud = false) {
    const previous = stateRef.current;
    stateRef.current = nextState;
    const collectedCoins = nextState.coins.filter((coin) => coin.collected).length;
    const shouldUpdateHud =
      forceHud ||
      nextState.phase !== previous.phase ||
      nextState.attempt !== previous.attempt ||
      nextState.practice !== previous.practice ||
      Math.floor(nextState.progress) !== Math.floor(previous.progress) ||
      Math.floor(nextState.bestProgress) !== Math.floor(previous.bestProgress) ||
      collectedCoins !== previous.coins.filter((coin) => coin.collected).length ||
      nextState.message !== previous.message;

    if (shouldUpdateHud) {
      setHud({
        progress: nextState.progress,
        bestProgress: nextState.bestProgress,
        phase: nextState.phase,
        attempt: nextState.attempt,
        practice: nextState.practice,
        coins: collectedCoins,
        message: nextState.message,
      });
    }

    if (Math.floor(nextState.bestProgress) > Math.floor(previous.bestProgress) || nextState.phase === "complete") {
      writeStoredNumber(STORAGE_KEY, nextState.bestProgress);
    }
  }

  function render() {
    const context = contextRef.current;
    if (context) {
      drawScene(context, stateRef.current, elapsedRef.current);
    }
  }

  function activate() {
    sync(jumpOrTriggerOrb(stateRef.current), true);
    render();
  }

  function restart() {
    sync(resetRun(stateRef.current), true);
    render();
  }

  function togglePause() {
    const current = stateRef.current;
    if (current.phase === "playing") {
      sync({ ...current, phase: "paused", message: "Paused." }, true);
    } else if (current.phase === "paused") {
      sync({ ...current, phase: "playing", message: "Back on beat." }, true);
    }
  }

  function togglePractice() {
    const current = stateRef.current;
    sync(resetRun(current, !current.practice), true);
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
    const code = event.code.toLowerCase();
    if (key === " " || code === "space" || key === "arrowup" || key === "w" || key === "enter") {
      event.preventDefault();
      event.stopPropagation();
      activate();
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
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, []);

  useAnimationFrameLoop((delta, elapsed) => {
    elapsedRef.current = elapsed;
    const next = updateState(stateRef.current, Math.min(delta, 0.034));
    sync(next);
    render();
  });

  return (
    <GamePanel>
      <div
        className="mx-auto flex max-w-full flex-col gap-5"
        style={{ width: "min(100%, calc(100vw - 2rem))" }}
      >
        <GameHud
          items={[
            { label: "Progress", value: `${Math.floor(hud.progress)}%` },
            { label: "Best", value: `${Math.floor(hud.bestProgress)}%` },
            { label: "Attempt", value: hud.attempt },
            { label: "Coins", value: `${hud.coins}/4` },
            { label: "Mode", value: hud.practice ? "practice" : "normal" },
            { label: "Status", value: hud.phase },
          ]}
          actions={
            <>
              <GameButton variant="primary" onClick={activate}>
                Jump
              </GameButton>
              <GameButton onClick={restart}>Restart</GameButton>
              <GameButton onClick={togglePause}>{hud.phase === "paused" ? "Resume" : "Pause"}</GameButton>
              <GameButton onClick={togglePractice}>{hud.practice ? "Normal" : "Practice"}</GameButton>
            </>
          }
        />

        <GamePlayfield className="mx-auto aspect-video w-full max-w-[min(60rem,72dvh)] touch-none border-0 bg-[#2220a4]">
          <canvas
            ref={canvasRef}
            className="h-full w-full"
            aria-label="Geometry Dash playfield"
            onPointerDown={(event) => {
              event.preventDefault();
              activate();
            }}
          />
        </GamePlayfield>

        <GameStatus>
          {hud.message} Space, W, click, or tap jumps and triggers yellow orbs. P pauses, R restarts.
        </GameStatus>

        <TouchControls className="max-w-[22rem]">
          <div className="grid grid-cols-2 gap-2">
            <GameButton variant="touch" onPointerDown={activate}>
              Jump
            </GameButton>
            <GameButton variant="touch" onClick={restart}>
              Restart
            </GameButton>
          </div>
        </TouchControls>
      </div>
    </GamePanel>
  );
}
