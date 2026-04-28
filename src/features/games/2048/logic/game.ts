import { TWENTY_FORTY_EIGHT_SIZE, TWENTY_FORTY_EIGHT_WIN_TILE } from "@/features/games/2048/config/constants";
import type {
  TwentyFortyEightDirection,
  TwentyFortyEightState,
  TwentyFortyEightTile,
} from "@/features/games/2048/types";

function getEmptyCells(tiles: TwentyFortyEightTile[]) {
  const occupied = new Set(tiles.map((tile) => `${tile.row}:${tile.column}`));
  const cells: Array<{ row: number; column: number }> = [];

  for (let row = 0; row < TWENTY_FORTY_EIGHT_SIZE; row += 1) {
    for (let column = 0; column < TWENTY_FORTY_EIGHT_SIZE; column += 1) {
      if (!occupied.has(`${row}:${column}`)) {
        cells.push({ row, column });
      }
    }
  }

  return cells;
}

function addRandomTile(state: TwentyFortyEightState): TwentyFortyEightState {
  const emptyCells = getEmptyCells(state.tiles);
  if (emptyCells.length === 0) {
    return state;
  }

  const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const tile: TwentyFortyEightTile = {
    id: state.nextTileId,
    value: Math.random() < 0.9 ? 2 : 4,
    row: cell.row,
    column: cell.column,
    isNew: true,
  };

  return {
    ...state,
    tiles: [...state.tiles.map((candidate) => ({ ...candidate, isNew: false, mergedFrom: undefined })), tile],
    nextTileId: state.nextTileId + 1,
  };
}

export function createTwentyFortyEightState(bestScore = 0): TwentyFortyEightState {
  return addRandomTile(
    addRandomTile({
      tiles: [],
      score: 0,
      bestScore,
      phase: "playing",
      nextTileId: 1,
    }),
  );
}

function getLineCells(index: number, direction: TwentyFortyEightDirection) {
  const cells: Array<{ row: number; column: number }> = [];

  for (let offset = 0; offset < TWENTY_FORTY_EIGHT_SIZE; offset += 1) {
    if (direction === "left") {
      cells.push({ row: index, column: offset });
    } else if (direction === "right") {
      cells.push({ row: index, column: TWENTY_FORTY_EIGHT_SIZE - 1 - offset });
    } else if (direction === "up") {
      cells.push({ row: offset, column: index });
    } else {
      cells.push({ row: TWENTY_FORTY_EIGHT_SIZE - 1 - offset, column: index });
    }
  }

  return cells;
}

function hasAvailableMove(tiles: TwentyFortyEightTile[]) {
  if (tiles.length < TWENTY_FORTY_EIGHT_SIZE * TWENTY_FORTY_EIGHT_SIZE) {
    return true;
  }

  return tiles.some((tile) =>
    tiles.some(
      (candidate) =>
        candidate.value === tile.value &&
        ((Math.abs(candidate.row - tile.row) === 1 && candidate.column === tile.column) ||
          (Math.abs(candidate.column - tile.column) === 1 && candidate.row === tile.row)),
    ),
  );
}

export function moveTwentyFortyEight(
  state: TwentyFortyEightState,
  direction: TwentyFortyEightDirection,
): TwentyFortyEightState {
  if (state.phase !== "playing") {
    return state;
  }

  const sourceTiles: TwentyFortyEightTile[] = state.tiles.map((tile) => ({
    ...tile,
    isNew: false,
    mergedFrom: undefined,
  }));
  const tileByCell = new Map(sourceTiles.map((tile) => [`${tile.row}:${tile.column}`, tile]));
  const nextTiles: TwentyFortyEightTile[] = [];
  let moved = false;
  let scoreGain = 0;
  let nextTileId = state.nextTileId;

  for (let index = 0; index < TWENTY_FORTY_EIGHT_SIZE; index += 1) {
    const cells = getLineCells(index, direction);
    const lineTiles = cells
      .map((cell) => tileByCell.get(`${cell.row}:${cell.column}`))
      .filter((tile): tile is TwentyFortyEightTile => Boolean(tile));

    let targetIndex = 0;
    for (let sourceIndex = 0; sourceIndex < lineTiles.length; sourceIndex += 1) {
      const tile = lineTiles[sourceIndex];
      const nextTile = lineTiles[sourceIndex + 1];
      const targetCell = cells[targetIndex];

      if (!tile || !targetCell) {
        continue;
      }

      if (nextTile && nextTile.value === tile.value) {
        const value = tile.value * 2;
        nextTiles.push({
          id: nextTileId,
          value,
          row: targetCell.row,
          column: targetCell.column,
          mergedFrom: [tile.id, nextTile.id],
        });
        nextTileId += 1;
        scoreGain += value;
        moved =
          moved ||
          tile.row !== targetCell.row ||
          tile.column !== targetCell.column ||
          nextTile.row !== targetCell.row ||
          nextTile.column !== targetCell.column;
        sourceIndex += 1;
      } else {
        nextTiles.push({
          ...tile,
          row: targetCell.row,
          column: targetCell.column,
        });
        moved = moved || tile.row !== targetCell.row || tile.column !== targetCell.column;
      }

      targetIndex += 1;
    }
  }

  if (!moved) {
    return state;
  }

  const scoredState = {
    ...state,
    tiles: nextTiles,
    score: state.score + scoreGain,
    bestScore: Math.max(state.bestScore, state.score + scoreGain),
    nextTileId,
  };
  const withSpawn = addRandomTile(scoredState);
  const won = withSpawn.tiles.some((tile) => tile.value >= TWENTY_FORTY_EIGHT_WIN_TILE);

  return {
    ...withSpawn,
    phase: won ? "won" : hasAvailableMove(withSpawn.tiles) ? "playing" : "game-over",
  };
}
