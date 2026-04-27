import {
  ASTEROIDS_BULLET_LIFE,
  ASTEROIDS_BULLET_SPEED,
  ASTEROIDS_FRICTION,
  ASTEROIDS_HEIGHT,
  ASTEROIDS_RESPAWN_INVULNERABLE_SECONDS,
  ASTEROIDS_SHIP_RADIUS,
  ASTEROIDS_THRUST,
  ASTEROIDS_TURN_SPEED,
  ASTEROIDS_WIDTH,
} from "@/features/games/asteroids/config/constants";
import type {
  AsteroidsBullet,
  AsteroidsInput,
  AsteroidsRock,
  AsteroidsShip,
  AsteroidsState,
} from "@/features/games/asteroids/types";

function wrap(value: number, max: number) {
  if (value < 0) {
    return value + max;
  }

  if (value > max) {
    return value - max;
  }

  return value;
}

function distanceSquared(left: { x: number; y: number }, right: { x: number; y: number }) {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return dx * dx + dy * dy;
}

function createShip(): AsteroidsShip {
  return {
    x: ASTEROIDS_WIDTH / 2,
    y: ASTEROIDS_HEIGHT / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    invulnerableTimer: ASTEROIDS_RESPAWN_INVULNERABLE_SECONDS,
  };
}

function createWaveRocks(wave: number, nextId: number) {
  const count = Math.min(4 + wave, 8);
  const rocks: AsteroidsRock[] = [];

  for (let index = 0; index < count; index += 1) {
    const side = index % 4;
    const x = side === 0 ? 30 : side === 1 ? ASTEROIDS_WIDTH - 30 : Math.random() * ASTEROIDS_WIDTH;
    const y = side === 2 ? 30 : side === 3 ? ASTEROIDS_HEIGHT - 30 : Math.random() * ASTEROIDS_HEIGHT;
    const angle = Math.random() * Math.PI * 2;
    const speed = 44 + wave * 8 + Math.random() * 36;
    rocks.push({
      id: nextId + index,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 42,
      tier: 3,
    });
  }

  return {
    rocks,
    nextId: nextId + count,
  };
}

export function createAsteroidsState(bestScore = 0): AsteroidsState {
  const wave = createWaveRocks(1, 1);

  return {
    phase: "idle",
    score: 0,
    bestScore,
    lives: 3,
    wave: 1,
    nextId: wave.nextId,
    shotCooldown: 0,
    ship: createShip(),
    rocks: wave.rocks,
    bullets: [],
  };
}

export function startAsteroids(state: AsteroidsState): AsteroidsState {
  if (state.phase === "game-over") {
    return {
      ...createAsteroidsState(state.bestScore),
      phase: "playing",
    };
  }

  return {
    ...state,
    phase: "playing",
  };
}

function splitRock(rock: AsteroidsRock, nextId: number): { rocks: AsteroidsRock[]; nextId: number } {
  if (rock.tier <= 1) {
    return { rocks: [], nextId };
  }

  const nextTier = rock.tier - 1;
  const nextRadius = rock.radius * 0.62;
  const angle = Math.random() * Math.PI * 2;

  return {
    nextId: nextId + 2,
    rocks: [0, Math.PI].map((offset, index) => ({
      id: nextId + index,
      x: rock.x,
      y: rock.y,
      vx: Math.cos(angle + offset) * (92 + Math.random() * 44),
      vy: Math.sin(angle + offset) * (92 + Math.random() * 44),
      radius: nextRadius,
      tier: nextTier,
    })),
  };
}

export function updateAsteroids(
  state: AsteroidsState,
  deltaSeconds: number,
  input: AsteroidsInput,
): AsteroidsState {
  if (state.phase !== "playing") {
    return state;
  }

  let nextId = state.nextId;
  let ship = {
    ...state.ship,
    angle: state.ship.angle + input.turn * ASTEROIDS_TURN_SPEED * deltaSeconds,
    invulnerableTimer: Math.max(0, state.ship.invulnerableTimer - deltaSeconds),
  };

  if (input.thrust) {
    ship = {
      ...ship,
      vx: ship.vx + Math.cos(ship.angle) * ASTEROIDS_THRUST * deltaSeconds,
      vy: ship.vy + Math.sin(ship.angle) * ASTEROIDS_THRUST * deltaSeconds,
    };
  }

  ship = {
    ...ship,
    x: wrap(ship.x + ship.vx * deltaSeconds, ASTEROIDS_WIDTH),
    y: wrap(ship.y + ship.vy * deltaSeconds, ASTEROIDS_HEIGHT),
    vx: ship.vx * ASTEROIDS_FRICTION,
    vy: ship.vy * ASTEROIDS_FRICTION,
  };

  let shotCooldown = Math.max(0, state.shotCooldown - deltaSeconds);
  let bullets: AsteroidsBullet[] = state.bullets
    .map((bullet) => ({
      ...bullet,
      x: wrap(bullet.x + bullet.vx * deltaSeconds, ASTEROIDS_WIDTH),
      y: wrap(bullet.y + bullet.vy * deltaSeconds, ASTEROIDS_HEIGHT),
      life: bullet.life - deltaSeconds,
    }))
    .filter((bullet) => bullet.life > 0);

  if (input.shoot && shotCooldown <= 0) {
    bullets = [
      ...bullets,
      {
        id: nextId,
        x: ship.x + Math.cos(ship.angle) * ASTEROIDS_SHIP_RADIUS,
        y: ship.y + Math.sin(ship.angle) * ASTEROIDS_SHIP_RADIUS,
        vx: ship.vx + Math.cos(ship.angle) * ASTEROIDS_BULLET_SPEED,
        vy: ship.vy + Math.sin(ship.angle) * ASTEROIDS_BULLET_SPEED,
        life: ASTEROIDS_BULLET_LIFE,
      },
    ];
    nextId += 1;
    shotCooldown = 0.22;
  }

  let rocks = state.rocks.map((rock) => ({
    ...rock,
    x: wrap(rock.x + rock.vx * deltaSeconds, ASTEROIDS_WIDTH),
    y: wrap(rock.y + rock.vy * deltaSeconds, ASTEROIDS_HEIGHT),
  }));
  let score = state.score;

  for (const bullet of bullets) {
    const hitRock = rocks.find(
      (rock) => distanceSquared(bullet, rock) <= (rock.radius + 3) * (rock.radius + 3),
    );

    if (!hitRock) {
      continue;
    }

    const split = splitRock(hitRock, nextId);
    nextId = split.nextId;
    bullets = bullets.filter((candidate) => candidate.id !== bullet.id);
    rocks = [...rocks.filter((candidate) => candidate.id !== hitRock.id), ...split.rocks];
    score += hitRock.tier === 3 ? 40 : hitRock.tier === 2 ? 80 : 140;
    break;
  }

  let lives = state.lives;
  if (
    ship.invulnerableTimer <= 0 &&
    rocks.some((rock) => distanceSquared(ship, rock) <= (rock.radius + ASTEROIDS_SHIP_RADIUS) ** 2)
  ) {
    lives -= 1;
    if (lives <= 0) {
      return {
        ...state,
        phase: "game-over",
        score,
        bestScore: Math.max(state.bestScore, score),
        lives: 0,
        ship,
        rocks,
        bullets,
      };
    }

    ship = createShip();
    bullets = [];
  }

  let wave = state.wave;
  if (rocks.length === 0) {
    wave += 1;
    const nextWave = createWaveRocks(wave, nextId);
    rocks = nextWave.rocks;
    nextId = nextWave.nextId;
    score += 250;
    ship = {
      ...ship,
      invulnerableTimer: ASTEROIDS_RESPAWN_INVULNERABLE_SECONDS,
    };
  }

  return {
    ...state,
    score,
    bestScore: Math.max(state.bestScore, score),
    lives,
    wave,
    nextId,
    shotCooldown,
    ship,
    rocks,
    bullets,
  };
}
