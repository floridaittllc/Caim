export type KeyboardMode = "qwerty" | "pin";

export type Layer = "letters" | "numbers" | "symbols";

export type SpecialKeyId =
  | "shift"
  | "caps"
  | "backspace"
  | "enter"
  | "space"
  | "tab"
  | "left"
  | "right"
  | "home"
  | "end"
  | "layer-letters"
  | "layer-numbers"
  | "layer-symbols"
  | "mode-qwerty"
  | "mode-pin"
  | "clear";

export type CharKeyDef = {
  kind: "char";
  id: string;
  primary: string;
  shifted?: string;
  flex?: number;
};

export type SpecialKeyDef = {
  kind: "special";
  id: SpecialKeyId;
  label: string;
  flex?: number;
};

export type KeyDef = CharKeyDef | SpecialKeyDef;

export type KeyboardRow = KeyDef[];

export type ModeBuffer = {
  value: string;
  cursor: number;
};

export type KeyboardState = {
  value: string;
  cursor: number;
  shift: boolean;
  capsLock: boolean;
  layer: Layer;
  mode: KeyboardMode;
  buffers: Record<KeyboardMode, ModeBuffer>;
  history: Record<KeyboardMode, ModeBuffer[]>;
  pinCaptured: boolean;
  lastTextAction: "none" | "insert" | "backspace";
};

export type JumpTarget = "start" | "end";

export type KeyboardAction =
  | { type: "insert"; char: string }
  | { type: "backspace" }
  | { type: "enter" }
  | { type: "space" }
  | { type: "tab" }
  | { type: "toggleShift" }
  | { type: "toggleCaps" }
  | { type: "setLayer"; layer: Layer }
  | { type: "setMode"; mode: KeyboardMode }
  | { type: "setCursor"; cursor: number }
  | { type: "nudge"; delta: number }
  | { type: "jump"; to: JumpTarget }
  | { type: "replace"; value: string; cursor: number }
  | { type: "clear" }
  | { type: "undo" };

export const MAX_PIN_LENGTH = 8;

export const MAX_HISTORY = 80;

export function isShifted(state: KeyboardState): boolean {
  return state.shift !== state.capsLock;
}

export function displayChar(key: CharKeyDef, state: KeyboardState): string {
  if (key.shifted && isShifted(state)) {
    return key.shifted;
  }
  if (!key.shifted && /[a-z]/i.test(key.primary)) {
    return isShifted(state) ? key.primary.toUpperCase() : key.primary.toLowerCase();
  }
  return key.primary;
}

export function isKeyDisabled(keyDef: KeyDef, state: KeyboardState): boolean {
  return keyDef.kind === "special" && keyDef.id === "enter" && state.mode === "pin" && state.value.length === 0;
}

const GLYPH_NAMES: Record<string, string> = {
  ",": "comma",
  ".": "period",
  "!": "exclamation mark",
  "?": "question mark",
  "'": "apostrophe",
  '"': "quotation mark",
  "-": "hyphen",
  "_": "underscore",
  "/": "slash",
  "\\": "backslash",
  ":": "colon",
  ";": "semicolon",
  "(": "left parenthesis",
  ")": "right parenthesis",
  "<": "less than",
  ">": "greater than",
  "$": "dollar sign",
  "&": "ampersand",
  "@": "at sign",
  "#": "number sign",
  "%": "percent",
  "^": "caret",
  "*": "asterisk",
  "+": "plus",
  "=": "equals",
  "[": "left square bracket",
  "]": "right square bracket",
  "{": "left curly brace",
  "}": "right curly brace",
  "|": "vertical bar",
  "~": "tilde",
  "`": "backtick",
  "€": "euro sign",
  "£": "pound sign",
  "¥": "yen sign",
  "•": "bullet",
  "°": "degree",
  "§": "section",
  "©": "copyright",
  "®": "registered",
  "™": "trademark",
  "×": "multiplication sign",
  "±": "plus-minus",
  "≠": "not equal",
  "¿": "inverted question mark",
  "¡": "inverted exclamation mark",
};

export function keyAriaLabel(keyDef: KeyDef, state: KeyboardState): string {
  if (keyDef.kind === "special") {
    if (keyDef.id === "shift") {
      return state.capsLock ? "caps lock" : "shift";
    }
    return keyDef.label;
  }
  const glyph = displayChar(keyDef, state);
  return GLYPH_NAMES[glyph] ?? glyph;
}
