# CAIm Keyboard

Hybrid product: **Expo app shell** + **native Swift iOS Keyboard Extension** + **Grok (xAI) cloud brain** (temporary until on-device / your own server).

| Layer | Role |
| --- | --- |
| **Expo (React Native)** | Companion app: Home, in-app keyboard preview, rewrite playground, settings / API key / Full vs PIN modes. Develop and run with Expo. |
| **Swift Keyboard Extension** | Real iOS *system* keyboard. Cannot be pure Expo. Sources live in `targets/CAImKeyboardExtension/`. |
| **Grok (xAI)** | Cloud Chat Completions for rewrite / grammar / tone. Offline heuristics when no key. |

> Expo **cannot** install itself as an iOS system keyboard. The Swift extension is required for that path.

## Quick start (Expo)

```sh
npm install
cp .env.example .env   # optional: add EXPO_PUBLIC_XAI_API_KEY or XAI_API_KEY
npx expo start
```

Then press `w` (web), `i` (iOS simulator on macOS), or scan the QR code with Expo Go.

```sh
npm test
npm run typecheck
```

### API key

1. Create a key at [console.x.ai](https://console.x.ai/).
2. Put it in `.env` as `EXPO_PUBLIC_XAI_API_KEY=...` **or** paste it in the app **Settings** tab (stored with SecureStore on device; AsyncStorage on web).
3. Without a key, Rewrite still works via local heuristics.

Grok client calls `https://api.x.ai/v1/chat/completions` (default model `grok-3`).

## App screens

- **Home** — product overview and architecture
- **Keyboard** — in-app Full QWERTY (hardware-style rows, always-visible number row) or PIN pad inserting into a `TextInput`
- **Rewrite** — Professional / Casual / Shorten / Expand via Grok (+ corrections JSON when returned)
- **Settings** — API key, Full/PIN default, writing goals, system-keyboard setup notes

## iOS system keyboard (Swift)

```sh
npx expo prebuild --platform ios
```

The config plugin `plugins/withCAImKeyboardExtension.js` copies `targets/CAImKeyboardExtension/` into `ios/CAImKeyboardExtension/`.

Then on a Mac with Xcode + Apple Developer:

1. Open the generated iOS project in Xcode.
2. Add a **Custom Keyboard Extension** target (or attach the copied Swift sources).
3. Use the provided `Info.plist` (`RequestsOpenAccess` = true).
4. Enable App Group `group.com.caim.keyboard` on host + extension.
5. Run on a **physical device**, then enable the keyboard under **Settings → General → Keyboard → Keyboards**, and turn on **Allow Full Access** for Grok network calls.

See `targets/CAImKeyboardExtension/README.md` for file-level detail.

## Project layout

```
app/                         Expo Router screens
components/keyboard/         In-app Expo keyboard UI
lib/grok/                    xAI client, parse, offline fallback
lib/settings.ts              SecureStore API key + prefs
targets/CAImKeyboardExtension/   Native Swift keyboard extension
plugins/withCAImKeyboardExtension.js
__tests__/                   Jest unit tests
```

## Codespaces / Cloud Agent

```sh
npm install
npx expo start --web
npm test && npm run typecheck
```
