"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  GameButton,
  GameHud,
  GamePanel,
  GamePlayfield,
  GameStatus,
} from "@/features/games/shared/components/game-ui";
import { useAnimationFrameLoop } from "@/features/games/shared/hooks/use-animation-frame-loop";

const STORAGE_KEY = "arcade.cookieCrafter.state";

type UpgradeKey = "cursor" | "oven" | "factory";
type State = {
  cookies: number;
  totalCookies: number;
  bestCookies: number;
  upgrades: Record<UpgradeKey, number>;
  clicks: number;
  lastPop: number;
};

const upgrades: Array<{ key: UpgradeKey; name: string; baseCost: number; cps: number; description: string }> = [
  { key: "cursor", name: "Helping Hand", baseCost: 15, cps: 0.2, description: "Tiny automatic taps." },
  { key: "oven", name: "Warm Oven", baseCost: 100, cps: 1.2, description: "Bakes while you play." },
  { key: "factory", name: "Cookie Crew", baseCost: 650, cps: 7, description: "A whole snack team." },
];

function createState(): State {
  return {
    cookies: 0,
    totalCookies: 0,
    bestCookies: 0,
    upgrades: { cursor: 0, oven: 0, factory: 0 },
    clicks: 0,
    lastPop: 0,
  };
}

function readState() {
  if (typeof window === "undefined") return createState();
  try {
    return { ...createState(), ...JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") } as State;
  } catch {
    return createState();
  }
}

function writeState(state: State) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function costFor(key: UpgradeKey, count: number) {
  const upgrade = upgrades.find((candidate) => candidate.key === key)!;
  return Math.ceil(upgrade.baseCost * 1.18 ** count);
}

function cpsFor(state: State) {
  return upgrades.reduce((total, upgrade) => total + state.upgrades[upgrade.key] * upgrade.cps, 0);
}

const crumbs = Array.from({ length: 28 }, (_, index) => ({
  id: index,
  x: (index * 37 + 13) % 100,
  y: (index * 61 + 29) % 100,
  size: 2 + ((index * 7) % 5),
}));

export function CookieCrafterGame() {
  const initialState = readState();
  const stateRef = useRef(initialState);
  const popTimerRef = useRef<number | null>(null);
  const [state, setState] = useState(initialState);
  const [isPopping, setIsPopping] = useState(false);

  function sync(nextState: State) {
    stateRef.current = nextState;
    setState(nextState);
    writeState(nextState);
  }

  function bake(amount = 1) {
    const current = stateRef.current;
    const cookies = current.cookies + amount;
    const totalCookies = current.totalCookies + amount;
    sync({
      ...current,
      cookies,
      totalCookies,
      bestCookies: Math.max(current.bestCookies, totalCookies),
      clicks: current.clicks + (amount === 1 ? 1 : 0),
      lastPop: performance.now(),
    });
    setIsPopping(true);
    if (popTimerRef.current !== null) {
      window.clearTimeout(popTimerRef.current);
    }
    popTimerRef.current = window.setTimeout(() => setIsPopping(false), 130);
  }

  function buy(key: UpgradeKey) {
    const current = stateRef.current;
    const cost = costFor(key, current.upgrades[key]);
    if (current.cookies < cost) return;
    sync({
      ...current,
      cookies: current.cookies - cost,
      upgrades: { ...current.upgrades, [key]: current.upgrades[key] + 1 },
    });
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (key === " " || key === "enter") {
      event.preventDefault();
      bake();
    } else if (key === "1") {
      event.preventDefault();
      buy("cursor");
    } else if (key === "2") {
      event.preventDefault();
      buy("oven");
    } else if (key === "3") {
      event.preventDefault();
      buy("factory");
    } else if (key === "r") {
      event.preventDefault();
      sync(createState());
    }
  });

  useEffect(() => {
    const handler = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (popTimerRef.current !== null) {
        window.clearTimeout(popTimerRef.current);
      }
    };
  }, []);

  useAnimationFrameLoop((delta) => {
    const cps = cpsFor(stateRef.current);
    if (cps <= 0) return;
    const amount = cps * delta;
    const current = stateRef.current;
    const cookies = current.cookies + amount;
    const totalCookies = current.totalCookies + amount;
    sync({ ...current, cookies, totalCookies, bestCookies: Math.max(current.bestCookies, totalCookies) });
  });

  const cps = cpsFor(state);
  const popScale = isPopping ? "scale-[0.96]" : "scale-100";

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "Cookies", value: Math.floor(state.cookies) },
          { label: "CPS", value: cps.toFixed(1) },
          { label: "Best", value: Math.floor(state.bestCookies) },
          { label: "Clicks", value: state.clicks },
        ]}
        actions={<GameButton onClick={() => sync(createState())}>Reset</GameButton>}
      />
      <GamePlayfield className="mx-auto grid aspect-[16/10] w-full max-w-[min(48rem,86dvh)] grid-cols-1 gap-4 border-0 bg-[#7cc7ff] p-4 text-[#4a2d16] md:grid-cols-[1fr_17rem]">
        <div className="relative flex min-h-0 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(180deg,#9edbff,#fff2b8)]">
          {crumbs.map((crumb) => (
            <span
              key={crumb.id}
              className="absolute rounded-full bg-[#9b5b2a]/40"
              style={{ left: `${crumb.x}%`, top: `${crumb.y}%`, width: crumb.size, height: crumb.size }}
            />
          ))}
          <button
            type="button"
            onClick={() => bake()}
            className={`relative grid aspect-square w-[min(56%,15rem)] place-items-center rounded-full border-[8px] border-[#5f3518] bg-[#c47b34] shadow-[inset_0_18px_0_rgba(255,255,255,0.22),0_18px_0_#6b3c1e,0_30px_60px_rgba(67,37,14,0.32)] transition-transform ${popScale}`}
            aria-label="Bake cookie"
          >
            <span className="absolute inset-5 rounded-full bg-[#d99345]" />
            {crumbs.slice(0, 12).map((chip) => (
              <span
                key={chip.id}
                className="absolute rounded-full bg-[#4b2611]"
                style={{ left: `${18 + (chip.x % 64)}%`, top: `${18 + (chip.y % 64)}%`, width: chip.size + 5, height: chip.size + 5 }}
              />
            ))}
            <span className="relative text-center text-lg font-black uppercase tracking-[0.18em] text-[#fff0c4] drop-shadow">Bake</span>
          </button>
        </div>
        <div className="flex min-h-0 flex-col gap-3 overflow-auto rounded-2xl bg-[#fff6c9] p-3 shadow-[inset_0_4px_0_rgba(255,255,255,0.7)]">
          {upgrades.map((upgrade, index) => {
            const count = state.upgrades[upgrade.key];
            const cost = costFor(upgrade.key, count);
            return (
              <button
                key={upgrade.key}
                type="button"
                onClick={() => buy(upgrade.key)}
                disabled={state.cookies < cost}
                className="rounded-xl border-2 border-[#7a4d25] bg-[#ffe48d] p-3 text-left shadow-[0_5px_0_#a8662f] disabled:opacity-50"
              >
                <span className="block text-sm font-black">{index + 1}. {upgrade.name} x{count}</span>
                <span className="block text-xs font-bold text-[#81522a]">{upgrade.description}</span>
                <span className="block text-xs font-black">Cost {cost} | +{upgrade.cps} cps</span>
              </button>
            );
          })}
        </div>
      </GamePlayfield>
      <GameStatus>Click the cookie, press Space, or buy upgrades with 1, 2, and 3. R resets.</GameStatus>
    </GamePanel>
  );
}
