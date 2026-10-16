import { describe, expect, it } from "vitest";
import {
  CLEAR_ANIMATION_MS_PER_CELL,
  Game,
  gravityInterval,
  LOCK_DELAY_MS,
  MAX_LOCK_RESETS,
  type GameEvent,
} from "../src/core/game";
import type { PieceType } from "../src/core/pieces";

function newGame() {
  const events: GameEvent[] = [];
  const game = new Game(undefined, (e) => events.push(e));
  return { game, events };
}

function place(game: Game, type: PieceType, x: number, y: number) {
  game.active = { type, rotation: 0, x, y };
}

function fillRow(game: Game, y: number, except: number[] = []) {
  for (let x = 0; x < game.board.width; x++) if (!except.includes(x)) game.board.set(x, y, 1);
}

// Runs the game in small steps, like the real frame loop does.
function run(game: Game, ms: number, step = 16) {
  for (let t = 0; t < ms; t += step) game.update(Math.min(step, ms - t));
}

describe("Game", () => {
  it("spawns pieces centred on the top row", () => {
    const { game } = newGame();
    const cells = game.cells.map((c) => ({ x: c.x + game.active.x, y: c.y + game.active.y }));
    expect(Math.min(...cells.map((c) => c.y))).toBe(0);
    const xs = cells.map((c) => c.x);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(3);
    expect(Math.max(...xs)).toBeLessThanOrEqual(6);
  });

  it("falls one row per gravity interval", () => {
    const { game } = newGame();
    place(game, "T", 3, 0);
    run(game, gravityInterval(1) - 20);
    expect(game.active.y).toBe(0);
    run(game, 40);
    expect(game.active.y).toBe(1);
  });

  it("waits for the lock delay before locking a grounded piece", () => {
    const { game } = newGame();
    place(game, "O", 4, 18);
    run(game, LOCK_DELAY_MS - 20);
    expect(game.board.get(4, 19)).toBe(0);
    run(game, 40);
    expect(game.board.get(4, 19)).not.toBe(0);
  });

  it("moving a grounded piece resets the lock delay, but only a limited number of times", () => {
    const { game } = newGame();
    place(game, "O", 4, 18);
    let moves = 0;
    while (game.board.get(0, 19) === 0 && game.board.get(9, 19) === 0 && moves < 100) {
      run(game, LOCK_DELAY_MS - 50);
      if (game.active.y !== 18) break;
      if (moves % 2 === 0) game.moveLeft();
      else game.moveRight();
      moves++;
    }
    // The last move no longer buys time, so the piece locks right after it.
    expect(moves).toBe(MAX_LOCK_RESETS + 1);
  });

  it("hard drop animates, scores two points per row and then locks", () => {
    const { game, events } = newGame();
    place(game, "O", 4, 0);
    game.hardDrop();
    expect(game.phase).toBe("dropping");
    expect(game.score).toBe(36);

    // Input is ignored while the piece is falling.
    expect(game.moveLeft()).toBe(false);
    run(game, 18 * 8 + 16);
    expect(game.board.get(4, 19)).not.toBe(0);
    expect(game.board.get(5, 18)).not.toBe(0);
    expect(events.filter((e) => e.type === "lock")).toHaveLength(1);
    expect(game.phase).toBe("playing");
  });

  it("clears lines after the animation and only then spawns the next piece", () => {
    const { game, events } = newGame();
    for (let y = 16; y < 20; y++) fillRow(game, y, [9]);
    game.board.set(0, 15, 2);
    place(game, "I", 6, 0);
    game.rotate(1); // vertical I occupies column 8 in this state
    game.active.x += 1;
    game.hardDrop();
    run(game, 300);

    expect(game.phase).toBe("clearing");
    const clear = events.find((e) => e.type === "clear");
    expect(clear).toEqual({ type: "clear", lines: 4, points: 800 });
    expect(game.lines).toBe(4);

    run(game, 4 * 10 * CLEAR_ANIMATION_MS_PER_CELL + 16);
    expect(game.phase).toBe("playing");
    // Everything above fell four rows; the stray block lands on the floor.
    expect(game.board.get(0, 19)).toBe(2);
    expect(game.board.fullRows()).toEqual([]);
    // The new piece does not overlap anything.
    expect(game.board.collides(game.cells, game.active.x, game.active.y)).toBe(false);
  });

  it("levels up every ten lines and scores by level", () => {
    const { game } = newGame();
    game.lines = 9;
    fillRow(game, 19, [4, 5]);
    place(game, "O", 4, 0);
    game.hardDrop();
    run(game, 400);
    expect(game.lines).toBe(10);
    expect(game.level).toBe(2);
  });

  it("kicks a T piece off the wall when rotating", () => {
    const { game } = newGame();
    place(game, "T", 0, 5);
    expect(game.rotate(1)).toBe(true); // vertical, flat side against the left wall
    game.active.x = -1;
    expect(game.board.collides(game.cells, game.active.x, game.active.y)).toBe(false);
    // Back to spawn state: it doesn't fit in place, the kick pushes it one column right.
    expect(game.rotate(-1)).toBe(true);
    expect(game.active).toMatchObject({ rotation: 0, x: 0 });
  });

  it("rotates an I piece standing against the right wall", () => {
    const { game } = newGame();
    place(game, "I", 6, 5);
    game.rotate(1);
    while (game.moveRight());
    expect(game.rotate(1)).toBe(true);
    expect(game.board.collides(game.cells, game.active.x, game.active.y)).toBe(false);
  });

  it("refuses a rotation when every kick collides", () => {
    const { game } = newGame();
    for (let y = 2; y < 20; y++) fillRow(game, y, [4]);
    game.active = { type: "I", rotation: 1, x: 2, y: 16 }; // vertical I inside a one-wide well
    expect(game.board.collides(game.cells, 2, 16)).toBe(false);
    expect(game.rotate(1)).toBe(false);
    expect(game.rotate(-1)).toBe(false);
    expect(game.active).toMatchObject({ rotation: 1, x: 2, y: 16 });
  });

  it("holds once per piece and brings back the held piece in spawn orientation", () => {
    const { game } = newGame();
    place(game, "T", 3, 4);
    game.rotate(1);
    expect(game.holdPiece()).toBe(true);
    expect(game.hold).toBe("T");
    expect(game.holdPiece()).toBe(false);

    game.hardDrop();
    run(game, 400);
    expect(game.holdPiece()).toBe(true);
    expect(game.active.type).toBe("T");
    expect(game.active.rotation).toBe(0);
  });

  it("ends the game when a new piece can't spawn", () => {
    const { game, events } = newGame();
    for (let y = 1; y < 20; y++) fillRow(game, y, [0]);
    place(game, "O", 4, 0);
    game.hardDrop();
    run(game, 50);
    expect(game.phase).toBe("over");
    expect(events.at(-1)).toEqual({ type: "gameOver" });
  });
});
