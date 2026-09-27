import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors } from '@/lib/theme';

type Props = {
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
  width?: number;
  special?: boolean;
  active?: boolean;
  style?: ViewStyle;
};

export function KeyButton({
  label,
  onPress,
  onLongPress,
  width = 1,
  special,
  active,
  style,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={({ pressed }) => [
        styles.key,
        special && styles.special,
        active && styles.active,
        { flex: width },
        (pressed || active) && styles.pressed,
        style,
      ]}
    >
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  key: {
    backgroundColor: colors.key,
    borderRadius: 6,
    minHeight: 40,
    marginHorizontal: 2,
    marginVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  special: {
    backgroundColor: colors.keySpecial,
  },
  active: {
    backgroundColor: colors.accentDim,
    borderColor: colors.accent,
  },
  pressed: {
    backgroundColor: colors.keyPress,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
});
