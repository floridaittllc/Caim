import type { KeyboardMode, KeyboardRow, KeyDef } from "./types";

function char(primary: string, shifted?: string, flex = 1): KeyDef {
  return {
    kind: "char",
    id: `char-${primary}`,
    primary,
    shifted,
    flex,
  };
}

function special(
  id: Extract<KeyDef, { kind: "special" }>["id"],
  label: string,
  flex = 1,
): KeyDef {
  return { kind: "special", id, label, flex };
}

const LETTERS_Q = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"] as const;
const LETTERS_A = ["a", "s", "d", "f", "g", "h", "j", "k", "l"] as const;
const LETTERS_Z = ["z", "x", "c", "v", "b", "n", "m"] as const;

export const FULL_ROWS: KeyboardRow[] = [
  [
    special("escape", "esc", 1.15),
    char("`", "~"),
    char("1", "!"),
    char("2", "@"),
    char("3", "#"),
    char("4", "$"),
    char("5", "%"),
    char("6", "^"),
    char("7", "&"),
    char("8", "*"),
    char("9", "("),
    char("0", ")"),
    char("-", "_"),
    char("=", "+"),
    special("backspace", "backspace", 2),
  ],
  [
    special("tab", "tab", 1.5),
    ...LETTERS_Q.map((letter) => char(letter)),
    char("[", "{"),
    char("]", "}"),
    char("\\", "|", 1.5),
  ],
  [
    special("caps", "caps", 1.75),
    ...LETTERS_A.map((letter) => char(letter)),
    char(";", ":"),
    char("'", '"'),
    special("enter", "enter", 2.25),
  ],
  [
    special("shift-left", "shift", 2.25),
    ...LETTERS_Z.map((letter) => char(letter)),
    char(",", "<"),
    char(".", ">"),
    char("/", "?"),
    special("shift-right", "shift", 2.75),
  ],
  [
    special("ctrl-left", "ctrl", 1.25),
    special("meta-left", "win", 1.1),
    special("alt-left", "alt", 1.1),
    special("space", "space", 5.8),
    special("alt-right", "alt", 1.1),
    special("meta-right", "win", 1.1),
    special("ctrl-right", "ctrl", 1.25),
    special("left", "←", 0.95),
    special("down", "↓", 0.95),
    special("up", "↑", 0.95),
    special("right", "→", 0.95),
    special("home", "home", 1.15),
    special("end", "end", 1.15),
  ],
];

export const PIN_ROWS: KeyboardRow[] = [
  [char("1"), char("2"), char("3")],
  [char("4"), char("5"), char("6")],
  [char("7"), char("8"), char("9")],
  [special("clear", "clear", 1), char("0"), special("backspace", "del", 1)],
  [special("enter", "enter", 3)],
];

export function rowsFor(mode: KeyboardMode): KeyboardRow[] {
  switch (mode) {
    case "pin":
      return PIN_ROWS;
    case "qwerty":
      return FULL_ROWS;
    default: {
      const exhaustive: never = mode;
      return exhaustive;
    }
  }
}

export const HOME_ROW_MARKS = new Set(["f", "j"]);

export const NUMBER_ROW_SHIFT: ReadonlyArray<readonly [string, string]> = [
  ["`", "~"],
  ["1", "!"],
  ["2", "@"],
  ["3", "#"],
  ["4", "$"],
  ["5", "%"],
  ["6", "^"],
  ["7", "&"],
  ["8", "*"],
  ["9", "("],
  ["0", ")"],
  ["-", "_"],
  ["=", "+"],
];
