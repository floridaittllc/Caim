import { useCallback, useEffect, useMemo, useReducer } from "react";
import { rowsFor } from "./layouts";
import { INITIAL_STATE, reduceKeyboard } from "./reducer";
import type { KeyDef, KeyboardAction, KeyboardState, SpecialKeyId } from "./types";
import { displayChar } from "./types";

function specialAction(id: SpecialKeyId): KeyboardAction | null {
  switch (id) {
    case "shift":
      return { type: "toggleShift" };
    case "caps":
      return { type: "toggleCaps" };
    case "backspace":
      return { type: "backspace" };
    case "enter":
      return { type: "enter" };
    case "space":
      return { type: "space" };
    case "tab":
      return { type: "tab" };
    case "left":
      return { type: "nudge", delta: -1 };
    case "right":
      return { type: "nudge", delta: 1 };
    case "home":
      return { type: "jump", to: "start" };
    case "end":
      return { type: "jump", to: "end" };
    case "layer-letters":
      return { type: "setLayer", layer: "letters" };
    case "layer-numbers":
      return { type: "setLayer", layer: "numbers" };
    case "layer-symbols":
      return { type: "setLayer", layer: "symbols" };
    case "mode-qwerty":
      return { type: "setMode", mode: "qwerty" };
    case "mode-pin":
      return { type: "setMode", mode: "pin" };
    case "clear":
      return { type: "clear" };
    default: {
      const exhaustive: never = id;
      return exhaustive;
    }
  }
}

function shouldIgnorePhysicalKey(event: KeyboardEvent): boolean {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.closest(".toolbar, .masthead")) {
    return true;
  }
  if (target instanceof HTMLButtonElement && !target.closest("[data-testid='keyboard']")) {
    return true;
  }
  if (
    (event.key === "Enter" || event.key === " ") &&
    target instanceof HTMLButtonElement
  ) {
    return true;
  }
  if (event.key === "Tab" && !(target instanceof HTMLTextAreaElement)) {
    return true;
  }
  return false;
}

function physicalKeyToAction(event: KeyboardEvent, state: KeyboardState): KeyboardAction | null {
  if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "z") {
    return { type: "undo" };
  }

  if (event.metaKey || event.ctrlKey || event.altKey) {
    return null;
  }

  switch (event.key) {
    case "Backspace":
      return { type: "backspace" };
    case "Enter":
      return { type: "enter" };
    case "Tab":
      return { type: "tab" };
    case " ":
      return { type: "space" };
    case "Shift":
    case "CapsLock":
      return null;
    case "ArrowLeft":
      return { type: "nudge", delta: -1 };
    case "ArrowRight":
      return { type: "nudge", delta: 1 };
    case "Home":
      return { type: "jump", to: "start" };
    case "End":
      return { type: "jump", to: "end" };
    case "Escape":
      return state.layer === "letters" ? null : { type: "setLayer", layer: "letters" };
    default:
      if (event.key.length === 1) {
        return { type: "insert", char: event.key };
      }
      return null;
  }
}

export function useKeyboard() {
  const [state, dispatch] = useReducer(reduceKeyboard, INITIAL_STATE);

  const rows = useMemo(
    () => rowsFor(state.mode, state.layer),
    [state.mode, state.layer],
  );

  const pressKey = useCallback((key: KeyDef) => {
    if (key.kind === "char") {
      dispatch({ type: "insert", char: displayChar(key, state) });
      return;
    }
    const action = specialAction(key.id);
    if (action) {
      dispatch(action);
    }
  }, [state]);

  const dispatchAction = useCallback((action: KeyboardAction) => {
    dispatch(action);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnorePhysicalKey(event)) {
        return;
      }
      const action = physicalKeyToAction(event, state);
      if (!action) {
        return;
      }
      event.preventDefault();
      dispatch(action);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state]);

  return {
    state,
    rows,
    pressKey,
    dispatch: dispatchAction,
  };
}

export { specialAction, physicalKeyToAction, shouldIgnorePhysicalKey };
