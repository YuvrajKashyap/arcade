export const MINESWEEPER_STORAGE_KEY = "arcade.minesweeper.bestTime";

export const MINESWEEPER_DIFFICULTIES = [
  { id: "beginner", label: "Beginner", rows: 9, columns: 9, mines: 10 },
  { id: "intermediate", label: "Intermediate", rows: 12, columns: 14, mines: 24 },
  { id: "expert", label: "Expert", rows: 14, columns: 18, mines: 40 },
] as const;
