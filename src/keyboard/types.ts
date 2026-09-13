export type KeyboardMode = "qwerty" | "pin";

export type Layer = "letters" | "numbers" | "symbols";

export type SpecialKeyId =
  | "shift"
  | "caps"
  | "backspace"
  | "enter"
  | "space"
  | "tab"
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

export type KeyboardState = {
  value: string;
  cursor: number;
  shift: boolean;
  capsLock: boolean;
  layer: Layer;
  mode: KeyboardMode;
};

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
  | { type: "replace"; value: string; cursor: number }
  | { type: "clear" };

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
