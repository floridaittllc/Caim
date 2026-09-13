import { useEffect, useRef } from "react";
import type { KeyboardState } from "./types";

type ComposerProps = {
  state: KeyboardState;
  onReplace: (value: string, cursor: number) => void;
};

export function Composer({ state, onReplace }: ComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const displayValue = state.mode === "pin" ? "•".repeat(state.value.length) : state.value;

  useEffect(() => {
    const field = ref.current;
    if (!field || document.activeElement !== field) {
      return;
    }
    const cursor = Math.min(state.cursor, displayValue.length);
    field.setSelectionRange(cursor, cursor);
  }, [displayValue, state.cursor]);

  return (
    <label className="composer">
      <span className="composer-label">
        {state.mode === "pin" ? "PIN" : "Typed text"}
      </span>
      <textarea
        ref={ref}
        className="composer-field"
        data-testid="composer"
        spellCheck={state.mode !== "pin"}
        autoCapitalize="off"
        autoCorrect="off"
        rows={state.mode === "pin" ? 1 : 5}
        readOnly={state.mode === "pin"}
        inputMode={state.mode === "pin" ? "none" : "text"}
        value={displayValue}
        onChange={(event) => {
          if (state.mode === "pin") {
            const digits = event.target.value.replace(/\D/g, "");
            onReplace(digits, digits.length);
            return;
          }
          onReplace(event.target.value, event.target.selectionStart ?? event.target.value.length);
        }}
        onSelect={(event) => {
          const target = event.currentTarget;
          onReplace(state.value, target.selectionStart ?? state.cursor);
        }}
        placeholder={state.mode === "pin" ? "Enter PIN" : "Tap keys below, or type on a physical keyboard"}
      />
    </label>
  );
}
