export type Action =
  | "left"
  | "right"
  | "softDrop"
  | "hardDrop"
  | "rotateRight"
  | "rotateLeft"
  | "hold"
  | "pause";

// Each action has a main key and an optional second key (KeyboardEvent.code values).
// The main key is only empty if the player gave it to another action.
export type Controls = Record<Action, [string?, string?]>;

export const ACTIONS: readonly { action: Action; label: string }[] = [
  { action: "left", label: "MOVE LEFT" },
  { action: "right", label: "MOVE RIGHT" },
  { action: "rotateRight", label: "ROTATE RIGHT" },
  { action: "rotateLeft", label: "ROTATE LEFT" },
  { action: "softDrop", label: "SOFT DROP" },
  { action: "hardDrop", label: "HARD DROP" },
  { action: "hold", label: "HOLD PIECE" },
  { action: "pause", label: "PAUSE" },
];

export const DEFAULT_CONTROLS: Readonly<Controls> = {
  left: ["ArrowLeft"],
  right: ["ArrowRight"],
  softDrop: ["ArrowDown"],
  hardDrop: ["Space"],
  rotateRight: ["ArrowUp", "KeyX"],
  rotateLeft: ["KeyZ"],
  hold: ["KeyC", "ShiftLeft"],
  pause: ["Escape", "KeyP"],
};

const CONTROLS_KEY = "controls";

export function cloneControls(controls: Readonly<Controls>): Controls {
  return Object.fromEntries(Object.entries(controls).map(([a, keys]) => [a, [...keys]])) as Controls;
}

export function loadControls(): Controls {
  const controls = cloneControls(DEFAULT_CONTROLS);
  try {
    const saved = JSON.parse(localStorage.getItem(CONTROLS_KEY) ?? "null") as Partial<Controls> | null;
    for (const { action } of ACTIONS) {
      const keys = saved?.[action];
      if (Array.isArray(keys)) controls[action] = [keys[0] || undefined, keys[1] || undefined];
    }
  } catch {
    // fall back to defaults
  }
  return controls;
}

export function saveControls(controls: Controls): void {
  try {
    localStorage.setItem(CONTROLS_KEY, JSON.stringify(controls));
  } catch {
    // ignore
  }
}

// Assigns a key to one slot of an action. A key can only do one thing, so if it
// was bound elsewhere the two bindings swap places.
export function bindKey(controls: Controls, action: Action, slot: 0 | 1, code: string): Controls {
  const next = cloneControls(controls);
  const previous = next[action][slot];
  for (const { action: other } of ACTIONS) {
    const keys = next[other];
    for (const s of [0, 1] as const) {
      if (keys[s] === code && !(other === action && s === slot)) keys[s] = previous;
    }
  }
  next[action][slot] = code;
  for (const { action: other } of ACTIONS) {
    const keys = next[other];
    if (!keys[0] && keys[1]) next[other] = [keys[1], undefined];
    else if (keys[0] === keys[1]) keys[1] = undefined;
  }
  return next;
}

export function clearSecondKey(controls: Controls, action: Action): Controls {
  const next = cloneControls(controls);
  next[action][1] = undefined;
  return next;
}

export function keyMap(controls: Controls): Map<string, Action> {
  const map = new Map<string, Action>();
  for (const { action } of ACTIONS) {
    for (const code of controls[action]) if (code) map.set(code, action);
  }
  return map;
}

const KEY_NAMES: Record<string, string> = {
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
  Space: "Space",
  Escape: "Esc",
  ShiftLeft: "L-Shift",
  ShiftRight: "R-Shift",
  ControlLeft: "L-Ctrl",
  ControlRight: "R-Ctrl",
  AltLeft: "L-Alt",
  AltRight: "R-Alt",
  Enter: "Enter",
  Backspace: "Backspace",
  Tab: "Tab",
};

export function keyLabel(code: string): string {
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `Num ${code.slice(6)}`;
  return code;
}
