import { describe, expect, it } from "vitest";
import { INITIAL_STATE, reduceKeyboard } from "./reducer";
import { displayChar, isShifted } from "./types";
import type { CharKeyDef, KeyboardState } from "./types";

function apply(state: KeyboardState, ...actions: Parameters<typeof reduceKeyboard>[1][]): KeyboardState {
  return actions.reduce((next, action) => reduceKeyboard(next, action), state);
}

const letterQ: CharKeyDef = { kind: "char", id: "char-q", primary: "q" };

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

  it("keeps caps lock on after insert", () => {
    const caps = reduceKeyboard(INITIAL_STATE, { type: "toggleCaps" });
    const next = reduceKeyboard(caps, { type: "insert", char: "A" });
    expect(next.capsLock).toBe(true);
    expect(next.value).toBe("A");
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

  it("nudges the cursor without changing text", () => {
    const next = apply(INITIAL_STATE, { type: "insert", char: "ab" }, { type: "nudge", delta: -1 });
    expect(next.value).toBe("ab");
    expect(next.cursor).toBe(1);
  });

  it("turns a second space into a period", () => {
    const next = apply(
      INITIAL_STATE,
      { type: "insert", char: "hi" },
      { type: "space" },
      { type: "space" },
    );
    expect(next.value).toBe("hi. ");
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

  it("clamps the cursor to the value length", () => {
    const next = apply(INITIAL_STATE, { type: "insert", char: "ab" }, { type: "setCursor", cursor: 99 });
    expect(next.cursor).toBe(2);
  });

  it("replaces the whole buffer", () => {
    const next = reduceKeyboard(INITIAL_STATE, { type: "replace", value: "door", cursor: 2 });
    expect(next.value).toBe("door");
    expect(next.cursor).toBe(2);
  });
});

describe("shift display", () => {
  it("shows uppercase when shift or caps is on, but not both", () => {
    const base = INITIAL_STATE;
    expect(displayChar(letterQ, base)).toBe("q");
    expect(displayChar(letterQ, { ...base, shift: true })).toBe("Q");
    expect(displayChar(letterQ, { ...base, capsLock: true })).toBe("Q");
    expect(displayChar(letterQ, { ...base, shift: true, capsLock: true })).toBe("q");
    expect(isShifted({ ...base, shift: true, capsLock: true })).toBe(false);
  });
});
