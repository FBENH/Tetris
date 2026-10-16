import type { Game } from "../core/game";
import { PIECE_COLORS, pieceFromId, ROTATIONS, type Cell, type PieceType } from "../core/pieces";
import type { Settings } from "./settings";

const LINE = 0.05; // border thickness, in blocks
const SIDE_WIDTH = 6; // hold / next panels are 6 blocks wide
const NEXT_SLOT_HEIGHT = 6;
const CLEAR_COLOR = "gray";

interface Surface {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number; // in blocks
  height: number;
}

function surface(canvas: HTMLCanvasElement, width: number, height: number): Surface {
  return { canvas, ctx: canvas.getContext("2d")!, width, height };
}

// Draws in "block" units: 1 unit = one cell of the board.
export class Renderer {
  private readonly board: Surface;
  private readonly hold: Surface;
  private readonly next: Surface;
  private readonly gridLayer = document.createElement("canvas");
  private colors: Settings;
  private sidePanelsKey = "";

  constructor(
    boardCanvas: HTMLCanvasElement,
    holdCanvas: HTMLCanvasElement,
    nextCanvas: HTMLCanvasElement,
    colors: Settings,
    boardWidth: number,
    boardHeight: number,
  ) {
    this.board = surface(boardCanvas, boardWidth, boardHeight);
    this.hold = surface(holdCanvas, SIDE_WIDTH, SIDE_WIDTH);
    this.next = surface(nextCanvas, SIDE_WIDTH, NEXT_SLOT_HEIGHT * 3);
    this.colors = colors;
    this.resize();
  }

  setColors(colors: Settings): void {
    this.colors = colors;
    this.resize();
  }

  // Block size follows the window height, as in the original game.
  resize(): void {
    const blockSize = Math.max(12, Math.floor(window.innerHeight / 30));
    const dpr = window.devicePixelRatio || 1;
    for (const s of [this.board, this.hold, this.next]) {
      s.canvas.style.width = `${s.width * blockSize}px`;
      s.canvas.style.height = `${s.height * blockSize}px`;
      s.canvas.width = Math.round(s.width * blockSize * dpr);
      s.canvas.height = Math.round(s.height * blockSize * dpr);
      s.ctx.setTransform(blockSize * dpr, 0, 0, blockSize * dpr, 0, 0);
    }
    this.buildGridLayer();
    this.sidePanelsKey = "";
  }

  render(game: Game): void {
    this.drawBoard(game);
    this.drawSidePanels(game);
  }

  // Background and grid never change during a game, so they are drawn once to an
  // offscreen canvas and copied each frame instead of issuing ~30 fillRects.
  private buildGridLayer(): void {
    const { canvas, width, height } = this.board;
    this.gridLayer.width = canvas.width;
    this.gridLayer.height = canvas.height;
    const ctx = this.gridLayer.getContext("2d")!;
    const scale = canvas.width / width;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = this.colors.background;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = this.colors.grid;
    for (let x = 0; x < width; x++) ctx.fillRect(x, 0, LINE, height);
    for (let y = 0; y < height; y++) ctx.fillRect(0, y, width, LINE);
  }

  private drawBoard(game: Game): void {
    const { ctx } = this.board;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.gridLayer, 0, 0);
    ctx.restore();

    const { board } = game;
    const clearing = new Map<number, number>(); // row -> gray cells painted so far
    game.clearingRows.forEach((row, i) => {
      clearing.set(row, Math.max(0, Math.min(board.width, game.clearProgress - i * board.width)));
    });

    for (let y = 0; y < board.height; y++) {
      const gray = clearing.get(y) ?? 0;
      for (let x = 0; x < board.width; x++) {
        const id = board.get(x, y);
        if (!id) continue;
        const color = x < gray ? CLEAR_COLOR : PIECE_COLORS[pieceFromId(id)];
        this.block(ctx, x, y, color, this.colors.background);
      }
    }

    if (game.phase === "playing" || game.phase === "dropping") {
      const { type, x, y } = game.active;
      const cells = game.cells;
      const color = PIECE_COLORS[type];
      for (const c of cells) this.outline(ctx, c.x + x, c.y + game.ghostY, color);
      const drawY = game.phase === "dropping" ? y + Math.floor(game.dropProgress) : y;
      for (const c of cells) {
        if (c.y + drawY >= 0) this.block(ctx, c.x + x, c.y + drawY, color, this.colors.border);
      }
    }
  }

  // The hold and next panels only change when a piece is used, so redraw them only then.
  private drawSidePanels(game: Game): void {
    const next = game.next;
    const key = `${game.hold}|${game.holdUsed}|${next.join("")}`;
    if (key === this.sidePanelsKey) return;
    this.sidePanelsKey = key;

    this.clearPanel(this.hold);
    if (game.hold) {
      this.hold.ctx.globalAlpha = game.holdUsed ? 0.4 : 1;
      this.panelPiece(this.hold.ctx, game.hold, SIDE_WIDTH / 2);
      this.hold.ctx.globalAlpha = 1;
    }

    this.clearPanel(this.next);
    next.forEach((type, i) => this.panelPiece(this.next.ctx, type, NEXT_SLOT_HEIGHT * i + NEXT_SLOT_HEIGHT / 2));
  }

  private clearPanel({ ctx, width, height }: Surface): void {
    ctx.fillStyle = this.colors.background;
    ctx.fillRect(0, 0, width, height);
  }

  // Draws a piece centred horizontally in the panel and vertically on centerY.
  private panelPiece(ctx: CanvasRenderingContext2D, type: PieceType, centerY: number): void {
    const cells: readonly Cell[] = ROTATIONS[type][0];
    const xs = cells.map((c) => c.x);
    const ys = cells.map((c) => c.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const w = Math.max(...xs) - minX + 1;
    const h = Math.max(...ys) - minY + 1;
    const ox = (SIDE_WIDTH - w) / 2 - minX;
    const oy = centerY - h / 2 - minY;
    for (const c of cells) this.block(ctx, c.x + ox, c.y + oy, PIECE_COLORS[type], this.colors.border);
  }

  private block(ctx: CanvasRenderingContext2D, x: number, y: number, fill: string, edge: string): void {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, 1, 1);
    this.outline(ctx, x, y, edge);
  }

  private outline(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, LINE);
    ctx.fillRect(x, y + 1 - LINE, 1, LINE);
    ctx.fillRect(x, y, LINE, 1);
    ctx.fillRect(x + 1 - LINE, y, LINE, 1);
  }
}
