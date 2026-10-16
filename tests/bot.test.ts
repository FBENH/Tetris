import { describe, expect, it } from "vitest";
import { planPlacement } from "../src/core/bot";
import { Game } from "../src/core/game";

// Deterministic RNG so the test always plays the same pieces.
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
}

describe("demo bot", () => {
  it("keeps playing and clears lines", () => {
    const game = new Game(seeded(42));
    let pieces = 0;
    while (pieces < 200 && game.phase !== "over") {
      if (game.phase === "playing") {
        const plan = planPlacement(game.board, game.active.type);
        expect(plan).not.toBeNull();
        while (game.active.rotation !== plan!.rotation && game.rotate(1));
        while (game.active.x < plan!.x && game.moveRight());
        while (game.active.x > plan!.x && game.moveLeft());
        game.hardDrop();
        pieces++;
      }
      game.update(50);
    }
    expect(game.phase).not.toBe("over");
    expect(game.lines).toBeGreaterThan(60);
  });
});
