import {
  MAX_HISTORY,
  MAX_PIN_LENGTH,
  type JumpTarget,
  type KeyboardAction,
  type KeyboardState,
  type ModeBuffer,
  type ModifierId,
} from "./types";

const EMPTY_BUFFER: ModeBuffer = { value: "", cursor: 0 };

export const INITIAL_STATE: KeyboardState = {
  value: "",
  cursor: 0,
  shift: false,
  capsLock: false,
  ctrl: false,
  alt: false,
  meta: false,
  mode: "qwerty",
  buffers: {
    qwerty: { ...EMPTY_BUFFER },
    pin: { ...EMPTY_BUFFER },
  },
  history: {
    qwerty: [],
    pin: [],
  },
  pinCaptured: false,
  lastTextAction: "none",
};

function clampCursor(value: string, cursor: number): number {
  return Math.max(0, Math.min(cursor, value.length));
}

function releasedModifiers(): Pick<KeyboardState, "shift" | "ctrl" | "alt" | "meta"> {
  return { shift: false, ctrl: false, alt: false, meta: false };
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

function pushUndo(state: KeyboardState): KeyboardState {
  const stack = state.history[state.mode];
  const snapshot: ModeBuffer = { value: state.value, cursor: state.cursor };
  const last = stack[stack.length - 1];
  if (last && last.value === snapshot.value && last.cursor === snapshot.cursor) {
    return state;
  }
  return {
    ...state,
    history: {
      ...state.history,
      [state.mode]: [...stack, snapshot].slice(-MAX_HISTORY),
    },
  };
}

function commitText(
  state: KeyboardState,
  patch: Partial<KeyboardState> & { value?: string; cursor?: number },
  edit: KeyboardState["lastTextAction"] = "insert",
): KeyboardState {
  const nextValue = patch.value ?? state.value;
  if (nextValue === state.value && (patch.cursor ?? state.cursor) === state.cursor) {
    return commit(state, { ...patch, lastTextAction: edit });
  }
  const shouldCoalesce = edit === "backspace" && state.lastTextAction === "backspace";
  const base = shouldCoalesce ? state : pushUndo(state);
  return commit(base, { ...patch, lastTextAction: edit });
}

function insertAtCursor(state: KeyboardState, text: string): KeyboardState {
  if (state.mode === "pin") {
    if (!/^\d+$/.test(text)) {
      return state;
    }
    const nextLength = state.value.length + text.length;
    if (state.value.length >= MAX_PIN_LENGTH || nextLength > MAX_PIN_LENGTH) {
      return state;
    }
  }
  const next = state.value.slice(0, state.cursor) + text + state.value.slice(state.cursor);
  return commitText(state, {
    value: next,
    cursor: state.cursor + text.length,
    ...releasedModifiers(),
    pinCaptured: false,
  });
}

function jumpCursor(state: KeyboardState, to: JumpTarget): KeyboardState {
  switch (to) {
    case "start":
      return commit(state, { cursor: 0, lastTextAction: "none" });
    case "end":
      return commit(state, { cursor: state.value.length, lastTextAction: "none" });
    default: {
      const exhaustive: never = to;
      return exhaustive;
    }
  }
}

function lineBounds(value: string, cursor: number): { start: number; end: number } {
  const start = value.lastIndexOf("\n", cursor - 1) + 1;
  const newline = value.indexOf("\n", cursor);
  const end = newline === -1 ? value.length : newline;
  return { start, end };
}

function nudgeLine(state: KeyboardState, delta: number): KeyboardState {
  const { value, cursor } = state;
  const current = lineBounds(value, cursor);
  const column = cursor - current.start;

  if (delta < 0) {
    if (current.start === 0) {
      return commit(state, { cursor: 0, lastTextAction: "none" });
    }
    const previous = lineBounds(value, current.start - 1);
    const previousLength = previous.end - previous.start;
    return commit(state, {
      cursor: previous.start + Math.min(column, previousLength),
      lastTextAction: "none",
    });
  }

  if (delta > 0) {
    if (current.end === value.length) {
      return commit(state, { cursor: value.length, lastTextAction: "none" });
    }
    const next = lineBounds(value, current.end + 1);
    const nextLength = next.end - next.start;
    return commit(state, {
      cursor: next.start + Math.min(column, nextLength),
      lastTextAction: "none",
    });
  }

  return state;
}

function toggleModifier(state: KeyboardState, modifier: ModifierId): KeyboardState {
  switch (modifier) {
    case "ctrl":
      return { ...state, ctrl: !state.ctrl };
    case "alt":
      return { ...state, alt: !state.alt };
    case "meta":
      return { ...state, meta: !state.meta };
    default: {
      const exhaustive: never = modifier;
      return exhaustive;
    }
  }
}

function resetTransientKeys(state: KeyboardState): KeyboardState {
  return {
    ...state,
    ...releasedModifiers(),
    capsLock: false,
  };
}

function assertNever(value: never): never {
  throw new Error(`Unhandled keyboard action: ${JSON.stringify(value)}`);
}

export function reduceKeyboard(state: KeyboardState, action: KeyboardAction): KeyboardState {
  switch (action.type) {
    case "insert":
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
        if (state.value.length === 0) {
          return state;
        }
        return { ...state, ...releasedModifiers(), pinCaptured: true };
      }
      return insertAtCursor(state, "\n");
    case "backspace": {
      if (state.cursor === 0) {
        return state;
      }
      const next =
        state.value.slice(0, state.cursor - 1) + state.value.slice(state.cursor);
      return commitText(
        state,
        {
          value: next,
          cursor: state.cursor - 1,
          ...releasedModifiers(),
          pinCaptured: false,
        },
        "backspace",
      );
    }
    case "toggleShift":
      return { ...state, shift: !state.shift };
    case "toggleCaps":
      return { ...state, capsLock: !state.capsLock, shift: false };
    case "toggleModifier":
      return toggleModifier(state, action.modifier);
    case "releaseModifiers":
      return { ...state, ...releasedModifiers() };
    case "setMode": {
      if (action.mode === state.mode) {
        return resetTransientKeys(state);
      }
      const buffers = {
        ...state.buffers,
        [state.mode]: { value: state.value, cursor: state.cursor },
      };
      const incoming = buffers[action.mode];
      return {
        ...resetTransientKeys(state),
        mode: action.mode,
        value: incoming.value,
        cursor: incoming.cursor,
        buffers,
        pinCaptured: false,
      };
    }
    case "setCursor":
      return commit(state, { cursor: action.cursor, lastTextAction: "none" });
    case "nudge":
      return commit(state, { cursor: state.cursor + action.delta, lastTextAction: "none" });
    case "nudgeLine":
      return nudgeLine(state, action.delta);
    case "jump":
      return jumpCursor(state, action.to);
    case "replace":
      if (action.value === state.value) {
        return commit(state, { cursor: action.cursor });
      }
      return commitText(state, {
        value: action.value,
        cursor: action.cursor,
        pinCaptured: false,
      });
    case "clear":
      if (state.value === "" && state.cursor === 0) {
        return { ...state, ...releasedModifiers(), pinCaptured: false };
      }
      return commitText(state, {
        value: "",
        cursor: 0,
        ...releasedModifiers(),
        pinCaptured: false,
      });
    case "undo": {
      const stack = state.history[state.mode];
      if (stack.length === 0) {
        return state;
      }
      const previous = stack[stack.length - 1];
      const cursor = clampCursor(previous.value, previous.cursor);
      return {
        ...state,
        value: previous.value,
        cursor,
        pinCaptured: false,
        buffers: {
          ...state.buffers,
          [state.mode]: { value: previous.value, cursor },
        },
        history: {
          ...state.history,
          [state.mode]: stack.slice(0, -1),
        },
      };
    }
    default:
      return assertNever(action);
  }
}
