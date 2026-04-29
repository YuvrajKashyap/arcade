"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  GameButton,
  GamePanel,
  GameStatus,
  TouchControls,
} from "@/features/games/shared/components/game-ui";
import {
  readStoredNumber,
  writeStoredNumber,
} from "@/features/games/shared/utils/local-storage";

const STORAGE_KEY = "arcade.snakesAndLadders.bestRolls.v2";
const BOARD_SIZE = 10;
const WIN_SQUARE = 100;

const ladders = new Map<number, number>([
  [1, 38],
  [4, 14],
  [8, 30],
  [21, 42],
  [28, 76],
  [50, 67],
  [71, 92],
  [80, 99],
]);

const snakes = new Map<number, number>([
  [32, 10],
  [36, 6],
  [48, 26],
  [62, 18],
  [88, 24],
  [95, 56],
  [97, 78],
]);

type Phase = "ready" | "playing" | "rolling" | "moving" | "won";
type PlayerKey = "you" | "cpu";
type JumpKind = "ladder" | "snake" | "none" | "bounce";
type MoveResult = {
  player: PlayerKey;
  from: number;
  die: number;
  target: number;
  final: number;
  kind: JumpKind;
  extraTurn: boolean;
};
type State = {
  phase: Phase;
  positions: Record<PlayerKey, number>;
  turn: PlayerKey;
  die: number;
  rolls: number;
  bestRolls: number;
  winner: PlayerKey | null;
  move: MoveResult | null;
  message: string;
  log: string[];
  rollId: number;
};

const players: Record<PlayerKey, { name: string; fill: string; ring: string }> = {
  you: { name: "You", fill: "#2563eb", ring: "#bfdbfe" },
  cpu: { name: "CPU", fill: "#f43f5e", ring: "#fecdd3" },
};

function createState(bestRolls = 0): State {
  return {
    phase: "ready",
    positions: { you: 0, cpu: 0 },
    turn: "you",
    die: 1,
    rolls: 0,
    bestRolls,
    winner: null,
    move: null,
    message: "Roll to enter the board. Land on ladders to climb and avoid snake heads.",
    log: ["Classic rules: exact 100 wins, and rolling a 6 gives another turn."],
    rollId: 0,
  };
}

function cellPosition(square: number) {
  if (square <= 0) return { row: 10, column: 0 };

  const index = square - 1;
  const rowFromBottom = Math.floor(index / BOARD_SIZE);
  const colInRow = index % BOARD_SIZE;
  const column = rowFromBottom % 2 === 0 ? colInRow : BOARD_SIZE - 1 - colInRow;

  return { row: BOARD_SIZE - 1 - rowFromBottom, column };
}

function squareCenter(square: number) {
  const position = cellPosition(square);
  return {
    x: position.column * 10 + 5,
    y: position.row * 10 + 5,
  };
}

function rollDie() {
  return 1 + Math.floor(Math.random() * 6);
}

function computeMove(state: State, player: PlayerKey, die: number): MoveResult {
  const from = state.positions[player];
  const rawTarget = from + die;

  if (rawTarget > WIN_SQUARE) {
    return {
      player,
      from,
      die,
      target: from,
      final: from,
      kind: "bounce",
      extraTurn: die === 6,
    };
  }

  const ladder = ladders.get(rawTarget);
  const snake = snakes.get(rawTarget);
  const final = ladder ?? snake ?? rawTarget;

  return {
    player,
    from,
    die,
    target: rawTarget,
    final,
    kind: ladder ? "ladder" : snake ? "snake" : "none",
    extraTurn: die === 6,
  };
}

function describeMove(move: MoveResult) {
  const name = players[move.player].name;
  if (move.kind === "bounce") {
    return `${name} rolled ${move.die}, needs exact 100, and stays on ${move.from || "start"}.`;
  }
  if (move.kind === "ladder") {
    return `${name} rolled ${move.die}, landed on ${move.target}, and climbed to ${move.final}.`;
  }
  if (move.kind === "snake") {
    return `${name} rolled ${move.die}, landed on ${move.target}, and slid to ${move.final}.`;
  }
  return `${name} rolled ${move.die} and moved to ${move.final}.`;
}

function nextTurnAfter(move: MoveResult) {
  return move.extraTurn ? move.player : move.player === "you" ? "cpu" : "you";
}

function createRollUpdate(state: State, player: PlayerKey): State {
  const die = rollDie();
  return {
    ...state,
    phase: "rolling",
    turn: player,
    die,
    move: null,
    message: `${players[player].name} is rolling...`,
    rollId: state.rollId + 1,
  };
}

function finishMove(state: State): State {
  if (!state.move) return state;

  const { move } = state;
  const positions = { ...state.positions, [move.player]: move.final };
  const winner = move.final === WIN_SQUARE ? move.player : null;
  const rolls = state.rolls + (move.player === "you" ? 1 : 0);
  const bestRolls =
    winner === "you"
      ? state.bestRolls === 0
        ? rolls
        : Math.min(state.bestRolls, rolls)
      : state.bestRolls;
  const turn = winner ? move.player : nextTurnAfter(move);
  const extra = !winner && move.extraTurn ? " Rolled a 6, so the turn continues." : "";
  const message =
    winner === "you"
      ? `You reached 100 in ${rolls} rolls.`
      : winner === "cpu"
        ? "CPU reached 100 first. Start a new race."
        : `${describeMove(move)}${extra}`;

  return {
    ...state,
    phase: winner ? "won" : "playing",
    positions,
    turn,
    rolls,
    bestRolls,
    winner,
    message,
    log: [message, ...state.log].slice(0, 5),
  };
}

function DiceFace({ value, rolling }: { value: number; rolling: boolean }) {
  const pips = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  }[value] ?? [4];

  return (
    <div
      className={`grid size-20 grid-cols-3 grid-rows-3 gap-1.5 rounded-xl border-4 border-[#4a2a12] bg-[#fff7e1] p-3 shadow-[inset_0_4px_rgba(255,255,255,0.8),0_12px_26px_rgba(74,42,18,0.28)] ${
        rolling ? "animate-[spin_520ms_cubic-bezier(0.2,0.8,0.2,1)]" : ""
      }`}
      aria-label={`Die showing ${value}`}
    >
      {Array.from({ length: 9 }, (_, index) => (
        <span
          key={index}
          className={`rounded-full ${pips.includes(index) ? "bg-[#241306] shadow-[0_1px_rgba(255,255,255,0.45)]" : "bg-transparent"}`}
        />
      ))}
    </div>
  );
}

function Token({
  player,
  square,
  offset,
}: {
  player: PlayerKey;
  square: number;
  offset: number;
}) {
  if (square <= 0) {
    return (
      <div
        className="grid size-7 place-items-center rounded-full border-2 text-[0.62rem] font-black text-white shadow-[0_6px_14px_rgba(0,0,0,0.35)]"
        style={{
          background: players[player].fill,
          borderColor: players[player].ring,
        }}
      >
        {player === "you" ? "Y" : "C"}
      </div>
    );
  }

  const center = squareCenter(square);
  return (
    <div
      className="absolute z-30 grid size-[6.4%] min-h-5 min-w-5 place-items-center rounded-full border-2 text-[0.58rem] font-black text-white shadow-[0_8px_16px_rgba(0,0,0,0.38)] transition-[left,top,transform] duration-500 ease-[cubic-bezier(0.18,0.9,0.2,1)]"
      style={{
        left: `${center.x}%`,
        top: `${center.y}%`,
        transform: `translate(calc(-50% + ${offset}px), -50%)`,
        background: `radial-gradient(circle at 32% 28%, #ffffffcc 0 13%, ${players[player].fill} 14% 100%)`,
        borderColor: players[player].ring,
      }}
    >
      {player === "you" ? "Y" : "C"}
    </div>
  );
}

function LadderSvg({ from, to }: { from: number; to: number }) {
  const a = squareCenter(from);
  const b = squareCenter(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  const nx = (-dy / length) * 1.2;
  const ny = (dx / length) * 1.2;
  const rungCount = Math.max(3, Math.round(length / 8));

  return (
    <g>
      <line x1={a.x - nx} y1={a.y - ny} x2={b.x - nx} y2={b.y - ny} stroke="#8a4b16" strokeWidth="0.8" strokeLinecap="round" />
      <line x1={a.x + nx} y1={a.y + ny} x2={b.x + nx} y2={b.y + ny} stroke="#8a4b16" strokeWidth="0.8" strokeLinecap="round" />
      {Array.from({ length: rungCount }, (_, index) => {
        const t = (index + 0.5) / rungCount;
        const x = a.x + dx * t;
        const y = a.y + dy * t;
        return (
          <line
            key={index}
            x1={x - nx * 1.25}
            y1={y - ny * 1.25}
            x2={x + nx * 1.25}
            y2={y + ny * 1.25}
            stroke="#f8c15d"
            strokeWidth="0.65"
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
}

function SnakeSvg({ from, to, color }: { from: number; to: number; color: string }) {
  const a = squareCenter(from);
  const b = squareCenter(to);
  const midY = (a.y + b.y) / 2;
  const bend = from % 2 === 0 ? 10 : -10;
  const path = `M ${a.x} ${a.y} C ${a.x + bend} ${midY - 12}, ${b.x - bend} ${midY + 12}, ${b.x} ${b.y}`;

  return (
    <g>
      <path d={path} fill="none" stroke="#2a190c" strokeWidth="2.8" strokeLinecap="round" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" />
      <circle cx={a.x} cy={a.y} r="2.1" fill={color} stroke="#2a190c" strokeWidth="0.7" />
      <circle cx={a.x - 0.65} cy={a.y - 0.45} r="0.25" fill="#f8fafc" />
      <circle cx={a.x + 0.65} cy={a.y - 0.45} r="0.25" fill="#f8fafc" />
      <path d={`M ${b.x - 1.2} ${b.y - 0.6} L ${b.x + 1.2} ${b.y} L ${b.x - 1.2} ${b.y + 0.6}`} fill="#2a190c" opacity="0.45" />
    </g>
  );
}

function BoardArt() {
  const snakeColors = ["#16a34a", "#dc2626", "#9333ea", "#0891b2", "#ea580c", "#65a30d", "#be123c"];

  return (
    <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
      {[...ladders.entries()].map(([from, to]) => (
        <LadderSvg key={`ladder-${from}`} from={from} to={to} />
      ))}
      {[...snakes.entries()].map(([from, to], index) => (
        <SnakeSvg key={`snake-${from}`} from={from} to={to} color={snakeColors[index % snakeColors.length]} />
      ))}
    </svg>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-[#6b3b16]/20 bg-white/65 px-3 py-2 shadow-[inset_0_1px_rgba(255,255,255,0.8)]">
      <div className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#7a4318]">{label}</div>
      <div className="mt-1 text-lg font-black leading-none text-[#241306]">{value}</div>
    </div>
  );
}

export function LadderRaceGame() {
  const initialState = useMemo(() => createState(readStoredNumber(STORAGE_KEY)), []);
  const [state, setState] = useState(initialState);
  const stateRef = useRef(initialState);
  const cells = useMemo(() => Array.from({ length: 100 }, (_, index) => 100 - index), []);
  const canRoll = state.phase === "ready" || (state.phase === "playing" && state.turn === "you");

  function sync(nextState: State) {
    stateRef.current = nextState;
    setState(nextState);
    writeStoredNumber(STORAGE_KEY, nextState.bestRolls);
  }

  function restart() {
    sync(createState(stateRef.current.bestRolls));
  }

  function rollFor(player: PlayerKey) {
    const current = stateRef.current;
    if (current.phase === "rolling" || current.phase === "moving" || current.phase === "won") return;
    if (current.phase === "playing" && current.turn !== player) return;

    sync(createRollUpdate({ ...current, phase: "playing" }, player));
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (key === " " || key === "enter") {
      event.preventDefault();
      rollFor("you");
    } else if (key === "r") {
      event.preventDefault();
      restart();
    }
  });

  const rollForCpu = useEffectEvent(() => rollFor("cpu"));

  useEffect(() => {
    const handler = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (state.phase !== "rolling") return;

    const timeout = window.setTimeout(() => {
      const current = stateRef.current;
      if (current.phase !== "rolling") return;
      const move = computeMove(current, current.turn, current.die);
      sync({
        ...current,
        phase: "moving",
        move,
        positions: { ...current.positions, [current.turn]: move.target },
        message: describeMove(move),
      });
    }, 560);

    return () => window.clearTimeout(timeout);
  }, [state.phase, state.rollId]);

  useEffect(() => {
    if (state.phase !== "moving" || !state.move) return;

    const timeout = window.setTimeout(() => {
      const current = stateRef.current;
      sync(finishMove(current));
    }, state.move.kind === "none" || state.move.kind === "bounce" ? 560 : 860);

    return () => window.clearTimeout(timeout);
  }, [state.phase, state.move]);

  useEffect(() => {
    if (state.phase !== "playing" || state.turn !== "cpu") return;

    const timeout = window.setTimeout(() => rollForCpu(), 720);
    return () => window.clearTimeout(timeout);
  }, [state.phase, state.turn, state.rollId]);

  return (
    <GamePanel>
      <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[minmax(20rem,43rem)_18rem] lg:items-start">
        <div className="rounded-xl border border-[#6b3b16]/25 bg-[#f8e3aa] p-3 shadow-[0_26px_70px_rgba(52,32,8,0.28)]">
          <div className="relative aspect-square overflow-hidden rounded-lg border-[6px] border-[#6b3b16] bg-[#f7c765] p-2 shadow-[inset_0_6px_rgba(255,255,255,0.45)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.28),transparent_46%)]" />
            <div data-testid="snakes-board" className="relative z-10 grid h-full grid-cols-10 grid-rows-10 gap-1">
              {cells.map((square) => {
                const position = cellPosition(square);
                const isStart = square === 1;
                const isFinish = square === 100;
                const isLadder = ladders.has(square);
                const isSnake = snakes.has(square);

                return (
                  <div
                    key={square}
                    className={`relative overflow-hidden rounded-md border border-[#80531d]/20 p-1 text-[0.58rem] font-black text-[#4a2a12] shadow-[inset_0_1px_rgba(255,255,255,0.45)] ${
                      (position.row + position.column) % 2 === 0 ? "bg-[#fff1b8]" : "bg-[#f4b95c]"
                    }`}
                  >
                    <span className="relative z-10">{square}</span>
                    {isFinish ? <span className="absolute inset-x-1 bottom-1 rounded-full bg-[#7c2d12] px-1 text-center text-[0.48rem] uppercase tracking-wide text-white">Finish</span> : null}
                    {isStart ? <span className="absolute inset-x-1 bottom-1 rounded-full bg-[#1d4ed8] px-1 text-center text-[0.48rem] uppercase tracking-wide text-white">Start</span> : null}
                    {isLadder ? <span className="absolute right-1 top-1 size-2 rounded-full bg-[#f8c15d] ring-1 ring-[#8a4b16]" /> : null}
                    {isSnake ? <span className="absolute right-1 top-1 size-2 rounded-full bg-[#16a34a] ring-1 ring-[#2a190c]" /> : null}
                  </div>
                );
              })}
            </div>
            <BoardArt />
            <Token player="you" square={state.positions.you} offset={state.positions.you === state.positions.cpu ? -7 : 0} />
            <Token player="cpu" square={state.positions.cpu} offset={state.positions.you === state.positions.cpu ? 7 : 0} />
          </div>
        </div>

        <aside className="grid gap-3 rounded-xl border border-[#6b3b16]/25 bg-[#f8e3aa] p-3 text-[#241306] shadow-[0_26px_70px_rgba(52,32,8,0.22)]">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-[#6b3b16]/20 bg-white/55 p-3">
            <div>
              <div className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#7a4318]">Turn</div>
              <div className="mt-1 text-2xl font-black">{players[state.turn].name}</div>
            </div>
            <DiceFace value={state.die} rolling={state.phase === "rolling"} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StatBox label="Your Square" value={state.positions.you || "Start"} />
            <StatBox label="CPU Square" value={state.positions.cpu || "Start"} />
            <StatBox label="Rolls" value={state.rolls} />
            <StatBox label="Best" value={state.bestRolls || "--"} />
          </div>

          <div className="grid gap-2">
            <GameButton variant="primary" onClick={() => rollFor("you")} disabled={!canRoll}>
              {state.phase === "ready" ? "Start Roll" : state.turn === "you" ? "Roll Dice" : "CPU Turn"}
            </GameButton>
            <GameButton onClick={restart}>Restart</GameButton>
          </div>

          <div className="rounded-lg border border-[#6b3b16]/20 bg-white/55 p-3">
            <div className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#7a4318]">Race Log</div>
            <div className="mt-2 grid gap-2">
              {state.log.map((item, index) => (
                <p key={`${item}-${index}`} className="rounded-md bg-[#fff7e1]/80 px-3 py-2 text-sm font-semibold leading-5 text-[#4a2a12]">
                  {item}
                </p>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-[#6b3b16]/20 bg-white/55 p-3">
            <Token player="you" square={0} offset={0} />
            <span className="text-sm font-bold">You</span>
            <Token player="cpu" square={0} offset={0} />
            <span className="text-sm font-bold">CPU</span>
          </div>
        </aside>
      </div>

      <GameStatus>
        {state.message} Press Space or Enter to roll. Ladders climb upward, snake heads slide downward, and you must land exactly on 100.
      </GameStatus>
      <TouchControls className="max-w-[22rem]">
        <GameButton variant="touch" className="w-full" onClick={() => rollFor("you")} disabled={!canRoll}>
          {state.phase === "ready" ? "Start Roll" : state.turn === "you" ? "Roll Dice" : "CPU Turn"}
        </GameButton>
      </TouchControls>
    </GamePanel>
  );
}
