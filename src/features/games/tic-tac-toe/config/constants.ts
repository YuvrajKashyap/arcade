import type { TicTacToeDifficulty } from "@/features/games/tic-tac-toe/types";

export const TIC_TAC_TOE_STORAGE_KEY = "games.tic-tac-toe.stats";
export const TIC_TAC_TOE_CPU_DELAY_MS = 360;
export const TIC_TAC_TOE_DEFAULT_DIFFICULTY: TicTacToeDifficulty = "impossible";
export const TIC_TAC_TOE_DIFFICULTIES = [
  "easy",
  "medium",
  "hard",
  "impossible",
] as const satisfies readonly TicTacToeDifficulty[];
