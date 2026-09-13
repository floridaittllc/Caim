import { useEffect, useRef } from "react";
import type { KeyDef, KeyboardState, SpecialKeyId } from "./types";
import { displayChar, isKeyDisabled, keyAriaLabel } from "./types";
import { HOME_ROW_MARKS } from "./layouts";

type KeyButtonProps = {
  keyDef: KeyDef;
  state: KeyboardState;
  onPress: (key: KeyDef) => void;
  onDoublePress?: (key: KeyDef) => void;
  onLongPress?: (key: KeyDef) => void;
};

const REPEATABLE_IDS: ReadonlySet<SpecialKeyId> = new Set(["backspace", "left", "right", "space"]);
const LONG_PRESS_IDS: ReadonlySet<SpecialKeyId> = new Set(["shift"]);

function isToggleActive(id: SpecialKeyId, state: KeyboardState): boolean {
  switch (id) {
    case "shift":
      return state.shift || state.capsLock;
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
    case "left":
    case "right":
    case "home":
    case "end":
    case "clear":
      return false;
    default: {
      const exhaustive: never = id;
      return exhaustive;
    }
  }
}

function isRepeatable(keyDef: KeyDef): boolean {
  return keyDef.kind === "special" && REPEATABLE_IDS.has(keyDef.id);
}

function usesDeferredPress(keyDef: KeyDef): boolean {
  return keyDef.kind === "special" && LONG_PRESS_IDS.has(keyDef.id);
}

export function KeyButton({ keyDef, state, onPress, onDoublePress, onLongPress }: KeyButtonProps) {
  const flex = keyDef.flex ?? 1;
  const isChar = keyDef.kind === "char";
  const label = isChar
    ? displayChar(keyDef, state)
    : keyDef.id === "shift" && state.capsLock
      ? "caps"
      : keyDef.label;
  const active = !isChar && isToggleActive(keyDef.id, state);
  const disabled = isKeyDisabled(keyDef, state);
  const homeMark = isChar && HOME_ROW_MARKS.has(keyDef.primary);
  const variant = isChar ? "glyph" : keyDef.id === "space" ? "space" : "special";
  const pressed = !isChar && (keyDef.id === "shift" || keyDef.id === "caps") ? active : undefined;
  const onPressRef = useRef(onPress);
  const onLongPressRef = useRef(onLongPress);
  const holdDelayRef = useRef<number | null>(null);
  const holdRepeatRef = useRef<number | null>(null);
  const longPressedRef = useRef(false);
  const pointerHandledRef = useRef(false);

  onPressRef.current = onPress;
  onLongPressRef.current = onLongPress;

  useEffect(() => {
    return () => {
      if (holdDelayRef.current !== null) {
        window.clearTimeout(holdDelayRef.current);
      }
      if (holdRepeatRef.current !== null) {
        window.clearInterval(holdRepeatRef.current);
      }
    };
  }, []);

  function clearHold() {
    if (holdDelayRef.current !== null) {
      window.clearTimeout(holdDelayRef.current);
      holdDelayRef.current = null;
    }
    if (holdRepeatRef.current !== null) {
      window.clearInterval(holdRepeatRef.current);
      holdRepeatRef.current = null;
    }
  }

  function startHold() {
    if (disabled) {
      return;
    }
    if (isRepeatable(keyDef)) {
      holdDelayRef.current = window.setTimeout(() => {
        holdRepeatRef.current = window.setInterval(() => {
          onPressRef.current(keyDef);
        }, 55);
      }, 380);
      return;
    }
    if (usesDeferredPress(keyDef) && onLongPressRef.current) {
      holdDelayRef.current = window.setTimeout(() => {
        longPressedRef.current = true;
        onLongPressRef.current?.(keyDef);
      }, 450);
    }
  }

  function finishPointer() {
    if (usesDeferredPress(keyDef) && !longPressedRef.current && !disabled) {
      onPressRef.current(keyDef);
    }
    longPressedRef.current = false;
    clearHold();
  }

  return (
    <button
      type="button"
      className={`key key-${variant}${active ? " is-active" : ""}`}
      style={{ flex }}
      data-testid={`key-${keyDef.id}`}
      data-key-id={keyDef.id}
      aria-label={keyAriaLabel(keyDef, state)}
      aria-pressed={pressed}
      disabled={disabled}
      onPointerDown={(event) => {
        if (disabled) {
          return;
        }
        event.preventDefault();
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // jsdom and some WebViews do not implement pointer capture.
        }
        pointerHandledRef.current = true;
        if (!usesDeferredPress(keyDef)) {
          onPress(keyDef);
        }
        startHold();
      }}
      onPointerUp={finishPointer}
      onPointerCancel={() => {
        longPressedRef.current = false;
        clearHold();
      }}
      onPointerLeave={() => {
        if (usesDeferredPress(keyDef)) {
          return;
        }
        clearHold();
      }}
      onClick={(event) => {
        if (pointerHandledRef.current) {
          pointerHandledRef.current = false;
          event.preventDefault();
          return;
        }
        if (disabled) {
          return;
        }
        onPress(keyDef);
      }}
      onDoubleClick={() => onDoublePress?.(keyDef)}
    >
      <span className="key-label">{label}</span>
      {homeMark ? <span className="key-nub" aria-hidden="true" /> : null}
    </button>
  );
}
