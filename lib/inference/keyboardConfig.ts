import { KEYBOARD_SHARED_KEYS } from 'caim-app-group/src/keys';

import { PROVIDER_PREFERENCES, normalizeBaseUrl, type ProviderPreference } from './endpoint';

export type KeyboardAIConfig = {
  provider: ProviderPreference;
  selfHostedBaseUrl: string;
  selfHostedModel: string;
  backgroundGrammar: boolean;
  onDeviceEnabled: boolean;
};

export const DEFAULT_AI_CONFIG: KeyboardAIConfig = {
  provider: 'auto',
  selfHostedBaseUrl: '',
  selfHostedModel: '',
  backgroundGrammar: true,
  onDeviceEnabled: true,
};

export function parseAIConfig(raw: string | null): KeyboardAIConfig {
  if (!raw) {
    return DEFAULT_AI_CONFIG;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<KeyboardAIConfig>;
    return {
      provider: PROVIDER_PREFERENCES.includes(parsed.provider as ProviderPreference)
        ? (parsed.provider as ProviderPreference)
        : DEFAULT_AI_CONFIG.provider,
      selfHostedBaseUrl:
        typeof parsed.selfHostedBaseUrl === 'string' ? parsed.selfHostedBaseUrl : '',
      selfHostedModel: typeof parsed.selfHostedModel === 'string' ? parsed.selfHostedModel : '',
      backgroundGrammar: parsed.backgroundGrammar !== false,
      onDeviceEnabled: parsed.onDeviceEnabled !== false,
    };
  } catch {
    return DEFAULT_AI_CONFIG;
  }
}

/** Values the keyboard reads through `InferenceSettings` (Swift). Empty strings remove the key. */
export function sharedValuesForKeyboard(
  config: KeyboardAIConfig,
  selfHostedApiKey: string | null,
): Record<string, string> {
  return {
    [KEYBOARD_SHARED_KEYS.provider]: config.provider,
    [KEYBOARD_SHARED_KEYS.selfHostedBaseUrl]: normalizeBaseUrl(config.selfHostedBaseUrl) ?? '',
    [KEYBOARD_SHARED_KEYS.selfHostedApiKey]: selfHostedApiKey?.trim() ?? '',
    [KEYBOARD_SHARED_KEYS.selfHostedModel]: config.selfHostedModel.trim(),
    [KEYBOARD_SHARED_KEYS.backgroundGrammar]: config.backgroundGrammar ? 'on' : 'off',
    [KEYBOARD_SHARED_KEYS.onDeviceEnabled]: config.onDeviceEnabled ? 'on' : 'off',
  };
}
