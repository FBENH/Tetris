export type Action =
  | "left"
  | "right"
  | "softDrop"
  | "hardDrop"
  | "rotateRight"
  | "rotateLeft"
  | "hold"
  | "pause";

export const KEY_BINDINGS: Readonly<Record<string, Action>> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowDown: "softDrop",
  ArrowUp: "rotateRight",
  KeyX: "rotateRight",
  KeyZ: "rotateLeft",
  Space: "hardDrop",
  KeyC: "hold",
  ShiftLeft: "hold",
  Escape: "pause",
  KeyP: "pause",
};

// Auto-repeat timings: wait DAS ms after the first move, then repeat every ARR ms.
const DAS_MS = 170;
const ARR_MS = 50;
const SOFT_DROP_REPEAT_MS = 40;

type Repeatable = "left" | "right" | "softDrop";

interface Held {
  elapsed: number;
  delay: number;
  interval: number;
}

// Handles key repeat itself instead of relying on the OS (which waits ~500 ms
// before repeating), so moving sideways feels immediate and consistent.
export class Input {
  private readonly held = new Map<Repeatable, Held>();
  private readonly onAction: (action: Action) => void;
  // Off while the menu is showing, so keys like Space keep working on buttons.
  enabled = false;

  constructor(onAction: (action: Action) => void) {
    this.onAction = onAction;
    window.addEventListener("keydown", this.keyDown);
    window.addEventListener("keyup", this.keyUp);
    window.addEventListener("blur", this.reset);
  }

  reset = (): void => {
    this.held.clear();
  };

  update(dt: number): void {
    for (const [action, state] of this.held) {
      state.elapsed += dt;
      while (state.elapsed >= state.delay) {
        state.elapsed -= state.delay;
        state.delay = state.interval;
        this.onAction(action);
      }
    }
  }

  private keyDown = (e: KeyboardEvent): void => {
    const action = KEY_BINDINGS[e.code];
    if (!action || !this.enabled) return;
    e.preventDefault();
    if (e.repeat) return;

    if (action === "left" || action === "right") {
      // Pressing the opposite direction takes over.
      this.held.delete(action === "left" ? "right" : "left");
      this.held.set(action, { elapsed: 0, delay: DAS_MS, interval: ARR_MS });
    } else if (action === "softDrop") {
      this.held.set(action, { elapsed: 0, delay: SOFT_DROP_REPEAT_MS, interval: SOFT_DROP_REPEAT_MS });
    }
    this.onAction(action);
  };

  private keyUp = (e: KeyboardEvent): void => {
    const action = KEY_BINDINGS[e.code];
    if (action === "left" || action === "right" || action === "softDrop") this.held.delete(action);
  };
}
