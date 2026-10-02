export type KeyDef = {
  id: string;
  label: string;
  insert?: string;
  width?: number;
  action?:
    | 'backspace'
    | 'enter'
    | 'space'
    | 'shift'
    | 'caps'
    | 'tab'
    | 'escape'
    | 'left'
    | 'right'
    | 'home'
    | 'end';
  special?: boolean;
};

const numberRow: KeyDef[] = [
  { id: 'grave', label: '`', insert: '`' },
  { id: '1', label: '1', insert: '1' },
  { id: '2', label: '2', insert: '2' },
  { id: '3', label: '3', insert: '3' },
  { id: '4', label: '4', insert: '4' },
  { id: '5', label: '5', insert: '5' },
  { id: '6', label: '6', insert: '6' },
  { id: '7', label: '7', insert: '7' },
  { id: '8', label: '8', insert: '8' },
  { id: '9', label: '9', insert: '9' },
  { id: '0', label: '0', insert: '0' },
  { id: 'minus', label: '-', insert: '-' },
  { id: 'equals', label: '=', insert: '=' },
  { id: 'backspace', label: '⌫', action: 'backspace', width: 1.5, special: true },
];

const row1: KeyDef[] = [
  { id: 'tab', label: 'Tab', action: 'tab', width: 1.4, special: true },
  { id: 'q', label: 'Q', insert: 'q' },
  { id: 'w', label: 'W', insert: 'w' },
  { id: 'e', label: 'E', insert: 'e' },
  { id: 'r', label: 'R', insert: 'r' },
  { id: 't', label: 'T', insert: 't' },
  { id: 'y', label: 'Y', insert: 'y' },
  { id: 'u', label: 'U', insert: 'u' },
  { id: 'i', label: 'I', insert: 'i' },
  { id: 'o', label: 'O', insert: 'o' },
  { id: 'p', label: 'P', insert: 'p' },
  { id: 'lbrack', label: '[', insert: '[' },
  { id: 'rbrack', label: ']', insert: ']' },
  { id: 'bslash', label: '\\', insert: '\\', width: 1.2 },
];

const row2: KeyDef[] = [
  { id: 'caps', label: 'Caps', action: 'caps', width: 1.6, special: true },
  { id: 'a', label: 'A', insert: 'a' },
  { id: 's', label: 'S', insert: 's' },
  { id: 'd', label: 'D', insert: 'd' },
  { id: 'f', label: 'F', insert: 'f' },
  { id: 'g', label: 'G', insert: 'g' },
  { id: 'h', label: 'H', insert: 'h' },
  { id: 'j', label: 'J', insert: 'j' },
  { id: 'k', label: 'K', insert: 'k' },
  { id: 'l', label: 'L', insert: 'l' },
  { id: 'semi', label: ';', insert: ';' },
  { id: 'quote', label: "'", insert: "'" },
  { id: 'enter', label: 'Enter', action: 'enter', width: 1.8, special: true },
];

const row3: KeyDef[] = [
  { id: 'lshift', label: 'Shift', action: 'shift', width: 2.1, special: true },
  { id: 'z', label: 'Z', insert: 'z' },
  { id: 'x', label: 'X', insert: 'x' },
  { id: 'c', label: 'C', insert: 'c' },
  { id: 'v', label: 'V', insert: 'v' },
  { id: 'b', label: 'B', insert: 'b' },
  { id: 'n', label: 'N', insert: 'n' },
  { id: 'm', label: 'M', insert: 'm' },
  { id: 'comma', label: ',', insert: ',' },
  { id: 'period', label: '.', insert: '.' },
  { id: 'slash', label: '/', insert: '/' },
  { id: 'rshift', label: 'Shift', action: 'shift', width: 2.1, special: true },
];

const row4: KeyDef[] = [
  { id: 'esc', label: 'Esc', action: 'escape', width: 1.2, special: true },
  { id: 'home', label: 'Home', action: 'home', width: 1.2, special: true },
  { id: 'end', label: 'End', action: 'end', width: 1.2, special: true },
  { id: 'left', label: '←', action: 'left', special: true },
  { id: 'space', label: 'Space', action: 'space', width: 5.5, special: true },
  { id: 'right', label: '→', action: 'right', special: true },
];

export const FULL_LAYOUT: KeyDef[][] = [numberRow, row1, row2, row3, row4];

const SHIFT_MAP: Record<string, string> = {
  '`': '~',
  '1': '!',
  '2': '@',
  '3': '#',
  '4': '$',
  '5': '%',
  '6': '^',
  '7': '&',
  '8': '*',
  '9': '(',
  '0': ')',
  '-': '_',
  '=': '+',
  '[': '{',
  ']': '}',
  '\\': '|',
  ';': ':',
  "'": '"',
  ',': '<',
  '.': '>',
  '/': '?',
};

export function resolveInsert(
  key: KeyDef,
  shifted: boolean,
  caps: boolean,
): string | null {
  if (key.action === 'space') {
    return ' ';
  }
  if (key.action === 'tab') {
    return '\t';
  }
  if (key.action === 'enter') {
    return '\n';
  }
  if (!key.insert) {
    return null;
  }

  const base = key.insert;
  if (/^[a-z]$/.test(base)) {
    const upper = shifted !== caps;
    return upper ? base.toUpperCase() : base;
  }
  if (shifted && SHIFT_MAP[base]) {
    return SHIFT_MAP[base];
  }
  return base;
}

export function displayLabel(
  key: KeyDef,
  shifted: boolean,
  caps: boolean,
): string {
  if (key.action || !key.insert) {
    return key.label;
  }
  const resolved = resolveInsert(key, shifted, caps);
  return resolved ?? key.label;
}
