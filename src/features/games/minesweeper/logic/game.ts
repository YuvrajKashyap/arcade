import { MINESWEEPER_DIFFICULTIES } from "@/features/games/minesweeper/config/constants";
import type {
  MinesweeperCell,
  MinesweeperDifficulty,
  MinesweeperState,
} from "@/features/games/minesweeper/types";

export function getDifficultyConfig(difficulty: MinesweeperDifficulty) {
  return (
    MINESWEEPER_DIFFICULTIES.find((candidate) => candidate.id === difficulty) ??
    MINESWEEPER_DIFFICULTIES[0]
  );
}

function getNeighbors(index: number, rows: number, columns: number) {
  const row = Math.floor(index / columns);
  const column = index % columns;
  const neighbors: number[] = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) {
        continue;
      }

      const nextRow = row + rowOffset;
      const nextColumn = column + columnOffset;
      if (nextRow >= 0 && nextRow < rows && nextColumn >= 0 && nextColumn < columns) {
        neighbors.push(nextRow * columns + nextColumn);
      }
    }
  }

  return neighbors;
}

function buildCells(
  rows: number,
  columns: number,
  mines: number,
  safeIndex: number,
): MinesweeperCell[] {
  const totalCells = rows * columns;
  const cells = Array.from({ length: totalCells }, () => ({
    mine: false,
    revealed: false,
    flagged: false,
    adjacent: 0,
  }));
  const blocked = new Set([safeIndex, ...getNeighbors(safeIndex, rows, columns)]);
  const mineIndexes = new Set<number>();

  while (mineIndexes.size < mines) {
    const candidate = Math.floor(Math.random() * totalCells);
    if (!blocked.has(candidate)) {
      mineIndexes.add(candidate);
    }
  }

  for (const index of mineIndexes) {
    cells[index].mine = true;
  }

  return cells.map((cell, index) => ({
    ...cell,
    adjacent: getNeighbors(index, rows, columns).filter((neighbor) => cells[neighbor].mine).length,
  }));
}

export function createMinesweeperState(
  difficulty: MinesweeperDifficulty = "beginner",
): MinesweeperState {
  const config = getDifficultyConfig(difficulty);

  return {
    phase: "idle",
    difficulty,
    rows: config.rows,
    columns: config.columns,
    mines: config.mines,
    cells: Array.from({ length: config.rows * config.columns }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
    })),
    flags: 0,
    startedAt: null,
    elapsedSeconds: 0,
  };
}

function revealFrom(cells: MinesweeperCell[], startIndex: number, rows: number, columns: number) {
  const nextCells = cells.map((cell) => ({ ...cell }));
  const queue = [startIndex];
  const visited = new Set<number>();

  while (queue.length > 0) {
    const index = queue.shift()!;
    if (visited.has(index)) {
      continue;
    }

    visited.add(index);
    const cell = nextCells[index];
    if (cell.flagged || cell.revealed) {
      continue;
    }

    cell.revealed = true;
    if (cell.adjacent === 0 && !cell.mine) {
      queue.push(...getNeighbors(index, rows, columns));
    }
  }

  return nextCells;
}

function hasWon(cells: MinesweeperCell[]) {
  return cells.every((cell) => cell.mine || cell.revealed);
}

export function revealCell(state: MinesweeperState, index: number, now: number): MinesweeperState {
  if (state.phase === "won" || state.phase === "lost") {
    return state;
  }

  let nextState = state;
  if (state.phase === "idle") {
    nextState = {
      ...state,
      phase: "playing",
      cells: buildCells(state.rows, state.columns, state.mines, index),
      startedAt: now,
    };
  }

  const cell = nextState.cells[index];
  if (cell.flagged || cell.revealed) {
    return nextState;
  }

  if (cell.mine) {
    return {
      ...nextState,
      phase: "lost",
      cells: nextState.cells.map((candidate) =>
        candidate.mine ? { ...candidate, revealed: true } : candidate,
      ),
      elapsedSeconds: nextState.startedAt ? Math.floor((now - nextState.startedAt) / 1000) : 0,
    };
  }

  const nextCells = revealFrom(nextState.cells, index, nextState.rows, nextState.columns);
  const nextElapsed = nextState.startedAt ? Math.floor((now - nextState.startedAt) / 1000) : 0;

  return {
    ...nextState,
    phase: hasWon(nextCells) ? "won" : "playing",
    cells: nextCells,
    elapsedSeconds: nextElapsed,
  };
}

export function toggleFlag(state: MinesweeperState, index: number): MinesweeperState {
  if (state.phase === "won" || state.phase === "lost") {
    return state;
  }

  const cell = state.cells[index];
  if (cell.revealed) {
    return state;
  }

  const nextFlagged = !cell.flagged;
  return {
    ...state,
    cells: state.cells.map((candidate, candidateIndex) =>
      candidateIndex === index ? { ...candidate, flagged: nextFlagged } : candidate,
    ),
    flags: state.flags + (nextFlagged ? 1 : -1),
  };
}

export function tickMinesweeper(state: MinesweeperState, now: number): MinesweeperState {
  if (state.phase !== "playing" || !state.startedAt) {
    return state;
  }

  return {
    ...state,
    elapsedSeconds: Math.floor((now - state.startedAt) / 1000),
  };
}

export function getNextCellIndex(currentIndex: number, key: string, rows: number, columns: number) {
  const row = Math.floor(currentIndex / columns);
  const column = currentIndex % columns;

  if (key === "arrowup" || key === "w") {
    return Math.max(0, row - 1) * columns + column;
  }

  if (key === "arrowdown" || key === "s") {
    return Math.min(rows - 1, row + 1) * columns + column;
  }

  if (key === "arrowleft" || key === "a") {
    return row * columns + Math.max(0, column - 1);
  }

  if (key === "arrowright" || key === "d") {
    return row * columns + Math.min(columns - 1, column + 1);
  }

  return currentIndex;
}
