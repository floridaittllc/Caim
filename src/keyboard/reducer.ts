import type { KeyboardAction, KeyboardState } from "./types";

export const INITIAL_STATE: KeyboardState = {
  value: "",
  cursor: 0,
  shift: false,
  capsLock: false,
  layer: "letters",
  mode: "qwerty",
};

function insertAtCursor(state: KeyboardState, text: string): KeyboardState {
  const next = state.value.slice(0, state.cursor) + text + state.value.slice(state.cursor);
  return {
    ...state,
    value: next,
    cursor: state.cursor + text.length,
    shift: false,
  };
}

function clampCursor(value: string, cursor: number): number {
  return Math.max(0, Math.min(cursor, value.length));
}

function assertNever(value: never): never {
  throw new Error(`Unhandled keyboard action: ${JSON.stringify(value)}`);
}

export function reduceKeyboard(state: KeyboardState, action: KeyboardAction): KeyboardState {
  switch (action.type) {
    case "insert":
      if (state.mode === "pin" && !/^\d$/.test(action.char)) {
        return state;
      }
      return insertAtCursor(state, action.char);
    case "space":
      if (state.mode === "pin") {
        return state;
      }
      return insertAtCursor(state, " ");
    case "tab":
      if (state.mode === "pin") {
        return state;
      }
      return insertAtCursor(state, "\t");
    case "enter":
      if (state.mode === "pin") {
        return { ...state, shift: false };
      }
      return insertAtCursor(state, "\n");
    case "backspace": {
      if (state.cursor === 0) {
        return state;
      }
      const next =
        state.value.slice(0, state.cursor - 1) + state.value.slice(state.cursor);
      return {
        ...state,
        value: next,
        cursor: state.cursor - 1,
        shift: false,
      };
    }
    case "toggleShift":
      return { ...state, shift: !state.shift };
    case "toggleCaps":
      return { ...state, capsLock: !state.capsLock, shift: false };
    case "setLayer":
      return { ...state, layer: action.layer, shift: false };
    case "setMode":
      return {
        ...state,
        mode: action.mode,
        layer: "letters",
        shift: false,
        capsLock: false,
      };
    case "setCursor":
      return { ...state, cursor: clampCursor(state.value, action.cursor) };
    case "replace": {
      const value = action.value;
      return {
        ...state,
        value,
        cursor: clampCursor(value, action.cursor),
      };
    }
    case "clear":
      return { ...state, value: "", cursor: 0, shift: false };
    default:
      return assertNever(action);
  }
}
