import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { rewriteWithGrok } from '@/lib/grok/client';
import type { Correction, GrokSuggestion, RewriteStyle } from '@/lib/grok/types';
import { getApiKey } from '@/lib/settings';
import { colors } from '@/lib/theme';

const STYLES: { id: RewriteStyle; label: string }[] = [
  { id: 'professional', label: 'Professional' },
  { id: 'casual', label: 'Casual' },
  { id: 'shorten', label: 'Shorten' },
  { id: 'expand', label: 'Expand' },
];

export default function RewriteScreen() {
  const [text, setText] = useState(
    "i cant belive this works — let's fix grammer and tone",
  );
  const [style, setStyle] = useState<RewriteStyle>('professional');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GrokSuggestion | null>(null);
  const [apiConfigured, setApiConfigured] = useState(false);

  useEffect(() => {
    void getApiKey().then((key) => setApiConfigured(Boolean(key)));
  }, []);

  const run = useCallback(async () => {
    setLoading(true);
    setResult(null);
    try {
      const key = await getApiKey();
      const suggestion = await rewriteWithGrok(text, style, { apiKey: key });
      setResult(suggestion);
    } finally {
      setLoading(false);
    }
  }, [style, text]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Rewrite / Fix</Text>
      <Text style={styles.subtitle}>
        Cloud brain: Grok (xAI Chat Completions). Without an API key, offline
        heuristics keep the playground usable.
      </Text>
      <Text style={styles.badge}>
        {apiConfigured ? 'API key on device' : 'Offline / no key — heuristics'}
      </Text>

      <TextInput
        style={styles.input}
        multiline
        value={text}
        onChangeText={setText}
        placeholderTextColor={colors.textMuted}
      />

      <View style={styles.stylesRow}>
        {STYLES.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setStyle(item.id)}
            style={[styles.chip, style === item.id && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                style === item.id && styles.chipTextActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[styles.cta, loading && styles.ctaDisabled]}
        onPress={() => void run()}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <Text style={styles.ctaText}>Run with Grok</Text>
        )}
      </Pressable>

      {result ? <ResultCard result={result} onApply={setText} /> : null}
    </ScrollView>
  );
}

function ResultCard({
  result,
  onApply,
}: {
  result: GrokSuggestion;
  onApply: (text: string) => void;
}) {
  return (
    <View style={styles.result}>
      <Text style={styles.resultMeta}>
        Source: {result.source}
        {result.model ? ` · ${result.model}` : ''}
      </Text>
      {result.warning ? (
        <Text style={styles.warning}>{result.warning}</Text>
      ) : null}
      <Text style={styles.resultText}>{result.rewritten}</Text>
      <Pressable style={styles.apply} onPress={() => onApply(result.rewritten)}>
        <Text style={styles.applyText}>Apply rewrite</Text>
      </Pressable>
      {result.corrections.length > 0 ? (
        <View style={styles.corrections}>
          <Text style={styles.corrTitle}>Suggestions</Text>
          {result.corrections.map((c: Correction, i: number) => (
            <Text key={`${c.original}-${i}`} style={styles.corrItem}>
              “{c.original}” → “{c.suggestion}” ({c.reason})
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  badge: {
    alignSelf: 'flex-start',
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    minHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  stylesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  cta: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.7 },
  ctaText: { color: colors.bg, fontWeight: '700', fontSize: 16 },
  result: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  resultMeta: { color: colors.textMuted, fontSize: 12 },
  warning: { color: colors.danger, fontSize: 13 },
  resultText: { color: colors.text, fontSize: 16, lineHeight: 24 },
  apply: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  applyText: { color: colors.accent, fontWeight: '700' },
  corrections: { gap: 4, marginTop: 4 },
  corrTitle: { color: colors.text, fontWeight: '700' },
  corrItem: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
});
