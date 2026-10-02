import { requireOptionalNativeModule } from 'expo-modules-core';

import { KEYBOARD_API_KEY_DEFAULTS_KEY, type KeyboardSharedKey } from './keys';

export {
  KEYBOARD_API_KEY_DEFAULTS_KEY,
  KEYBOARD_APP_GROUP_ID,
  KEYBOARD_SHARED_KEYS,
  type KeyboardSharedKey,
} from './keys';

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

/** Write (or remove, for empty values) keys in the keyboard App Group. No-op off iOS. */
export function syncSharedValues(
  values: Partial<Record<KeyboardSharedKey, string | null | undefined>>,
): void {
  if (!native) {
    return;
  }
  for (const [key, value] of Object.entries(values)) {
    const trimmed = value?.trim() ?? '';
    if (trimmed) {
      native.setSharedValue(key, trimmed);
    } else {
      native.removeSharedValue(key);
    }
  }
}

/** Publish the xAI key into the keyboard extension App Group. No-op off iOS. */
export function syncSharedApiKey(apiKey: string | null | undefined): void {
  syncSharedValues({ [KEYBOARD_API_KEY_DEFAULTS_KEY]: apiKey });
}
