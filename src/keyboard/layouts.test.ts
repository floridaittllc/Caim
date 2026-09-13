import { describe, expect, it } from "vitest";
import { FULL_ROWS, NUMBER_ROW_SHIFT, PIN_ROWS, rowsFor } from "./layouts";
import { physicalKeyToAction, specialAction } from "./useKeyboard";
import { INITIAL_STATE } from "./reducer";
import type { SpecialKeyId } from "./types";

function charPrimaries(rows: typeof FULL_ROWS): string {
  return rows
    .flat()
    .filter((key) => key.kind === "char")
    .map((key) => key.primary)
    .join("");
}

function specialIds(rows: typeof FULL_ROWS): SpecialKeyId[] {
  return rows
    .flat()
    .filter((key) => key.kind === "special")
    .map((key) => key.id);
}

describe("layouts", () => {
  it("exposes a hardware number row with shifted punctuation always visible", () => {
    const numberRow = FULL_ROWS[0].filter((key) => key.kind === "char");
    expect(numberRow.map((key) => [key.primary, key.shifted])).toEqual([...NUMBER_ROW_SHIFT]);
  });

  it("puts letters and row punctuation on a single board", () => {
    const letters = charPrimaries(FULL_ROWS);
    for (const glyph of "qwertyuiopasdfghjklzxcvbnm") {
      expect(letters).toContain(glyph);
    }
    expect(letters).toContain(",");
    expect(letters).toContain(".");
    expect(letters).toContain("/");
    expect(letters).toContain(";");
    expect(letters).toContain("'");
    expect(letters).toContain("[");
    expect(letters).toContain("]");
    expect(letters).toContain("\\");
  });

  it("includes hardware modifiers, enter, tab, caps, and a nav cluster", () => {
    const ids = specialIds(FULL_ROWS);
    expect(ids).toEqual(expect.arrayContaining([
      "escape",
      "tab",
      "caps",
      "shift-left",
      "shift-right",
      "ctrl-left",
      "ctrl-right",
      "alt-left",
      "alt-right",
      "meta-left",
      "meta-right",
      "enter",
      "backspace",
      "left",
      "right",
      "up",
      "down",
      "home",
      "end",
    ]));
    const labels = FULL_ROWS.flat().map((key) => (key.kind === "special" ? key.label : key.primary));
    expect(labels).not.toContain("123");
    expect(labels).not.toContain("#+=");
    expect(labels).not.toContain("ABC");
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

  it("switches between the full board and PIN without layer rows", () => {
    expect(rowsFor("pin")).toBe(PIN_ROWS);
    expect(rowsFor("qwerty")).toBe(FULL_ROWS);
    expect(rowsFor("qwerty")[0].some((key) => key.kind === "char" && key.primary === "1")).toBe(true);
  });
});

describe("key mapping", () => {
  it("maps special keys to reducer actions exhaustively", () => {
    expect(specialAction("shift-left")).toEqual({ type: "toggleShift" });
    expect(specialAction("shift-right")).toEqual({ type: "toggleShift" });
    expect(specialAction("caps")).toEqual({ type: "toggleCaps" });
    expect(specialAction("backspace")).toEqual({ type: "backspace" });
    expect(specialAction("enter")).toEqual({ type: "enter" });
    expect(specialAction("space")).toEqual({ type: "space" });
    expect(specialAction("tab")).toEqual({ type: "tab" });
    expect(specialAction("escape")).toEqual({ type: "releaseModifiers" });
    expect(specialAction("left")).toEqual({ type: "nudge", delta: -1 });
    expect(specialAction("right")).toEqual({ type: "nudge", delta: 1 });
    expect(specialAction("up")).toEqual({ type: "nudgeLine", delta: -1 });
    expect(specialAction("down")).toEqual({ type: "nudgeLine", delta: 1 });
    expect(specialAction("home")).toEqual({ type: "jump", to: "start" });
    expect(specialAction("end")).toEqual({ type: "jump", to: "end" });
    expect(specialAction("ctrl-left")).toEqual({ type: "toggleModifier", modifier: "ctrl" });
    expect(specialAction("ctrl-right")).toEqual({ type: "toggleModifier", modifier: "ctrl" });
    expect(specialAction("alt-left")).toEqual({ type: "toggleModifier", modifier: "alt" });
    expect(specialAction("alt-right")).toEqual({ type: "toggleModifier", modifier: "alt" });
    expect(specialAction("meta-left")).toEqual({ type: "toggleModifier", modifier: "meta" });
    expect(specialAction("meta-right")).toEqual({ type: "toggleModifier", modifier: "meta" });
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

    const caps = new KeyboardEvent("keydown", { key: "CapsLock" });
    expect(physicalKeyToAction(caps, INITIAL_STATE)).toEqual({ type: "toggleCaps" });

    const undo = new KeyboardEvent("keydown", { key: "z", ctrlKey: true });
    expect(physicalKeyToAction(undo, INITIAL_STATE)).toEqual({ type: "undo" });

    const home = new KeyboardEvent("keydown", { key: "Home" });
    expect(physicalKeyToAction(home, INITIAL_STATE)).toEqual({ type: "jump", to: "start" });

    const end = new KeyboardEvent("keydown", { key: "End" });
    expect(physicalKeyToAction(end, INITIAL_STATE)).toEqual({ type: "jump", to: "end" });

    const up = new KeyboardEvent("keydown", { key: "ArrowUp" });
    expect(physicalKeyToAction(up, INITIAL_STATE)).toEqual({ type: "nudgeLine", delta: -1 });

    const escape = new KeyboardEvent("keydown", { key: "Escape" });
    expect(physicalKeyToAction(escape, INITIAL_STATE)).toBeNull();
    expect(physicalKeyToAction(escape, { ...INITIAL_STATE, shift: true })).toEqual({ type: "releaseModifiers" });
  });
});
