import { Board } from "./board";
import { ROTATIONS, type PieceType, type Rotation } from "./pieces";

// Simple placement AI for the menu's demo game. For every rotation and column it
// drops the piece, scores the resulting board and keeps the best one.
// Weights from the well-known "El-Tetris"-style heuristic.
const WEIGHTS = {
  height: -0.51,
  lines: 0.76,
  holes: -0.36,
  bumpiness: -0.18,
};

export interface Placement {
  rotation: Rotation;
  x: number;
}

export function planPlacement(board: Board, type: PieceType): Placement | null {
  const scratch = new Board(board.width, board.height);
  let best: Placement | null = null;
  let bestScore = -Infinity;
  const rotations = type === "O" ? 1 : 4;

  for (let r = 0; r < rotations; r++) {
    const cells = ROTATIONS[type][r];
    const minX = -Math.min(...cells.map((c) => c.x));
    const maxX = board.width - 1 - Math.max(...cells.map((c) => c.x));
    const startY = -Math.min(...cells.map((c) => c.y));
    for (let x = minX; x <= maxX; x++) {
      if (board.collides(cells, x, startY)) continue;
      const y = startY + board.dropDistance(cells, x, startY);
      scratch.cells.set(board.cells);
      if (!scratch.merge(cells, x, y, 1)) continue; // would lock above the top
      const score = evaluate(scratch);
      if (score > bestScore) {
        bestScore = score;
        best = { rotation: r as Rotation, x };
      }
    }
  }
  return best;
}

function evaluate(board: Board): number {
  const lines = board.fullRows().length;
  if (lines) board.removeRows(board.fullRows());

  let height = 0;
  let holes = 0;
  let bumpiness = 0;
  let previous = -1;
  for (let x = 0; x < board.width; x++) {
    let top = board.height;
    for (let y = 0; y < board.height; y++) {
      if (board.get(x, y)) {
        if (top === board.height) top = y;
      } else if (top < y) {
        holes++;
      }
    }
    const columnHeight = board.height - top;
    height += columnHeight;
    if (previous >= 0) bumpiness += Math.abs(columnHeight - previous);
    previous = columnHeight;
  }

  return WEIGHTS.height * height + WEIGHTS.lines * lines + WEIGHTS.holes * holes + WEIGHTS.bumpiness * bumpiness;
}
