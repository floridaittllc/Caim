import { useCallback, useRef, useState } from "react";
import { Composer } from "./keyboard/Composer";
import { Keyboard } from "./keyboard/Keyboard";
import { useKeyboard } from "./keyboard/useKeyboard";
import type { KeyDef } from "./keyboard/types";
import { MAX_PIN_LENGTH } from "./keyboard/types";

type Notice = "copied" | "copy-failed" | null;

function statusMessage(args: {
  notice: Notice;
  mode: "qwerty" | "pin";
  valueLength: number;
  pinCaptured: boolean;
  capsLock: boolean;
  shift: boolean;
}): { text: string; tone: "banner" | "muted" } {
  const { notice, mode, valueLength, pinCaptured, capsLock, shift } = args;
  switch (notice) {
    case "copied":
      return { text: "Copied to clipboard", tone: "banner" };
    case "copy-failed":
      return { text: "Copy failed — clipboard unavailable", tone: "banner" };
    case null:
      break;
    default: {
      const exhaustive: never = notice;
      return exhaustive;
    }
  }

  if (pinCaptured) {
    return { text: `PIN captured (${valueLength} digits)`, tone: "banner" };
  }
  if (mode === "pin") {
    if (valueLength === 0) {
      return { text: "Enter a PIN, then press enter", tone: "muted" };
    }
    return { text: `${valueLength} / ${MAX_PIN_LENGTH} digits`, tone: "muted" };
  }
  if (capsLock) {
    return { text: "Caps lock on", tone: "muted" };
  }
  if (shift) {
    return { text: "Shift", tone: "muted" };
  }
  return { text: `${valueLength} characters`, tone: "muted" };
}

export function App() {
  const { state, rows, pressKey, dispatch } = useKeyboard();
  const [notice, setNotice] = useState<Notice>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const noticeTimer = useRef<number | null>(null);

  const focusComposer = useCallback(() => {
    composerRef.current?.focus({ preventScroll: true });
  }, []);

  const onPress = useCallback(
    (key: KeyDef) => {
      pressKey(key);
      window.requestAnimationFrame(focusComposer);
    },
    [pressKey, focusComposer],
  );

  const onDoublePress = useCallback(
    (key: KeyDef) => {
      if (key.kind === "special" && key.id === "shift") {
        dispatch({ type: "toggleCaps" });
      }
    },
    [dispatch],
  );

  const onLongPress = useCallback(
    (key: KeyDef) => {
      if (key.kind === "special" && key.id === "shift") {
        dispatch({ type: "toggleCaps" });
      }
    },
    [dispatch],
  );

  function flashNotice(next: Notice) {
    if (noticeTimer.current !== null) {
      window.clearTimeout(noticeTimer.current);
    }
    setNotice(next);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 1800);
  }

  async function copyText() {
    const text = state.value;
    if (!text) {
      return;
    }
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
        throw new Error("clipboard unavailable");
      }
      await navigator.clipboard.writeText(text);
      flashNotice("copied");
    } catch {
      flashNotice("copy-failed");
    }
  }

  const status = statusMessage({
    notice,
    mode: state.mode,
    valueLength: state.value.length,
    pinCaptured: state.pinCaptured,
    capsLock: state.capsLock,
    shift: state.shift,
  });
  const canUndo = state.history[state.mode].length > 0;

  return (
    <div className="shell">
      <header className="masthead">
        <p className="eyebrow">CAIm</p>
        <h1>Keyboard</h1>
        <p className="lede">
          Large-key on-screen keyboard for kiosk, tablet, and classroom use. Hold shift for caps lock,
          or double-tap it. Tab, home, and end live on the 123 layer.
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
          <button
            type="button"
            className="text-btn"
            data-testid="undo"
            disabled={!canUndo}
            onClick={() => dispatch({ type: "undo" })}
          >
            Undo
          </button>
          <button type="button" className="text-btn" data-testid="copy" onClick={() => void copyText()}>
            Copy
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
        inputRef={composerRef}
        onReplace={(value, cursor) => dispatch({ type: "replace", value, cursor })}
      />

      <p
        className={`status ${status.tone === "banner" ? "banner" : "muted"}`}
        data-testid={state.pinCaptured && notice === null ? "pin-submitted" : "status"}
        role="status"
      >
        {status.text}
      </p>

      <Keyboard
        rows={rows}
        state={state}
        onPress={onPress}
        onDoublePress={onDoublePress}
        onLongPress={onLongPress}
      />
    </div>
  );
}
