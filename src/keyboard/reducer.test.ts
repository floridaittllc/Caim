import { describe, expect, it } from "vitest";
import { INITIAL_STATE, reduceKeyboard } from "./reducer";
import { displayChar, isKeyDisabled, letterIsUppercase, MAX_PIN_LENGTH } from "./types";
import type { CharKeyDef, KeyboardState, SpecialKeyDef } from "./types";

function apply(state: KeyboardState, ...actions: Parameters<typeof reduceKeyboard>[1][]): KeyboardState {
  return actions.reduce((next, action) => reduceKeyboard(next, action), state);
}

const letterQ: CharKeyDef = { kind: "char", id: "char-q", primary: "q" };
const pinEnter: SpecialKeyDef = { kind: "special", id: "enter", label: "enter" };

describe("reduceKeyboard", () => {
  it("inserts characters at the cursor and advances it", () => {
    const next = apply(INITIAL_STATE, { type: "insert", char: "c" }, { type: "insert", char: "a" });
    expect(next.value).toBe("ca");
    expect(next.cursor).toBe(2);
  });

  it("inserts in the middle of existing text", () => {
    const seeded = apply(INITIAL_STATE, { type: "insert", char: "cm" }, { type: "setCursor", cursor: 1 });
    const next = reduceKeyboard(seeded, { type: "insert", char: "a" });
    expect(next.value).toBe("cam");
    expect(next.cursor).toBe(2);
  });

  it("backspaces the character before the cursor", () => {
    const next = apply(
      INITIAL_STATE,
      { type: "insert", char: "cat" },
      { type: "backspace" },
    );
    expect(next.value).toBe("ca");
    expect(next.cursor).toBe(2);
  });

  it("does not backspace at the start of the buffer", () => {
    const next = reduceKeyboard(INITIAL_STATE, { type: "backspace" });
    expect(next).toEqual(INITIAL_STATE);
  });

  it("consumes shift after inserting a character", () => {
    const shifted = reduceKeyboard(INITIAL_STATE, { type: "toggleShift" });
    expect(shifted.shift).toBe(true);
    const next = reduceKeyboard(shifted, { type: "insert", char: "A" });
    expect(next.shift).toBe(false);
    expect(next.value).toBe("A");
  });

  it("consumes shift after punctuation as well as letters", () => {
    const shifted = reduceKeyboard(INITIAL_STATE, { type: "toggleShift" });
    const next = reduceKeyboard(shifted, { type: "insert", char: "!" });
    expect(next.shift).toBe(false);
    expect(next.value).toBe("!");
  });

  it("keeps caps lock on after insert", () => {
    const caps = reduceKeyboard(INITIAL_STATE, { type: "toggleCaps" });
    const next = reduceKeyboard(caps, { type: "insert", char: "A" });
    expect(next.capsLock).toBe(true);
    expect(next.value).toBe("A");
  });

  it("releases latched modifiers without touching caps lock", () => {
    const armed = apply(
      INITIAL_STATE,
      { type: "toggleCaps" },
      { type: "toggleShift" },
      { type: "toggleModifier", modifier: "ctrl" },
    );
    const next = reduceKeyboard(armed, { type: "releaseModifiers" });
    expect(next.shift).toBe(false);
    expect(next.ctrl).toBe(false);
    expect(next.capsLock).toBe(true);
  });

  it("toggles ctrl, alt, and meta independently", () => {
    const ctrl = reduceKeyboard(INITIAL_STATE, { type: "toggleModifier", modifier: "ctrl" });
    expect(ctrl.ctrl).toBe(true);
    const alt = reduceKeyboard(ctrl, { type: "toggleModifier", modifier: "alt" });
    expect(alt.alt).toBe(true);
    expect(alt.ctrl).toBe(true);
    const meta = reduceKeyboard(alt, { type: "toggleModifier", modifier: "meta" });
    expect(meta.meta).toBe(true);
  });

  it("clears the buffer", () => {
    const next = apply(INITIAL_STATE, { type: "insert", char: "hello" }, { type: "clear" });
    expect(next.value).toBe("");
    expect(next.cursor).toBe(0);
  });

  it("inserts space, tab, and newline in qwerty mode", () => {
    const next = apply(INITIAL_STATE, { type: "space" }, { type: "tab" }, { type: "enter" });
    expect(next.value).toBe(" \t\n");
  });

  it("inserts two spaces instead of converting them to a period", () => {
    const next = apply(
      INITIAL_STATE,
      { type: "insert", char: "hi" },
      { type: "space" },
      { type: "space" },
    );
    expect(next.value).toBe("hi  ");
    expect(next.cursor).toBe(4);
  });

  it("nudges the cursor without changing text", () => {
    const next = apply(INITIAL_STATE, { type: "insert", char: "ab" }, { type: "nudge", delta: -1 });
    expect(next.value).toBe("ab");
    expect(next.cursor).toBe(1);
  });

  it("jumps the cursor to the start and end", () => {
    const seeded = apply(INITIAL_STATE, { type: "insert", char: "caim" }, { type: "nudge", delta: -2 });
    expect(seeded.cursor).toBe(2);
    const home = reduceKeyboard(seeded, { type: "jump", to: "start" });
    expect(home.cursor).toBe(0);
    const end = reduceKeyboard(home, { type: "jump", to: "end" });
    expect(end.cursor).toBe(4);
    expect(end.value).toBe("caim");
  });

  it("moves the caret between lines with nudgeLine", () => {
    const seeded = apply(INITIAL_STATE, { type: "insert", char: "ab\ncd" }, { type: "jump", to: "end" });
    const up = reduceKeyboard(seeded, { type: "nudgeLine", delta: -1 });
    expect(up.value).toBe("ab\ncd");
    expect(up.cursor).toBe(2);
    const down = reduceKeyboard(up, { type: "nudgeLine", delta: 1 });
    expect(down.cursor).toBe(5);
  });

  it("ignores non-digits and whitespace in PIN mode", () => {
    const pin = reduceKeyboard(INITIAL_STATE, { type: "setMode", mode: "pin" });
    const next = apply(
      pin,
      { type: "insert", char: "1" },
      { type: "insert", char: "a" },
      { type: "space" },
      { type: "tab" },
      { type: "enter" },
      { type: "insert", char: "9" },
    );
    expect(next.value).toBe("19");
    expect(next.mode).toBe("pin");
  });

  it("keeps qwerty and PIN buffers separate", () => {
    const typed = apply(INITIAL_STATE, { type: "insert", char: "Ca" }, { type: "setMode", mode: "pin" });
    expect(typed.value).toBe("");
    const pin = apply(typed, { type: "insert", char: "1" }, { type: "insert", char: "2" });
    expect(pin.value).toBe("12");
    const back = reduceKeyboard(pin, { type: "setMode", mode: "qwerty" });
    expect(back.value).toBe("Ca");
    expect(back.buffers.pin.value).toBe("12");
  });

  it("clears only the current mode buffer", () => {
    const typed = apply(
      INITIAL_STATE,
      { type: "insert", char: "hello" },
      { type: "setMode", mode: "pin" },
      { type: "insert", char: "1" },
      { type: "insert", char: "2" },
      { type: "clear" },
    );
    expect(typed.mode).toBe("pin");
    expect(typed.value).toBe("");
    const back = reduceKeyboard(typed, { type: "setMode", mode: "qwerty" });
    expect(back.value).toBe("hello");
  });

  it("marks a PIN as captured on enter without changing digits", () => {
    const pin = apply(
      INITIAL_STATE,
      { type: "setMode", mode: "pin" },
      { type: "insert", char: "1" },
      { type: "enter" },
    );
    expect(pin.value).toBe("1");
    expect(pin.pinCaptured).toBe(true);
  });

  it("does not capture an empty PIN", () => {
    const pin = apply(INITIAL_STATE, { type: "setMode", mode: "pin" }, { type: "enter" });
    expect(pin.value).toBe("");
    expect(pin.pinCaptured).toBe(false);
    expect(isKeyDisabled(pinEnter, pin)).toBe(true);
  });

  it("rejects PIN digits beyond the max length", () => {
    let pin = reduceKeyboard(INITIAL_STATE, { type: "setMode", mode: "pin" });
    for (let digit = 0; digit < MAX_PIN_LENGTH + 3; digit += 1) {
      pin = reduceKeyboard(pin, { type: "insert", char: String(digit % 10) });
    }
    expect(pin.value).toHaveLength(MAX_PIN_LENGTH);
    expect(pin.value).toBe("01234567");
  });

  it("undoes the current mode buffer only", () => {
    const typed = apply(
      INITIAL_STATE,
      { type: "insert", char: "C" },
      { type: "insert", char: "a" },
      { type: "setMode", mode: "pin" },
      { type: "insert", char: "1" },
      { type: "insert", char: "2" },
      { type: "undo" },
    );
    expect(typed.mode).toBe("pin");
    expect(typed.value).toBe("1");
    const back = apply(typed, { type: "setMode", mode: "qwerty" }, { type: "undo" });
    expect(back.value).toBe("C");
  });

  it("coalesces repeated backspaces into a single undo", () => {
    const typed = apply(
      INITIAL_STATE,
      { type: "insert", char: "cat" },
      { type: "backspace" },
      { type: "backspace" },
    );
    expect(typed.value).toBe("c");
    const undone = reduceKeyboard(typed, { type: "undo" });
    expect(undone.value).toBe("cat");
  });

  it("undoes insert, space, and backspace", () => {
    const typed = apply(INITIAL_STATE, { type: "insert", char: "hi" }, { type: "space" });
    expect(typed.value).toBe("hi ");
    const undoneSpace = reduceKeyboard(typed, { type: "undo" });
    expect(undoneSpace.value).toBe("hi");
    const gone = reduceKeyboard(undoneSpace, { type: "undo" });
    expect(gone.value).toBe("");
  });

  it("does nothing when undo history is empty", () => {
    const next = reduceKeyboard(INITIAL_STATE, { type: "undo" });
    expect(next).toEqual(INITIAL_STATE);
  });

  it("clamps the cursor to the value length", () => {
    const next = apply(INITIAL_STATE, { type: "insert", char: "ab" }, { type: "setCursor", cursor: 99 });
    expect(next.cursor).toBe(2);
  });

  it("replaces the whole buffer", () => {
    const next = reduceKeyboard(INITIAL_STATE, { type: "replace", value: "door", cursor: 2 });
    expect(next.value).toBe("door");
    expect(next.cursor).toBe(2);
  });

  it("does not record cursor-only replacements in undo history", () => {
    const seeded = apply(INITIAL_STATE, { type: "insert", char: "ab" }, { type: "replace", value: "ab", cursor: 0 });
    expect(seeded.cursor).toBe(0);
    const undone = reduceKeyboard(seeded, { type: "undo" });
    expect(undone.value).toBe("");
  });
});

describe("shift display", () => {
  it("shows uppercase when shift or caps is on, but not both", () => {
    const base = INITIAL_STATE;
    expect(displayChar(letterQ, base)).toBe("q");
    expect(displayChar(letterQ, { ...base, shift: true })).toBe("Q");
    expect(displayChar(letterQ, { ...base, capsLock: true })).toBe("Q");
    expect(displayChar(letterQ, { ...base, shift: true, capsLock: true })).toBe("q");
    expect(letterIsUppercase({ ...base, shift: true, capsLock: true })).toBe(false);
  });

  it("uses shift for number-row punctuation even when caps lock is on", () => {
    const one: CharKeyDef = { kind: "char", id: "char-1", primary: "1", shifted: "!" };
    expect(displayChar(one, INITIAL_STATE)).toBe("1");
    expect(displayChar(one, { ...INITIAL_STATE, shift: true })).toBe("!");
    expect(displayChar(one, { ...INITIAL_STATE, capsLock: true })).toBe("1");
    expect(displayChar(one, { ...INITIAL_STATE, shift: true, capsLock: true })).toBe("!");
  });
});
