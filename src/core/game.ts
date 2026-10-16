import { Board } from "./board";
import { getKicks, pieceId, pieceSize, ROTATIONS, type Cell, type PieceType, type Rotation } from "./pieces";
import { PieceBag, type Rng } from "./randomizer";

export const LOCK_DELAY_MS = 500;
export const MAX_LOCK_RESETS = 15;
export const DROP_ANIMATION_MS_PER_ROW = 8;
export const CLEAR_ANIMATION_MS_PER_CELL = 8;
export const NEXT_PREVIEW_COUNT = 3;
export const LINES_PER_LEVEL = 10;

const LINE_POINTS = [0, 100, 300, 500, 800];

export type Phase = "playing" | "dropping" | "clearing" | "over";

export interface ActivePiece {
  type: PieceType;
  rotation: Rotation;
  x: number;
  y: number;
}

export type GameEvent =
  | { type: "move" }
  | { type: "rotate" }
  | { type: "hardDrop" }
  | { type: "lock" }
  | { type: "clear"; lines: number; points: number }
  | { type: "hold" }
  | { type: "gameOver" };

// Milliseconds per row at a given level (guideline curve; level 1 = 1 second).
export function gravityInterval(level: number): number {
  return 1000 * Math.pow(0.8 - (level - 1) * 0.007, level - 1);
}

export function linePoints(lines: number, level: number): number {
  return (LINE_POINTS[lines] ?? 0) * level;
}

// Pure game state: no DOM, no timers. The caller drives it with update(dt).
export class Game {
  readonly board = new Board();
  private bag: PieceBag;
  private listener: (event: GameEvent) => void;

  active!: ActivePiece;
  phase: Phase = "playing";
  hold: PieceType | null = null;
  holdUsed = false;
  score = 0;
  lines = 0;
  level = 1;

  // Hard drop animation: rows travelled so far (fractional).
  dropProgress = 0;
  private dropDistance = 0;
  // Line clear animation.
  clearingRows: number[] = [];
  clearProgress = 0; // cells already painted gray

  private gravityTimer = 0;
  private lockTimer = 0;
  private lockResets = 0;
  private lowestY = 0;
  private clearTimer = 0;

  constructor(rng?: Rng, listener: (event: GameEvent) => void = () => {}) {
    this.bag = new PieceBag(rng);
    this.listener = listener;
    this.spawn(this.bag.next());
  }

  get cells(): readonly Cell[] {
    return ROTATIONS[this.active.type][this.active.rotation];
  }

  get next(): PieceType[] {
    return this.bag.peek(NEXT_PREVIEW_COUNT);
  }

  get ghostY(): number {
    return this.active.y + this.board.dropDistance(this.cells, this.active.x, this.active.y);
  }

  get isGrounded(): boolean {
    return this.board.collides(this.cells, this.active.x, this.active.y + 1);
  }

  update(dt: number): void {
    switch (this.phase) {
      case "playing":
        this.applyGravity(dt);
        break;
      case "dropping":
        this.dropProgress = Math.min(this.dropDistance, this.dropProgress + dt / DROP_ANIMATION_MS_PER_ROW);
        if (this.dropProgress >= this.dropDistance) {
          this.active.y += this.dropDistance;
          this.lock();
        }
        break;
      case "clearing": {
        this.clearTimer += dt;
        const total = this.clearingRows.length * this.board.width;
        this.clearProgress = Math.min(total, Math.floor(this.clearTimer / CLEAR_ANIMATION_MS_PER_CELL));
        if (this.clearProgress >= total) {
          this.board.removeRows(this.clearingRows);
          this.clearingRows = [];
          this.spawn(this.bag.next());
        }
        break;
      }
    }
  }

  moveLeft(): boolean {
    return this.shift(-1);
  }

  moveRight(): boolean {
    return this.shift(1);
  }

  softDrop(): boolean {
    if (this.phase !== "playing" || this.isGrounded) return false;
    this.active.y++;
    this.score += 1;
    this.gravityTimer = 0;
    this.trackLowest();
    return true;
  }

  hardDrop(): void {
    if (this.phase !== "playing") return;
    this.dropDistance = this.ghostY - this.active.y;
    this.dropProgress = 0;
    this.score += this.dropDistance * 2;
    this.listener({ type: "hardDrop" });
    if (this.dropDistance === 0) {
      this.lock();
    } else {
      this.phase = "dropping";
    }
  }

  rotate(direction: 1 | -1): boolean {
    if (this.phase !== "playing") return false;
    const { type, rotation, x, y } = this.active;
    const to = ((rotation + direction + 4) % 4) as Rotation;
    const cells = ROTATIONS[type][to];
    for (const kick of getKicks(type, rotation, to)) {
      if (!this.board.collides(cells, x + kick.x, y + kick.y)) {
        this.active = { type, rotation: to, x: x + kick.x, y: y + kick.y };
        this.trackLowest();
        this.resetLockOnMove();
        this.listener({ type: "rotate" });
        return true;
      }
    }
    return false;
  }

  holdPiece(): boolean {
    if (this.phase !== "playing" || this.holdUsed) return false;
    const current = this.active.type;
    const swapped = this.hold;
    this.hold = current;
    this.spawn(swapped ?? this.bag.next());
    this.holdUsed = true;
    this.listener({ type: "hold" });
    return true;
  }

  private shift(dx: number): boolean {
    if (this.phase !== "playing") return false;
    if (this.board.collides(this.cells, this.active.x + dx, this.active.y)) return false;
    this.active.x += dx;
    this.resetLockOnMove();
    this.listener({ type: "move" });
    return true;
  }

  private applyGravity(dt: number): void {
    if (this.isGrounded) {
      this.gravityTimer = 0;
      this.lockTimer += dt;
      if (this.lockTimer >= LOCK_DELAY_MS) this.lock();
      return;
    }
    this.gravityTimer += dt;
    const interval = gravityInterval(this.level);
    while (this.gravityTimer >= interval && !this.isGrounded) {
      this.gravityTimer -= interval;
      this.active.y++;
      this.trackLowest();
    }
  }

  // Moving or rotating a piece that is resting on something gives it more time,
  // up to MAX_LOCK_RESETS times, so it can't be stalled forever.
  private resetLockOnMove(): void {
    if (this.lockResets < MAX_LOCK_RESETS) {
      this.lockTimer = 0;
      this.lockResets++;
    }
  }

  private trackLowest(): void {
    if (this.active.y > this.lowestY) {
      this.lowestY = this.active.y;
      this.lockResets = 0;
      this.lockTimer = 0;
    }
  }

  private lock(): void {
    const { x, y, type } = this.active;
    const visible = this.board.merge(this.cells, x, y, pieceId(type));
    this.holdUsed = false;
    this.listener({ type: "lock" });
    if (!visible) {
      this.endGame();
      return;
    }

    const rows = this.board.fullRows();
    if (rows.length === 0) {
      this.spawn(this.bag.next());
      return;
    }

    const points = linePoints(rows.length, this.level);
    this.score += points;
    this.lines += rows.length;
    this.level = 1 + Math.floor(this.lines / LINES_PER_LEVEL);
    this.clearingRows = rows;
    this.clearProgress = 0;
    this.clearTimer = 0;
    this.phase = "clearing";
    this.listener({ type: "clear", lines: rows.length, points });
  }

  private spawn(type: PieceType): void {
    const size = pieceSize(type);
    const topRow = Math.min(...ROTATIONS[type][0].map((c) => c.y));
    this.active = {
      type,
      rotation: 0,
      x: Math.floor((this.board.width - size) / 2),
      y: -topRow,
    };
    this.phase = "playing";
    this.gravityTimer = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.lowestY = this.active.y;
    if (this.board.collides(this.cells, this.active.x, this.active.y)) this.endGame();
  }

  private endGame(): void {
    this.phase = "over";
    this.listener({ type: "gameOver" });
  }
}
