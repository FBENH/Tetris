import type { Cell } from "./pieces";

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

// Playfield stored as a flat array of piece ids (0 = empty).
// Rows above the top (y < 0) are a hidden spawn area: free for collisions,
// but a piece that locks there ends the game.
export class Board {
  readonly width: number;
  readonly height: number;
  readonly cells: Uint8Array;

  constructor(width = BOARD_WIDTH, height = BOARD_HEIGHT) {
    this.width = width;
    this.height = height;
    this.cells = new Uint8Array(width * height);
  }

  get(x: number, y: number): number {
    return this.cells[y * this.width + x];
  }

  set(x: number, y: number, id: number): void {
    this.cells[y * this.width + x] = id;
  }

  clear(): void {
    this.cells.fill(0);
  }

  isBlocked(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y >= this.height) return true;
    if (y < 0) return false;
    return this.get(x, y) !== 0;
  }

  collides(cells: readonly Cell[], offsetX: number, offsetY: number): boolean {
    for (const c of cells) {
      if (this.isBlocked(c.x + offsetX, c.y + offsetY)) return true;
    }
    return false;
  }

  // Writes the piece into the board. Returns false if any cell is above the visible area.
  merge(cells: readonly Cell[], offsetX: number, offsetY: number, id: number): boolean {
    let visible = true;
    for (const c of cells) {
      const y = c.y + offsetY;
      if (y < 0) {
        visible = false;
        continue;
      }
      this.set(c.x + offsetX, y, id);
    }
    return visible;
  }

  fullRows(): number[] {
    const rows: number[] = [];
    for (let y = 0; y < this.height; y++) {
      const start = y * this.width;
      if (this.cells.subarray(start, start + this.width).every((v) => v !== 0)) rows.push(y);
    }
    return rows;
  }

  // Removes the given rows and shifts everything above them down in a single pass.
  removeRows(rows: readonly number[]): void {
    if (rows.length === 0) return;
    const remove = new Set(rows);
    let write = this.height - 1;
    for (let read = this.height - 1; read >= 0; read--) {
      if (remove.has(read)) continue;
      if (write !== read) {
        this.cells.copyWithin(write * this.width, read * this.width, (read + 1) * this.width);
      }
      write--;
    }
    this.cells.fill(0, 0, (write + 1) * this.width);
  }

  // Lowest y the cells can reach by falling straight down from startY.
  dropDistance(cells: readonly Cell[], x: number, startY: number): number {
    let distance = 0;
    while (!this.collides(cells, x, startY + distance + 1)) distance++;
    return distance;
  }
}
