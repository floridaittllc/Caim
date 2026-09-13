import type { KeyboardAction, KeyboardState, ModeBuffer } from "./types";

const EMPTY_BUFFER: ModeBuffer = { value: "", cursor: 0 };

export const INITIAL_STATE: KeyboardState = {
  value: "",
  cursor: 0,
  shift: false,
  capsLock: false,
  layer: "letters",
  mode: "qwerty",
  buffers: {
    qwerty: { ...EMPTY_BUFFER },
    pin: { ...EMPTY_BUFFER },
  },
  pinCaptured: false,
};

function clampCursor(value: string, cursor: number): number {
  return Math.max(0, Math.min(cursor, value.length));
}

function commit(
  state: KeyboardState,
  patch: Partial<KeyboardState> & { value?: string; cursor?: number },
): KeyboardState {
  const value = patch.value ?? state.value;
  const cursor = clampCursor(value, patch.cursor ?? state.cursor);
  return {
    ...state,
    ...patch,
    value,
    cursor,
    buffers: {
      ...state.buffers,
      [state.mode]: { value, cursor },
    },
  };
}

function insertAtCursor(state: KeyboardState, text: string): KeyboardState {
  const next = state.value.slice(0, state.cursor) + text + state.value.slice(state.cursor);
  return commit(state, {
    value: next,
    cursor: state.cursor + text.length,
    shift: false,
    pinCaptured: false,
  });
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
        return { ...state, shift: false, pinCaptured: true };
      }
      return insertAtCursor(state, "\n");
    case "backspace": {
      if (state.cursor === 0) {
        return state;
      }
      const next =
        state.value.slice(0, state.cursor - 1) + state.value.slice(state.cursor);
      return commit(state, {
        value: next,
        cursor: state.cursor - 1,
        shift: false,
        pinCaptured: false,
      });
    }
    case "toggleShift":
      return { ...state, shift: !state.shift };
    case "toggleCaps":
      return { ...state, capsLock: !state.capsLock, shift: false };
    case "setLayer":
      return { ...state, layer: action.layer, shift: false };
    case "setMode": {
      if (action.mode === state.mode) {
        return { ...state, layer: "letters", shift: false, capsLock: false };
      }
      const buffers = {
        ...state.buffers,
        [state.mode]: { value: state.value, cursor: state.cursor },
      };
      const incoming = buffers[action.mode];
      return {
        ...state,
        mode: action.mode,
        value: incoming.value,
        cursor: incoming.cursor,
        buffers,
        layer: "letters",
        shift: false,
        capsLock: false,
        pinCaptured: false,
      };
    }
    case "setCursor":
      return commit(state, { cursor: action.cursor });
    case "replace":
      return commit(state, {
        value: action.value,
        cursor: action.cursor,
        pinCaptured: false,
      });
    case "clear":
      return commit(state, { value: "", cursor: 0, shift: false, pinCaptured: false });
    default:
      return assertNever(action);
  }
}
