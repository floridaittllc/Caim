import type { KeyboardRow, KeyboardState, KeyDef } from "./types";
import { KeyButton } from "./KeyButton";

type KeyboardProps = {
  rows: KeyboardRow[];
  state: KeyboardState;
  onPress: (key: KeyDef) => void;
  onDoublePress?: (key: KeyDef) => void;
};

export function Keyboard({ rows, state, onPress, onDoublePress }: KeyboardProps) {
  const label = state.mode === "pin" ? "PIN keypad" : "On-screen keyboard";

  return (
    <div
      className={`keyboard keyboard-${state.mode}`}
      role="group"
      aria-label={label}
      data-testid="keyboard"
    >
      {rows.map((row, rowIndex) => (
        <div className="keyboard-row" key={`row-${rowIndex}`}>
          {row.map((keyDef) => (
            <KeyButton
              key={keyDef.id}
              keyDef={keyDef}
              state={state}
              onPress={onPress}
              onDoublePress={onDoublePress}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
