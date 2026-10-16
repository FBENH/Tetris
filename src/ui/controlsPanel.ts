import { ACTIONS, bindKey, clearSecondKey, keyLabel, type Action, type Controls } from "./controls";

interface Capture {
  action: Action;
  slot: 0 | 1;
}

// The CONTROLS table: click a key, then press the new key for that action.
// Backspace or Delete clears a second key.
export class ControlsPanel {
  private controls: Controls;
  private capture: Capture | null = null;
  private readonly body: HTMLElement;
  private readonly onChange: (controls: Controls) => void;

  constructor(body: HTMLElement, controls: Controls, onChange: (controls: Controls) => void) {
    this.body = body;
    this.controls = controls;
    this.onChange = onChange;
    // Capture phase so the game's own key handling never sees the key being assigned.
    window.addEventListener("keydown", this.keyDown, true);
    this.render();
  }

  set(controls: Controls): void {
    this.controls = controls;
    this.cancel();
    this.render();
  }

  cancel(): void {
    this.capture = null;
    this.render();
  }

  private render(): void {
    this.body.replaceChildren(
      ...ACTIONS.map(({ action, label }) => {
        const row = document.createElement("tr");
        const name = document.createElement("td");
        name.textContent = label;
        const keys = document.createElement("td");
        keys.className = "key-slots";
        keys.append(this.slotButton(action, 0), this.slotButton(action, 1));
        row.append(name, keys);
        return row;
      }),
    );
  }

  private slotButton(action: Action, slot: 0 | 1): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "key-button";
    const code = this.controls[action][slot];
    const waiting = this.capture?.action === action && this.capture.slot === slot;
    button.textContent = waiting ? "PRESS A KEY" : code ? keyLabel(code) : "—";
    button.classList.toggle("waiting", waiting);
    button.classList.toggle("empty", !code && !waiting);
    button.setAttribute("aria-label", `${action} key ${slot + 1}`);
    button.addEventListener("click", () => {
      this.capture = waiting ? null : { action, slot };
      this.render();
    });
    return button;
  }

  private keyDown = (e: KeyboardEvent): void => {
    if (!this.capture) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const { action, slot } = this.capture;
    if (e.code === "Backspace" || e.code === "Delete") {
      if (slot === 1) this.update(clearSecondKey(this.controls, action));
      else this.cancel();
      return;
    }
    this.update(bindKey(this.controls, action, slot, e.code));
  };

  private update(controls: Controls): void {
    this.controls = controls;
    this.capture = null;
    this.render();
    this.onChange(controls);
  }
}
