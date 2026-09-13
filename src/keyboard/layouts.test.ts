import { describe, expect, it } from "vitest";
import { LETTER_ROWS, NUMBER_ROWS, PIN_ROWS, rowsFor } from "./layouts";
import { physicalKeyToAction, specialAction } from "./useKeyboard";
import { INITIAL_STATE } from "./reducer";

function charPrimaries(rows: typeof LETTER_ROWS): string {
  return rows
    .flat()
    .filter((key) => key.kind === "char")
    .map((key) => key.primary)
    .join("");
}

describe("layouts", () => {
  it("includes every letter plus comma and period on the letter layer", () => {
    const letters = charPrimaries(LETTER_ROWS);
    expect(letters).toContain("qwertyuiopasdfghjklzxcvbnm");
    expect(letters).toContain(",");
    expect(letters).toContain(".");
  });

  it("keeps tab on the numbers layer with home and end", () => {
    const ids = NUMBER_ROWS.flat()
      .filter((key) => key.kind === "special")
      .map((key) => key.id);
    expect(ids).toContain("tab");
    expect(ids).toContain("home");
    expect(ids).toContain("end");
    expect(ids).toContain("shift");
  });

  it("maps number keys to shifted punctuation", () => {
    const top = NUMBER_ROWS[0];
    expect(top[0]).toMatchObject({ primary: "1", shifted: "!" });
    expect(top[1]).toMatchObject({ primary: "2", shifted: "@" });
    expect(top[9]).toMatchObject({ primary: "0", shifted: ")" });
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
    expect(specialAction("left")).toEqual({ type: "nudge", delta: -1 });
    expect(specialAction("right")).toEqual({ type: "nudge", delta: 1 });
    expect(specialAction("home")).toEqual({ type: "jump", to: "start" });
    expect(specialAction("end")).toEqual({ type: "jump", to: "end" });
    expect(specialAction("layer-letters")).toEqual({ type: "setLayer", layer: "letters" });
    expect(specialAction("layer-numbers")).toEqual({ type: "setLayer", layer: "numbers" });
    expect(specialAction("layer-symbols")).toEqual({ type: "setLayer", layer: "symbols" });
    expect(specialAction("mode-qwerty")).toEqual({ type: "setMode", mode: "qwerty" });
    expect(specialAction("mode-pin")).toEqual({ type: "setMode", mode: "pin" });
    expect(specialAction("clear")).toEqual({ type: "clear" });
  });

  it("maps physical keys, ignoring modifiers held with meta/ctrl except undo", () => {
    const backspace = new KeyboardEvent("keydown", { key: "Backspace" });
    expect(physicalKeyToAction(backspace, INITIAL_STATE)).toEqual({ type: "backspace" });

    const letter = new KeyboardEvent("keydown", { key: "A" });
    expect(physicalKeyToAction(letter, INITIAL_STATE)).toEqual({ type: "insert", char: "A" });

    const shortcut = new KeyboardEvent("keydown", { key: "a", metaKey: true });
    expect(physicalKeyToAction(shortcut, INITIAL_STATE)).toBeNull();

    const shift = new KeyboardEvent("keydown", { key: "Shift" });
    expect(physicalKeyToAction(shift, INITIAL_STATE)).toBeNull();

    const undo = new KeyboardEvent("keydown", { key: "z", ctrlKey: true });
    expect(physicalKeyToAction(undo, INITIAL_STATE)).toEqual({ type: "undo" });

    const home = new KeyboardEvent("keydown", { key: "Home" });
    expect(physicalKeyToAction(home, INITIAL_STATE)).toEqual({ type: "jump", to: "start" });

    const end = new KeyboardEvent("keydown", { key: "End" });
    expect(physicalKeyToAction(end, INITIAL_STATE)).toEqual({ type: "jump", to: "end" });
  });
});
