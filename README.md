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

## Install on your iPhone

Expo Go cannot register a system keyboard. UIKit still compiles only on Apple's builders. `eas build` runs `expo prebuild` there, and `plugins/withCaimKeyboard.js` injects the Swift keyboard extension (sources, extension target, `RequestsOpenAccess`, App Group `group.com.caim.keyboard`, and the local package `Packages/CAImKeyboardCore`). A paid Apple Developer Program membership is required for an internal device install.

1. `npm i -g eas-cli` (or use `npx eas-cli` in place of `eas` below).
2. `eas login`
3. `eas device:create` (registers the iPhone). If this repo is not linked to Expo yet, run `eas init` first so `app.json` gets `extra.eas.projectId`.
4. `eas build --platform ios --profile preview` (or `--profile development`). Sign in with the Apple Developer account that should sign `com.caim.keyboard`, and allow App Group `group.com.caim.keyboard` when EAS asks.
5. Install the link / QR on the phone, then Settings → General → Keyboard → Keyboards → add CAIm. Turn on Allow Full Access. Open the CAIm app and save the xAI API key so it is copied into the App Group.

`preview` is an internal release build with the keyboard embedded. `development` is that same native extension plus `expo-dev-client`.

```sh
npx expo prebuild --platform ios
```

On Linux, prebuild stops before CocoaPods and Xcode. EAS Build is the command that produces the iPhone binary. The extension calls `CAImKeyboardCore` through `KeyboardEngineAdapter`.

See `targets/CAImKeyboardExtension/README.md` for the Swift files.

## Project layout

```
app/                         Expo Router screens
components/keyboard/         In-app Expo keyboard UI
lib/grok/                    xAI client, parse, offline fallback
lib/settings.ts              SecureStore API key + prefs
Packages/CAImKeyboardCore/      Pure Swift engine (`swift test` on Linux)
targets/CAImKeyboardExtension/   UIKit keyboard; EAS embeds it and links the core package
plugins/withCaimKeyboard.js  Expo config plugin (pbxproj, entitlements, App Group)
modules/caim-app-group/      Host App Group writer for the xAI API key
eas.json                     preview + development iOS device profiles
__tests__/                   Jest unit tests
```

## Codespaces / Cloud Agent

```sh
npm install
npx expo start --web
npm test && npm run typecheck
cd Packages/CAImKeyboardCore && swift test
```
