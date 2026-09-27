/**
 CAIm iOS Keyboard Extension
 ============================

 Expo alone cannot register as an iOS *system* keyboard. This folder is the
 native Custom Keyboard Extension (UIKit) meant to be wired into the iOS app
 produced by `npx expo prebuild`.

 Setup
 -----
 `plugins/withCaimKeyboard.js` copies this folder into the iOS project on
 `expo prebuild` / EAS Build, adds the CAImKeyboardExtension target, sets
 RequestsOpenAccess, entitles App Group `group.com.caim.keyboard`, embeds the
 .appex, and links `Packages/CAImKeyboardCore`. Install on a phone with
 `eas build --platform ios --profile preview` (see the repo README). Expo Go
 does not include this extension.

 The keyboard engine (layouts, shift/caps, cursor edits, PIN, Grok JSON) is
 `Packages/CAImKeyboardCore`. On Linux:

     cd Packages/CAImKeyboardCore && swift test

 This folder is only the UIKit host. The config plugin links
 `Packages/CAImKeyboardCore` so these files can `import CAImKeyboardCore`.

 Files
 -----
 - KeyboardViewController.swift — UIInputViewController; calls KeyboardEngineAdapter
 - KeyboardEngineAdapter.swift — `#if canImport(UIKit)` bridge onto textDocumentProxy
 - KeyboardView.swift — Renders KeyboardModel.rows (QWERTY or PIN)
 - GrokClient.swift — App Group API key + CAImKeyboardCore.GrokRewriteClient
 - Info.plist — keyboard extension attributes

 The Expo config plugin at `plugins/withCaimKeyboard.js` copies this tree and
 wires the Xcode target during `expo prebuild` / EAS Build.
 */
