import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  DEFAULT_SELF_HOSTED_MODEL,
  normalizeBaseUrl,
  testSelfHostedConnection,
  type ProviderPreference,
} from '@/lib/inference/endpoint';
import {
  DEFAULT_AI_CONFIG,
  getAIConfig,
  getApiKey,
  getPrefs,
  getSelfHostedApiKey,
  setAIConfig,
  setApiKey,
  setPrefs,
  type AppPrefs,
  type KeyboardAIConfig,
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

const PROVIDERS: { id: ProviderPreference; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'onDevice', label: 'On-device' },
  { id: 'selfHosted', label: 'RunPod / self-hosted' },
  { id: 'grok', label: 'Grok' },
];

type TestState =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'done'; ok: boolean; message: string };

export default function SettingsScreen() {
  const [apiKey, setApiKeyField] = useState('');
  const [savedHint, setSavedHint] = useState('');
  const [prefs, setPrefsState] = useState<AppPrefs>({
    keyboardMode: 'full',
    goals: ['grammar', 'clarity'],
  });
  const [aiConfig, setAIConfigState] = useState<KeyboardAIConfig>(DEFAULT_AI_CONFIG);
  const [selfHostedKey, setSelfHostedKey] = useState('');
  const [aiHint, setAIHint] = useState('');
  const [testState, setTestState] = useState<TestState>({ kind: 'idle' });

  useEffect(() => {
    void (async () => {
      const [key, stored, ai, hostedKey] = await Promise.all([
        getApiKey(),
        getPrefs(),
        getAIConfig(),
        getSelfHostedApiKey(),
      ]);
      if (key) {
        setApiKeyField(key);
      }
      setPrefsState(stored);
      setAIConfigState(ai);
      if (hostedKey) {
        setSelfHostedKey(hostedKey);
      }
    })();
  }, []);

  const saveAI = useCallback(
    async (next: KeyboardAIConfig, hint?: string) => {
      setAIConfigState(next);
      await setAIConfig(next, selfHostedKey);
      if (hint) {
        setAIHint(hint);
      }
    },
    [selfHostedKey],
  );

  const saveEndpoint = useCallback(async () => {
    const url = aiConfig.selfHostedBaseUrl.trim();
    if (url && !normalizeBaseUrl(url)) {
      setAIHint('That URL is not valid. Use an https URL or a RunPod endpoint id.');
      return;
    }
    await saveAI(
      aiConfig,
      url ? 'Endpoint saved and shared with the keyboard.' : 'Self-hosted endpoint cleared.',
    );
  }, [aiConfig, saveAI]);

  const testConnection = useCallback(async () => {
    setTestState({ kind: 'running' });
    const result = await testSelfHostedConnection({
      baseUrl: aiConfig.selfHostedBaseUrl,
      apiKey: selfHostedKey,
      model: aiConfig.selfHostedModel,
    });
    setTestState(
      result.ok
        ? {
            kind: 'done',
            ok: true,
            message: `Connected in ${(result.latencyMs / 1000).toFixed(1)}s · ${result.issueCount} issues found in the sample · model ${result.model ?? 'unknown'}`,
          }
        : { kind: 'done', ok: false, message: result.message },
    );
  }, [aiConfig, selfHostedKey]);

  const normalizedPreview = aiConfig.selfHostedBaseUrl.trim()
    ? normalizeBaseUrl(aiConfig.selfHostedBaseUrl)
    : null;

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

      <Text style={styles.section}>Background grammar (keyboard)</Text>
      <Text style={styles.help}>
        While you type, the CAIm keyboard checks the current sentence after a short pause.
        Auto tries Apple's on-device model first (iOS 26 with Apple Intelligence), then your
        self-hosted endpoint (e.g. RunPod), then Grok. Network providers need Allow Full Access.
      </Text>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Check grammar while typing</Text>
        <Switch
          value={aiConfig.backgroundGrammar}
          onValueChange={(backgroundGrammar) => void saveAI({ ...aiConfig, backgroundGrammar })}
        />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Use on-device model when available</Text>
        <Switch
          value={aiConfig.onDeviceEnabled}
          onValueChange={(onDeviceEnabled) => void saveAI({ ...aiConfig, onDeviceEnabled })}
        />
      </View>
      <Text style={styles.label}>Preferred provider</Text>
      <View style={styles.row}>
        {PROVIDERS.map((provider) => {
          const active = aiConfig.provider === provider.id;
          return (
            <Pressable
              key={provider.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => void saveAI({ ...aiConfig, provider: provider.id })}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {provider.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.help}>
        The preferred provider goes first; the others stay as fallbacks.
      </Text>

      <Text style={styles.label}>Self-hosted endpoint (RunPod)</Text>
      <TextInput
        style={styles.input}
        value={aiConfig.selfHostedBaseUrl}
        onChangeText={(selfHostedBaseUrl) => {
          setAIConfigState({ ...aiConfig, selfHostedBaseUrl });
          setTestState({ kind: 'idle' });
        }}
        placeholder="RunPod endpoint id or https://…/v1"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      {normalizedPreview ? (
        <Text style={styles.help}>
          Requests go to <Text style={styles.mono}>{normalizedPreview}/chat/completions</Text>
        </Text>
      ) : null}
      <TextInput
        style={styles.input}
        value={selfHostedKey}
        onChangeText={(value) => {
          setSelfHostedKey(value);
          setTestState({ kind: 'idle' });
        }}
        placeholder="API key (RunPod key, or the Pod's VLLM_API_KEY)"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        value={aiConfig.selfHostedModel}
        onChangeText={(selfHostedModel) => setAIConfigState({ ...aiConfig, selfHostedModel })}
        placeholder={`Model (default ${DEFAULT_SELF_HOSTED_MODEL})`}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <View style={styles.row}>
        <Pressable style={[styles.cta, styles.flex]} onPress={() => void saveEndpoint()}>
          <Text style={styles.ctaText}>Save endpoint</Text>
        </Pressable>
        <Pressable
          style={[styles.ctaSecondary, styles.flex]}
          disabled={testState.kind === 'running'}
          onPress={() => void testConnection()}
        >
          {testState.kind === 'running' ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Text style={styles.ctaSecondaryText}>Test connection</Text>
          )}
        </Pressable>
      </View>
      {testState.kind === 'running' ? (
        <Text style={styles.help}>
          Sending a sample grammar check. A cold serverless worker can take a minute or two.
        </Text>
      ) : null}
      {testState.kind === 'done' ? (
        <Text style={testState.ok ? styles.hint : styles.error}>{testState.message}</Text>
      ) : null}
      {aiHint ? <Text style={styles.hint}>{aiHint}</Text> : null}

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

      <Text style={styles.section}>System keyboard (iPhone)</Text>
      <Text style={styles.help}>
        The CAIm system keyboard ships inside the native iOS build (EAS preview
        or development), not Expo Go. Install that build, then open Settings →
        General → Keyboard → Keyboards → Add New Keyboard → CAIm. Turn on Allow
        Full Access so this API key can reach the keyboard through App Group{' '}
        <Text style={styles.mono}>group.com.caim.keyboard</Text>.
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
  ctaSecondary: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaSecondaryText: { color: colors.accent, fontWeight: '700' },
  flex: { flex: 1 },
  hint: { color: colors.accent, fontSize: 13 },
  error: { color: colors.danger, fontSize: 13 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 6 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchLabel: { color: colors.text, fontSize: 14, flex: 1 },
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
