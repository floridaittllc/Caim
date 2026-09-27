import { requireOptionalNativeModule } from 'expo-modules-core';

export const KEYBOARD_APP_GROUP_ID = 'group.com.caim.keyboard';
export const KEYBOARD_API_KEY_DEFAULTS_KEY = 'xai_api_key';

type CaimAppGroupNative = {
  setSharedValue(key: string, value: string): void;
  removeSharedValue(key: string): void;
};

function loadNative(): CaimAppGroupNative | null {
  try {
    return requireOptionalNativeModule<CaimAppGroupNative>('CaimAppGroup');
  } catch {
    return null;
  }
}

const native = loadNative();

/** Publish the xAI key into the keyboard extension App Group. No-op off iOS. */
export function syncSharedApiKey(apiKey: string | null | undefined): void {
  if (!native) {
    return;
  }
  const trimmed = apiKey?.trim() ?? '';
  if (!trimmed) {
    native.removeSharedValue(KEYBOARD_API_KEY_DEFAULTS_KEY);
    return;
  }
  native.setSharedValue(KEYBOARD_API_KEY_DEFAULTS_KEY, trimmed);
}
