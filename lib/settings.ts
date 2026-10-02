import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncSharedApiKey, syncSharedValues } from 'caim-app-group';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import {
  DEFAULT_AI_CONFIG,
  parseAIConfig,
  sharedValuesForKeyboard,
  type KeyboardAIConfig,
} from '@/lib/inference/keyboardConfig';

export { DEFAULT_AI_CONFIG, type KeyboardAIConfig } from '@/lib/inference/keyboardConfig';

const API_KEY_SECURE = 'caim_xai_api_key';
const SELF_HOSTED_KEY_SECURE = 'caim_selfhosted_api_key';
const PREFS_KEY = 'caim_prefs_v1';
const AI_CONFIG_KEY = 'caim_keyboard_ai_v1';

export type KeyboardMode = 'full' | 'pin';

export type WritingGoal = 'clarity' | 'tone' | 'brevity' | 'grammar';

export type AppPrefs = {
  keyboardMode: KeyboardMode;
  goals: WritingGoal[];
};

const DEFAULT_PREFS: AppPrefs = {
  keyboardMode: 'full',
  goals: ['grammar', 'clarity'],
};

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getApiKey(): Promise<string | null> {
  return secureGet(API_KEY_SECURE);
}

export async function publishStoredApiKeyToKeyboard(): Promise<void> {
  try {
    const stored = (await getApiKey())?.trim() ?? '';
    const env =
      process.env.EXPO_PUBLIC_XAI_API_KEY?.trim() ||
      process.env.XAI_API_KEY?.trim() ||
      '';
    syncSharedApiKey(stored || env || null);
  } catch {
    // SecureStore and the App Group module are absent on web and in Expo Go.
  }
}

export async function setApiKey(key: string): Promise<void> {
  const trimmed = key.trim();
  if (!trimmed) {
    await secureDelete(API_KEY_SECURE);
  } else {
    await secureSet(API_KEY_SECURE, trimmed);
  }
  await publishStoredApiKeyToKeyboard();
}

export async function getPrefs(): Promise<AppPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) {
      return DEFAULT_PREFS;
    }
    const parsed = JSON.parse(raw) as Partial<AppPrefs>;
    return {
      keyboardMode: parsed.keyboardMode === 'pin' ? 'pin' : 'full',
      goals: Array.isArray(parsed.goals) && parsed.goals.length
        ? (parsed.goals as WritingGoal[])
        : DEFAULT_PREFS.goals,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function setPrefs(prefs: AppPrefs): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export async function getAIConfig(): Promise<KeyboardAIConfig> {
  try {
    return parseAIConfig(await AsyncStorage.getItem(AI_CONFIG_KEY));
  } catch {
    return DEFAULT_AI_CONFIG;
  }
}

export async function getSelfHostedApiKey(): Promise<string | null> {
  return secureGet(SELF_HOSTED_KEY_SECURE);
}

export async function publishAIConfigToKeyboard(): Promise<void> {
  try {
    const [config, key] = await Promise.all([getAIConfig(), getSelfHostedApiKey()]);
    syncSharedValues(sharedValuesForKeyboard(config, key));
  } catch {
    // SecureStore and the App Group module are absent on web and in Expo Go.
  }
}

export async function setAIConfig(config: KeyboardAIConfig, selfHostedApiKey: string): Promise<void> {
  await AsyncStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
  const trimmed = selfHostedApiKey.trim();
  if (trimmed) {
    await secureSet(SELF_HOSTED_KEY_SECURE, trimmed);
  } else {
    await secureDelete(SELF_HOSTED_KEY_SECURE);
  }
  await publishAIConfigToKeyboard();
}
