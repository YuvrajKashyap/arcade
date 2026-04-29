"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  GameButton,
  GameHud,
  GamePanel,
  GamePlayfield,
  GameStatus,
} from "@/features/games/shared/components/game-ui";
import { useAnimationFrameLoop } from "@/features/games/shared/hooks/use-animation-frame-loop";

const STORAGE_KEY = "arcade.cookieCrafter.state.v2";
const MAX_OFFLINE_SECONDS = 60 * 60 * 8;

type BuildingKey =
  | "cursor"
  | "grandma"
  | "farm"
  | "mine"
  | "factory"
  | "bank"
  | "temple"
  | "wizard"
  | "shipment"
  | "alchemy"
  | "portal"
  | "timeMachine";

type BuffId = "frenzy" | "clickFrenzy";

type GoldenCookie = {
  id: number;
  x: number;
  y: number;
  expiresAt: number;
};

type Buff = {
  id: BuffId;
  label: string;
  multiplier: number;
  expiresAt: number;
};

type FloatText = {
  id: number;
  text: string;
  x: number;
  y: number;
  createdAt: number;
  kind: "cookie" | "golden";
};

type State = {
  cookies: number;
  totalCookies: number;
  handCookies: number;
  bestCookies: number;
  clicks: number;
  buildings: Record<BuildingKey, number>;
  upgrades: string[];
  achievements: string[];
  goldenClicks: number;
  ascensions: number;
  prestige: number;
  lastSavedAt: number;
};

type Building = {
  key: BuildingKey;
  name: string;
  baseCost: number;
  baseCps: number;
  description: string;
  color: string;
  icon: string;
};

type Upgrade = {
  id: string;
  name: string;
  cost: number;
  description: string;
  unlock: (state: State) => boolean;
  kind: "click" | "global" | "building" | "golden" | "milk";
  target?: BuildingKey;
  multiplier: number;
};

type Achievement = {
  id: string;
  name: string;
  description: string;
  unlock: (state: State) => boolean;
};

const buildings: Building[] = [
  { key: "cursor", name: "Cursor", baseCost: 15, baseCps: 0.1, description: "Autoclicks the cookie.", color: "#d7e7ff", icon: "C" },
  { key: "grandma", name: "Grandma", baseCost: 100, baseCps: 1, description: "A nice grandma to bake more cookies.", color: "#f4d1a6", icon: "G" },
  { key: "farm", name: "Farm", baseCost: 1100, baseCps: 8, description: "Grows cookie plants from cookie seeds.", color: "#b8df83", icon: "F" },
  { key: "mine", name: "Mine", baseCost: 12000, baseCps: 47, description: "Mines chocolate chips and cookie ore.", color: "#b7bbc8", icon: "M" },
  { key: "factory", name: "Factory", baseCost: 130000, baseCps: 260, description: "Mass-produces cookies at scale.", color: "#c9d1d8", icon: "F" },
  { key: "bank", name: "Bank", baseCost: 1400000, baseCps: 1400, description: "Generates cookies from interest.", color: "#f4d66f", icon: "B" },
  { key: "temple", name: "Temple", baseCost: 20000000, baseCps: 7800, description: "Full of ancient cookie rituals.", color: "#d7b47a", icon: "T" },
  { key: "wizard", name: "Wizard Tower", baseCost: 330000000, baseCps: 44000, description: "Summons cookies through magic.", color: "#c6a2ff", icon: "W" },
  { key: "shipment", name: "Shipment", baseCost: 5100000000, baseCps: 260000, description: "Brings cookies from the cookie planet.", color: "#95d8ff", icon: "S" },
  { key: "alchemy", name: "Alchemy Lab", baseCost: 75000000000, baseCps: 1600000, description: "Turns gold into cookies.", color: "#90e0b7", icon: "A" },
  { key: "portal", name: "Portal", baseCost: 1000000000000, baseCps: 10000000, description: "Opens a door to the cookieverse.", color: "#f0a1ff", icon: "P" },
  { key: "timeMachine", name: "Time Machine", baseCost: 14000000000000, baseCps: 65000000, description: "Retrieves cookies before they were eaten.", color: "#9fb5ff", icon: "T" },
];

const upgrades: Upgrade[] = [
  { id: "reinforced-index", name: "Reinforced index finger", cost: 100, description: "Clicking gains twice as many cookies.", unlock: (s) => s.clicks >= 15, kind: "click", multiplier: 2 },
  { id: "carpal-tunnel", name: "Carpal tunnel prevention cream", cost: 500, description: "Clicking gains twice as many cookies again.", unlock: (s) => s.clicks >= 70, kind: "click", multiplier: 2 },
  { id: "ambidextrous", name: "Ambidextrous", cost: 10000, description: "Clicking power doubles.", unlock: (s) => s.handCookies >= 1200, kind: "click", multiplier: 2 },
  { id: "plain-cookies", name: "Plain cookies", cost: 1000, description: "All production +10%.", unlock: (s) => s.totalCookies >= 900, kind: "global", multiplier: 1.1 },
  { id: "sugar-cookies", name: "Sugar cookies", cost: 50000, description: "All production +15%.", unlock: (s) => s.totalCookies >= 25000, kind: "global", multiplier: 1.15 },
  { id: "butter-cookies", name: "Butter cookies", cost: 500000, description: "All production +20%.", unlock: (s) => s.totalCookies >= 250000, kind: "global", multiplier: 1.2 },
  { id: "lucky-day", name: "Lucky day", cost: 777777, description: "Golden cookies appear more often.", unlock: (s) => s.goldenClicks >= 1, kind: "golden", multiplier: 0.78 },
  { id: "serendipity", name: "Serendipity", cost: 7777777, description: "Golden cookie effects last longer.", unlock: (s) => s.goldenClicks >= 4, kind: "golden", multiplier: 1.5 },
  { id: "kitten-workers", name: "Kitten workers", cost: 9000000, description: "Milk from achievements boosts CpS.", unlock: (s) => s.achievements.length >= 5, kind: "milk", multiplier: 0.04 },
  { id: "kitten-engineers", name: "Kitten engineers", cost: 900000000, description: "Milk bonus gets stronger.", unlock: (s) => s.achievements.length >= 10, kind: "milk", multiplier: 0.06 },
  { id: "cursor-training", name: "Cursor training", cost: 500, description: "Cursors are twice as efficient.", unlock: (s) => s.buildings.cursor >= 1, kind: "building", target: "cursor", multiplier: 2 },
  { id: "thousand-fingers", name: "Thousand fingers", cost: 5000, description: "Cursors are twice as efficient.", unlock: (s) => s.buildings.cursor >= 10, kind: "building", target: "cursor", multiplier: 2 },
  { id: "forwards-from-grandma", name: "Forwards from grandma", cost: 1000, description: "Grandmas are twice as efficient.", unlock: (s) => s.buildings.grandma >= 1, kind: "building", target: "grandma", multiplier: 2 },
  { id: "steel-plated-rolling-pins", name: "Steel-plated rolling pins", cost: 5000, description: "Grandmas are twice as efficient.", unlock: (s) => s.buildings.grandma >= 5, kind: "building", target: "grandma", multiplier: 2 },
  { id: "cheap-hoes", name: "Cheap hoes", cost: 11000, description: "Farms are twice as efficient.", unlock: (s) => s.buildings.farm >= 1, kind: "building", target: "farm", multiplier: 2 },
  { id: "fertilizer", name: "Fertilizer", cost: 55000, description: "Farms are twice as efficient.", unlock: (s) => s.buildings.farm >= 5, kind: "building", target: "farm", multiplier: 2 },
  { id: "sugar-gas", name: "Sugar gas", cost: 120000, description: "Mines are twice as efficient.", unlock: (s) => s.buildings.mine >= 1, kind: "building", target: "mine", multiplier: 2 },
  { id: "mega-drill", name: "Mega drill", cost: 600000, description: "Mines are twice as efficient.", unlock: (s) => s.buildings.mine >= 5, kind: "building", target: "mine", multiplier: 2 },
  { id: "sturdier-belts", name: "Sturdier conveyor belts", cost: 1300000, description: "Factories are twice as efficient.", unlock: (s) => s.buildings.factory >= 1, kind: "building", target: "factory", multiplier: 2 },
  { id: "child-labor-laws", name: "Child-safe robot labor", cost: 6500000, description: "Factories are twice as efficient.", unlock: (s) => s.buildings.factory >= 5, kind: "building", target: "factory", multiplier: 2 },
  { id: "taller-tellers", name: "Taller tellers", cost: 14000000, description: "Banks are twice as efficient.", unlock: (s) => s.buildings.bank >= 1, kind: "building", target: "bank", multiplier: 2 },
  { id: "cookie-tithes", name: "Cookie tithes", cost: 200000000, description: "Temples are twice as efficient.", unlock: (s) => s.buildings.temple >= 1, kind: "building", target: "temple", multiplier: 2 },
  { id: "pointier-hats", name: "Pointier hats", cost: 3300000000, description: "Wizard towers are twice as efficient.", unlock: (s) => s.buildings.wizard >= 1, kind: "building", target: "wizard", multiplier: 2 },
  { id: "vanilla-nebulae", name: "Vanilla nebulae", cost: 51000000000, description: "Shipments are twice as efficient.", unlock: (s) => s.buildings.shipment >= 1, kind: "building", target: "shipment", multiplier: 2 },
];

const achievements: Achievement[] = [
  { id: "wake-and-bake", name: "Wake and bake", description: "Bake your first cookie.", unlock: (s) => s.totalCookies >= 1 },
  { id: "making-dough", name: "Making dough", description: "Bake 1,000 cookies.", unlock: (s) => s.totalCookies >= 1000 },
  { id: "cookie-chain", name: "Cookie chain", description: "Bake 100,000 cookies.", unlock: (s) => s.totalCookies >= 100000 },
  { id: "millionaire", name: "Cookie millionaire", description: "Bake 1 million cookies.", unlock: (s) => s.totalCookies >= 1000000 },
  { id: "click", name: "Click", description: "Click 100 times.", unlock: (s) => s.clicks >= 100 },
  { id: "clickathlon", name: "Clickathlon", description: "Click 500 times.", unlock: (s) => s.clicks >= 500 },
  { id: "builder", name: "Builder", description: "Own 25 buildings.", unlock: (s) => totalBuildings(s) >= 25 },
  { id: "architect", name: "Architect", description: "Own 100 buildings.", unlock: (s) => totalBuildings(s) >= 100 },
  { id: "grandmas-cookies", name: "Grandma's cookies", description: "Own 10 grandmas.", unlock: (s) => s.buildings.grandma >= 10 },
  { id: "golden-touch", name: "Golden touch", description: "Click a golden cookie.", unlock: (s) => s.goldenClicks >= 1 },
  { id: "upgrader", name: "Upgrader", description: "Buy 10 upgrades.", unlock: (s) => s.upgrades.length >= 10 },
];

const buildingKeys = buildings.map((building) => building.key);
const crumbDots = Array.from({ length: 26 }, (_, index) => ({
  id: index,
  x: 12 + ((index * 29 + 7) % 76),
  y: 12 + ((index * 43 + 19) % 76),
  size: 6 + ((index * 5) % 13),
}));

function createBuildings(): Record<BuildingKey, number> {
  return Object.fromEntries(buildingKeys.map((key) => [key, 0])) as Record<BuildingKey, number>;
}

function createState(): State {
  return {
    cookies: 0,
    totalCookies: 0,
    handCookies: 0,
    bestCookies: 0,
    clicks: 0,
    buildings: createBuildings(),
    upgrades: [],
    achievements: [],
    goldenClicks: 0,
    ascensions: 0,
    prestige: 0,
    lastSavedAt: Date.now(),
  };
}

function normalizeState(value: Partial<State>): State {
  const base = createState();
  return {
    ...base,
    ...value,
    buildings: { ...base.buildings, ...(value.buildings ?? {}) },
    upgrades: Array.isArray(value.upgrades) ? value.upgrades : [],
    achievements: Array.isArray(value.achievements) ? value.achievements : [],
    lastSavedAt: typeof value.lastSavedAt === "number" ? value.lastSavedAt : Date.now(),
  };
}

function readState() {
  if (typeof window === "undefined") return createState();
  try {
    const parsed = normalizeState(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}"));
    const offlineSeconds = Math.min(MAX_OFFLINE_SECONDS, Math.max(0, (Date.now() - parsed.lastSavedAt) / 1000));
    const offlineGain = cpsFor(parsed) * offlineSeconds * 0.75;
    if (offlineGain > 0) {
      return awardCookies({ ...parsed, lastSavedAt: Date.now() }, offlineGain, false);
    }
    return { ...parsed, lastSavedAt: Date.now() };
  } catch {
    return createState();
  }
}

function writeState(state: State) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, lastSavedAt: Date.now() }));
  }
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (value < 1000) return value.toFixed(value < 100 ? 1 : 0).replace(/\.0$/, "");
  const units = ["K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
  let scaled = value;
  let unit = "";
  for (const nextUnit of units) {
    scaled /= 1000;
    unit = nextUnit;
    if (Math.abs(scaled) < 1000) break;
  }
  return `${scaled >= 100 ? scaled.toFixed(0) : scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(2)}${unit}`;
}

function totalBuildings(state: State) {
  return buildingKeys.reduce((sum, key) => sum + state.buildings[key], 0);
}

function costFor(building: Building, count: number) {
  return Math.floor(building.baseCost * 1.15 ** count + 0.000001);
}

function hasUpgrade(state: State, id: string) {
  return state.upgrades.includes(id);
}

function upgradeMultiplier(state: State, kind: Upgrade["kind"], target?: BuildingKey) {
  return upgrades.reduce((multiplier, upgrade) => {
    if (!hasUpgrade(state, upgrade.id) || upgrade.kind !== kind) return multiplier;
    if (target && upgrade.target !== target) return multiplier;
    return multiplier * upgrade.multiplier;
  }, 1);
}

function milkMultiplier(state: State) {
  const milkPercent = state.achievements.length * 4;
  const kittenPower = upgrades.reduce((power, upgrade) => {
    if (upgrade.kind !== "milk" || !hasUpgrade(state, upgrade.id)) return power;
    return power + upgrade.multiplier;
  }, 0);
  return 1 + milkPercent * kittenPower;
}

function prestigeMultiplier(state: State) {
  return 1 + state.prestige * 0.01;
}

function cpsFor(state: State, buffs: Buff[] = []) {
  const base = buildings.reduce((sum, building) => {
    return sum + state.buildings[building.key] * building.baseCps * upgradeMultiplier(state, "building", building.key);
  }, 0);
  const buffMultiplier = buffs.reduce((multiplier, buff) => multiplier * buff.multiplier, 1);
  return base * upgradeMultiplier(state, "global") * milkMultiplier(state) * prestigeMultiplier(state) * buffMultiplier;
}

function clickValueFor(state: State, buffs: Buff[] = []) {
  const clickBuff = buffs.some((buff) => buff.id === "clickFrenzy") ? 777 : 1;
  return Math.max(1, 1 * upgradeMultiplier(state, "click") * prestigeMultiplier(state) * clickBuff);
}

function awardCookies(state: State, amount: number, fromClick: boolean): State {
  const cookies = state.cookies + amount;
  const totalCookies = state.totalCookies + amount;
  return unlockAchievements({
    ...state,
    cookies,
    totalCookies,
    handCookies: state.handCookies + (fromClick ? amount : 0),
    bestCookies: Math.max(state.bestCookies, totalCookies),
    clicks: state.clicks + (fromClick ? 1 : 0),
  });
}

function unlockAchievements(state: State) {
  const owned = new Set(state.achievements);
  let changed = false;
  for (const achievement of achievements) {
    if (!owned.has(achievement.id) && achievement.unlock(state)) {
      owned.add(achievement.id);
      changed = true;
    }
  }
  return changed ? { ...state, achievements: [...owned] } : state;
}

function unlockedUpgrades(state: State) {
  return upgrades.filter((upgrade) => !hasUpgrade(state, upgrade.id) && upgrade.unlock(state));
}

function goldenDelay(state: State) {
  return (19000 + Math.random() * 15000) * upgradeMultiplier(state, "golden");
}

export function CookieCrafterGame() {
  const initialState = readState();
  const stateRef = useRef(initialState);
  const goldenTimerRef = useRef<number | null>(null);
  const floatIdRef = useRef(1);
  const lastPersistRef = useRef(0);
  const [state, setState] = useState(initialState);
  const [isPressed, setIsPressed] = useState(false);
  const [goldenCookie, setGoldenCookie] = useState<GoldenCookie | null>(null);
  const [buffs, setBuffs] = useState<Buff[]>([]);
  const [floatTexts, setFloatTexts] = useState<FloatText[]>([]);
  const [notice, setNotice] = useState("A fresh bakery. Click the cookie to begin.");

  function sync(nextState: State, persist = false) {
    const normalized = unlockAchievements(nextState);
    stateRef.current = normalized;
    setState(normalized);
    const now = performance.now();
    if (persist || now - lastPersistRef.current > 1000) {
      lastPersistRef.current = now;
      writeState(normalized);
    }
  }

  function addFloat(text: string, x = 48 + Math.random() * 12, y = 48 + Math.random() * 10) {
    const createdAt = performance.now();
    const id = floatIdRef.current;
    floatIdRef.current += 1;
    setFloatTexts((items) => [...items.slice(-12), { id, text, x, y, createdAt, kind: "cookie" }]);
  }

  function scheduleGoldenCookie(currentState = stateRef.current) {
    if (typeof window === "undefined") return;
    if (goldenTimerRef.current !== null) {
      window.clearTimeout(goldenTimerRef.current);
    }
    goldenTimerRef.current = window.setTimeout(() => {
      setGoldenCookie({
        id: Date.now(),
        x: 12 + Math.random() * 72,
        y: 16 + Math.random() * 62,
        expiresAt: performance.now() + 12000,
      });
    }, goldenDelay(currentState));
  }

  function bake(amount = clickValueFor(stateRef.current, buffs), x?: number, y?: number) {
    sync(awardCookies(stateRef.current, amount, true));
    setIsPressed(true);
    addFloat(`+${formatNumber(amount)}`, x, y);
    window.setTimeout(() => setIsPressed(false), 95);
  }

  function buyBuilding(key: BuildingKey) {
    const building = buildings.find((candidate) => candidate.key === key);
    if (!building) return;
    const current = stateRef.current;
    const count = current.buildings[key];
    const cost = costFor(building, count);
    if (current.cookies < cost) return;
    sync({
      ...current,
      cookies: current.cookies - cost,
      buildings: { ...current.buildings, [key]: count + 1 },
    }, true);
    setNotice(`${building.name} purchased.`);
  }

  function buyUpgrade(id: string) {
    const upgrade = upgrades.find((candidate) => candidate.id === id);
    const current = stateRef.current;
    if (!upgrade || current.cookies < upgrade.cost || hasUpgrade(current, id) || !upgrade.unlock(current)) return;
    sync({
      ...current,
      cookies: current.cookies - upgrade.cost,
      upgrades: [...current.upgrades, id],
    }, true);
    setNotice(`${upgrade.name} unlocked.`);
  }

  function clickGoldenCookie() {
    const current = stateRef.current;
    const now = performance.now();
    const roll = Math.random();
    const longer = hasUpgrade(current, "serendipity") ? 1.5 : 1;
    let nextState = { ...current, goldenClicks: current.goldenClicks + 1 };
    let text = "";

    if (roll < 0.44) {
      setBuffs((items) => [...items.filter((buff) => buff.id !== "frenzy"), { id: "frenzy", label: "Frenzy x7", multiplier: 7, expiresAt: now + 77000 * longer }]);
      text = "Frenzy! Production x7.";
    } else if (roll < 0.68) {
      setBuffs((items) => [...items.filter((buff) => buff.id !== "clickFrenzy"), { id: "clickFrenzy", label: "Click frenzy", multiplier: 1, expiresAt: now + 13000 * longer }]);
      text = "Click frenzy! Clicks are wild.";
    } else {
      const lucky = Math.max(13, Math.min(current.cookies * 0.15, cpsFor(current, buffs) * 900 + 13));
      nextState = awardCookies(nextState, lucky, false);
      text = `Lucky! +${formatNumber(lucky)} cookies.`;
      const createdAt = performance.now();
      const id = floatIdRef.current;
      floatIdRef.current += 1;
      setFloatTexts((items) => [...items.slice(-12), { id, text: `+${formatNumber(lucky)}`, x: goldenCookie?.x ?? 50, y: goldenCookie?.y ?? 50, createdAt, kind: "golden" }]);
    }

    sync(unlockAchievements(nextState));
    setGoldenCookie(null);
    setNotice(text);
    scheduleGoldenCookie(nextState);
  }

  function resetRun() {
    sync(createState(), true);
    setBuffs([]);
    setGoldenCookie(null);
    setNotice("Bakery reset.");
    scheduleGoldenCookie(createState());
  }

  function ascend() {
    const chips = Math.floor(Math.sqrt(stateRef.current.bestCookies / 1000000000));
    if (chips <= stateRef.current.prestige) return;
    const next = createState();
    next.prestige = chips;
    next.ascensions = stateRef.current.ascensions + 1;
    sync(next, true);
    setBuffs([]);
    setGoldenCookie(null);
    setNotice(`Ascended. Prestige level ${chips} now boosts production.`);
    scheduleGoldenCookie(next);
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (key === " " || key === "enter") {
      event.preventDefault();
      bake();
      return;
    }

    if (/^[1-9]$/.test(key)) {
      event.preventDefault();
      const index = Number(key) - 1;
      const upgrade = visibleUpgrades[index];
      if (upgrade) {
        buyUpgrade(upgrade.id);
      } else {
        const building = buildings[index];
        if (building) buyBuilding(building.key);
      }
      return;
    }

    if (key === "0") {
      event.preventDefault();
      buyBuilding(buildings[9].key);
      return;
    }

    if (key === "r") {
      event.preventDefault();
      resetRun();
    }
  });

  useEffect(() => {
    const handler = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", handler);
    scheduleGoldenCookie(stateRef.current);
    return () => {
      window.removeEventListener("keydown", handler);
      if (goldenTimerRef.current !== null) {
        window.clearTimeout(goldenTimerRef.current);
      }
    };
  }, []);

  useAnimationFrameLoop((delta) => {
    const now = performance.now();
    const activeBuffs = buffs.filter((buff) => buff.expiresAt > now);
    if (activeBuffs.length !== buffs.length) {
      setBuffs(activeBuffs);
    }

    if (goldenCookie && goldenCookie.expiresAt <= now) {
      setGoldenCookie(null);
      scheduleGoldenCookie(stateRef.current);
    }

    setFloatTexts((items) => items.filter((item) => now - item.createdAt < 1100));

    const cps = cpsFor(stateRef.current, activeBuffs);
    if (cps <= 0) return;
    sync(awardCookies(stateRef.current, cps * delta, false));
  });

  const activeCps = cpsFor(state, buffs);
  const clickValue = clickValueFor(state, buffs);
  const visibleUpgrades = unlockedUpgrades(state).sort((a, b) => a.cost - b.cost).slice(0, 9);
  const nextUpgrades = unlockedUpgrades(state).length;
  const milk = state.achievements.length * 4;
  const heavenlyChips = Math.floor(Math.sqrt(state.bestCookies / 1000000000));
  const prestigeGain = Math.max(0, heavenlyChips - state.prestige);
  const bakeryRows = useMemo(
    () =>
      buildings
        .filter((building) => state.buildings[building.key] > 0)
        .slice(-8)
        .flatMap((building) => Array.from({ length: Math.min(10, state.buildings[building.key]) }, (_, index) => ({ building, index }))),
    [state.buildings],
  );

  return (
    <GamePanel>
      <GameHud
        items={[
          { label: "Cookies", value: formatNumber(state.cookies) },
          { label: "CPS", value: formatNumber(activeCps) },
          { label: "Click", value: formatNumber(clickValue) },
          { label: "Milk", value: `${milk}%` },
        ]}
        actions={
          <>
            <GameButton onClick={ascend} disabled={prestigeGain <= 0}>
              Ascend +{formatNumber(prestigeGain)}
            </GameButton>
            <GameButton onClick={resetRun}>Reset</GameButton>
          </>
        }
      />

      <GamePlayfield className="mx-auto grid aspect-[7/9] w-full max-w-[min(64rem,86dvh)] grid-cols-1 grid-rows-[1.05fr_0.78fr_1.2fr] overflow-hidden border-0 bg-[#1b1220] text-[#4a2d16] shadow-[0_28px_90px_rgba(32,16,6,0.38)] md:aspect-[16/10] md:grid-cols-[1.05fr_1fr_19rem] md:grid-rows-none">
        <section className="relative min-h-0 overflow-hidden bg-[radial-gradient(circle_at_50%_42%,#f5d690_0%,#d69a42_38%,#835324_69%,#322018_100%)] p-4">
          <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(90deg,rgba(255,255,255,.16)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:34px_34px]" />
          <div className="relative flex h-full min-h-0 flex-col items-center justify-between gap-3">
            <div className="w-full rounded-xl border border-[#f7d98d]/45 bg-[#3b2418]/70 px-3 py-2 text-center text-[#ffe8a7] shadow-[inset_0_2px_0_rgba(255,255,255,0.16)]">
              <p className="text-xs font-black uppercase tracking-[0.18em]">Bakery</p>
              <p className="mt-1 text-sm font-bold">{notice}</p>
            </div>

            <div className="relative grid flex-1 place-items-center">
              {floatTexts.map((item) => (
                <span
                  key={item.id}
                  className="pointer-events-none absolute z-20 inline-flex items-center gap-1 text-sm font-black text-white drop-shadow-[0_2px_1px_rgba(74,38,10,0.9)]"
                  style={{
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    transform: `translate(-50%, calc(-50% - ${(performance.now() - item.createdAt) / 18}px))`,
                    opacity: Math.max(0, 1 - (performance.now() - item.createdAt) / 1100),
                  }}
                >
                  <svg
                    viewBox="0 0 32 32"
                    className="h-6 w-6 drop-shadow-[0_2px_0_rgba(52,25,9,0.55)]"
                    aria-hidden="true"
                  >
                    <circle cx="16" cy="16" r="13" fill={item.kind === "golden" ? "#ffd84a" : "#c77b34"} stroke={item.kind === "golden" ? "#fff7a8" : "#5b3218"} strokeWidth="3" />
                    <circle cx="11" cy="11" r="2.6" fill={item.kind === "golden" ? "#fff7a8" : "#4a2614"} />
                    <circle cx="19" cy="10" r="2.2" fill={item.kind === "golden" ? "#fff7a8" : "#4a2614"} />
                    <circle cx="21" cy="20" r="3" fill={item.kind === "golden" ? "#fff7a8" : "#4a2614"} />
                    <circle cx="12" cy="21" r="1.9" fill={item.kind === "golden" ? "#fff7a8" : "#4a2614"} />
                  </svg>
                  {item.text}
                </span>
              ))}

              <button
                type="button"
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  bake(clickValue, ((event.clientX - rect.left) / rect.width) * 100, ((event.clientY - rect.top) / rect.height) * 100);
                }}
                className={`relative grid aspect-square w-[clamp(8.5rem,62%,18rem)] place-items-center rounded-full border-[10px] border-[#4f2d18] bg-[#b96f2f] shadow-[inset_0_22px_0_rgba(255,255,255,0.2),inset_0_-24px_0_rgba(77,37,12,0.22),0_18px_0_#5d341c,0_34px_70px_rgba(29,13,6,0.42)] transition-transform duration-75 hover:scale-[1.015] active:scale-95 ${isPressed ? "scale-95" : "scale-100"}`}
                aria-label="Bake cookie"
              >
                <span className="absolute inset-[9%] rounded-full bg-[#d89244] shadow-[inset_0_12px_0_rgba(255,255,255,0.18)]" />
                <span className="absolute inset-[18%] rounded-full bg-[#c57932]/80" />
                {crumbDots.map((chip) => (
                  <span
                    key={chip.id}
                    className="absolute rounded-full bg-[#4a2614] shadow-[inset_0_2px_0_rgba(255,255,255,0.12)]"
                    style={{ left: `${chip.x}%`, top: `${chip.y}%`, width: chip.size, height: chip.size }}
                  />
                ))}
              </button>

              {goldenCookie ? (
                <button
                  type="button"
                  onClick={clickGoldenCookie}
                  className="absolute z-30 grid h-16 w-16 animate-pulse place-items-center rounded-full border-4 border-[#fff7aa] bg-[#ffd447] text-xs font-black uppercase text-[#6b4306] shadow-[0_0_34px_rgba(255,225,76,0.9),0_8px_0_#a96e12]"
                  style={{ left: `${goldenCookie.x}%`, top: `${goldenCookie.y}%` }}
                  aria-label="Golden cookie"
                >
                  Lucky
                </button>
              ) : null}
            </div>

            <div className="grid w-full grid-cols-3 gap-2 text-center text-[#fff1be]">
              <div className="rounded-lg bg-[#3b2418]/72 px-2 py-2">
                <span className="block text-[0.62rem] font-black uppercase tracking-[0.14em]">Baked</span>
                <span className="text-sm font-black">{formatNumber(state.totalCookies)}</span>
              </div>
              <div className="rounded-lg bg-[#3b2418]/72 px-2 py-2">
                <span className="block text-[0.62rem] font-black uppercase tracking-[0.14em]">Clicks</span>
                <span className="text-sm font-black">{formatNumber(state.clicks)}</span>
              </div>
              <div className="rounded-lg bg-[#3b2418]/72 px-2 py-2">
                <span className="block text-[0.62rem] font-black uppercase tracking-[0.14em]">Prestige</span>
                <span className="text-sm font-black">{formatNumber(state.prestige)}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="relative min-h-0 overflow-hidden border-y border-[#4f321d] bg-[#2a1b17] md:border-x md:border-y-0">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,234,178,0.08),transparent_28%,rgba(0,0,0,0.22))]" />
          <div className="relative flex h-full min-h-0 flex-col">
            <div className="border-b border-[#5b3b22] bg-[#170f10]/80 px-4 py-3 text-[#ffe0a0]">
              <p className="text-xs font-black uppercase tracking-[0.18em]">Cookie empire</p>
              <p className="mt-1 text-sm font-bold">{totalBuildings(state)} buildings, {state.upgrades.length} upgrades, {state.achievements.length} achievements.</p>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <div className="grid h-full grid-cols-4 content-start gap-2 overflow-hidden p-3">
                {bakeryRows.length === 0 ? (
                  <div className="col-span-4 grid h-full place-items-center text-center text-sm font-bold text-[#b99065]">
                    Buy buildings to fill the bakery floor.
                  </div>
                ) : (
                  bakeryRows.map(({ building, index }) => (
                    <div
                      key={`${building.key}-${index}`}
                      className="grid aspect-square place-items-center rounded-xl border-2 border-[#1b100d] text-sm font-black text-[#2b1b13] shadow-[inset_0_3px_0_rgba(255,255,255,0.26),0_4px_0_rgba(0,0,0,0.28)]"
                      style={{ background: building.color }}
                      title={building.name}
                    >
                      {building.icon}
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-[#5b3b22] bg-[#170f10]/80 p-3">
              {buffs.length === 0 ? (
                <span className="col-span-2 rounded-lg border border-[#5b3b22] px-3 py-2 text-center text-xs font-bold text-[#b99065]">No active golden effects</span>
              ) : (
                buffs.map((buff) => (
                  <span key={buff.id} className="rounded-lg border border-[#f6d65a] bg-[#4a3412] px-3 py-2 text-center text-xs font-black text-[#ffe682]">
                    {buff.label} {Math.ceil((buff.expiresAt - performance.now()) / 1000)}s
                  </span>
                ))
              )}
            </div>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col bg-[#f4db9a]">
          <div className="border-b-4 border-[#805026] bg-[#5a321c] px-3 py-3 text-[#ffe4a6]">
            <p className="text-xs font-black uppercase tracking-[0.18em]">Store</p>
            <p className="text-xs font-bold">{nextUpgrades} upgrades available</p>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {visibleUpgrades.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 border-b-4 border-[#b77a38] bg-[#ffd76f] p-2">
                {visibleUpgrades.map((upgrade, index) => (
                  <button
                    key={upgrade.id}
                    type="button"
                    onClick={() => buyUpgrade(upgrade.id)}
                    disabled={state.cookies < upgrade.cost}
                    className="group min-h-16 rounded-lg border-2 border-[#8b5726] bg-[#fff2a8] p-2 text-left shadow-[0_4px_0_#9c622e] disabled:opacity-50"
                    title={`${upgrade.name}: ${upgrade.description}`}
                  >
                    <span className="block text-[0.62rem] font-black text-[#6b3e18]">{index + 1}</span>
                    <span className="block truncate text-xs font-black">{upgrade.name}</span>
                    <span className="block text-[0.64rem] font-black text-[#9a5b20]">{formatNumber(upgrade.cost)}</span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="grid">
              {buildings.map((building, index) => {
                const count = state.buildings[building.key];
                const cost = costFor(building, count);
                const canBuy = state.cookies >= cost;
                return (
                  <button
                    key={building.key}
                    type="button"
                    onClick={() => buyBuilding(building.key)}
                    disabled={!canBuy}
                    className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 border-b border-[#c9944e] bg-[#f7dda1] px-3 py-2 text-left transition hover:bg-[#ffe9b9] disabled:opacity-55"
                    title={building.description}
                  >
                    <span className="grid aspect-square place-items-center rounded-lg border-2 border-[#7b4b23] text-sm font-black shadow-[inset_0_3px_0_rgba(255,255,255,0.3)]" style={{ background: building.color }}>
                      {building.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-[#4a2d16]">{index < 9 ? `${index + 1}. ` : index === 9 ? "0. " : ""}{building.name}</span>
                      <span className="block truncate text-[0.7rem] font-bold text-[#8a592d]">
                        {formatNumber(cost)} cookies
                        {!canBuy ? ` (${formatNumber(Math.max(0, cost - state.cookies))} short)` : " (ready)"}
                      </span>
                      <span className="block truncate text-[0.7rem] font-bold text-[#8a592d]">+{formatNumber(building.baseCps * upgradeMultiplier(state, "building", building.key))} cps</span>
                    </span>
                    <span className="text-lg font-black text-[#6e421e]">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </GamePlayfield>

      <GameStatus>
        Click or tap the big cookie. Space/Enter bakes, 1-9 buys visible upgrades or buildings, 0 buys Alchemy Lab, and R resets.
      </GameStatus>
    </GamePanel>
  );
}
