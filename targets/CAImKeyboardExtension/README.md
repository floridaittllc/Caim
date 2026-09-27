/**
 CAIm iOS Keyboard Extension
 ============================

 Expo alone cannot register as an iOS *system* keyboard. This folder is the
 native Custom Keyboard Extension (UIKit) meant to be wired into the iOS app
 produced by `npx expo prebuild`.

 Setup (Xcode + Apple Developer required)
 ----------------------------------------
 1. From the repo root: `npx expo prebuild --platform ios`
 2. Open `ios/CAIm.xcworkspace` (or `.xcodeproj`) in Xcode on a Mac.
 3. File → New → Target → Custom Keyboard Extension, or copy these sources
    into a new target named `CAImKeyboardExtension`.
 4. Add the local package `Packages/CAImKeyboardCore` to that target
    (`../Packages/CAImKeyboardCore` from the generated `ios/` folder).
 5. Set the target's Info.plist to this folder's `Info.plist` (RequestsOpenAccess = YES).
 6. Enable App Groups on both the host app and the extension:
      group.com.caim.keyboard
 7. Run the host app on a physical device, then:
      Settings → General → Keyboard → Keyboards → Add New Keyboard → CAIm
      Enable "Allow Full Access" for Grok network calls.

 The keyboard engine (layouts, shift/caps, cursor edits, PIN, Grok JSON) is
 `Packages/CAImKeyboardCore`. On Linux:

     cd Packages/CAImKeyboardCore && swift test

 This folder is only the UIKit host. Link that local package in the extension
 target so these files can `import CAImKeyboardCore`.

 Files
 -----
 - KeyboardViewController.swift — UIInputViewController; calls KeyboardEngineAdapter
 - KeyboardEngineAdapter.swift — `#if canImport(UIKit)` bridge onto textDocumentProxy
 - KeyboardView.swift — Renders KeyboardModel.rows (QWERTY or PIN)
 - GrokClient.swift — App Group API key + CAImKeyboardCore.GrokRewriteClient
 - Info.plist — keyboard extension attributes

 The Expo config plugin at `plugins/withCAImKeyboardExtension.js` is a scaffold
 that copies this tree into `ios/CAImKeyboardExtension` during prebuild. Full
 pbxproj wiring still needs Xcode (or a follow-up plugin that edits the project).
 */
