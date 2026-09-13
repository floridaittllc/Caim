import type { KeyDef, KeyboardState, SpecialKeyId } from "./types";
import { displayChar } from "./types";
import { HOME_ROW_MARKS } from "./layouts";

type KeyButtonProps = {
  keyDef: KeyDef;
  state: KeyboardState;
  onPress: (key: KeyDef) => void;
  onDoublePress?: (key: KeyDef) => void;
};

function isToggleActive(id: SpecialKeyId, state: KeyboardState): boolean {
  switch (id) {
    case "shift":
      return state.shift;
    case "caps":
      return state.capsLock;
    case "layer-letters":
      return state.layer === "letters";
    case "layer-numbers":
      return state.layer === "numbers";
    case "layer-symbols":
      return state.layer === "symbols";
    case "mode-qwerty":
      return state.mode === "qwerty";
    case "mode-pin":
      return state.mode === "pin";
    case "backspace":
    case "enter":
    case "space":
    case "tab":
    case "clear":
      return false;
    default: {
      const exhaustive: never = id;
      return exhaustive;
    }
  }
}

export function KeyButton({ keyDef, state, onPress, onDoublePress }: KeyButtonProps) {
  const flex = keyDef.flex ?? 1;
  const isChar = keyDef.kind === "char";
  const label = isChar ? displayChar(keyDef, state) : keyDef.label;
  const active = !isChar && isToggleActive(keyDef.id, state);
  const homeMark = isChar && HOME_ROW_MARKS.has(keyDef.primary);
  const variant = isChar ? "glyph" : keyDef.id === "space" ? "space" : "special";

  return (
    <button
      type="button"
      className={`key key-${variant}${active ? " is-active" : ""}`}
      style={{ flex }}
      data-testid={`key-${keyDef.id}`}
      data-key-id={keyDef.id}
      aria-label={isChar ? label : keyDef.label}
      aria-pressed={!isChar && (keyDef.id === "shift" || keyDef.id === "caps") ? active : undefined}
      onPointerDown={(event) => {
        event.preventDefault();
        onPress(keyDef);
      }}
      onDoubleClick={() => onDoublePress?.(keyDef)}
    >
      <span className="key-label">{label}</span>
      {homeMark ? <span className="key-nub" aria-hidden="true" /> : null}
    </button>
  );
}
