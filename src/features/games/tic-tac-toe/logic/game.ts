import type {
  TicTacToeBoard,
  TicTacToeCell,
  TicTacToeMark,
} from "@/features/games/tic-tac-toe/types";

const orderedMoves = [4, 0, 2, 6, 8, 1, 3, 5, 7] as const;

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
