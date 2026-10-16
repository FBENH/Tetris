import { PIECE_TYPES, type PieceType } from "./pieces";

export type Rng = () => number;

// "7-bag" randomizer: every group of seven pieces contains each tetromino once,
// which avoids long droughts (e.g. no I piece for 20 turns).
export class PieceBag {
  private readonly queue: PieceType[] = [];
  private readonly rng: Rng;

  constructor(rng: Rng = Math.random) {
    this.rng = rng;
  }

  next(): PieceType {
    this.fill(1);
    return this.queue.shift()!;
  }

  peek(count: number): PieceType[] {
    this.fill(count);
    return this.queue.slice(0, count);
  }

  private fill(count: number): void {
    while (this.queue.length < count) {
      const bag = [...PIECE_TYPES];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      this.queue.push(...bag);
    }
  }
}
