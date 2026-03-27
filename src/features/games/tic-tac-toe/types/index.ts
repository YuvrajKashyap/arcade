export type TicTacToeMark = "x" | "o";
export type TicTacToeCell = TicTacToeMark | null;
export type TicTacToeBoard = TicTacToeCell[];
export type TicTacToeDifficulty = "easy" | "medium" | "hard" | "impossible";
export type TicTacToeTurn = "player" | "cpu";
export type TicTacToeOutcome = TicTacToeTurn | "draw" | null;
export type TicTacToePhase = "idle" | "playing" | "finished";

export type TicTacToeStats = {
  wins: number;
  losses: number;
  draws: number;
};

export type TicTacToeStatsByDifficulty = Record<TicTacToeDifficulty, TicTacToeStats>;
