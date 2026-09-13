# CAIm Keyboard

On-screen keyboard for kiosk, tablet, and classroom use. Tap the keys to type, or use a physical keyboard when one is attached. The composer stays on `inputMode="none"` so a native OS keyboard does not cover the on-screen keys.

## Layouts

- **Full** — QWERTY with comma and period on the letter layer, shift, caps lock (hold or double-tap shift), caret arrows, numbers, and symbols
- **Numbers / symbols** — shifted punctuation on number keys (`1!`, `2@`, …). **Tab**, **home**, and **end** live on the 123 layer
- **PIN** — large keypad with masked digits, isolated from typed text, 8-digit max, enter disabled until a PIN is entered
- Hold delete, space, or arrows to repeat; double-space inserts a period
- Undo the current mode buffer from the toolbar or Ctrl/Cmd+Z
- Copy fails gracefully if the clipboard is unavailable

## Development

```sh
npm install
npm run dev
```

The app runs at [http://127.0.0.1:3000](http://127.0.0.1:3000).

```sh
npm test
npm run typecheck
npm run build
```

## Codespaces

1. Click the **Code** button
2. Select the **Codespaces** tab
3. Click **Create codespace on main**

The environment includes Python, Node.js, Git, and VS Code extensions for this repo.
