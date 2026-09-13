import { useCallback, useState } from "react";
import { Composer } from "./keyboard/Composer";
import { Keyboard } from "./keyboard/Keyboard";
import { useKeyboard } from "./keyboard/useKeyboard";
import type { KeyDef } from "./keyboard/types";

export function App() {
  const { state, rows, pressKey, dispatch } = useKeyboard();
  const [copied, setCopied] = useState(false);

  const onPress = useCallback(
    (key: KeyDef) => {
      pressKey(key);
    },
    [pressKey],
  );

  const onDoublePress = useCallback(
    (key: KeyDef) => {
      if (key.kind === "special" && key.id === "shift") {
        dispatch({ type: "toggleCaps" });
      }
    },
    [dispatch],
  );

  async function copyText() {
    const text = state.value;
    if (!text) {
      return;
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="shell">
      <header className="masthead">
        <p className="eyebrow">CAIm</p>
        <h1>Keyboard</h1>
        <p className="lede">
          Large-key on-screen keyboard for kiosk, tablet, and classroom use. Double-tap shift for caps lock.
        </p>
      </header>

      <div className="toolbar" role="toolbar" aria-label="Keyboard options">
        <div className="mode-switch" role="group" aria-label="Keyboard layout">
          <button
            type="button"
            className={state.mode === "qwerty" ? "chip is-on" : "chip"}
            aria-pressed={state.mode === "qwerty"}
            data-testid="mode-qwerty"
            onClick={() => dispatch({ type: "setMode", mode: "qwerty" })}
          >
            Full
          </button>
          <button
            type="button"
            className={state.mode === "pin" ? "chip is-on" : "chip"}
            aria-pressed={state.mode === "pin"}
            data-testid="mode-pin"
            onClick={() => dispatch({ type: "setMode", mode: "pin" })}
          >
            PIN
          </button>
        </div>
        <div className="toolbar-actions">
          <button type="button" className="text-btn" data-testid="copy" onClick={() => void copyText()}>
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            className="text-btn"
            data-testid="clear"
            onClick={() => dispatch({ type: "clear" })}
          >
            Clear
          </button>
        </div>
      </div>

      <Composer
        state={state}
        onReplace={(value, cursor) => dispatch({ type: "replace", value, cursor })}
      />

      {state.pinCaptured ? (
        <p className="status banner" data-testid="pin-submitted" role="status">
          PIN captured ({state.value.length} digits)
        </p>
      ) : (
        <p className="status muted">
          {state.capsLock ? "Caps lock on" : state.shift ? "Shift" : `${state.value.length} characters`}
        </p>
      )}

      <Keyboard
        rows={rows}
        state={state}
        onPress={onPress}
        onDoublePress={onDoublePress}
      />
    </div>
  );
}
