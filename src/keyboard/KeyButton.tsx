import { useEffect, useRef } from "react";
import type { KeyDef, KeyboardState, SpecialKeyId } from "./types";
import { isKeyDisabled, isToggleActive, isToggleKey, keyAriaLabel } from "./types";
import { HOME_ROW_MARKS } from "./layouts";

type KeyButtonProps = {
  keyDef: KeyDef;
  state: KeyboardState;
  onPress: (key: KeyDef) => void;
};

const REPEATABLE_IDS: ReadonlySet<SpecialKeyId> = new Set([
  "backspace",
  "left",
  "right",
  "up",
  "down",
  "space",
]);

function isRepeatable(keyDef: KeyDef): boolean {
  return keyDef.kind === "special" && REPEATABLE_IDS.has(keyDef.id);
}

function visibleKeyLabel(keyDef: KeyDef): string {
  if (keyDef.kind === "special") {
    return keyDef.label;
  }
  if (/[a-z]/i.test(keyDef.primary)) {
    return keyDef.primary.toUpperCase();
  }
  return keyDef.primary;
}

function keyVariant(keyDef: KeyDef): "glyph" | "space" | "special" {
  if (keyDef.kind === "char") {
    return "glyph";
  }
  if (keyDef.id === "space") {
    return "space";
  }
  return "special";
}

export function KeyButton({ keyDef, state, onPress }: KeyButtonProps) {
  const flex = keyDef.flex ?? 1;
  const isChar = keyDef.kind === "char";
  const dualLegend = isChar && Boolean(keyDef.shifted);
  const active = !isChar && isToggleActive(keyDef.id, state);
  const disabled = isKeyDisabled(keyDef, state);
  const homeMark = isChar && HOME_ROW_MARKS.has(keyDef.primary);
  const variant = keyVariant(keyDef);
  const pressed = !isChar && isToggleKey(keyDef.id) ? active : undefined;
  const onPressRef = useRef(onPress);
  const holdDelayRef = useRef<number | null>(null);
  const holdRepeatRef = useRef<number | null>(null);
  const pointerHandledRef = useRef(false);

  onPressRef.current = onPress;

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
    if (disabled || !isRepeatable(keyDef)) {
      return;
    }
    holdDelayRef.current = window.setTimeout(() => {
      holdRepeatRef.current = window.setInterval(() => {
        onPressRef.current(keyDef);
      }, 55);
    }, 380);
  }

  return (
    <button
      type="button"
      className={`key key-${variant}${active ? " is-active" : ""}${dualLegend ? " key-has-legends" : ""}`}
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
        onPress(keyDef);
        startHold();
      }}
      onPointerUp={clearHold}
      onPointerCancel={clearHold}
      onPointerLeave={() => {
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
    >
      {dualLegend ? (
        <span className="key-legends" aria-hidden="true">
          <span className="key-legend-shift">{keyDef.shifted}</span>
          <span className="key-legend-primary">{keyDef.primary}</span>
        </span>
      ) : (
        <span className="key-label">
          {visibleKeyLabel(keyDef)}
        </span>
      )}
      {homeMark ? <span className="key-nub" aria-hidden="true" /> : null}
    </button>
  );
}
