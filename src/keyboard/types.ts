export type KeyboardMode = "qwerty" | "pin";

export type ModifierId = "ctrl" | "alt" | "meta";

export type SpecialKeyId =
  | "shift-left"
  | "shift-right"
  | "caps"
  | "backspace"
  | "enter"
  | "space"
  | "tab"
  | "escape"
  | "left"
  | "right"
  | "up"
  | "down"
  | "home"
  | "end"
  | "ctrl-left"
  | "ctrl-right"
  | "alt-left"
  | "alt-right"
  | "meta-left"
  | "meta-right"
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
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
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
  | { type: "toggleModifier"; modifier: ModifierId }
  | { type: "releaseModifiers" }
  | { type: "setMode"; mode: KeyboardMode }
  | { type: "setCursor"; cursor: number }
  | { type: "nudge"; delta: number }
  | { type: "nudgeLine"; delta: number }
  | { type: "jump"; to: JumpTarget }
  | { type: "replace"; value: string; cursor: number }
  | { type: "clear" }
  | { type: "undo" };

export const MAX_PIN_LENGTH = 8;

export const MAX_HISTORY = 80;

export function letterIsUppercase(state: KeyboardState): boolean {
  return state.shift !== state.capsLock;
}

export function displayChar(key: CharKeyDef, state: KeyboardState): string {
  if (key.shifted && state.shift) {
    return key.shifted;
  }
  if (!key.shifted && /[a-z]/i.test(key.primary)) {
    return letterIsUppercase(state) ? key.primary.toUpperCase() : key.primary.toLowerCase();
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
};

export function keyAriaLabel(keyDef: KeyDef, state: KeyboardState): string {
  if (keyDef.kind === "special") {
    switch (keyDef.id) {
      case "shift-left":
        return "left shift";
      case "shift-right":
        return "right shift";
      case "caps":
        return "caps lock";
      case "backspace":
        return "backspace";
      case "enter":
        return "enter";
      case "space":
        return "space";
      case "tab":
        return "tab";
      case "escape":
        return "escape";
      case "left":
        return "left arrow";
      case "right":
        return "right arrow";
      case "up":
        return "up arrow";
      case "down":
        return "down arrow";
      case "home":
        return "home";
      case "end":
        return "end";
      case "ctrl-left":
        return "left control";
      case "ctrl-right":
        return "right control";
      case "alt-left":
        return "left alt";
      case "alt-right":
        return "right alt";
      case "meta-left":
        return "left windows";
      case "meta-right":
        return "right windows";
      case "mode-qwerty":
        return "full keyboard";
      case "mode-pin":
        return "PIN keypad";
      case "clear":
        return "clear";
      default: {
        const exhaustive: never = keyDef;
        return exhaustive;
      }
    }
  }
  const glyph = displayChar(keyDef, state);
  return GLYPH_NAMES[glyph] ?? glyph;
}

export function isToggleKey(id: SpecialKeyId): boolean {
  switch (id) {
    case "shift-left":
    case "shift-right":
    case "caps":
    case "ctrl-left":
    case "ctrl-right":
    case "alt-left":
    case "alt-right":
    case "meta-left":
    case "meta-right":
      return true;
    case "backspace":
    case "enter":
    case "space":
    case "tab":
    case "escape":
    case "left":
    case "right":
    case "up":
    case "down":
    case "home":
    case "end":
    case "mode-qwerty":
    case "mode-pin":
    case "clear":
      return false;
    default: {
      const exhaustive: never = id;
      return exhaustive;
    }
  }
}

export function isToggleActive(id: SpecialKeyId, state: KeyboardState): boolean {
  switch (id) {
    case "shift-left":
    case "shift-right":
      return state.shift;
    case "caps":
      return state.capsLock;
    case "ctrl-left":
    case "ctrl-right":
      return state.ctrl;
    case "alt-left":
    case "alt-right":
      return state.alt;
    case "meta-left":
    case "meta-right":
      return state.meta;
    case "backspace":
    case "enter":
    case "space":
    case "tab":
    case "escape":
    case "left":
    case "right":
    case "up":
    case "down":
    case "home":
    case "end":
    case "mode-qwerty":
    case "mode-pin":
    case "clear":
      return false;
    default: {
      const exhaustive: never = id;
      return exhaustive;
    }
  }
}
