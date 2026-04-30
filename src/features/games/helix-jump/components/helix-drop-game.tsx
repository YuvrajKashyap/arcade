"use client";

import { type PointerEvent, useEffect, useEffectEvent, useRef, useState } from "react";
import * as THREE from "three";
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

const STORAGE_KEY = "arcade.helixDrop.bestScore";
const FIREBALL_DROP_COUNT = 3;
const BALL_RADIUS = 0.42;
const TOWER_RADIUS = 2.15;
const CORE_RADIUS = 0.38;
const PLATFORM_THICKNESS = 0.18;
const PLATFORM_SPACING = 1.34;
const START_LAYER_Y = -0.9;
const BALL_WORLD_Y = 1.55;
const DANGER_SIZE = 42;
const CAMERA_SCROLL_TARGET = 1.55;

type Phase = "idle" | "playing" | "paused" | "game-over";
type Layer = {
  id: number;
  y: number;
  gapStart: number;
  gapSize: number;
  dangerStart: number;
  dangerSize: number;
  hue: number;
};
type Particle = {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
};
type State = {
  phase: Phase;
  rotation: number;
  ballY: number;
  velocityY: number;
  layers: Layer[];
  score: number;
  bestScore: number;
  level: number;
  combo: number;
  fireTime: number;
  message: string;
};
type HudState = {
  score: number;
  bestScore: number;
  combo: number;
  phase: Phase;
  message: string;
};
type ThreeRuntime = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  tower: THREE.Group;
  ball: THREE.Mesh;
  ballGlow: THREE.PointLight;
  layerGroups: Map<number, THREE.Group>;
  particles: Particle[];
  smashMaterial: THREE.MeshStandardMaterial;
};

function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

function inArc(angle: number, start: number, size: number) {
  const a = normalizeAngle(angle);
  const s = normalizeAngle(start);
  const e = s + size;
  return e <= 360 ? a >= s && a <= e : a >= s || a <= e - 360;
}

function seededLayer(index: number, y: number, level: number): Layer {
  return {
    id: index,
    y,
    gapStart: normalizeAngle(index * 61 + level * 43),
    gapSize: Math.max(58, 103 - level * 2.5 - (index % 3) * 8),
    dangerStart: normalizeAngle(index * 107 + level * 31 + 84),
    dangerSize: Math.min(70, DANGER_SIZE + level * 2),
    hue: (index * 38 + level * 26) % 360,
  };
}

function createLayers(level = 1) {
  return Array.from({ length: 15 }, (_, index) => seededLayer(index, START_LAYER_Y - index * PLATFORM_SPACING, level));
}

function createState(bestScore = 0): State {
  return {
    phase: "idle",
    rotation: 0,
    ballY: BALL_WORLD_Y,
    velocityY: 0,
    layers: createLayers(1),
    score: 0,
    bestScore,
    level: 1,
    combo: 0,
    fireTime: 0,
    message: "Drag the tower and drop through the gaps.",
  };
}

function impactAngle(rotation: number) {
  return normalizeAngle(270 - rotation);
}

function createSectorGeometry(startDeg: number, sizeDeg: number, innerRadius: number, outerRadius: number) {
  const shape = new THREE.Shape();
  const start = THREE.MathUtils.degToRad(startDeg);
  const end = THREE.MathUtils.degToRad(startDeg + sizeDeg);
  const stepCount = Math.max(8, Math.ceil(sizeDeg / 6));

  for (let index = 0; index <= stepCount; index += 1) {
    const angle = start + (end - start) * (index / stepCount);
    const x = Math.cos(angle) * outerRadius;
    const y = Math.sin(angle) * outerRadius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  for (let index = stepCount; index >= 0; index -= 1) {
    const angle = start + (end - start) * (index / stepCount);
    shape.lineTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
  }
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: PLATFORM_THICKNESS,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.035,
    bevelThickness: 0.035,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, PLATFORM_THICKNESS / -2, 0);
  return geometry;
}

function createLayerGroup(layer: Layer) {
  const group = new THREE.Group();
  group.userData.layerId = layer.id;

  for (let start = 0; start < 360; start += 12) {
    const center = normalizeAngle(start + 6);
    if (inArc(center, layer.gapStart, layer.gapSize)) continue;

    const danger = inArc(center, layer.dangerStart, layer.dangerSize);
    const material = new THREE.MeshStandardMaterial({
      color: danger ? "#f1193f" : new THREE.Color(`hsl(${layer.hue}, 86%, ${start > 180 ? 54 : 62}%)`),
      roughness: danger ? 0.42 : 0.31,
      metalness: 0.08,
      emissive: danger ? new THREE.Color("#650014") : new THREE.Color(`hsl(${layer.hue}, 88%, 22%)`),
      emissiveIntensity: danger ? 0.12 : 0.08,
    });
    const mesh = new THREE.Mesh(createSectorGeometry(start + 1.1, 9.9, CORE_RADIUS + 0.12, TOWER_RADIUS), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    if (!danger && start % 36 === 0) {
      const highlight = new THREE.Mesh(
        createSectorGeometry(start + 2.5, 5.5, TOWER_RADIUS - 0.42, TOWER_RADIUS - 0.1),
        new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.24 }),
      );
      highlight.position.y = 0.102;
      group.add(highlight);
    }
  }

  return group;
}

function createRuntime(canvas: HTMLCanvasElement): ThreeRuntime {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#7b4cff");
  scene.fog = new THREE.Fog("#7b4cff", 8, 19);

  const camera = new THREE.PerspectiveCamera(34, 3 / 4, 0.1, 80);
  camera.position.set(0, 3.85, 9.4);
  camera.lookAt(0, -0.05, 0);

  const tower = new THREE.Group();
  scene.add(tower);

  const coreMaterial = new THREE.MeshStandardMaterial({
    color: "#fbf7ff",
    roughness: 0.22,
    metalness: 0.08,
  });
  const core = new THREE.Mesh(new THREE.CylinderGeometry(CORE_RADIUS, CORE_RADIUS, 28, 36), coreMaterial);
  core.position.y = -9;
  core.castShadow = true;
  core.receiveShadow = true;
  tower.add(core);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.2, 0.32, 48),
    new THREE.MeshStandardMaterial({ color: "#eee6ff", roughness: 0.28, metalness: 0.06 }),
  );
  base.position.y = -18.2;
  base.castShadow = true;
  base.receiveShadow = true;
  tower.add(base);

  const ballMaterial = new THREE.MeshPhysicalMaterial({
    color: "#ff3cae",
    roughness: 0.18,
    metalness: 0.02,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 48, 32), ballMaterial);
  ball.position.set(0, BALL_WORLD_Y, TOWER_RADIUS + 0.18);
  ball.castShadow = true;
  scene.add(ball);

  const ballGlow = new THREE.PointLight("#ff4fbc", 2.4, 4.5);
  ballGlow.position.copy(ball.position);
  scene.add(ballGlow);

  const ambient = new THREE.HemisphereLight("#ffffff", "#724cff", 2.8);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight("#ffffff", 3.8);
  keyLight.position.set(-3.4, 7.5, 5.2);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 18;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight("#ffd25d", 2.1);
  rimLight.position.set(4.2, 3.4, -4.8);
  scene.add(rimLight);

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 24),
    new THREE.MeshBasicMaterial({ color: "#ff7aba", transparent: true, opacity: 0.25 }),
  );
  backdrop.position.set(0, -2.5, -5.5);
  scene.add(backdrop);

  return {
    renderer,
    scene,
    camera,
    tower,
    ball,
    ballGlow,
    layerGroups: new Map(),
    particles: [],
    smashMaterial: new THREE.MeshStandardMaterial({
      color: "#fff155",
      emissive: "#ff861f",
      emissiveIntensity: 1.2,
      roughness: 0.24,
    }),
  };
}

function resizeRuntime(runtime: ThreeRuntime, wrapper: HTMLDivElement) {
  const { width, height } = wrapper.getBoundingClientRect();
  const renderWidth = Math.max(1, Math.floor(width));
  const renderHeight = Math.max(1, Math.floor(height));
  runtime.renderer.setSize(renderWidth, renderHeight, false);
  runtime.camera.aspect = renderWidth / renderHeight;
  runtime.camera.updateProjectionMatrix();
}

function ensureLayerMeshes(runtime: ThreeRuntime, layers: Layer[]) {
  const visibleIds = new Set(layers.map((layer) => layer.id));
  runtime.layerGroups.forEach((group, id) => {
    if (!visibleIds.has(id)) {
      runtime.tower.remove(group);
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
          else child.material.dispose();
        }
      });
      runtime.layerGroups.delete(id);
    }
  });

  for (const layer of layers) {
    let group = runtime.layerGroups.get(layer.id);
    if (!group) {
      group = createLayerGroup(layer);
      runtime.layerGroups.set(layer.id, group);
      runtime.tower.add(group);
    }
    group.position.y = layer.y;
  }
}

function createParticleBurst(runtime: ThreeRuntime, y: number, danger = false, count = 20) {
  const geometry = new THREE.SphereGeometry(0.055, 10, 8);
  for (let index = 0; index < count; index += 1) {
    const material = danger
      ? runtime.smashMaterial.clone()
      : new THREE.MeshStandardMaterial({
          color: index % 2 === 0 ? "#ffffff" : "#65ffe8",
          emissive: index % 2 === 0 ? "#ff44c7" : "#1bd8ff",
          emissiveIntensity: 0.4,
        });
    const mesh = new THREE.Mesh(geometry.clone(), material);
    const angle = Math.random() * Math.PI * 2;
    const radius = CORE_RADIUS + 0.5 + Math.random() * 1.3;
    mesh.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    runtime.scene.add(mesh);
    runtime.particles.push({
      mesh,
      velocity: new THREE.Vector3(
        Math.cos(angle) * (1.2 + Math.random() * 2.2),
        1.2 + Math.random() * 2.8,
        Math.sin(angle) * (1.2 + Math.random() * 2.2),
      ),
      life: 0.45 + Math.random() * 0.35,
    });
  }
}

function updateParticles(runtime: ThreeRuntime, delta: number) {
  for (let index = runtime.particles.length - 1; index >= 0; index -= 1) {
    const particle = runtime.particles[index];
    particle.life -= delta;
    particle.velocity.y -= 6.6 * delta;
    particle.mesh.position.addScaledVector(particle.velocity, delta);
    particle.mesh.scale.setScalar(Math.max(0, particle.life * 1.9));
    if (particle.life <= 0) {
      runtime.scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      if (Array.isArray(particle.mesh.material)) particle.mesh.material.forEach((material) => material.dispose());
      else particle.mesh.material.dispose();
      runtime.particles.splice(index, 1);
    }
  }
}

function updateState(state: State, delta: number, input: number, runtime?: ThreeRuntime): State {
  if (state.phase !== "playing") {
    return state;
  }

  const rotation = normalizeAngle(state.rotation + input * 285 * delta);
  let ballY = state.ballY + state.velocityY * delta;
  let velocityY = state.velocityY - 19.6 * delta;
  let layers = state.layers.map((layer) => ({ ...layer }));
  let score = state.score;
  let bestScore = state.bestScore;
  let combo = state.combo;
  let fireTime = Math.max(0, state.fireTime - delta);
  let message = state.message;

  const cameraDrop = Math.min(0, ballY - CAMERA_SCROLL_TARGET);
  if (cameraDrop < 0) {
    ballY -= cameraDrop;
    layers = layers.map((layer) => ({ ...layer, y: layer.y - cameraDrop }));
  }

  for (const layer of layers) {
    const platformTop = layer.y + PLATFORM_THICKNESS / 2;
    const platformBottom = layer.y - PLATFORM_THICKNESS / 2;
    const crossing = velocityY < 0 && ballY - BALL_RADIUS <= platformTop && ballY - BALL_RADIUS >= platformBottom;
    if (!crossing) continue;

    const localAngle = impactAngle(rotation);
    const gap = inArc(localAngle, layer.gapStart, layer.gapSize);
    const danger = inArc(localAngle, layer.dangerStart, layer.dangerSize);
    const fireball = fireTime > 0 || combo >= FIREBALL_DROP_COUNT;

    if (gap) {
      layer.y = 999;
      score += 1 + Math.max(0, combo - 1);
      bestScore = Math.max(bestScore, score);
      combo += 1;
      fireTime = combo >= FIREBALL_DROP_COUNT ? 1.1 : fireTime;
      message = combo >= FIREBALL_DROP_COUNT ? "Fireball smash is active." : "Clean drop.";
      if (runtime) createParticleBurst(runtime, platformTop, false, 12);
    } else if (danger && !fireball) {
      if (runtime) createParticleBurst(runtime, platformTop, true, 34);
      return {
        ...state,
        phase: "game-over",
        rotation,
        ballY,
        velocityY: 0,
        layers,
        score,
        bestScore,
        combo: 0,
        fireTime: 0,
        message: "You hit a red danger slice.",
      };
    } else if (fireball && Math.abs(velocityY) > 8.6) {
      layer.y = 999;
      score += danger ? 5 : 3;
      bestScore = Math.max(bestScore, score);
      combo += 1;
      fireTime = 0.92;
      message = "Smash through.";
      if (runtime) createParticleBurst(runtime, platformTop, danger, 28);
    } else {
      ballY = platformTop + BALL_RADIUS;
      velocityY = 6.9 + Math.min(0.9, combo * 0.14);
      combo = 0;
      fireTime = 0;
      message = "Bounce.";
      if (runtime) createParticleBurst(runtime, platformTop, false, 10);
    }
  }

  layers = layers.filter((layer) => layer.y < 4.7);
  while (layers.length < 15) {
    const nextId = Math.max(0, ...layers.map((layer) => layer.id)) + 1;
    const lowestY = Math.min(START_LAYER_Y, ...layers.map((layer) => layer.y));
    const nextLevel = Math.floor(score / 12) + 1;
    layers.push(seededLayer(nextId, lowestY - PLATFORM_SPACING, nextLevel));
  }

  return {
    ...state,
    phase: "playing",
    rotation,
    ballY,
    velocityY,
    layers,
    score,
    bestScore,
    level: Math.floor(score / 12) + 1,
    combo,
    fireTime,
    message,
  };
}

function renderRuntime(runtime: ThreeRuntime, state: State, elapsed: number) {
  ensureLayerMeshes(runtime, state.layers);
  runtime.tower.rotation.y = THREE.MathUtils.degToRad(state.rotation);
  runtime.ball.position.set(0, state.ballY, TOWER_RADIUS + 0.18);
  runtime.ball.rotation.x += 0.07 + Math.abs(state.velocityY) * 0.002;
  const squash = THREE.MathUtils.clamp(state.velocityY / 44, -0.16, 0.22);
  runtime.ball.scale.set(1 + Math.abs(squash) * 0.38, 1 - squash, 1 + Math.abs(squash) * 0.38);
  runtime.ballGlow.position.copy(runtime.ball.position);
  runtime.ballGlow.intensity = state.fireTime > 0 ? 5.4 : 2.4 + Math.sin(elapsed * 7) * 0.25;

  const material = runtime.ball.material;
  if (material instanceof THREE.MeshPhysicalMaterial) {
    material.color.set(state.fireTime > 0 ? "#ff7829" : "#ff3cae");
    material.emissive.set(state.fireTime > 0 ? "#ff3300" : "#000000");
    material.emissiveIntensity = state.fireTime > 0 ? 0.34 : 0;
  }

  const idleBob = state.phase === "idle" ? Math.sin(elapsed * 2.4) * 0.08 : 0;
  runtime.camera.position.set(Math.sin(elapsed * 0.18) * 0.14, 3.85 + idleBob, 9.4);
  runtime.camera.lookAt(0, -0.05, 0);
  runtime.renderer.render(runtime.scene, runtime.camera);
}

function disposeRuntime(runtime: ThreeRuntime) {
  runtime.layerGroups.forEach((group) => {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
        else child.material.dispose();
      }
    });
  });
  runtime.scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
      else child.material.dispose();
    }
  });
  runtime.renderer.dispose();
}

function hudFromState(state: State): HudState {
  return {
    score: state.score,
    bestScore: state.bestScore,
    combo: state.combo,
    phase: state.phase,
    message: state.message,
  };
}

function hudChanged(a: HudState, b: HudState) {
  return a.score !== b.score || a.bestScore !== b.bestScore || a.combo !== b.combo || a.phase !== b.phase || a.message !== b.message;
}

export function HelixDropGame() {
  const initialState = createState(readStoredNumber(STORAGE_KEY));
  const initialHud = hudFromState(initialState);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<ThreeRuntime | null>(null);
  const stateRef = useRef(initialState);
  const inputRef = useRef(0);
  const dragRef = useRef<{ x: number; pointerId: number } | null>(null);
  const hudRef = useRef(initialHud);
  const [hud, setHud] = useState(initialHud);

  function sync(nextState: State, forceHud = false) {
    stateRef.current = nextState;
    const nextHud = hudFromState(nextState);
    if (forceHud || hudChanged(hudRef.current, nextHud)) {
      hudRef.current = nextHud;
      setHud(nextHud);
      writeStoredNumber(STORAGE_KEY, nextState.bestScore);
    }
  }

  function start() {
    const nextState = { ...createState(stateRef.current.bestScore), phase: "playing" as Phase };
    sync(nextState, true);
  }

  function rotateByDrag(clientX: number) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = clientX - drag.x;
    dragRef.current = { ...drag, x: clientX };
    const current = stateRef.current.phase === "idle" ? { ...stateRef.current, phase: "playing" as Phase } : stateRef.current;
    sync({ ...current, rotation: normalizeAngle(current.rotation + dx * 0.92) });
  }

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, pointerId: event.pointerId };
    if (stateRef.current.phase === "idle" || stateRef.current.phase === "game-over") start();
  }

  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    rotateByDrag(event.clientX);
  }

  function onPointerEnd(event: PointerEvent<HTMLCanvasElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (key === "arrowleft" || key === "a") {
      event.preventDefault();
      inputRef.current = -1;
      if (stateRef.current.phase === "idle") sync({ ...stateRef.current, phase: "playing" }, true);
    } else if (key === "arrowright" || key === "d") {
      event.preventDefault();
      inputRef.current = 1;
      if (stateRef.current.phase === "idle") sync({ ...stateRef.current, phase: "playing" }, true);
    } else if (key === " " || key === "r") {
      event.preventDefault();
      start();
    } else if (key === "p") {
      event.preventDefault();
      const current = stateRef.current;
      sync({ ...current, phase: current.phase === "playing" ? "paused" : "playing" }, true);
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return undefined;

    const runtime = createRuntime(canvas);
    runtimeRef.current = runtime;
    resizeRuntime(runtime, wrapper);
    renderRuntime(runtime, stateRef.current, 0);

    const resizeObserver = new ResizeObserver(() => resizeRuntime(runtime, wrapper));
    resizeObserver.observe(wrapper);
    const down = (event: KeyboardEvent) => onKeyDown(event);
    const up = (event: KeyboardEvent) => {
      if (["arrowleft", "a", "arrowright", "d"].includes(event.key.toLowerCase())) inputRef.current = 0;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      resizeObserver.disconnect();
      disposeRuntime(runtime);
      runtimeRef.current = null;
    };
  }, []);

  useAnimationFrameLoop((delta, elapsed) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const safeDelta = Math.min(delta, 0.026);
    updateParticles(runtime, safeDelta);
    const nextState = updateState(stateRef.current, safeDelta, inputRef.current, runtime);
    if (nextState !== stateRef.current) sync(nextState);
    renderRuntime(runtime, stateRef.current, elapsed);
  });

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "Score", value: hud.score },
          { label: "Best", value: hud.bestScore },
          { label: "Combo", value: hud.combo > 1 ? `${hud.combo}x` : "-" },
          { label: "Status", value: hud.phase },
        ]}
        actions={
          <GameButton variant="primary" onClick={start}>
            Start
          </GameButton>
        }
      />
      <GamePlayfield className="mx-auto aspect-[3/4] w-full max-w-[min(24rem,58dvh)] overflow-hidden border-0 bg-gradient-to-b from-[#6f49ff] via-[#ff55b8] to-[#ffae46]">
        <div ref={wrapperRef} className="h-full w-full touch-none">
          <canvas
            ref={canvasRef}
            className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
            aria-label="Helix Jump 3D field"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
          />
        </div>
      </GamePlayfield>
      <GameStatus>{hud.message} Drag the 3D tower, drop through gaps, avoid red slices, and chain clean drops for smash mode.</GameStatus>
      <TouchControls className="max-w-[18rem]">
        <div className="grid grid-cols-2 gap-2">
          <GameButton variant="touch" onPointerDown={() => (inputRef.current = -1)} onPointerUp={() => (inputRef.current = 0)} onPointerLeave={() => (inputRef.current = 0)}>
            Left
          </GameButton>
          <GameButton variant="touch" onPointerDown={() => (inputRef.current = 1)} onPointerUp={() => (inputRef.current = 0)} onPointerLeave={() => (inputRef.current = 0)}>
            Right
          </GameButton>
        </div>
      </TouchControls>
    </GamePanel>
  );
}
