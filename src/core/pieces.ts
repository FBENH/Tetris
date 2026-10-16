// Tetromino definitions and SRS (Super Rotation System) data.
// Coordinates are y-down: x grows to the right, y grows towards the floor.

export type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
export type Rotation = 0 | 1 | 2 | 3; // 0 = spawn, 1 = R, 2 = 180, 3 = L

export interface Cell {
  readonly x: number;
  readonly y: number;
}

export const PIECE_TYPES: readonly PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];

// Board cells store a piece id (index + 1) so 0 means empty.
export const pieceId = (type: PieceType): number => PIECE_TYPES.indexOf(type) + 1;
export const pieceFromId = (id: number): PieceType => PIECE_TYPES[id - 1];

export const PIECE_COLORS: Readonly<Record<PieceType, string>> = {
  O: "#e3e100",
  I: "#008986",
  Z: "#FF6633",
  S: "#66CC33",
  L: "#FF9933",
  J: "#2745b9",
  T: "#9933FF",
};

// Spawn orientation, inside a square bounding box so rotations keep a fixed pivot.
const SPAWN_SHAPES: Readonly<Record<PieceType, readonly string[]>> = {
  I: ["....", "####", "....", "...."],
  O: ["##", "##"],
  T: [".#.", "###", "..."],
  S: [".##", "##.", "..."],
  Z: ["##.", ".##", "..."],
  J: ["#..", "###", "..."],
  L: ["..#", "###", "..."],
};

export const pieceSize = (type: PieceType): number => SPAWN_SHAPES[type].length;

function shapeToCells(rows: readonly string[]): Cell[] {
  const cells: Cell[] = [];
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === "#") cells.push({ x, y });
    });
  });
  return cells;
}

// Clockwise rotation inside an n x n box: (x, y) -> (n - 1 - y, x)
function rotateCells(cells: readonly Cell[], size: number): Cell[] {
  return cells.map(({ x, y }) => ({ x: size - 1 - y, y: x }));
}

// ROTATIONS[type][rotation] -> the four occupied cells, precomputed once.
export const ROTATIONS: Readonly<Record<PieceType, readonly (readonly Cell[])[]>> = Object.fromEntries(
  PIECE_TYPES.map((type) => {
    const size = pieceSize(type);
    const states: Cell[][] = [shapeToCells(SPAWN_SHAPES[type])];
    for (let r = 1; r < 4; r++) states.push(rotateCells(states[r - 1], size));
    return [type, states];
  }),
) as Record<PieceType, Cell[][]>;

// SRS wall kicks, written in the usual y-up notation and converted to y-down below.
type KickTable = Record<string, readonly [number, number][]>;

const JLSTZ_KICKS: KickTable = {
  "0>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "1>0": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "1>2": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "2>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "2>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "3>2": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "3>0": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "0>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};

const I_KICKS: KickTable = {
  "0>1": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "1>0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "1>2": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  "2>1": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "2>3": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "3>2": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "3>0": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "0>3": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

export function getKicks(type: PieceType, from: Rotation, to: Rotation): Cell[] {
  if (type === "O") return [{ x: 0, y: 0 }];
  const table = type === "I" ? I_KICKS : JLSTZ_KICKS;
  return table[`${from}>${to}`].map(([x, y]) => ({ x, y: -y }));
}
