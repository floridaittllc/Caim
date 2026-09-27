import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  getApiKey,
  getPrefs,
  setApiKey,
  setPrefs,
  type AppPrefs,
  type KeyboardMode,
  type WritingGoal,
} from '@/lib/settings';
import { colors } from '@/lib/theme';

const GOALS: { id: WritingGoal; label: string }[] = [
  { id: 'grammar', label: 'Grammar' },
  { id: 'clarity', label: 'Clarity' },
  { id: 'tone', label: 'Tone' },
  { id: 'brevity', label: 'Brevity' },
];

export default function SettingsScreen() {
  const [apiKey, setApiKeyField] = useState('');
  const [savedHint, setSavedHint] = useState('');
  const [prefs, setPrefsState] = useState<AppPrefs>({
    keyboardMode: 'full',
    goals: ['grammar', 'clarity'],
  });

  useEffect(() => {
    void (async () => {
      const [key, stored] = await Promise.all([getApiKey(), getPrefs()]);
      if (key) {
        setApiKeyField(key);
      }
      setPrefsState(stored);
    })();
  }, []);

  const saveKey = useCallback(async () => {
    await setApiKey(apiKey);
    setSavedHint(
      apiKey.trim()
        ? 'API key saved securely on device.'
        : 'API key cleared — offline heuristics will be used.',
    );
  }, [apiKey]);

  const updatePrefs = useCallback(async (next: AppPrefs) => {
    setPrefsState(next);
    await setPrefs(next);
  }, []);

  const toggleGoal = (goal: WritingGoal) => {
    const has = prefs.goals.includes(goal);
    const goals = has
      ? prefs.goals.filter((g) => g !== goal)
      : [...prefs.goals, goal];
    void updatePrefs({ ...prefs, goals: goals.length ? goals : ['grammar'] });
  };

  const setMode = (keyboardMode: KeyboardMode) => {
    void updatePrefs({ ...prefs, keyboardMode });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.section}>xAI / Grok API key</Text>
      <Text style={styles.help}>
        Stored with SecureStore (AsyncStorage on web). Prefer{' '}
        <Text style={styles.mono}>EXPO_PUBLIC_XAI_API_KEY</Text> in{' '}
        <Text style={styles.mono}>.env</Text> for local dev, or paste below.
        Never commit keys.
      </Text>
      <TextInput
        style={styles.input}
        value={apiKey}
        onChangeText={setApiKeyField}
        placeholder="xai-..."
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />
      <Pressable style={styles.cta} onPress={() => void saveKey()}>
        <Text style={styles.ctaText}>Save API key</Text>
      </Pressable>
      {savedHint ? <Text style={styles.hint}>{savedHint}</Text> : null}

      <Text style={styles.section}>Default keyboard mode</Text>
      <View style={styles.row}>
        {(['full', 'pin'] as KeyboardMode[]).map((mode) => (
          <Pressable
            key={mode}
            style={[
              styles.chip,
              prefs.keyboardMode === mode && styles.chipActive,
            ]}
            onPress={() => setMode(mode)}
          >
            <Text
              style={[
                styles.chipText,
                prefs.keyboardMode === mode && styles.chipTextActive,
              ]}
            >
              {mode === 'full' ? 'Full QWERTY' : 'PIN'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>Writing goals</Text>
      <View style={styles.row}>
        {GOALS.map((goal) => {
          const active = prefs.goals.includes(goal.id);
          return (
            <Pressable
              key={goal.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggleGoal(goal.id)}
            >
              <Text
                style={[styles.chipText, active && styles.chipTextActive]}
              >
                {goal.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.section}>System keyboard (iOS)</Text>
      <Text style={styles.help}>
        Expo cannot install as an iOS system keyboard by itself. After{' '}
        <Text style={styles.mono}>npx expo prebuild</Text>, open the iOS project
        in Xcode, add the target under{' '}
        <Text style={styles.mono}>targets/CAImKeyboardExtension</Text> (or use
        the config plugin), enable App Groups + Full Access, then run on a
        device with an Apple Developer account. Enable the keyboard in Settings
        → General → Keyboard → Keyboards.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 10, paddingBottom: 48 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 8 },
  section: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  help: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  mono: { color: colors.accent, fontFamily: 'SpaceMono' },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 12,
    fontSize: 15,
  },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaText: { color: colors.bg, fontWeight: '700' },
  hint: { color: colors.accent, fontSize: 13 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: { color: colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: colors.bg },
});
