import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { KeyButton } from '@/components/keyboard/KeyButton';
import {
  FULL_LAYOUT,
  displayLabel,
  resolveInsert,
  type KeyDef,
} from '@/components/keyboard/layouts';
import { colors } from '@/lib/theme';

export type ComposerState = {
  text: string;
  selection: { start: number; end: number };
};

type Props = {
  value: ComposerState;
  onChange: (next: ComposerState) => void;
};

function insertAt(
  state: ComposerState,
  chunk: string,
): ComposerState {
  const { text, selection } = state;
  const before = text.slice(0, selection.start);
  const after = text.slice(selection.end);
  const nextText = `${before}${chunk}${after}`;
  const caret = selection.start + chunk.length;
  return { text: nextText, selection: { start: caret, end: caret } };
}

function deleteBackward(state: ComposerState): ComposerState {
  const { text, selection } = state;
  if (selection.start !== selection.end) {
    return insertAt(state, '');
  }
  if (selection.start === 0) {
    return state;
  }
  const before = text.slice(0, selection.start - 1);
  const after = text.slice(selection.end);
  const caret = selection.start - 1;
  return { text: `${before}${after}`, selection: { start: caret, end: caret } };
}

export function OnScreenKeyboard({ value, onChange }: Props) {
  const [shift, setShift] = useState(false);
  const [caps, setCaps] = useState(false);
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const clearHold = useCallback(() => {
    if (holdRef.current) {
      clearInterval(holdRef.current);
      holdRef.current = null;
    }
  }, []);

  useEffect(() => clearHold, [clearHold]);

  const apply = useCallback(
    (mutator: (current: ComposerState) => ComposerState) => {
      onChange(mutator(valueRef.current));
    },
    [onChange],
  );

  const handleKey = useCallback(
    (key: KeyDef) => {
      const action = key.action;
      switch (action) {
        case 'backspace':
          apply(deleteBackward);
          return;
        case 'shift':
          setShift((s) => !s);
          return;
        case 'caps':
          setCaps((c) => !c);
          return;
        case 'escape':
          apply(() => ({ text: '', selection: { start: 0, end: 0 } }));
          return;
        case 'home':
          apply((s) => ({ ...s, selection: { start: 0, end: 0 } }));
          return;
        case 'end':
          apply((s) => {
            const n = s.text.length;
            return { ...s, selection: { start: n, end: n } };
          });
          return;
        case 'left':
          apply((s) => {
            const start = Math.max(0, s.selection.start - 1);
            return { ...s, selection: { start, end: start } };
          });
          return;
        case 'right':
          apply((s) => {
            const start = Math.min(s.text.length, s.selection.start + 1);
            return { ...s, selection: { start, end: start } };
          });
          return;
        case 'space':
        case 'tab':
        case 'enter':
        case undefined: {
          const chunk = resolveInsert(key, shift, caps);
          if (chunk == null) {
            return;
          }
          apply((s) => insertAt(s, chunk));
          if (shift && action !== 'space') {
            setShift(false);
          }
          return;
        }
        default: {
          const _exhaustive: never = action;
          void _exhaustive;
        }
      }
    },
    [apply, caps, shift],
  );

  const startHold = useCallback(
    (key: KeyDef) => {
      clearHold();
      if (key.action !== 'backspace' && key.action !== 'left' && key.action !== 'right' && key.action !== 'space') {
        return;
      }
      holdRef.current = setInterval(() => handleKey(key), 60);
    },
    [clearHold, handleKey],
  );

  return (
    <View style={styles.board} accessibilityLabel="CAIm on-screen keyboard">
      {FULL_LAYOUT.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((key) => {
            const active =
              (key.action === 'shift' && shift) ||
              (key.action === 'caps' && caps);
            return (
              <KeyButton
                key={key.id}
                label={displayLabel(key, shift, caps)}
                width={key.width}
                special={key.special}
                active={active}
                onPress={() => {
                  clearHold();
                  handleKey(key);
                }}
                onLongPress={() => startHold(key)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
});
