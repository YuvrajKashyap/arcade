import type {
  TicTacToeBoard,
  TicTacToeCell,
  TicTacToeDifficulty,
  TicTacToeMark,
} from "@/features/games/tic-tac-toe/types";

const orderedMoves = [4, 0, 2, 6, 8, 1, 3, 5, 7] as const;
const cornerMoves = [0, 2, 6, 8] as const;
const sideMoves = [1, 3, 5, 7] as const;

export const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

export function createEmptyBoard(): TicTacToeBoard {
  return Array.from({ length: 9 }, () => null as TicTacToeCell);
}

export function getWinningLine(board: TicTacToeBoard) {
  return (
    winningLines.find(([a, b, c]) => {
      return board[a] && board[a] === board[b] && board[a] === board[c];
    }) ?? null
  );
}

export function getWinner(board: TicTacToeBoard): TicTacToeMark | null {
  const winningLine = getWinningLine(board);

  return winningLine ? board[winningLine[0]] : null;
}

export function isBoardFull(board: TicTacToeBoard) {
  return board.every(Boolean);
}

function getAvailableMoves(board: TicTacToeBoard) {
  return orderedMoves.filter((move) => board[move] === null);
}

function pickRandomMove(moves: readonly number[]) {
  if (moves.length === 0) {
    return -1;
  }

  return moves[Math.floor(Math.random() * moves.length)];
}

function getImmediateMove(board: TicTacToeBoard, mark: TicTacToeMark) {
  for (const move of getAvailableMoves(board)) {
    board[move] = mark;
    const winner = getWinner(board);
    board[move] = null;

    if (winner === mark) {
      return move;
    }
  }

  return -1;
}

function getRandomPreferredMove(
  board: TicTacToeBoard,
  moves: readonly number[],
) {
  return pickRandomMove(moves.filter((move) => board[move] === null));
}

function scoreBoard(board: TicTacToeBoard, depth: number, isCpuTurn: boolean): number {
  const winner = getWinner(board);

  if (winner === "o") {
    return 10 - depth;
  }

  if (winner === "x") {
    return depth - 10;
  }

  if (isBoardFull(board)) {
    return 0;
  }

  const nextMoves = getAvailableMoves(board);

  if (isCpuTurn) {
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const move of nextMoves) {
      board[move] = "o";
      bestScore = Math.max(bestScore, scoreBoard(board, depth + 1, false));
      board[move] = null;
    }

    return bestScore;
  }

  let bestScore = Number.POSITIVE_INFINITY;

  for (const move of nextMoves) {
    board[move] = "x";
    bestScore = Math.min(bestScore, scoreBoard(board, depth + 1, true));
    board[move] = null;
  }

  return bestScore;
}

export function getBestCpuMove(board: TicTacToeBoard) {
  let bestMove = -1;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const move of getAvailableMoves(board)) {
    board[move] = "o";
    const candidateScore = scoreBoard(board, 0, false);
    board[move] = null;

    if (candidateScore > bestScore) {
      bestScore = candidateScore;
      bestMove = move;
    }
  }

  return bestMove;
}

function getEasyCpuMove(board: TicTacToeBoard) {
  const winningMove = getImmediateMove(board, "o");

  if (winningMove !== -1) {
    return winningMove;
  }

  return pickRandomMove(getAvailableMoves(board));
}

function getMediumCpuMove(board: TicTacToeBoard) {
  const winningMove = getImmediateMove(board, "o");

  if (winningMove !== -1) {
    return winningMove;
  }

  const blockingMove = getImmediateMove(board, "x");

  if (blockingMove !== -1) {
    return blockingMove;
  }

  if (board[4] === null) {
    return 4;
  }

  const cornerMove = getRandomPreferredMove(board, cornerMoves);

  if (cornerMove !== -1) {
    return cornerMove;
  }

  const sideMove = getRandomPreferredMove(board, sideMoves);

  if (sideMove !== -1) {
    return sideMove;
  }

  return pickRandomMove(getAvailableMoves(board));
}

function getHardCpuMove(board: TicTacToeBoard) {
  const winningMove = getImmediateMove(board, "o");

  if (winningMove !== -1) {
    return winningMove;
  }

  const blockingMove = getImmediateMove(board, "x");

  if (blockingMove !== -1) {
    return blockingMove;
  }

  if (Math.random() < 0.82) {
    return getBestCpuMove(board);
  }

  return getMediumCpuMove(board);
}

export function getCpuMove(
  board: TicTacToeBoard,
  difficulty: TicTacToeDifficulty,
) {
  if (difficulty === "easy") {
    return getEasyCpuMove(board);
  }

  if (difficulty === "medium") {
    return getMediumCpuMove(board);
  }

  if (difficulty === "hard") {
    return getHardCpuMove(board);
  }

  return getBestCpuMove(board);
}

export function getNextKeyboardCellIndex(currentIndex: number, key: string) {
  const row = Math.floor(currentIndex / 3);
  const column = currentIndex % 3;

  if (key === "arrowup" || key === "w") {
    return Math.max(0, row - 1) * 3 + column;
  }

  if (key === "arrowdown" || key === "s") {
    return Math.min(2, row + 1) * 3 + column;
  }

  if (key === "arrowleft" || key === "a") {
    return row * 3 + Math.max(0, column - 1);
  }

  if (key === "arrowright" || key === "d") {
    return row * 3 + Math.min(2, column + 1);
  }

  return currentIndex;
}
