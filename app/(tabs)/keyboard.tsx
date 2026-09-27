import { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { OnScreenKeyboard, type ComposerState } from '@/components/keyboard/OnScreenKeyboard';
import { PinPad } from '@/components/keyboard/PinPad';
import { getPrefs, type KeyboardMode } from '@/lib/settings';
import { colors } from '@/lib/theme';

export default function KeyboardPreviewScreen() {
  const [mode, setMode] = useState<KeyboardMode>('full');
  const [composer, setComposer] = useState<ComposerState>({
    text: '',
    selection: { start: 0, end: 0 },
  });
  const [pin, setPin] = useState('');
  const [pinMessage, setPinMessage] = useState('');

  useEffect(() => {
    void getPrefs().then((prefs) => setMode(prefs.keyboardMode));
  }, []);

  const onComposerChange = useCallback((next: ComposerState) => {
    setComposer(next);
  }, []);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>In-app keyboard preview</Text>
      <Text style={styles.subtitle}>
        This is an Expo on-screen keyboard for testing. The iOS system keyboard
        is the native Swift extension under{' '}
        <Text style={styles.mono}>targets/CAImKeyboardExtension</Text>.
      </Text>

      <View style={styles.modeRow}>
        <Text
          style={[styles.modeChip, mode === 'full' && styles.modeActive]}
          onPress={() => setMode('full')}
        >
          Full QWERTY
        </Text>
        <Text
          style={[styles.modeChip, mode === 'pin' && styles.modeActive]}
          onPress={() => setMode('pin')}
        >
          PIN pad
        </Text>
      </View>

      {mode === 'full' ? (
        <>
          <TextInput
            style={styles.input}
            value={composer.text}
            onChangeText={(text) =>
              setComposer({
                text,
                selection: { start: text.length, end: text.length },
              })
            }
            onSelectionChange={(e) =>
              setComposer((s) => ({
                ...s,
                selection: e.nativeEvent.selection,
              }))
            }
            selection={composer.selection}
            multiline
            showSoftInputOnFocus={false}
            placeholder="Type with the on-screen keyboard…"
            placeholderTextColor={colors.textMuted}
          />
          <OnScreenKeyboard value={composer} onChange={onComposerChange} />
        </>
      ) : (
        <>
          <PinPad
            value={pin}
            onChange={setPin}
            onSubmit={(value) => setPinMessage(`PIN captured (${value.length} digits)`)}
          />
          {pinMessage ? <Text style={styles.pinMsg}>{pinMessage}</Text> : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  mono: { color: colors.accent, fontFamily: 'SpaceMono' },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeChip: {
    color: colors.textMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  modeActive: {
    color: colors.bg,
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  input: {
    minHeight: 100,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  pinMsg: { color: colors.accent, textAlign: 'center' },
});
