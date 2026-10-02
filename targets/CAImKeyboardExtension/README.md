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

 The keyboard engine (layouts, shift/caps, cursor edits, PIN, provider routing,
 grammar JSON parsing, debounce) is `Packages/CAImKeyboardCore`. On Linux:

     cd Packages/CAImKeyboardCore && swift test

 This folder is only the UIKit host. The config plugin links
 `Packages/CAImKeyboardCore` so these files can `import CAImKeyboardCore`.

 Background grammar
 ------------------
 About 600 ms after typing pauses, the current paragraph before the cursor
 (`documentContextBeforeInput`, at most 300 characters) is checked. New input
 cancels the in-flight check. Order: Apple on-device model -> self-hosted
 endpoint (RunPod, see server/runpod) -> Grok. `UITextChecker` spelling shows
 instantly while the model runs. The toolbar shows the issue count and a chip;
 tapping it applies the replacement.

 On-device (Foundation Models) is compiled only with the iOS 26 SDK, runs only
 on iOS 26 Apple Intelligence devices, and is gated by
 `SystemLanguageModel.default.availability`. Apple does not document keyboard
 extensions as a supported host. Inference runs in a system process, not in
 the extension's ~50-70 MB memory budget, but the provider turns itself off
 for the session after two failures so the router falls through.

 Without Full Access the keyboard cannot read the App Group or use the network,
 so only on-device and spelling run, and the toolbar says so.

 Files
 -----
 - KeyboardViewController.swift — UIInputViewController; toolbar + keys
 - KeyboardEngineAdapter.swift — `#if canImport(UIKit)` bridge onto textDocumentProxy
 - KeyboardView.swift — Renders KeyboardModel.rows (QWERTY or PIN)
 - KeyboardAssistant.swift — App Group settings -> InferenceRouter, debounced check, apply fix, rewrite
 - GrammarToolbarView.swift — Issue count / status and the tap-to-fix chip
 - OnDeviceGrammarProvider.swift — Foundation Models provider (iOS 26+, gated)
 - LocalSpellChecker.swift — UITextChecker spelling suggestions
 - Info.plist — keyboard extension attributes

 The Expo config plugin at `plugins/withCaimKeyboard.js` copies this tree and
 wires the Xcode target during `expo prebuild` / EAS Build.
 */
