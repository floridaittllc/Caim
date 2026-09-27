import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_KEY_SECURE = 'caim_xai_api_key';
const PREFS_KEY = 'caim_prefs_v1';

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

export async function setApiKey(key: string): Promise<void> {
  const trimmed = key.trim();
  if (!trimmed) {
    await secureDelete(API_KEY_SECURE);
    return;
  }
  await secureSet(API_KEY_SECURE, trimmed);
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
