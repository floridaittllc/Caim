import type { KeyboardRow, KeyboardState, KeyDef } from "./types";
import { KeyButton } from "./KeyButton";

type KeyboardProps = {
  rows: KeyboardRow[];
  state: KeyboardState;
  onPress: (key: KeyDef) => void;
};

export function Keyboard({ rows, state, onPress }: KeyboardProps) {
  const label = state.mode === "pin" ? "PIN keypad" : "On-screen keyboard";

  return (
    <div
      className={`keyboard keyboard-${state.mode}`}
      role="group"
      aria-label={label}
      data-testid="keyboard"
      data-shift={state.shift ? "on" : "off"}
      data-caps={state.capsLock ? "on" : "off"}
    >
      {rows.map((row, rowIndex) => (
        <div className="keyboard-row" key={`row-${rowIndex}`}>
          {row.map((keyDef) => (
            <KeyButton key={keyDef.id} keyDef={keyDef} state={state} onPress={onPress} />
          ))}
        </div>
      ))}
    </div>
  );
}
