# CAIm Keyboard

Hybrid product: **Expo app shell** + **native Swift iOS Keyboard Extension** + **Grok (xAI) cloud brain** (temporary until on-device / your own server).

| Layer | Role |
| --- | --- |
| **Expo (React Native)** | Companion app: Home, in-app keyboard preview, rewrite playground, settings / API key / Full vs PIN modes. Develop and run with Expo. |
| **Swift Keyboard Extension** | Real iOS *system* keyboard. Cannot be pure Expo. Sources live in `targets/CAImKeyboardExtension/`. |
| **Grok (xAI)** | Cloud Chat Completions for rewrite / grammar / tone. Offline heuristics when no key. |

> Expo **cannot** install itself as an iOS system keyboard. The Swift extension is required for that path.

## Swift engine on Linux (no Mac)

Layouts, shift/caps, insert-at-cursor, backspace, PIN rules, and Grok JSON parsing live in pure Swift:

```sh
cd Packages/CAImKeyboardCore
swift test
```

That runs here with the official Swift Linux toolchain from [swift.org](https://www.swift.org/install/linux/). Ubuntu 24.04 uses the `swift-*-ubuntu24.04.tar.gz` download. The core target does not import UIKit, so `swift test` does not need Xcode.

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

## iOS system keyboard UI (Xcode on a Mac)

UIKit and the Keyboard Extension SDK ship with Xcode. They are an Apple platform SDK, so `KeyboardViewController` cannot be compiled on Linux. Installing the system keyboard is a device run from Xcode:

```sh
npx expo prebuild --platform ios
```

The config plugin `plugins/withCAImKeyboardExtension.js` copies `targets/CAImKeyboardExtension/` into `ios/CAImKeyboardExtension/`.

Then on a Mac with Xcode + Apple Developer:

1. Open the generated iOS project in Xcode.
2. Add a **Custom Keyboard Extension** target (or attach the copied Swift sources).
3. Add the local package `Packages/CAImKeyboardCore` to that target (`../Packages/CAImKeyboardCore` from the `ios/` folder). The extension calls this engine through `KeyboardEngineAdapter`.
4. Use the provided `Info.plist` (`RequestsOpenAccess` = true).
5. Enable App Group `group.com.caim.keyboard` on host + extension.
6. Run on a **physical device**, then enable the keyboard under **Settings → General → Keyboard → Keyboards**, and turn on **Allow Full Access** for Grok network calls.

See `targets/CAImKeyboardExtension/README.md` for file-level detail.

## Project layout

```
app/                         Expo Router screens
components/keyboard/         In-app Expo keyboard UI
lib/grok/                    xAI client, parse, offline fallback
lib/settings.ts              SecureStore API key + prefs
Packages/CAImKeyboardCore/      Pure Swift engine (`swift test` on Linux)
targets/CAImKeyboardExtension/   UIKit keyboard extension (Xcode only)
plugins/withCAImKeyboardExtension.js
__tests__/                   Jest unit tests
```

## Codespaces / Cloud Agent

```sh
npm install
npx expo start --web
npm test && npm run typecheck
cd Packages/CAImKeyboardCore && swift test
```
