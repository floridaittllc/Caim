# CAIm Write

**CAIm Write** is a Grammarly-class Android writing assistant under the CAIm brand: compose or paste text, get real-time spelling/grammar/clarity suggestions, tone chips, vocabulary alternatives, Goals-aware multi-style rewrites, local draft history, and polished light/dark UI.

This is **not** an on-screen keyboard. It is a native-feeling writing product (Kotlin + Jetpack Compose) with a strong **offline-first** analysis and rewrite engine.

## Features

| Area | What you get |
|------|----------------|
| Editor | Large compose/paste surface with near-real-time analysis |
| Spelling & grammar | Underlines, tap-to-fix, one-tap apply, accept/dismiss all |
| Clarity | Wordy-phrase, filler, hedge, and redundancy suggestions |
| Tone | Tone chips (formal, confident, friendly, …) |
| Rewrite | Professional / Casual / Shorten / Expand / Friendly / Confident — structural + lexical transforms, not synonym soup |
| Suggestions UI | Counts, category filters (Correctness, Clarity, Engagement, Delivery) |
| Vocabulary | Long-press word → alternatives |
| Goals | Audience / formality / domain / intent (steers rewrites) |
| History | Room-backed local drafts |
| Share / copy | Cleaned text to clipboard or share sheet |
| Settings | EN-US, intensity, category toggles, appearance |
| Onboarding | Branded multi-step intro |

## Project layout

```
android/
  write-engine/     # Pure JVM Kotlin — analysis + rewrite (unit-tested)
  app/              # Jetpack Compose Android app (UI / data / navigation)
```

Clean layering:

- **UI** — Compose screens (editor, suggestions sheet, rewrite sheet, goals, history, settings, onboarding)
- **Domain / engine** — `write-engine` module (`CaimWriteEngine`)
- **Data** — Room documents + DataStore settings

## Open in Android Studio

1. Install [Android Studio](https://developer.android.com/studio) (Ladybug+ recommended) with Android SDK 35.
2. **File → Open** → select the `android/` directory (not only the repo root).
3. Let Gradle sync. Create an emulator (API 26+) or use a device.
4. Run the `app` configuration.

Optional OpenAI rewrites (offline fallback always available):

```bash
# environment
export OPENAI_API_KEY=sk-...

# or gradle property in ~/.gradle/gradle.properties
OPENAI_API_KEY=sk-...
```

## JVM unit tests (no Android SDK required)

From `android/`:

```bash
./gradlew :write-engine:test
```

These cover spelling/grammar detection, clarity transforms, tone signals, vocabulary, scoring, and all six rewrite styles.

## Offline vs API-backed

| Capability | Offline | With `OPENAI_API_KEY` |
|------------|---------|------------------------|
| Spelling / grammar / clarity / engagement | Yes | Same (local) |
| Tone detection | Yes | Same (local) |
| Vocabulary alternatives | Yes | Same (local) |
| Multi-style rewrite | Yes — `OfflineRewriteEngine` | Prefer OpenAI chat completions; **auto-fallback** to offline on missing key or errors |
| Documents / settings | Local Room + DataStore | Local |

## Brand / UI

Sea green + coral on foam/ink atmospheres, serif display + clean sans body — deliberately **not** purple-gradient AI chrome.

## License / notes

Part of the [floridaittllc/Caim](https://github.com/floridaittllc/Caim) repository. Earlier keyboard experiments may exist on other branches; this product branch is the Grammarly-clone writing assistant.
