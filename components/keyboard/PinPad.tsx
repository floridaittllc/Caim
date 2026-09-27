import { StyleSheet, Text, View } from 'react-native';

import { KeyButton } from '@/components/keyboard/KeyButton';
import { colors } from '@/lib/theme';

const MAX_PIN = 8;

type Props = {
  value: string;
  onChange: (next: string) => void;
  onSubmit?: (pin: string) => void;
};

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['clear', '0', '⌫'],
];

export function PinPad({ value, onChange, onSubmit }: Props) {
  const masked = '•'.repeat(value.length) + '○'.repeat(Math.max(0, MAX_PIN - value.length));

  const press = (label: string) => {
    if (label === 'clear') {
      onChange('');
      return;
    }
    if (label === '⌫') {
      onChange(value.slice(0, -1));
      return;
    }
    if (value.length >= MAX_PIN) {
      return;
    }
    const next = `${value}${label}`;
    onChange(next);
    if (next.length === MAX_PIN && onSubmit) {
      onSubmit(next);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.mask} accessibilityLabel={`PIN length ${value.length}`}>
        {masked}
      </Text>
      <View style={styles.grid}>
        {ROWS.map((row) => (
          <View key={row.join('-')} style={styles.row}>
            {row.map((label) => (
              <KeyButton
                key={label}
                label={label === 'clear' ? 'Clear' : label}
                special={label === 'clear' || label === '⌫'}
                width={1}
                style={styles.pinKey}
                onPress={() => press(label)}
              />
            ))}
          </View>
        ))}
      </View>
      <KeyButton
        label="Enter PIN"
        special
        style={styles.enter}
        onPress={() => {
          if (value.length > 0) {
            onSubmit?.(value);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.pin,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  mask: {
    color: colors.accent,
    fontSize: 28,
    letterSpacing: 8,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  grid: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
  },
  pinKey: {
    minHeight: 56,
  },
  enter: {
    minHeight: 48,
  },
});
