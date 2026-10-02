export const KEYBOARD_APP_GROUP_ID = 'group.com.caim.keyboard';
export const KEYBOARD_API_KEY_DEFAULTS_KEY = 'xai_api_key';

/** Must match `InferenceSettings.Key` in Packages/CAImKeyboardCore. */
export const KEYBOARD_SHARED_KEYS = {
  provider: 'inference_provider',
  selfHostedBaseUrl: 'selfhosted_base_url',
  selfHostedApiKey: 'selfhosted_api_key',
  selfHostedModel: 'selfhosted_model',
  xaiApiKey: KEYBOARD_API_KEY_DEFAULTS_KEY,
  backgroundGrammar: 'background_grammar',
  onDeviceEnabled: 'on_device_enabled',
} as const;

export type KeyboardSharedKey = (typeof KEYBOARD_SHARED_KEYS)[keyof typeof KEYBOARD_SHARED_KEYS];
