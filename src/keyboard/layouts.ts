import type { KeyboardRow, KeyDef } from "./types";

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

export const LETTER_ROWS: KeyboardRow[] = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"].map((letter) => char(letter)),
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"].map((letter) => char(letter)),
  [
    special("shift", "shift", 1.4),
    ...["z", "x", "c", "v", "b", "n", "m"].map((letter) => char(letter)),
    special("backspace", "delete", 1.4),
  ],
  [
    special("layer-numbers", "123", 1.3),
    special("tab", "tab", 1.1),
    special("space", "space", 5),
    special("enter", "return", 1.6),
  ],
];

export const NUMBER_ROWS: KeyboardRow[] = [
  [
    char("1"),
    char("2"),
    char("3"),
    char("4"),
    char("5"),
    char("6"),
    char("7"),
    char("8"),
    char("9"),
    char("0"),
  ],
  [
    char("-"),
    char("/"),
    char(":"),
    char(";"),
    char("("),
    char(")"),
    char("$"),
    char("&"),
    char("@"),
    char('"'),
  ],
  [
    special("layer-symbols", "#+=", 1.4),
    char("."),
    char(","),
    char("?"),
    char("!"),
    char("'"),
    special("backspace", "delete", 1.4),
  ],
  [
    special("layer-letters", "ABC", 1.3),
    special("tab", "tab", 1.1),
    special("space", "space", 5),
    special("enter", "return", 1.6),
  ],
];

export const SYMBOL_ROWS: KeyboardRow[] = [
  [
    char("["),
    char("]"),
    char("{"),
    char("}"),
    char("#"),
    char("%"),
    char("^"),
    char("*"),
    char("+"),
    char("="),
  ],
  [
    char("_"),
    char("\\"),
    char("|"),
    char("~"),
    char("<"),
    char(">"),
    char("€"),
    char("£"),
    char("¥"),
    char("•"),
  ],
  [
    special("layer-numbers", "123", 1.4),
    char("."),
    char(","),
    char("?"),
    char("!"),
    char("'"),
    special("backspace", "delete", 1.4),
  ],
  [
    special("layer-letters", "ABC", 1.3),
    special("tab", "tab", 1.1),
    special("space", "space", 5),
    special("enter", "return", 1.6),
  ],
];

export const PIN_ROWS: KeyboardRow[] = [
  [char("1"), char("2"), char("3")],
  [char("4"), char("5"), char("6")],
  [char("7"), char("8"), char("9")],
  [special("clear", "clear", 1), char("0"), special("backspace", "delete", 1)],
  [special("enter", "enter", 3)],
];

export function rowsFor(mode: "qwerty" | "pin", layer: "letters" | "numbers" | "symbols"): KeyboardRow[] {
  if (mode === "pin") {
    return PIN_ROWS;
  }
  switch (layer) {
    case "letters":
      return LETTER_ROWS;
    case "numbers":
      return NUMBER_ROWS;
    case "symbols":
      return SYMBOL_ROWS;
    default: {
      const exhaustive: never = layer;
      return exhaustive;
    }
  }
}

export const HOME_ROW_MARKS = new Set(["f", "j"]);
