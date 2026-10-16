import { describe, expect, it } from "vitest";
import { Board } from "../src/core/board";
import { ROTATIONS } from "../src/core/pieces";

function fillRow(board: Board, y: number, except: number[] = []) {
  for (let x = 0; x < board.width; x++) if (!except.includes(x)) board.set(x, y, 1);
}

describe("Board", () => {
  it("treats walls and floor as blocked and the hidden area above as free", () => {
    const board = new Board();
    expect(board.isBlocked(-1, 5)).toBe(true);
    expect(board.isBlocked(10, 5)).toBe(true);
    expect(board.isBlocked(3, 20)).toBe(true);
    expect(board.isBlocked(3, -2)).toBe(false);
    expect(board.isBlocked(3, 5)).toBe(false);
  });

  it("detects collisions against placed blocks", () => {
    const board = new Board();
    board.set(4, 10, 1);
    const o = ROTATIONS.O[0];
    expect(board.collides(o, 3, 9)).toBe(true);
    expect(board.collides(o, 5, 9)).toBe(false);
  });

  it("finds full rows and removes them, shifting the rest down", () => {
    const board = new Board();
    fillRow(board, 19);
    fillRow(board, 18, [0]);
    fillRow(board, 17);
    board.set(2, 16, 3);

    expect(board.fullRows()).toEqual([17, 19]);
    board.removeRows([17, 19]);

    // Row 18 (with a gap at x=0) falls to 19, the lone block at 16 falls to 18.
    expect(board.get(0, 19)).toBe(0);
    expect(board.get(1, 19)).toBe(1);
    expect(board.get(2, 18)).toBe(3);
    expect(board.fullRows()).toEqual([]);
    expect(board.cells.slice(0, 18 * 10).every((v) => v === 0)).toBe(true);
  });

  it("reports how far a piece can fall", () => {
    const board = new Board();
    board.set(4, 15, 1);
    const o = ROTATIONS.O[0];
    expect(board.dropDistance(o, 4, 0)).toBe(13); // lands on top of the block at y=15
    expect(board.dropDistance(o, 0, 0)).toBe(18); // lands on the floor
  });

  it("merge reports when a piece locks above the visible area", () => {
    const board = new Board();
    expect(board.merge(ROTATIONS.O[0], 4, -1, 1)).toBe(false);
    expect(board.get(4, 0)).toBe(1);
  });
});
