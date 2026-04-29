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
const FLOOR = 422;
const STORAGE_KEY = "arcade.arcadeFighter.bestWins";

type Phase = "intro" | "ready" | "playing" | "paused" | "round-over";
type Side = "player" | "rival";
type Action =
  | "idle"
  | "walk"
  | "crouch"
  | "jump"
  | "jab"
  | "kick"
  | "sweep"
  | "uppercut"
  | "fireball"
  | "impact"
  | "block"
  | "hit"
  | "ko";

type AttackId = "jab" | "kick" | "sweep" | "uppercut" | "impact";

type AttackSpec = {
  id: AttackId;
  damage: number;
  chip: number;
  startup: number;
  active: number;
  recovery: number;
  reach: number;
  height: number;
  lift: number;
  knockback: number;
  superGain: number;
  driveCost?: number;
};

type Fighter = {
  side: Side;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  drive: number;
  super: number;
  facing: 1 | -1;
  grounded: boolean;
  crouching: boolean;
  blocking: boolean;
  action: Action;
  actionTimer: number;
  attack?: AttackId;
  hitLanded: boolean;
  hitStop: number;
  stun: number;
  combo: number;
  aiThink: number;
  aiPlan: Action;
};

type Projectile = {
  owner: Side;
  x: number;
  y: number;
  vx: number;
  radius: number;
  damage: number;
  life: number;
  hit: boolean;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  kind: "spark" | "dust" | "paint" | "shock";
};

type FloatingText = {
  text: string;
  x: number;
  y: number;
  life: number;
};

type State = {
  phase: Phase;
  player: Fighter;
  rival: Fighter;
  projectiles: Projectile[];
  particles: Particle[];
  floaters: FloatingText[];
  timer: number;
  round: number;
  wins: number;
  bestWins: number;
  message: string;
  cameraShake: number;
  slowMo: number;
  roundPause: number;
};

const attacks: Record<AttackId, AttackSpec> = {
  jab: { id: "jab", damage: 6, chip: 1, startup: 0.06, active: 0.08, recovery: 0.18, reach: 78, height: 66, lift: 0, knockback: 120, superGain: 5 },
  kick: { id: "kick", damage: 10, chip: 2, startup: 0.11, active: 0.1, recovery: 0.27, reach: 104, height: 72, lift: 0, knockback: 180, superGain: 8 },
  sweep: { id: "sweep", damage: 9, chip: 1, startup: 0.14, active: 0.12, recovery: 0.34, reach: 118, height: 38, lift: -240, knockback: 210, superGain: 9 },
  uppercut: { id: "uppercut", damage: 16, chip: 3, startup: 0.1, active: 0.16, recovery: 0.44, reach: 74, height: 124, lift: -520, knockback: 190, superGain: 14 },
  impact: { id: "impact", damage: 18, chip: 5, startup: 0.24, active: 0.16, recovery: 0.5, reach: 96, height: 96, lift: -180, knockback: 390, superGain: 16, driveCost: 32 },
};

function createFighter(side: Side, bestWins = 0): Fighter {
  const isPlayer = side === "player";
  return {
    side,
    name: isPlayer ? "Ryo" : "Kane",
    x: isPlayer ? 250 : 710,
    y: FLOOR,
    vx: 0,
    vy: 0,
    health: 100,
    drive: 100,
    super: Math.min(100, bestWins * 6),
    facing: isPlayer ? 1 : -1,
    grounded: true,
    crouching: false,
    blocking: false,
    action: "idle",
    actionTimer: 0,
    hitLanded: false,
    hitStop: 0,
    stun: 0,
    combo: 0,
    aiThink: 0,
    aiPlan: "idle",
  };
}

function createState(bestWins = 0): State {
  return {
    phase: "intro",
    player: createFighter("player", bestWins),
    rival: createFighter("rival"),
    projectiles: [],
    particles: [],
    floaters: [],
    timer: 99,
    round: 1,
    wins: 0,
    bestWins,
    message: "Press Space to step into the fight.",
    cameraShake: 0,
    slowMo: 0,
    roundPause: 0,
  };
}

function startRound(current: State, keepWins = true): State {
  const wins = keepWins ? current.wins : 0;
  return {
    ...createState(current.bestWins),
    phase: "playing",
    round: current.round + (keepWins && current.phase === "round-over" ? 1 : 0),
    wins,
    message: "Fight!",
    roundPause: 0,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function actionDuration(fighter: Fighter) {
  if (!fighter.attack) return 0;
  const spec = attacks[fighter.attack];
  return spec.startup + spec.active + spec.recovery;
}

function inActiveFrames(fighter: Fighter) {
  if (!fighter.attack) return false;
  const spec = attacks[fighter.attack];
  const elapsed = actionDuration(fighter) - fighter.actionTimer;
  return elapsed >= spec.startup && elapsed <= spec.startup + spec.active;
}

function canAct(fighter: Fighter) {
  return fighter.stun <= 0 && fighter.actionTimer <= 0 && fighter.action !== "ko";
}

function startAttack(fighter: Fighter, attack: AttackId): Fighter {
  if (!canAct(fighter)) return fighter;
  const spec = attacks[attack];
  if (spec.driveCost && fighter.drive < spec.driveCost) return fighter;
  return {
    ...fighter,
    action: attack,
    actionTimer: spec.startup + spec.active + spec.recovery,
    attack,
    hitLanded: false,
    crouching: false,
    blocking: false,
    drive: Math.max(0, fighter.drive - (spec.driveCost ?? 0)),
  };
}

function startFireball(fighter: Fighter) {
  if (!canAct(fighter) || fighter.super < 18) return { fighter, projectile: undefined };
  return {
    fighter: {
      ...fighter,
      action: "fireball" as Action,
      actionTimer: 0.42,
      attack: undefined,
      hitLanded: true,
      super: Math.max(0, fighter.super - 18),
      crouching: false,
      blocking: false,
    },
    projectile: {
      owner: fighter.side,
      x: fighter.x + fighter.facing * 58,
      y: fighter.y - 88,
      vx: fighter.facing * 430,
      radius: 18,
      damage: 12,
      life: 1.45,
      hit: false,
    } satisfies Projectile,
  };
}

function hitbox(attacker: Fighter, spec: AttackSpec) {
  const baseY = attacker.y - (spec.id === "sweep" ? 30 : spec.id === "uppercut" ? 92 : 70);
  return {
    x: attacker.x + attacker.facing * (48 + spec.reach / 2),
    y: baseY,
    width: spec.reach,
    height: spec.height,
  };
}

function hurtbox(fighter: Fighter) {
  return {
    x: fighter.x,
    y: fighter.y - (fighter.crouching ? 48 : 78),
    width: fighter.crouching ? 58 : 64,
    height: fighter.crouching ? 70 : 122,
  };
}

function boxesOverlap(a: ReturnType<typeof hitbox>, b: ReturnType<typeof hurtbox>) {
  return Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.y - b.y) < (a.height + b.height) / 2;
}

function spawnHitParticles(x: number, y: number, strong = false): Particle[] {
  const colors = strong ? ["#fff06a", "#ff5a2b", "#64f8ff", "#ffffff"] : ["#ffe98a", "#ff8d47", "#ffffff"];
  return Array.from({ length: strong ? 20 : 10 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / (strong ? 20 : 10) + Math.random() * 0.5;
    const speed = (strong ? 180 : 110) + Math.random() * (strong ? 260 : 130);
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      life: strong ? 0.48 : 0.32,
      maxLife: strong ? 0.48 : 0.32,
      size: strong ? 7 + Math.random() * 8 : 4 + Math.random() * 5,
      color: colors[index % colors.length],
      kind: strong ? "paint" : "spark",
    };
  });
}

function spawnDust(x: number, y: number, amount = 6): Particle[] {
  return Array.from({ length: amount }, () => ({
    x: x + (Math.random() - 0.5) * 36,
    y,
    vx: (Math.random() - 0.5) * 120,
    vy: -40 - Math.random() * 80,
    life: 0.42,
    maxLife: 0.42,
    size: 5 + Math.random() * 7,
    color: "rgba(236,188,112,0.86)",
    kind: "dust",
  }));
}

function applyDamage(defender: Fighter, attacker: Fighter, spec: AttackSpec, blocked: boolean) {
  const damage = blocked ? spec.chip : spec.damage;
  const nextHealth = Math.max(0, defender.health - damage);
  const impact = blocked ? 0.35 : 1;
  const nextDefender: Fighter = {
    ...defender,
    health: nextHealth,
    drive: Math.max(0, defender.drive - (blocked ? 7 : 13)),
    super: clamp(defender.super + (blocked ? 2 : 5), 0, 100),
    vx: attacker.facing * spec.knockback * impact,
    vy: blocked ? defender.vy : Math.min(defender.vy, spec.lift),
    stun: blocked ? 0.12 : spec.id === "impact" ? 0.56 : 0.26,
    hitStop: blocked ? 0.07 : 0.11,
    action: nextHealth <= 0 ? "ko" : blocked ? "block" : "hit",
    actionTimer: blocked ? 0.15 : 0.24,
    attack: undefined,
    blocking: blocked,
    combo: blocked ? 0 : defender.combo,
  };
  const nextAttacker: Fighter = {
    ...attacker,
    hitLanded: true,
    hitStop: blocked ? 0.04 : 0.08,
    super: clamp(attacker.super + spec.superGain, 0, 100),
    drive: clamp(attacker.drive + (blocked ? 2 : 5), 0, 100),
    combo: blocked ? 0 : attacker.combo + 1,
  };
  return { defender: nextDefender, attacker: nextAttacker, damage };
}

function updateFacing(player: Fighter, rival: Fighter) {
  return {
    player: { ...player, facing: player.x <= rival.x ? 1 as const : -1 as const },
    rival: { ...rival, facing: rival.x <= player.x ? 1 as const : -1 as const },
  };
}

function updateFighterPhysics(fighter: Fighter, delta: number) {
  let next = { ...fighter };
  next.hitStop = Math.max(0, next.hitStop - delta);
  if (next.hitStop > 0) return next;

  next.stun = Math.max(0, next.stun - delta);
  next.actionTimer = Math.max(0, next.actionTimer - delta);
  next.drive = clamp(next.drive + delta * 7, 0, 100);
  if (next.actionTimer <= 0 && next.action !== "ko") {
    next.attack = undefined;
    next.action = next.grounded ? (next.crouching ? "crouch" : Math.abs(next.vx) > 8 ? "walk" : "idle") : "jump";
    next.hitLanded = false;
  }

  next.vy += 1650 * delta;
  next.x = clamp(next.x + next.vx * delta, 58, WIDTH - 58);
  next.y += next.vy * delta;
  if (next.y >= FLOOR) {
    if (!next.grounded && next.vy > 220) {
      next = { ...next, ...{ y: FLOOR, vy: 0, grounded: true }, action: next.action === "ko" ? "ko" : "idle" };
    } else {
      next.y = FLOOR;
      next.vy = 0;
      next.grounded = true;
    }
  } else {
    next.grounded = false;
  }
  next.vx *= next.grounded ? 0.82 : 0.96;
  return next;
}

function applyPlayerInput(player: Fighter, keys: Set<string>) {
  if (!canAct(player)) return player;
  const left = keys.has("a") || keys.has("arrowleft");
  const right = keys.has("d") || keys.has("arrowright");
  const up = keys.has("w") || keys.has("arrowup");
  const down = keys.has("s") || keys.has("arrowdown");
  const back = player.facing === 1 ? left : right;
  const horizontal = Number(right) - Number(left);
  const next = { ...player };
  next.crouching = down && next.grounded;
  next.blocking = back && next.grounded && !right && !left ? true : back && !down;
  if (next.blocking) {
    next.action = "block";
    next.vx = horizontal * 90;
  } else if (next.crouching) {
    next.action = "crouch";
    next.vx = horizontal * 80;
  } else {
    next.vx = horizontal * 260;
    next.action = Math.abs(next.vx) > 0 ? "walk" : "idle";
  }
  if (up && next.grounded && !next.crouching) {
    next.vy = -690;
    next.grounded = false;
    next.action = "jump";
  }
  return next;
}

function chooseAiAction(rival: Fighter, player: Fighter, delta: number) {
  let next = { ...rival, aiThink: rival.aiThink - delta };
  const distance = Math.abs(player.x - rival.x);
  const playerThreat = player.attack && inActiveFrames(player) && distance < 140;

  if (next.aiThink <= 0 && canAct(next)) {
    if (playerThreat && Math.random() < 0.72) {
      next.aiPlan = "block";
      next.aiThink = 0.25;
    } else if (distance > 320 && next.super >= 18 && Math.random() < 0.45) {
      next.aiPlan = "fireball";
      next.aiThink = 0.62;
    } else if (distance > 140) {
      next.aiPlan = "walk";
      next.aiThink = 0.3 + Math.random() * 0.3;
    } else if (distance < 58) {
      next.aiPlan = Math.random() < 0.6 ? "sweep" : "uppercut";
      next.aiThink = 0.55;
    } else {
      next.aiPlan = Math.random() < 0.48 ? "kick" : "jab";
      next.aiThink = 0.35 + Math.random() * 0.22;
    }
  }

  if (!canAct(next)) return next;

  if (next.aiPlan === "block") {
    next.blocking = true;
    next.crouching = Math.random() < 0.35;
    next.vx = 0;
    next.action = "block";
  } else if (next.aiPlan === "walk") {
    next.blocking = false;
    next.crouching = false;
    next.vx = next.facing * 185;
    next.action = "walk";
  } else if (next.aiPlan === "fireball") {
    next.vx = 0;
  } else if (["jab", "kick", "sweep", "uppercut", "impact"].includes(next.aiPlan)) {
    next = startAttack(next, next.aiPlan as AttackId);
  }
  return next;
}

function resolveBodyCollision(player: Fighter, rival: Fighter) {
  const distance = rival.x - player.x;
  const minDistance = 78;
  if (Math.abs(distance) >= minDistance) return { player, rival };
  const push = (minDistance - Math.abs(distance)) / 2;
  const direction = distance >= 0 ? 1 : -1;
  return {
    player: { ...player, x: clamp(player.x - direction * push, 58, WIDTH - 58) },
    rival: { ...rival, x: clamp(rival.x + direction * push, 58, WIDTH - 58) },
  };
}

function updateProjectiles(state: State, delta: number) {
  let player = state.player;
  let rival = state.rival;
  const particles = [...state.particles];
  const floaters = [...state.floaters];
  const projectiles: Projectile[] = [];
  let cameraShake = state.cameraShake;
  let slowMo = state.slowMo;

  for (const projectile of state.projectiles) {
    const next = { ...projectile, x: projectile.x + projectile.vx * delta, life: projectile.life - delta };
    const target = next.owner === "player" ? rival : player;
    const blocked = target.blocking && target.facing !== Math.sign(projectile.vx);
    const targetBox = hurtbox(target);
    const overlaps = Math.abs(next.x - targetBox.x) < targetBox.width / 2 + next.radius && Math.abs(next.y - targetBox.y) < targetBox.height / 2 + next.radius;
    if (overlaps && target.hitStop <= 0) {
      const damage = blocked ? 3 : next.damage;
      const updatedTarget: Fighter = {
        ...target,
        health: Math.max(0, target.health - damage),
        drive: Math.max(0, target.drive - (blocked ? 6 : 12)),
        vx: Math.sign(projectile.vx) * (blocked ? 120 : 260),
        stun: blocked ? 0.14 : 0.32,
        hitStop: blocked ? 0.05 : 0.1,
        action: target.health - damage <= 0 ? "ko" : blocked ? "block" : "hit",
        actionTimer: 0.24,
      };
      if (next.owner === "player") rival = updatedTarget;
      else player = updatedTarget;
      particles.push(...spawnHitParticles(next.x, next.y, !blocked));
      floaters.push({ text: blocked ? "BLOCK" : "HIT", x: next.x, y: next.y - 30, life: 0.65 });
      cameraShake = Math.max(cameraShake, blocked ? 4 : 10);
      slowMo = Math.max(slowMo, blocked ? 0.02 : 0.05);
    } else if (next.life > 0 && next.x > -40 && next.x < WIDTH + 40) {
      projectiles.push(next);
      particles.push({
        x: next.x - Math.sign(next.vx) * 14,
        y: next.y + (Math.random() - 0.5) * 8,
        vx: -Math.sign(next.vx) * 24,
        vy: (Math.random() - 0.5) * 24,
        life: 0.16,
        maxLife: 0.16,
        size: 5 + Math.random() * 6,
        color: "#7ee8ff",
        kind: "shock",
      });
    }
  }
  return { player, rival, projectiles, particles, floaters, cameraShake, slowMo };
}

function resolveAttackHits(state: State) {
  let player = state.player;
  let rival = state.rival;
  const particles = [...state.particles];
  const floaters = [...state.floaters];
  let cameraShake = state.cameraShake;
  let slowMo = state.slowMo;

  function tryHit(attacker: Fighter, defender: Fighter) {
    if (!attacker.attack || attacker.hitLanded || !inActiveFrames(attacker)) return { attacker, defender, didHit: false };
    const spec = attacks[attacker.attack];
    if (!boxesOverlap(hitbox(attacker, spec), hurtbox(defender))) return { attacker, defender, didHit: false };
    const blocked = defender.blocking && defender.facing === -attacker.facing && spec.id !== "sweep";
    const result = applyDamage(defender, attacker, spec, blocked);
    const impactX = defender.x - defender.facing * 42;
    const impactY = defender.y - (spec.id === "sweep" ? 34 : spec.id === "uppercut" ? 104 : 76);
    particles.push(...spawnHitParticles(impactX, impactY, spec.id === "impact" || spec.id === "uppercut"));
    floaters.push({
      text: blocked ? "BLOCK" : result.damage >= 16 ? "CRUSH" : `${result.damage}`,
      x: impactX,
      y: impactY - 28,
      life: 0.68,
    });
    cameraShake = Math.max(cameraShake, blocked ? 5 : spec.id === "impact" ? 18 : 10);
    slowMo = Math.max(slowMo, blocked ? 0.03 : spec.id === "impact" ? 0.12 : 0.06);
    return { attacker: result.attacker, defender: result.defender, didHit: true };
  }

  let result = tryHit(player, rival);
  player = result.attacker;
  rival = result.defender;
  result = tryHit(rival, player);
  rival = result.attacker;
  player = result.defender;
  return { player, rival, particles, floaters, cameraShake, slowMo };
}

function updateParticles(particles: Particle[], delta: number) {
  return particles
    .map((particle) => ({
      ...particle,
      x: particle.x + particle.vx * delta,
      y: particle.y + particle.vy * delta,
      vy: particle.vy + (particle.kind === "dust" ? 180 : 420) * delta,
      life: particle.life - delta,
    }))
    .filter((particle) => particle.life > 0);
}

function updateFloaters(floaters: FloatingText[], delta: number) {
  return floaters
    .map((floater) => ({ ...floater, y: floater.y - 48 * delta, life: floater.life - delta }))
    .filter((floater) => floater.life > 0);
}

function updateState(state: State, rawDelta: number, keys: Set<string>): State {
  let delta = state.slowMo > 0 ? rawDelta * 0.32 : rawDelta;
  delta = Math.min(delta, 0.033);

  if (state.phase === "intro" || state.phase === "paused") {
    return {
      ...state,
      particles: updateParticles(state.particles, rawDelta),
      cameraShake: Math.max(0, state.cameraShake - rawDelta * 18),
    };
  }

  if (state.phase === "ready") {
    const roundPause = Math.max(0, state.roundPause - rawDelta);
    return {
      ...state,
      phase: roundPause <= 0 ? "playing" : "ready",
      roundPause,
      message: roundPause <= 0 ? "Fight!" : "Get ready.",
    };
  }

  if (state.phase === "round-over") {
    return {
      ...state,
      particles: updateParticles(state.particles, rawDelta),
      floaters: updateFloaters(state.floaters, rawDelta),
      cameraShake: Math.max(0, state.cameraShake - rawDelta * 18),
      slowMo: Math.max(0, state.slowMo - rawDelta),
    };
  }

  let player = applyPlayerInput(state.player, keys);
  let rival = chooseAiAction(state.rival, player, delta);
  let projectiles = [...state.projectiles];
  let particles = [...state.particles];
  let floaters = [...state.floaters];

  if (rival.aiPlan === "fireball" && canAct(rival)) {
    const fired = startFireball(rival);
    rival = fired.fighter;
    if (fired.projectile) projectiles.push(fired.projectile);
  }

  player = updateFighterPhysics(player, delta);
  rival = updateFighterPhysics(rival, delta);
  ({ player, rival } = resolveBodyCollision(player, rival));
  ({ player, rival } = updateFacing(player, rival));

  const projectileResult = updateProjectiles({ ...state, player, rival, projectiles, particles, floaters }, delta);
  player = projectileResult.player;
  rival = projectileResult.rival;
  projectiles = projectileResult.projectiles;
  particles = projectileResult.particles;
  floaters = projectileResult.floaters;

  const hitResult = resolveAttackHits({ ...state, player, rival, projectiles, particles, floaters, cameraShake: projectileResult.cameraShake, slowMo: projectileResult.slowMo });
  player = hitResult.player;
  rival = hitResult.rival;
  particles = hitResult.particles;
  floaters = hitResult.floaters;

  if (player.grounded && Math.abs(player.vx) > 180) particles.push(...spawnDust(player.x, FLOOR + 2, 1));
  if (rival.grounded && Math.abs(rival.vx) > 170) particles.push(...spawnDust(rival.x, FLOOR + 2, 1));

  const timer = Math.max(0, state.timer - delta);
  const playerWon = rival.health <= 0 || (timer <= 0 && player.health >= rival.health);
  const rivalWon = player.health <= 0 || (timer <= 0 && rival.health > player.health);
  const wins = playerWon ? state.wins + 1 : state.wins;
  const bestWins = Math.max(state.bestWins, wins);

  return {
    ...state,
    phase: playerWon || rivalWon ? "round-over" : "playing",
    player,
    rival,
    projectiles,
    particles: updateParticles(particles, rawDelta),
    floaters: updateFloaters(floaters, rawDelta),
    timer,
    wins,
    bestWins,
    message: playerWon ? "K.O. You win. Space starts the next round." : rivalWon ? "K.O. Rival wins. Space rematches." : "Fight!",
    cameraShake: Math.max(0, hitResult.cameraShake - rawDelta * 18),
    slowMo: Math.max(0, hitResult.slowMo - rawDelta),
  };
}

function drawRoundedBar(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, value: number, color: string, flip = false) {
  context.save();
  context.fillStyle = "rgba(12,12,18,0.86)";
  context.strokeStyle = "rgba(255,255,255,0.52)";
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(x, y, width, height, 8);
  context.fill();
  context.stroke();
  const fillWidth = Math.max(0, (width - 8) * (value / 100));
  context.fillStyle = color;
  context.beginPath();
  context.roundRect(flip ? x + width - 4 - fillWidth : x + 4, y + 4, fillWidth, height - 8, 5);
  context.fill();
  context.restore();
}

function drawStage(context: CanvasRenderingContext2D, elapsed: number) {
  const sky = context.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, "#0d9de6");
  sky.addColorStop(0.34, "#70dcff");
  sky.addColorStop(0.56, "#ffd06b");
  sky.addColorStop(1, "#25100d");
  context.fillStyle = sky;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.fillStyle = "rgba(255,255,255,0.72)";
  for (let i = 0; i < 16; i += 1) {
    const x = (i * 86 + (elapsed * 14) % 86) - 40;
    context.beginPath();
    context.ellipse(x, 72 + (i % 4) * 14, 48, 13, 0, 0, Math.PI * 2);
    context.fill();
  }

  for (let layer = 0; layer < 3; layer += 1) {
    const y = 122 + layer * 38;
    const alpha = 0.28 + layer * 0.16;
    context.fillStyle = `rgba(30,33,61,${alpha})`;
    for (let i = -1; i < 12; i += 1) {
      const width = 72 + ((i + layer) % 4) * 22;
      const height = 92 + ((i * 17 + layer * 9) % 80);
      const x = i * 92 - ((elapsed * (8 + layer * 4)) % 92);
      context.fillRect(x, y + 110 - height, width, height);
      context.fillStyle = `rgba(255,220,96,${0.12 + layer * 0.04})`;
      for (let w = 0; w < 3; w += 1) {
        context.fillRect(x + 12 + w * 18, y + 132 - height, 8, 24);
      }
      context.fillStyle = `rgba(30,33,61,${alpha})`;
    }
  }

  const crowdY = FLOOR - 52;
  for (let i = 0; i < 34; i += 1) {
    const bob = Math.sin(elapsed * 3.4 + i) * 3;
    const x = 12 + i * 30;
    context.fillStyle = i % 3 === 0 ? "#32244f" : i % 3 === 1 ? "#5c2134" : "#233d5d";
    context.beginPath();
    context.roundRect(x, crowdY + bob, 20, 44, 8);
    context.fill();
    context.fillStyle = "#d99b62";
    context.beginPath();
    context.arc(x + 10, crowdY - 8 + bob, 9, 0, Math.PI * 2);
    context.fill();
  }

  const banner = context.createLinearGradient(0, FLOOR - 176, WIDTH, FLOOR - 134);
  banner.addColorStop(0, "#ef2445");
  banner.addColorStop(0.48, "#ffdc45");
  banner.addColorStop(1, "#24bfff");
  context.fillStyle = banner;
  context.fillRect(0, FLOOR - 180, WIDTH, 46);
  context.fillStyle = "#111";
  context.font = "900 19px sans-serif";
  context.textAlign = "center";
  context.fillText("WORLD ARCADE FIGHTING GRAND PRIX", WIDTH / 2, FLOOR - 151);

  context.save();
  context.globalAlpha = 0.2;
  context.strokeStyle = "#fff8a6";
  context.lineWidth = 8;
  for (let i = 0; i < 10; i += 1) {
    context.beginPath();
    context.moveTo(i * 120 - 80, 112 + (i % 3) * 42);
    context.lineTo(i * 120 + 80, 82 + (i % 3) * 42);
    context.stroke();
  }
  context.restore();

  const floor = context.createLinearGradient(0, FLOOR, 0, HEIGHT);
  floor.addColorStop(0, "#8b3827");
  floor.addColorStop(0.52, "#3d1b19");
  floor.addColorStop(1, "#120b0c");
  context.fillStyle = floor;
  context.fillRect(0, FLOOR, WIDTH, HEIGHT - FLOOR);
  context.strokeStyle = "rgba(255,206,112,0.22)";
  context.lineWidth = 2;
  for (let i = 0; i < 15; i += 1) {
    const y = FLOOR + i * 10;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(WIDTH, y + i * 3);
    context.stroke();
  }
  for (let i = 0; i < 13; i += 1) {
    const x = i * 80;
    context.beginPath();
    context.moveTo(x, FLOOR);
    context.lineTo(x - 130, HEIGHT);
    context.stroke();
  }
}

function drawFighter(context: CanvasRenderingContext2D, fighter: Fighter, elapsed: number) {
  const isPlayer = fighter.side === "player";
  const sway = Math.sin(elapsed * 8 + (isPlayer ? 0 : 1.6)) * (fighter.action === "idle" ? 3 : 1);
  const crouch = fighter.crouching ? 18 : 0;
  const hitFlash = fighter.action === "hit" && Math.floor(elapsed * 34) % 2 === 0;

  context.save();
  context.translate(fighter.x, fighter.y);
  context.scale(fighter.facing * 1.18, 1.18);
  context.globalAlpha = fighter.action === "ko" ? 0.82 : 1;
  if (fighter.action === "ko") context.rotate(fighter.facing * -0.75);

  context.fillStyle = "rgba(0,0,0,0.28)";
  context.beginPath();
  context.ellipse(0, 8, 58, 12, 0, 0, Math.PI * 2);
  context.fill();

  const skin = hitFlash ? "#ffffff" : isPlayer ? "#d99a62" : "#e1b071";
  const cloth = isPlayer ? "#f2eee5" : "#d5262f";
  const trim = isPlayer ? "#e02222" : "#f7c146";
  const dark = "#151116";

  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = dark;
  context.lineWidth = 9;

  const lean = fighter.action === "walk" ? 8 : fighter.action === "block" ? -8 : fighter.attack ? 12 : 0;
  const torsoY = -82 + crouch;

  context.save();
  context.translate(lean, torsoY + sway);
  context.rotate((fighter.attack === "uppercut" ? -0.28 : fighter.action === "block" ? -0.16 : 0.08) * fighter.facing);
  context.fillStyle = cloth;
  context.beginPath();
  context.moveTo(-30, -6);
  context.lineTo(30, -8);
  context.lineTo(38, 58);
  context.quadraticCurveTo(0, 78, -40, 58);
  context.closePath();
  context.fill();
  context.stroke();
  context.strokeStyle = isPlayer ? "rgba(255,255,255,0.72)" : "rgba(255,210,78,0.52)";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(-18, 8);
  context.quadraticCurveTo(-5, 28, -24, 52);
  context.moveTo(18, 8);
  context.quadraticCurveTo(4, 30, 25, 52);
  context.stroke();
  context.fillStyle = isPlayer ? "#141414" : "#5a1512";
  context.fillRect(-9, 30, 18, 50);
  context.strokeRect(-9, 30, 18, 50);
  context.restore();

  const headY = -142 + crouch + sway;
  context.fillStyle = skin;
  context.beginPath();
  context.roundRect(-22 + lean * 0.25, headY, 44, 48, 14);
  context.fill();
  context.stroke();

  context.fillStyle = isPlayer ? "#171015" : "#f6c62f";
  for (let i = 0; i < 7; i += 1) {
    context.beginPath();
    context.moveTo(-24 + i * 8, headY + 7);
    context.lineTo(-34 + i * 12, headY - 22 - (i % 2) * 9);
    context.lineTo(-12 + i * 7, headY + 2);
    context.fill();
  }
  context.fillStyle = trim;
  context.fillRect(-29, headY + 10, 58, 9);
  if (isPlayer) {
    context.beginPath();
    context.moveTo(-28, headY + 15);
    context.quadraticCurveTo(-62, headY + 1 + Math.sin(elapsed * 7) * 8, -82, headY + 24);
    context.lineTo(-58, headY + 30);
    context.closePath();
    context.fill();
  }

  context.fillStyle = "#111";
  context.fillRect(7, headY + 27, 9, 4);

  function limb(fromX: number, fromY: number, toX: number, toY: number, width: number, color: string) {
    context.strokeStyle = dark;
    context.lineWidth = width + 6;
    context.beginPath();
    context.moveTo(fromX, fromY);
    context.lineTo(toX, toY);
    context.stroke();
    context.strokeStyle = color;
    context.lineWidth = width;
    context.beginPath();
    context.moveTo(fromX, fromY);
    context.lineTo(toX, toY);
    context.stroke();
  }

  const punchExtend = fighter.attack === "jab" || fighter.attack === "impact" ? 56 : fighter.action === "block" ? -14 : 0;
  const kickExtend = fighter.attack === "kick" ? 78 : fighter.attack === "sweep" ? 94 : 0;
  const upper = fighter.attack === "uppercut" ? -78 : 0;

  limb(-24 + lean, -72 + crouch, -58, -44 + crouch, 16, skin);
  limb(24 + lean, -72 + crouch, 58 + punchExtend, -70 + upper + crouch, 16, skin);
  context.fillStyle = skin;
  context.strokeStyle = dark;
  context.lineWidth = 5;
  context.beginPath();
  context.ellipse(-29 + lean, -66 + crouch, 15, 21, -0.35, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.beginPath();
  context.ellipse(32 + lean, -66 + crouch, 16, 22, 0.3, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = isPlayer ? "#d71920" : "#7b3b16";
  context.beginPath();
  context.roundRect(48 + punchExtend, -84 + upper + crouch, 30, 28, 10);
  context.fill();
  context.stroke();

  limb(-17, -18 + crouch, -36, 0, 18, cloth);
  limb(20, -18 + crouch, 42 + kickExtend, -6 + (fighter.attack === "sweep" ? 22 : 0), 18, cloth);
  context.fillStyle = "#151515";
  context.beginPath();
  context.roundRect(31 + kickExtend, -18 + (fighter.attack === "sweep" ? 22 : 0), 38, 18, 8);
  context.fill();
  context.stroke();

  if (fighter.action === "block") {
    context.strokeStyle = "rgba(119,230,255,0.75)";
    context.lineWidth = 4;
    context.beginPath();
    context.arc(36, -82 + crouch, 58, -0.9, 1.15);
    context.stroke();
  }

  if (fighter.attack === "impact" && inActiveFrames(fighter)) {
    context.strokeStyle = "rgba(255,255,255,0.86)";
    context.lineWidth = 5;
    context.beginPath();
    context.arc(54, -72, 48 + Math.sin(elapsed * 30) * 5, -0.8, 0.8);
    context.stroke();
  }

  context.restore();
}

function drawProjectile(context: CanvasRenderingContext2D, projectile: Projectile, elapsed: number) {
  const gradient = context.createRadialGradient(projectile.x, projectile.y, 2, projectile.x, projectile.y, 28);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.35, "#91f7ff");
  gradient.addColorStop(1, "rgba(0,84,255,0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(projectile.x, projectile.y, 30 + Math.sin(elapsed * 24) * 4, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#c9fbff";
  context.lineWidth = 3;
  context.beginPath();
  context.arc(projectile.x, projectile.y, 15, 0, Math.PI * 2);
  context.stroke();
}

function drawParticles(context: CanvasRenderingContext2D, particles: Particle[]) {
  for (const particle of particles) {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = particle.color;
    if (particle.kind === "paint") {
      context.translate(particle.x, particle.y);
      context.rotate(Math.atan2(particle.vy, particle.vx));
      context.fillRect(-particle.size, -particle.size / 3, particle.size * 2.4, particle.size * 0.66);
    } else {
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }
}

function drawHud(context: CanvasRenderingContext2D, state: State) {
  drawRoundedBar(context, 34, 26, 340, 26, state.player.health, state.player.health > 32 ? "#ffe251" : "#ff4646");
  drawRoundedBar(context, WIDTH - 374, 26, 340, 26, state.rival.health, state.rival.health > 32 ? "#ffe251" : "#ff4646", true);
  drawRoundedBar(context, 74, 60, 220, 12, state.player.drive, "#3de4ff");
  drawRoundedBar(context, WIDTH - 294, 60, 220, 12, state.rival.drive, "#3de4ff", true);
  drawRoundedBar(context, 74, 78, 170, 10, state.player.super, "#ff63d8");
  drawRoundedBar(context, WIDTH - 244, 78, 170, 10, state.rival.super, "#ff63d8", true);

  context.fillStyle = "#fff7d7";
  context.strokeStyle = "#141414";
  context.lineWidth = 5;
  context.font = "900 22px sans-serif";
  context.textAlign = "left";
  context.strokeText(state.player.name.toUpperCase(), 36, 22);
  context.fillText(state.player.name.toUpperCase(), 36, 22);
  context.textAlign = "right";
  context.strokeText(state.rival.name.toUpperCase(), WIDTH - 36, 22);
  context.fillText(state.rival.name.toUpperCase(), WIDTH - 36, 22);

  context.textAlign = "center";
  context.font = "900 42px sans-serif";
  context.fillStyle = "#fff8a8";
  context.strokeStyle = "#151515";
  context.lineWidth = 7;
  const time = String(Math.ceil(state.timer)).padStart(2, "0");
  context.strokeText(time, WIDTH / 2, 62);
  context.fillText(time, WIDTH / 2, 62);

  context.font = "800 13px sans-serif";
  context.fillStyle = "#e9f7ff";
  context.fillText(`ROUND ${state.round}`, WIDTH / 2, 86);
}

function drawOverlays(context: CanvasRenderingContext2D, state: State) {
  for (const floater of state.floaters) {
    context.save();
    context.globalAlpha = clamp(floater.life / 0.68, 0, 1);
    context.font = "900 22px sans-serif";
    context.textAlign = "center";
    context.strokeStyle = "#111";
    context.lineWidth = 5;
    context.fillStyle = floater.text === "BLOCK" ? "#82eaff" : "#fff26d";
    context.strokeText(floater.text, floater.x, floater.y);
    context.fillText(floater.text, floater.x, floater.y);
    context.restore();
  }

  if (state.phase !== "playing") {
    context.fillStyle = "rgba(0,0,0,0.36)";
    context.fillRect(0, 0, WIDTH, HEIGHT);
    context.textAlign = "center";
    context.lineWidth = 8;
    context.strokeStyle = "#101010";
    context.fillStyle = "#ffe45b";
    context.font = "900 54px sans-serif";
    const title = state.phase === "paused" ? "PAUSED" : state.phase === "round-over" ? (state.player.health <= 0 ? "YOU LOSE" : "K.O.") : state.phase === "ready" ? "READY" : "ARCADE FIGHTER";
    context.strokeText(title, WIDTH / 2, 214);
    context.fillText(title, WIDTH / 2, 214);
    context.font = "800 18px sans-serif";
    context.fillStyle = "#ffffff";
    context.strokeStyle = "#151515";
    context.lineWidth = 4;
    context.strokeText(state.message, WIDTH / 2, 252);
    context.fillText(state.message, WIDTH / 2, 252);
    context.font = "800 15px sans-serif";
    context.fillStyle = "#bff4ff";
    context.fillText("A/D move  S crouch/block  W jump  J punch  K kick  L special  U impact", WIDTH / 2, 286);
  }
}

function drawScene(context: CanvasRenderingContext2D, state: State, elapsed: number) {
  context.clearRect(0, 0, WIDTH, HEIGHT);
  context.save();
  if (state.cameraShake > 0) {
    context.translate((Math.random() - 0.5) * state.cameraShake, (Math.random() - 0.5) * state.cameraShake);
  }
  drawStage(context, elapsed);
  drawParticles(context, state.particles.filter((particle) => particle.kind === "dust"));
  for (const projectile of state.projectiles) drawProjectile(context, projectile, elapsed);
  const fighters = [state.player, state.rival].sort((a, b) => a.y - b.y);
  for (const fighter of fighters) drawFighter(context, fighter, elapsed);
  drawParticles(context, state.particles.filter((particle) => particle.kind !== "dust"));
  context.restore();
  drawHud(context, state);
  drawOverlays(context, state);
}

export function ArcadeFighterGame() {
  const initialState = createState(readStoredNumber(STORAGE_KEY));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef(initialState);
  const keysRef = useRef(new Set<string>());
  const [hud, setHud] = useState({
    phase: initialState.phase,
    wins: initialState.wins,
    bestWins: initialState.bestWins,
    timer: initialState.timer,
    health: initialState.player.health,
    rivalHealth: initialState.rival.health,
    drive: initialState.player.drive,
    super: initialState.player.super,
  });

  function sync(nextState: State) {
    stateRef.current = nextState;
    setHud({
      phase: nextState.phase,
      wins: nextState.wins,
      bestWins: nextState.bestWins,
      timer: nextState.timer,
      health: nextState.player.health,
      rivalHealth: nextState.rival.health,
      drive: nextState.player.drive,
      super: nextState.player.super,
    });
    writeStoredNumber(STORAGE_KEY, nextState.bestWins);
  }

  function beginFight() {
    const current = stateRef.current;
    sync(startRound(current, current.phase === "round-over"));
  }

  function triggerAttack(attack: AttackId) {
    const current = stateRef.current;
    if (current.phase !== "playing") {
      beginFight();
      return;
    }
    sync({ ...current, player: startAttack(current.player, attack) });
  }

  function triggerFireball() {
    const current = stateRef.current;
    if (current.phase !== "playing") {
      beginFight();
      return;
    }
    const fired = startFireball(current.player);
    sync({ ...current, player: fired.fighter, projectiles: fired.projectile ? [...current.projectiles, fired.projectile] : current.projectiles });
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (["a", "d", "w", "s", "arrowleft", "arrowright", "arrowup", "arrowdown"].includes(key)) {
      event.preventDefault();
      keysRef.current.add(key);
    } else if (key === "j") {
      event.preventDefault();
      triggerAttack("jab");
    } else if (key === "k") {
      event.preventDefault();
      triggerAttack(keysRef.current.has("s") || keysRef.current.has("arrowdown") ? "sweep" : "kick");
    } else if (key === "l") {
      event.preventDefault();
      triggerFireball();
    } else if (key === "u") {
      event.preventDefault();
      triggerAttack("impact");
    } else if (key === "i") {
      event.preventDefault();
      triggerAttack("uppercut");
    } else if (key === " " || key === "r" || key === "enter") {
      event.preventDefault();
      beginFight();
    } else if (key === "p") {
      event.preventDefault();
      const current = stateRef.current;
      sync({ ...current, phase: current.phase === "playing" ? "paused" : "playing", message: current.phase === "playing" ? "Paused." : "Fight!" });
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      contextRef.current = configureHiDPICanvas(canvas, WIDTH, HEIGHT);
      if (contextRef.current) drawScene(contextRef.current, stateRef.current, 0);
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

  useAnimationFrameLoop((delta, elapsed) => {
    const nextState = updateState(stateRef.current, delta, keysRef.current);
    if (nextState !== stateRef.current) sync(nextState);
    if (contextRef.current) drawScene(contextRef.current, stateRef.current, elapsed);
  });

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "Wins", value: hud.wins },
          { label: "Best", value: hud.bestWins },
          { label: "HP", value: Math.ceil(hud.health) },
          { label: "Rival", value: Math.ceil(hud.rivalHealth) },
          { label: "Drive", value: `${Math.ceil(hud.drive)}%` },
          { label: "Super", value: `${Math.ceil(hud.super)}%` },
          { label: "Timer", value: Math.ceil(hud.timer) },
          { label: "Status", value: hud.phase },
        ]}
        actions={<GameButton variant="primary" onClick={beginFight}>Fight</GameButton>}
      />
      <GamePlayfield className="mx-auto aspect-[16/9] w-full max-w-[min(60rem,86dvh)] touch-none border-0 bg-black">
        <canvas ref={canvasRef} className="h-full w-full" aria-label="Arcade fighter field" />
      </GamePlayfield>
      <GameStatus>
        A/D move, S crouches or blocks, W jumps, J punches, K kicks, L throws a fireball, U uses impact, I uppercuts. Space starts or rematches.
      </GameStatus>
      <TouchControls className="max-w-[34rem]">
        <div className="grid grid-cols-4 gap-2">
          <GameButton variant="touch" onPointerDown={() => keysRef.current.add("a")} onPointerUp={() => keysRef.current.delete("a")} onPointerLeave={() => keysRef.current.delete("a")}>Left</GameButton>
          <GameButton variant="touch" onPointerDown={() => keysRef.current.add("d")} onPointerUp={() => keysRef.current.delete("d")} onPointerLeave={() => keysRef.current.delete("d")}>Right</GameButton>
          <GameButton variant="touch" onPointerDown={() => keysRef.current.add("w")} onPointerUp={() => keysRef.current.delete("w")} onPointerLeave={() => keysRef.current.delete("w")}>Jump</GameButton>
          <GameButton variant="touch" onPointerDown={() => keysRef.current.add("s")} onPointerUp={() => keysRef.current.delete("s")} onPointerLeave={() => keysRef.current.delete("s")}>Block</GameButton>
          <GameButton variant="touch" onClick={() => triggerAttack("jab")}>Punch</GameButton>
          <GameButton variant="touch" onClick={() => triggerAttack("kick")}>Kick</GameButton>
          <GameButton variant="touch" onClick={triggerFireball}>Special</GameButton>
          <GameButton variant="touch" onClick={beginFight}>Start</GameButton>
        </div>
      </TouchControls>
    </GamePanel>
  );
}
