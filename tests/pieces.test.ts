import { describe, expect, it } from "vitest";
import { PIECE_TYPES, ROTATIONS } from "../src/core/pieces";
import { PieceBag } from "../src/core/randomizer";

describe("pieces", () => {
  it("every rotation state has exactly four cells", () => {
    for (const type of PIECE_TYPES) {
      expect(ROTATIONS[type]).toHaveLength(4);
      for (const state of ROTATIONS[type]) expect(state).toHaveLength(4);
    }
  });

  it("has four distinct rotation states (one for O)", () => {
    const sort = (cells: { x: number; y: number }[]) =>
      [...cells].sort((a, b) => a.y - b.y || a.x - b.x);
    for (const type of PIECE_TYPES) {
      expect(new Set(ROTATIONS[type].map((s) => JSON.stringify(sort([...s])))).size).toBe(
        type === "O" ? 1 : 4,
      );
    }
  });
});

describe("PieceBag", () => {
  it("deals each piece once per group of seven", () => {
    const bag = new PieceBag();
    for (let round = 0; round < 20; round++) {
      const group = Array.from({ length: 7 }, () => bag.next());
      expect(new Set(group).size).toBe(7);
    }
  });

  it("peek shows what next() will return", () => {
    const bag = new PieceBag();
    const preview = bag.peek(10);
    expect(Array.from({ length: 10 }, () => bag.next())).toEqual(preview);
  });
});
