# CAIm Keyboard

On-screen keyboard for kiosk, tablet, and classroom use. Tap the keys to type, or use a physical keyboard when one is attached. The composer stays on `inputMode="none"` so a native OS keyboard does not cover the on-screen keys.

## Layouts

- **Full** — PC-style ANSI board: always-visible number row (`` ` 1 2 3 4 5 6 7 8 9 0 - = ``), dedicated Caps Lock, Tab, Backspace, Enter, left+right Shift/Ctrl/Alt/Win, Escape, and punctuation on the letter rows. No 123 / #+= layers.
- **PIN** — large numeric pad with masked digits, isolated from typed text, 8-digit max, enter disabled until a PIN is entered
- Shift latches for the next character (punctuation and case). Caps Lock is its own key and only affects letters.
- Arrow keys, home, and end move the composer caret; hold delete, space, or arrows to repeat
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
