import { describe, expect, it } from "vitest";
import { LETTER_ROWS, PIN_ROWS, rowsFor } from "./layouts";
import { physicalKeyToAction, specialAction } from "./useKeyboard";
import { INITIAL_STATE } from "./reducer";

describe("layouts", () => {
  it("includes every letter on the qwerty letter layer", () => {
    const letters = LETTER_ROWS.flat()
      .filter((key) => key.kind === "char")
      .map((key) => key.primary)
      .join("");
    expect(letters).toBe("qwertyuiopasdfghjklzxcvbnm");
  });

  it("returns a 3x3 PIN pad plus zero, clear, delete, and enter", () => {
    const ids = PIN_ROWS.flat().map((key) => key.id);
    expect(ids).toEqual([
      "char-1",
      "char-2",
      "char-3",
      "char-4",
      "char-5",
      "char-6",
      "char-7",
      "char-8",
      "char-9",
      "clear",
      "char-0",
      "backspace",
      "enter",
    ]);
  });

  it("switches qwerty layers without changing PIN rows", () => {
    expect(rowsFor("pin", "symbols")).toBe(PIN_ROWS);
    expect(rowsFor("qwerty", "numbers")[0][0]).toMatchObject({ primary: "1" });
  });
});

describe("key mapping", () => {
  it("maps special keys to reducer actions exhaustively", () => {
    expect(specialAction("shift")).toEqual({ type: "toggleShift" });
    expect(specialAction("caps")).toEqual({ type: "toggleCaps" });
    expect(specialAction("backspace")).toEqual({ type: "backspace" });
    expect(specialAction("enter")).toEqual({ type: "enter" });
    expect(specialAction("space")).toEqual({ type: "space" });
    expect(specialAction("tab")).toEqual({ type: "tab" });
    expect(specialAction("layer-letters")).toEqual({ type: "setLayer", layer: "letters" });
    expect(specialAction("layer-numbers")).toEqual({ type: "setLayer", layer: "numbers" });
    expect(specialAction("layer-symbols")).toEqual({ type: "setLayer", layer: "symbols" });
    expect(specialAction("mode-qwerty")).toEqual({ type: "setMode", mode: "qwerty" });
    expect(specialAction("mode-pin")).toEqual({ type: "setMode", mode: "pin" });
    expect(specialAction("clear")).toEqual({ type: "clear" });
  });

  it("maps physical keys, ignoring modifiers held with meta/ctrl", () => {
    const backspace = new KeyboardEvent("keydown", { key: "Backspace" });
    expect(physicalKeyToAction(backspace, INITIAL_STATE)).toEqual({ type: "backspace" });

    const letter = new KeyboardEvent("keydown", { key: "A" });
    expect(physicalKeyToAction(letter, INITIAL_STATE)).toEqual({ type: "insert", char: "A" });

    const shortcut = new KeyboardEvent("keydown", { key: "a", metaKey: true });
    expect(physicalKeyToAction(shortcut, INITIAL_STATE)).toBeNull();

    const shift = new KeyboardEvent("keydown", { key: "Shift" });
    expect(physicalKeyToAction(shift, INITIAL_STATE)).toBeNull();
  });
});
