# CAIm Write

Native Android writing assistant (Grammarly-class) branded **CAIm Write**.

## Quick start

Open the Android project in Android Studio:

```text
android/
```

Full docs, feature list, offline vs API behavior, and test commands: **[android/README.md](android/README.md)**.

```bash
cd android
./gradlew :write-engine:test   # JVM engine tests (no emulator needed)
```

## Product

- Real-time spelling, grammar, clarity, engagement suggestions
- Tone chips + Goals (audience / formality / domain)
- Six rewrite styles with a premium offline rewrite engine (optional OpenAI)
- Local draft history (Room), settings, onboarding, share/copy
- Jetpack Compose UI — light & dark

This repository’s primary product on this branch is **CAIm Write**, not an on-screen keyboard.
