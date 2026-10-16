import { describe, expect, it } from "vitest";
import { bindKey, clearSecondKey, DEFAULT_CONTROLS, keyLabel, keyMap } from "../src/ui/controls";

describe("controls", () => {
  it("maps every default key to its action", () => {
    const map = keyMap({ ...DEFAULT_CONTROLS });
    expect(map.get("ArrowLeft")).toBe("left");
    expect(map.get("KeyX")).toBe("rotateRight");
    expect(map.get("Escape")).toBe("pause");
  });

  it("binds a free key", () => {
    const controls = bindKey({ ...DEFAULT_CONTROLS }, "left", 0, "KeyA");
    expect(controls.left).toEqual(["KeyA"]);
    expect(keyMap(controls).get("ArrowLeft")).toBeUndefined();
  });

  it("swaps when the key already belongs to another action", () => {
    const controls = bindKey({ ...DEFAULT_CONTROLS }, "left", 0, "ArrowRight");
    expect(controls.left[0]).toBe("ArrowRight");
    expect(controls.right[0]).toBe("ArrowLeft");
  });

  it("promotes the second key when the main key is taken without a swap", () => {
    const controls = bindKey({ ...DEFAULT_CONTROLS }, "softDrop", 1, "KeyC");
    expect(controls.softDrop).toEqual(["ArrowDown", "KeyC"]);
    expect(controls.hold).toEqual(["ShiftLeft", undefined]);
  });

  it("swaps the two keys of the same action", () => {
    const controls = bindKey({ ...DEFAULT_CONTROLS }, "rotateRight", 1, "ArrowUp");
    expect(controls.rotateRight).toEqual(["KeyX", "ArrowUp"]);
  });

  it("clears the second key", () => {
    expect(clearSecondKey({ ...DEFAULT_CONTROLS }, "hold").hold).toEqual(["KeyC", undefined]);
  });

  it("does not mutate the defaults", () => {
    bindKey(DEFAULT_CONTROLS as never, "left", 0, "KeyA");
    expect(DEFAULT_CONTROLS.left).toEqual(["ArrowLeft"]);
  });

  it("labels keys for display", () => {
    expect(keyLabel("KeyZ")).toBe("Z");
    expect(keyLabel("ArrowUp")).toBe("↑");
    expect(keyLabel("Digit3")).toBe("3");
    expect(keyLabel("Escape")).toBe("Esc");
  });
});
