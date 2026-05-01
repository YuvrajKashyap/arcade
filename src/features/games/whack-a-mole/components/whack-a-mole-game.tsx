"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  GameButton,
  GameHud,
  GamePanel,
  GamePlayfield,
  GameStatus,
} from "@/features/games/shared/components/game-ui";
import {
  readStoredNumber,
  writeStoredNumber,
} from "@/features/games/shared/utils/local-storage";

const STORAGE_KEY = "arcade.whackAMole.bestScore.v2";
const HOLES = 9;
const ROUND_SECONDS = 60;
const MAX_ACTIVE_TARGETS = 4;
const FEVER_MAX = 100;

type Phase = "ready" | "playing" | "round-over";
type TargetKind = "mole" | "chief" | "decoy" | "timer";
type TargetState = "rising" | "up" | "bonked" | "escaping";

type Target = {
  id: number;
  hole: number;
  kind: TargetKind;
  born: number;
  life: number;
  state: TargetState;
  stateAt: number;
};

type Pop = {
  id: number;
  hole: number;
  text: string;
  tone: "good" | "bad" | "bonus" | "miss";
  born: number;
};

type RoundStats = {
  hits: number;
  misses: number;
  bonks: number;
  longestStreak: number;
};

const HOLE_KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3"];

const TARGET_META: Record<
  TargetKind,
  {
    label: string;
    points: number;
    life: number;
    color: string;
    dark: string;
    nose: string;
    eyebrow: string;
  }
> = {
  mole: {
    label: "Mole",
    points: 100,
    life: 1060,
    color: "#9a5a2e",
    dark: "#4e2a18",
    nose: "#f47058",
    eyebrow: "#2f160d",
  },
  chief: {
    label: "Boss",
    points: 250,
    life: 820,
    color: "#d1762e",
    dark: "#572514",
    nose: "#ff5d44",
    eyebrow: "#150806",
  },
  decoy: {
    label: "Decoy",
    points: -150,
    life: 940,
    color: "#6fb958",
    dark: "#23451d",
    nose: "#f0d75a",
    eyebrow: "#14310f",
  },
  timer: {
    label: "Time",
    points: 150,
    life: 720,
    color: "#2c93d8",
    dark: "#07345b",
    nose: "#fff3a4",
    eyebrow: "#041728",
  },
};

function now() {
  return performance.now();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatAccuracy(stats: RoundStats) {
  const attempts = stats.hits + stats.misses;
  if (attempts === 0) return "100%";
  return `${Math.round((stats.hits / attempts) * 100)}%`;
}

function createInitialStats(): RoundStats {
  return { hits: 0, misses: 0, bonks: 0, longestStreak: 0 };
}

function targetKind(elapsedSeconds: number): TargetKind {
  const roll = Math.random();
  if (elapsedSeconds > 10 && roll < 0.09) return "chief";
  if (elapsedSeconds > 18 && roll < 0.2) return "decoy";
  if (elapsedSeconds > 25 && roll < 0.27) return "timer";
  return "mole";
}

function targetLife(kind: TargetKind, elapsedSeconds: number, fever: number) {
  const base = TARGET_META[kind].life;
  const speedPressure = Math.min(360, elapsedSeconds * 8.5);
  const feverPressure = fever >= FEVER_MAX ? 130 : 0;
  return Math.max(470, base - speedPressure - feverPressure);
}

function scoreForTarget(kind: TargetKind, streak: number, fever: number) {
  const base = TARGET_META[kind].points;
  if (base < 0) return base;
  const streakBonus = Math.min(220, streak * 18);
  const feverBonus = fever >= FEVER_MAX ? 100 : 0;
  return base + streakBonus + feverBonus;
}

function difficultyLabel(timeLeft: number) {
  if (timeLeft <= 12) return "Final Rush";
  if (timeLeft <= 28) return "Fast";
  if (timeLeft <= 45) return "Medium";
  return "Warmup";
}

function holeLabel(index: number) {
  return `Hole ${index + 1}, key ${HOLE_KEYS[index]}`;
}

export function WhackAMoleGame() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => readStoredNumber(STORAGE_KEY));
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [streak, setStreak] = useState(0);
  const [fever, setFever] = useState(0);
  const [targets, setTargets] = useState<Target[]>([]);
  const [pops, setPops] = useState<Pop[]>([]);
  const [stats, setStats] = useState<RoundStats>(() => createInitialStats());
  const [message, setMessage] = useState("Start the cabinet, watch the holes, and bonk every real mole before it ducks.");

  const phaseRef = useRef<Phase>("ready");
  const scoreRef = useRef(0);
  const bestScoreRef = useRef(bestScore);
  const streakRef = useRef(0);
  const feverRef = useRef(0);
  const statsRef = useRef<RoundStats>(createInitialStats());
  const startAtRef = useRef(0);
  const nextTargetId = useRef(1);
  const nextPopId = useRef(1);
  const spawnTimer = useRef<number | null>(null);
  const tickTimer = useRef<number | null>(null);

  const activeTargets = useMemo(
    () => targets.filter((target) => target.state !== "bonked"),
    [targets],
  );
  const accuracy = formatAccuracy(stats);

  function stopTimers() {
    if (spawnTimer.current !== null) window.clearInterval(spawnTimer.current);
    if (tickTimer.current !== null) window.clearInterval(tickTimer.current);
    spawnTimer.current = null;
    tickTimer.current = null;
  }

  function syncScore(nextScore: number) {
    scoreRef.current = nextScore;
    setScore(nextScore);
  }

  function syncStreak(nextStreak: number) {
    streakRef.current = nextStreak;
    setStreak(nextStreak);
  }

  function syncFever(nextFever: number) {
    feverRef.current = nextFever;
    setFever(nextFever);
  }

  function syncStats(nextStats: RoundStats) {
    statsRef.current = nextStats;
    setStats(nextStats);
  }

  function addPop(hole: number, text: string, tone: Pop["tone"]) {
    const born = now();
    setPops((current) => [
      ...current.filter((pop) => born - pop.born < 780),
      { id: nextPopId.current++, hole, text, tone, born },
    ]);
  }

  function finishRound() {
    stopTimers();
    phaseRef.current = "round-over";
    setPhase("round-over");
    setTargets([]);
    const nextBest = Math.max(bestScoreRef.current, scoreRef.current);
    bestScoreRef.current = nextBest;
    setBestScore(nextBest);
    writeStoredNumber(STORAGE_KEY, nextBest);
    setMessage(
      scoreRef.current >= nextBest
        ? "New house record. Start another round and defend it."
        : "Round over. Tighten the misses and build a longer streak next run.",
    );
  }

  function clearRoundState() {
    stopTimers();
    phaseRef.current = "playing";
    setPhase("playing");
    syncScore(0);
    syncStreak(0);
    syncFever(0);
    syncStats(createInitialStats());
    setTargets([]);
    setPops([]);
    setTimeLeft(ROUND_SECONDS);
    setMessage("Hit real moles. Avoid green decoys. Blue time moles add seconds. Keep the streak alive.");
    startAtRef.current = now();
    nextTargetId.current = 1;
  }

  function spawnTarget() {
    const age = now();
    const elapsed = (age - startAtRef.current) / 1000;
    setTargets((current) => {
      const live = current.filter((target) => {
        if (target.state === "bonked") return age - target.stateAt < 240;
        return age - target.born < target.life;
      });
      if (live.filter((target) => target.state !== "bonked").length >= MAX_ACTIVE_TARGETS) return live;

      const openHoles = Array.from({ length: HOLES }, (_, index) => index).filter(
        (hole) => !live.some((target) => target.hole === hole && target.state !== "bonked"),
      );
      if (openHoles.length === 0) return live;

      const kind = targetKind(elapsed);
      const hole = openHoles[Math.floor(Math.random() * openHoles.length)]!;
      return [
        ...live,
        {
          id: nextTargetId.current++,
          hole,
          kind,
          born: age,
          life: targetLife(kind, elapsed, feverRef.current),
          state: "rising",
          stateAt: age,
        },
      ];
    });
  }

  function startRound() {
    clearRoundState();
    spawnTimer.current = window.setInterval(spawnTarget, 360);
    tickTimer.current = window.setInterval(() => {
      const age = now();
      const elapsed = Math.floor((age - startAtRef.current) / 1000);
      const remaining = Math.max(0, ROUND_SECONDS - elapsed);
      setTimeLeft(remaining);

      setTargets((current) =>
        current
          .map((target) => {
            if (target.state === "rising" && age - target.stateAt > 120) {
              return { ...target, state: "up" as TargetState, stateAt: age };
            }
            if ((target.state === "rising" || target.state === "up") && age - target.born > target.life) {
              return { ...target, state: "escaping" as TargetState, stateAt: age };
            }
            return target;
          })
          .filter((target) => target.state !== "escaping" || age - target.stateAt < 210)
          .filter((target) => target.state !== "bonked" || age - target.stateAt < 260),
      );

      setPops((current) => current.filter((pop) => age - pop.born < 820));
      if (feverRef.current > 0 && feverRef.current < FEVER_MAX) {
        syncFever(Math.max(0, feverRef.current - 1));
      }
      if (remaining <= 0) finishRound();
    }, 90);
  }

  function handleMiss(hole: number) {
    addPop(hole, "MISS", "miss");
    syncStreak(0);
    syncFever(Math.max(0, feverRef.current - 10));
    syncStats({ ...statsRef.current, misses: statsRef.current.misses + 1 });
    setMessage("Empty hole. Watch for the rise before swinging.");
  }

  function hitHole(hole: number) {
    if (phaseRef.current !== "playing") return;
    const age = now();
    const target = activeTargets.find((item) => item.hole === hole && item.state !== "escaping");

    if (!target) {
      handleMiss(hole);
      return;
    }

    setTargets((current) =>
      current.map((item) =>
        item.id === target.id ? { ...item, state: "bonked", stateAt: age } : item,
      ),
    );

    if (target.kind === "decoy") {
      const nextScore = Math.max(0, scoreRef.current + TARGET_META.decoy.points);
      syncScore(nextScore);
      syncStreak(0);
      syncFever(Math.max(0, feverRef.current - 24));
      syncStats({
        ...statsRef.current,
        misses: statsRef.current.misses + 1,
        bonks: statsRef.current.bonks + 1,
      });
      addPop(hole, "-150", "bad");
      setMessage("That was a decoy. Reset, refocus, and keep the real moles under control.");
      return;
    }

    const nextStreak = streakRef.current + 1;
    const points = scoreForTarget(target.kind, nextStreak, feverRef.current);
    syncScore(scoreRef.current + points);
    syncStreak(nextStreak);
    syncFever(clamp(feverRef.current + (target.kind === "chief" ? 22 : 14), 0, FEVER_MAX));
    syncStats({
      ...statsRef.current,
      hits: statsRef.current.hits + 1,
      bonks: statsRef.current.bonks + 1,
      longestStreak: Math.max(statsRef.current.longestStreak, nextStreak),
    });

    if (target.kind === "timer") {
      startAtRef.current += 2500;
      setTimeLeft((current) => Math.min(ROUND_SECONDS, current + 2));
      addPop(hole, "+2s", "bonus");
      setMessage("Time mole clipped. Two seconds back on the clock.");
    } else {
      addPop(hole, `+${points}`, target.kind === "chief" ? "bonus" : "good");
      setMessage(target.kind === "chief" ? "Boss mole bonked. Huge points." : "Clean hit. Keep chaining the streak.");
    }
  }

  const keyHandler = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (key === " " || key === "enter") {
      event.preventDefault();
      startRound();
      return;
    }
    if (key === "r") {
      event.preventDefault();
      startRound();
      return;
    }
    const holeIndex = HOLE_KEYS.indexOf(key);
    if (holeIndex >= 0) {
      event.preventDefault();
      hitHole(holeIndex);
    }
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => keyHandler(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  useEffect(() => stopTimers, []);

  const hudItems = [
    { label: "Score", value: score },
    { label: "Best", value: bestScore || "--" },
    { label: "Time", value: `${timeLeft}s` },
    { label: "Streak", value: streak },
    { label: "Accuracy", value: accuracy },
  ];

  return (
    <GamePanel>
      <GameHud
        items={hudItems}
        actions={
          <>
            <GameButton variant="primary" onClick={startRound}>
              {phase === "playing" ? "Restart" : "Start Round"}
            </GameButton>
          </>
        }
      />

      <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[minmax(22rem,44rem)_19rem] lg:items-stretch">
        <GamePlayfield className="relative border-0 bg-[#65d2ff] p-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.72),transparent_22%),radial-gradient(circle_at_80%_14%,rgba(255,242,122,0.55),transparent_20%),linear-gradient(180deg,#36a9ff_0%,#59caff_42%,#7cc843_43%,#389d30_100%)]" />
          <div className="absolute inset-x-0 top-0 h-32 bg-[repeating-conic-gradient(from_0deg_at_50%_100%,rgba(255,255,255,0.28)_0deg,rgba(255,255,255,0.28)_8deg,transparent_9deg,transparent_18deg)] opacity-80" />
          <div className="relative flex flex-col gap-4 p-3 sm:p-5">
            <div className="grid grid-cols-[1fr_auto] items-start gap-3">
              <div className="rounded-[1rem] border-4 border-white bg-[#251069] px-3 py-2 shadow-[0_7px_0_#080225,0_12px_20px_rgba(0,0,0,0.28)] sm:rounded-[1.2rem] sm:px-4 sm:py-3">
                <div className="whitespace-nowrap text-[clamp(1rem,6vw,2.45rem)] font-black uppercase leading-none text-[#ffe24d] drop-shadow-[2px_3px_0_#d9481e]">
                  Whack-a-Mole
                </div>
                <div className="mt-1 text-xs font-black uppercase tracking-[0.22em] text-[#8de7ff]">
                  premium cabinet
                </div>
              </div>

              <div className="w-24 rounded-xl border-4 border-white bg-[#e92929] p-1.5 shadow-[0_7px_0_#8d1010,0_12px_20px_rgba(0,0,0,0.2)] sm:w-40 sm:rounded-2xl sm:p-2">
                <div className="mx-auto h-10 w-20 rounded-full border-4 border-[#ff9b8b] bg-[radial-gradient(circle_at_38%_24%,#ff8b78_0_18%,#f23028_19%_64%,#9d1010_65%)] shadow-[inset_0_-8px_0_rgba(0,0,0,0.22)] sm:h-14 sm:w-32" />
                <div className="mx-auto mt-1 h-3 w-14 rounded-b-full bg-[#7c2f14] sm:h-4 sm:w-20" />
              </div>
            </div>

            <div className="mx-auto w-full max-w-[39rem] rounded-[1.5rem] border-[6px] border-[#0c70ce] bg-[#72c933] p-2.5 shadow-[inset_0_7px_0_rgba(255,255,255,0.35),0_14px_0_#07569e,0_24px_42px_rgba(0,0,0,0.28)] sm:rounded-[2rem] sm:p-4">
              <div
                data-testid="whack-board"
                className="grid aspect-[1.32] grid-cols-3 gap-2 rounded-[1.2rem] border-4 border-[#2c8a2d] bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.24),transparent_12%),linear-gradient(145deg,#a8ee6b,#5bbb3d)] p-2.5 sm:gap-3 sm:rounded-[1.4rem] sm:p-4"
              >
                {Array.from({ length: HOLES }, (_, hole) => {
                  const target = activeTargets.find((item) => item.hole === hole);
                  const pop = pops.findLast((item) => item.hole === hole);
                  return (
                    <button
                      key={hole}
                      type="button"
                      aria-label={holeLabel(hole)}
                      onPointerDown={() => hitHole(hole)}
                      className={`group relative overflow-hidden rounded-[1.25rem] border-4 border-[#ffce2e] bg-[#3d1c0d] shadow-[inset_0_12px_0_rgba(0,0,0,0.35),0_7px_0_#1b5f20] outline-none transition focus-visible:ring-4 focus-visible:ring-white ${
                        target ? "scale-[1.01]" : "hover:scale-[1.015]"
                      }`}
                    >
                      <span className="absolute inset-x-[12%] bottom-[15%] h-[22%] rounded-[50%] bg-black/45 blur-[1px]" />
                      <span className="absolute inset-x-[8%] top-[12%] h-[54%] rounded-[48%] border border-white/10 bg-[#5a2a15] shadow-[inset_0_-12px_0_rgba(0,0,0,0.25)]" />
                      <span className="absolute left-2 top-2 rounded-full bg-black/30 px-2 py-0.5 font-mono text-[0.58rem] font-black text-white/85">
                        {HOLE_KEYS[hole]}
                      </span>

                      {target ? <Mole target={target} /> : null}

                      {pop ? (
                        <span
                          className={`absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full border-2 px-2.5 py-1 text-xs font-black uppercase shadow-[0_4px_0_rgba(0,0,0,0.2)] ${
                            pop.tone === "good"
                              ? "border-[#0e7f2d] bg-white text-[#0e7f2d]"
                              : pop.tone === "bonus"
                                ? "border-[#b57000] bg-[#fff15b] text-[#6e3900]"
                                : pop.tone === "bad"
                                  ? "border-[#891414] bg-[#ffdae0] text-[#891414]"
                                  : "border-[#2c3d5f] bg-white text-[#2c3d5f]"
                          }`}
                        >
                          {pop.text}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </GamePlayfield>

        <aside className="grid gap-3 rounded-[1.4rem] border border-[#1b6cb4]/25 bg-[#f7fbff] p-4 text-[#0a2250] shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
          <div className="rounded-2xl border border-[#0c70ce]/20 bg-white p-3 shadow-sm">
            <div className="font-mono text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#1267ba]">Round</div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <div className="text-4xl font-black text-[#e92929]">{timeLeft}</div>
                <div className="text-xs font-black uppercase tracking-[0.14em] text-[#53657f]">seconds</div>
              </div>
              <div className="rounded-full border border-[#1267ba]/20 bg-[#e9f6ff] px-3 py-1 text-sm font-black text-[#1267ba]">
                {difficultyLabel(timeLeft)}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#0c70ce]/20 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.14em] text-[#1267ba]">
              <span>Fever</span>
              <span>{fever}%</span>
            </div>
            <div className="mt-2 h-4 overflow-hidden rounded-full border border-[#1267ba]/20 bg-[#d8e9f8]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#14b85a,#ffe24d,#ff382b)] transition-[width] duration-200"
                style={{ width: `${fever}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-bold leading-5 text-[#53657f]">
              Full fever adds bonus points and speeds the table up.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Hits" value={stats.hits} />
            <StatTile label="Misses" value={stats.misses} />
            <StatTile label="Bonks" value={stats.bonks} />
            <StatTile label="Best Streak" value={stats.longestStreak} />
          </div>

          <div className="rounded-2xl border border-[#0c70ce]/20 bg-white p-3 shadow-sm">
            <div className="font-mono text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#1267ba]">Targets</div>
            <div className="mt-3 grid gap-2">
              <LegendRow color="#9a5a2e" label="Brown mole" value="+100 plus streak" />
              <LegendRow color="#d1762e" label="Boss mole" value="+250 and big fever" />
              <LegendRow color="#2c93d8" label="Blue clock" value="+2 seconds" />
              <LegendRow color="#6fb958" label="Green decoy" value="-150 and reset" />
            </div>
          </div>
        </aside>
      </div>

      <GameStatus>
        {phase === "round-over" ? "Round over. " : ""}
        {message} Use numpad-style keys 1-9 or click/tap holes. Space/Enter starts, R restarts.
      </GameStatus>
    </GamePanel>
  );
}

function Mole({ target }: { target: Target }) {
  const meta = TARGET_META[target.kind];
  const stateClass =
    target.state === "bonked"
      ? "translate-y-[40%] scale-x-110 scale-y-75 rotate-3"
      : target.state === "escaping"
        ? "translate-y-[34%] scale-95"
        : target.state === "rising"
          ? "translate-y-[22%]"
          : "translate-y-0";

  return (
    <span
      className={`absolute inset-x-[13%] bottom-[7%] z-20 aspect-[1.05] rounded-t-[45%] rounded-b-[34%] border-4 border-white/70 shadow-[0_9px_0_rgba(0,0,0,0.22)] transition-transform duration-150 ${stateClass}`}
      style={{
        background: `radial-gradient(circle at 36% 26%, rgba(255,255,255,0.45) 0 7%, transparent 8%), linear-gradient(155deg, ${meta.color}, ${meta.dark})`,
      }}
    >
      {target.kind === "chief" ? (
        <span className="absolute -top-[18%] left-1/2 h-[30%] w-[54%] -translate-x-1/2 rounded-t-full border-4 border-[#ffe24d] bg-[#e92929] shadow-[0_4px_0_rgba(0,0,0,0.25)]" />
      ) : null}
      {target.kind === "timer" ? (
        <span className="absolute -top-[15%] left-1/2 grid h-[32%] w-[32%] -translate-x-1/2 place-items-center rounded-full border-4 border-white bg-[#ffe24d] text-[0.6rem] font-black text-[#07345b]">
          +2
        </span>
      ) : null}
      {target.kind === "decoy" ? (
        <span className="absolute -top-[12%] left-1/2 h-[28%] w-[18%] -translate-x-1/2 rounded-full bg-[#ff5a6c] shadow-[16px_10px_0_#ff5a6c,-16px_10px_0_#ff5a6c]" />
      ) : null}
      <span className="absolute left-[24%] top-[32%] h-[11%] w-[11%] rounded-full bg-white shadow-[2.15rem_0_0_white]">
        <span className="absolute left-1 top-1 h-2 w-2 rounded-full bg-black shadow-[2.15rem_0_0_black]" />
      </span>
      <span
        className="absolute left-[21%] top-[23%] h-[6%] w-[23%] -rotate-12 rounded-full shadow-[2.2rem_0.22rem_0_var(--mole-brow)]"
        style={{ backgroundColor: meta.eyebrow, "--mole-brow": meta.eyebrow } as React.CSSProperties}
      />
      <span
        className="absolute left-1/2 top-[48%] h-[17%] w-[22%] -translate-x-1/2 rounded-[50%]"
        style={{ backgroundColor: meta.nose }}
      />
      <span className="absolute left-1/2 top-[67%] h-[12%] w-[28%] -translate-x-1/2 rounded-b-full bg-[#290b07]" />
      <span className="absolute bottom-[-2%] left-[18%] h-[16%] w-[22%] rounded-t-full bg-[#ffc2a0] shadow-[3.1rem_0_0_#ffc2a0]" />
      <span className="sr-only">{meta.label}</span>
    </span>
  );
}

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-[#0c70ce]/15 bg-white p-3 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.12em] text-[#1267ba]">{label}</div>
      <div className="mt-1 text-2xl font-black text-[#0a2250]">{value}</div>
    </div>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-[#e9f6ff] px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: color }} />
        <span className="text-sm font-black">{label}</span>
      </div>
      <span className="text-right text-xs font-bold text-[#53657f]">{value}</span>
    </div>
  );
}
