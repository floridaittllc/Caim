# CAIm — a native iOS Grammarly-style keyboard

CAIm is a native iOS custom keyboard that checks grammar, spelling and style as
you type — a "Grammarly clone" for the iPhone. It is built around **GrammarKit**,
a dependency-free Swift engine that runs the same code on iOS *and* Linux, so the
core intelligence can be unit-tested and demonstrated on any machine (including
this headless CI environment) even though the UIKit keyboard itself needs
Xcode/macOS to build and an iPhone/simulator to run.

## Repository layout

```
Package.swift                    Swift package manifest (GrammarKit + demo + tests)
Sources/
  GrammarKit/                    The platform-independent engine (pure Swift, no UIKit/Foundation)
    Suggestion.swift             Suggestion value type + category + range helpers
    Tokenizer.swift              Word tokenizer with character-offset ranges
    Levenshtein.swift            Levenshtein & Damerau–Levenshtein edit distance
    Lexicon.swift                Word list, frequency table, misspelling maps
    SpellChecker.swift           Dictionary lookup + ranked corrections
    GrammarRules.swift           Grammar / capitalization / punctuation rules
    GrammarChecker.swift         Public orchestrator: check(_:) / autocorrect(_:)
  grammar-demo/
    main.swift                   CLI that runs the engine over sample sentences
Tests/
  GrammarKitTests/               48 XCTest cases across 5 files
ios/                             Native iOS project (opens in Xcode)
  project.yml                    XcodeGen spec (reproducible .xcodeproj)
  CAImKeyboard/                  Host / container app (SwiftUI)
  KeyboardExtension/             Custom keyboard extension (UIInputViewController)
.cursor/
  environment.json               Cloud Agent environment config
  install.sh                     Idempotent Swift-toolchain + build bootstrap
```

## Architecture

Two layers, one shared brain:

1. **GrammarKit (portable engine).** Pure Swift with **no `import UIKit` and no
   `import Foundation`**, so it compiles on Linux and iOS from the identical
   source. `GrammarChecker.check(_:)` returns `[Suggestion]`, each with a
   character-offset `range`, a human message, ranked `replacements`, and a
   `category` (`spelling`, `grammar`, `capitalization`, `punctuation`, `style`).
   `autocorrect(_:)` applies the top fix of every non-overlapping suggestion.

2. **iOS app + keyboard extension (UIKit/SwiftUI).** The keyboard extension
   (`KeyboardViewController: UIInputViewController`) renders a full QWERTY layout
   and, on every keystroke, feeds the text before the cursor into GrammarKit and
   shows the best correction in a Grammarly-style suggestion bar. Tapping a
   suggestion rewrites the word at the cursor via the text document proxy. The
   host app hosts the same engine in a live SwiftUI sandbox and explains how to
   enable the keyboard.

### What the engine detects

| Category | Examples |
| --- | --- |
| Spelling | `teh → the`, `recieve → receive`, `resturant → restaurant` (Damerau–Levenshtein ranking, frequency tie-break) |
| Grammar | `your → you're`, `its → it's`, `better then → better than`, `a apple → an apple`, `an cat → a cat`, `a honest → an honest` |
| Punctuation | missing contraction apostrophes (`dont → don't`), space before `,`/`.`, missing space after `.`/`,` |
| Capitalization | start-of-sentence capitalization, standalone `i → I` |
| Style | duplicated words (`the the`) |

The built-in dictionary is intentionally compact (~1,000 common words) but
sufficient for short-message text; production apps can inject a full word list
via `GrammarChecker(dictionary:)`.

## Build & test the engine on Linux (validated here)

```bash
# Install the Swift toolchain + build (idempotent):
bash .cursor/install.sh

# Or, once Swift is on PATH:
swift build
swift test          # 48 tests
swift run grammar-demo
swift run grammar-demo "your going to the resturant , its teh best"
```

This project's engine is validated on Linux with `swift test` (48 passing tests)
on Swift 6.3.3. See `/opt/cursor/artifacts/swift-test-output.log` for captured
output.

## Open and run the iOS app in Xcode

The keyboard UI is native UIKit and therefore requires **macOS + Xcode**; it
cannot be compiled on Linux.

1. Install [XcodeGen](https://github.com/yonaskolb/XcodeGen)
   (`brew install xcodegen`).
2. Generate the project:
   ```bash
   cd ios
   xcodegen generate      # creates CAImKeyboard.xcodeproj
   open CAImKeyboard.xcodeproj
   ```
3. Select the **CAImKeyboard** scheme, choose an iPhone simulator or a connected
   device, and Run. (Set your development team for signing if running on a real
   device.)

### Enable the keyboard on the iPhone

1. Open **Settings → General → Keyboard → Keyboards**.
2. Tap **Add New Keyboard…** and choose **CAIm Keyboard**.
3. In any text field, tap the 🌐 globe key to switch to CAIm.
4. Start typing — corrections appear in the bar above the keys; tap one to
   apply it.

Open Access is **not** required: grammar checking runs entirely on-device inside
the extension.

## Cloud Agent environment

`.cursor/environment.json` runs `.cursor/install.sh`, which:

- installs the Swift runtime's system libraries (`apt-get`, idempotent),
- installs the open-source Swift toolchain for Linux via
  [`swiftly`](https://www.swift.org/install/linux/) (skipped if `swift` already
  exists), and
- runs `swift build` so `swift test` is ready.

The script is safe to run repeatedly (it detects an existing toolchain and only
appends the `swiftly` env line to `~/.bashrc` once).

## Notes / limitations

- The UIKit keyboard extension and SwiftUI host app require Xcode/macOS to build
  and an iPhone/simulator to run; they are authored as correct native Swift but
  are not compiled in this Linux environment.
- The bundled dictionary and rule set favor precision on common short-message
  mistakes over exhaustive coverage. Homophone/agreement cases beyond the listed
  rules (e.g. `there/their`, subject–verb agreement) are intentionally out of
  scope for this version.
