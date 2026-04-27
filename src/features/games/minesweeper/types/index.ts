import type { MINESWEEPER_DIFFICULTIES } from "@/features/games/minesweeper/config/constants";

export type MinesweeperDifficulty = (typeof MINESWEEPER_DIFFICULTIES)[number]["id"];
export type MinesweeperPhase = "idle" | "playing" | "won" | "lost";

export type MinesweeperCell = {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
};

export type MinesweeperState = {
  phase: MinesweeperPhase;
  difficulty: MinesweeperDifficulty;
  rows: number;
  columns: number;
  mines: number;
  cells: MinesweeperCell[];
  flags: number;
  startedAt: number | null;
  elapsedSeconds: number;
};
