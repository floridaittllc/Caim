import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/lib/theme';

export default function HomeScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>CAIm</Text>
      <Text style={styles.tagline}>
        Intelligent keyboard companion — Expo app shell, native Swift system
        keyboard, Grok cloud brain for now.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>How the pieces fit</Text>
        <Text style={styles.cardBody}>
          • Expo (this app): settings, onboarding, rewrite playground, in-app
          keyboard preview.
        </Text>
        <Text style={styles.cardBody}>
          • Swift Keyboard Extension: the real iOS system keyboard (cannot be
          pure Expo).
        </Text>
        <Text style={styles.cardBody}>
          • Grok (xAI): temporary cloud inference until on-device or your own
          server.
        </Text>
      </View>

      <Link href="/keyboard" asChild>
        <Pressable style={styles.cta}>
          <Text style={styles.ctaText}>Try keyboard preview</Text>
        </Pressable>
      </Link>
      <Link href="/rewrite" asChild>
        <Pressable style={[styles.cta, styles.ctaSecondary]}>
          <Text style={styles.ctaText}>Rewrite with Grok</Text>
        </Pressable>
      </Link>
      <Link href="/settings" asChild>
        <Pressable style={[styles.cta, styles.ctaGhost]}>
          <Text style={[styles.ctaText, styles.ctaGhostText]}>
            Configure API key
          </Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 24,
    gap: 16,
    paddingBottom: 48,
  },
  brand: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaSecondary: {
    backgroundColor: colors.accentDim,
  },
  ctaGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ctaText: {
    color: colors.bg,
    fontWeight: '700',
    fontSize: 16,
  },
  ctaGhostText: {
    color: colors.text,
  },
});
