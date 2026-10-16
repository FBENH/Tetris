import { BOARD_HEIGHT, BOARD_WIDTH } from "../core/board";
import { planPlacement, type Placement } from "../core/bot";
import { Game } from "../core/game";
import { Renderer } from "./renderer";
import type { Settings } from "./settings";

const ACTION_MS = 90; // time between the bot's key presses
const DROP_PAUSE_MS = 180; // short wait in place before the hard drop
const RESTART_MS = 2000; // after a game over
const MAX_FRAME_MS = 100;

// A game played by the bot, drawn behind the main menu. Silent and input-free.
export class Demo {
  private game = new Game();
  private readonly renderer: Renderer;
  private plan: Placement | null = null;
  private timer = 0;
  private frameId = 0;
  private lastFrame = 0;

  constructor(canvas: HTMLCanvasElement, colors: Settings) {
    this.renderer = new Renderer({
      board: canvas,
      colors,
      boardWidth: BOARD_WIDTH,
      boardHeight: BOARD_HEIGHT,
      blocksPerScreen: 22,
    });
  }

  start(): void {
    cancelAnimationFrame(this.frameId);
    this.lastFrame = performance.now();
    this.frameId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    cancelAnimationFrame(this.frameId);
  }

  setColors(colors: Settings): void {
    this.renderer.setColors(colors);
  }

  resize(): void {
    this.renderer.resize();
  }

  private frame = (time: number): void => {
    const dt = Math.min(time - this.lastFrame, MAX_FRAME_MS);
    this.lastFrame = time;
    this.step(dt);
    this.renderer.render(this.game);
    this.frameId = requestAnimationFrame(this.frame);
  };

  private step(dt: number): void {
    const game = this.game;
    this.timer += dt;

    if (game.phase === "over") {
      if (this.timer >= RESTART_MS) this.reset();
      return;
    }

    if (game.phase === "playing") {
      this.plan ??= planPlacement(game.board, game.active.type);
      if (this.timer >= ACTION_MS) this.act();
    }
    game.update(dt);
  }

  // One key press towards the planned placement: rotate, then slide, then drop.
  private act(): void {
    const game = this.game;
    const plan = this.plan;
    if (!plan) {
      game.hardDrop();
      this.timer = 0;
      return;
    }
    if (game.active.rotation !== plan.rotation && game.rotate(1)) {
      this.timer = 0;
    } else if (game.active.x < plan.x && game.moveRight()) {
      this.timer = 0;
    } else if (game.active.x > plan.x && game.moveLeft()) {
      this.timer = 0;
    } else if (this.timer >= DROP_PAUSE_MS) {
      game.hardDrop();
      this.plan = null;
      this.timer = 0;
    }
  }

  private reset(): void {
    this.game = new Game();
    this.plan = null;
    this.timer = 0;
  }
}
