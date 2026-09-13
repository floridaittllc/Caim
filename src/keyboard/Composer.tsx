import { useEffect, useRef, type Ref } from "react";
import type { KeyboardState } from "./types";

type ComposerProps = {
  state: KeyboardState;
  onReplace: (value: string, cursor: number) => void;
  inputRef?: Ref<HTMLTextAreaElement>;
};

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) {
    return;
  }
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  ref.current = value;
}

export function Composer({ state, onReplace, inputRef }: ComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const displayValue = state.mode === "pin" ? "•".repeat(state.value.length) : state.value;

  useEffect(() => {
    const field = ref.current;
    if (!field) {
      return;
    }
    const cursor = Math.min(state.cursor, displayValue.length);
    try {
      field.setSelectionRange(cursor, cursor);
    } catch {
      // jsdom and some mobile WebViews reject selection updates while unmounted.
    }
  }, [displayValue, state.cursor]);

  return (
    <label className="composer">
      <span className="composer-label">
        {state.mode === "pin" ? "PIN" : "Typed text"}
      </span>
      <textarea
        ref={(node) => {
          ref.current = node;
          assignRef(inputRef, node);
        }}
        className="composer-field"
        data-testid="composer"
        spellCheck={state.mode !== "pin"}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        rows={state.mode === "pin" ? 1 : 5}
        readOnly
        inputMode="none"
        enterKeyHint="done"
        value={displayValue}
        onSelect={(event) => {
          const target = event.currentTarget;
          onReplace(state.value, target.selectionStart ?? state.cursor);
        }}
        placeholder={state.mode === "pin" ? "Enter PIN" : "Tap keys below, or type on a physical keyboard"}
      />
    </label>
  );
}
