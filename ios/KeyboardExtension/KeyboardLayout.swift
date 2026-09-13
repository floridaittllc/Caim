// KeyboardLayout.swift
// Data model describing the keys and the three key "planes" (letters, numbers,
// symbols) of the CAIm QWERTY keyboard.

#if canImport(UIKit)
import Foundation

/// A single logical key on the keyboard.
enum Key: Equatable {
    /// A character key. The displayed glyph is derived from the base string and
    /// the current shift state (for letters).
    case character(String)
    case backspace
    case shift
    /// Switch to the numbers plane ("123").
    case toNumbers
    /// Switch to the symbols plane ("#+=").
    case toSymbols
    /// Switch back to the letters plane ("ABC").
    case toLetters
    case space
    case `return`
    /// Globe key — advance to the next system keyboard.
    case nextKeyboard
}

/// Which set of keys is currently displayed.
enum KeyPlane {
    case letters
    case numbers
    case symbols
}

enum KeyboardLayout {
    /// Returns the row-by-row key layout for a given plane.
    static func rows(for plane: KeyPlane) -> [[Key]] {
        switch plane {
        case .letters:
            return [
                "qwertyuiop".map { Key.character(String($0)) },
                "asdfghjkl".map { Key.character(String($0)) },
                [.shift] + "zxcvbnm".map { Key.character(String($0)) } + [.backspace],
                [.nextKeyboard, .toNumbers, .space, .return],
            ]
        case .numbers:
            return [
                "1234567890".map { Key.character(String($0)) },
                "-/:;()$&@\"".map { Key.character(String($0)) },
                [.toSymbols] + ".,?!'".map { Key.character(String($0)) } + [.backspace],
                [.nextKeyboard, .toLetters, .space, .return],
            ]
        case .symbols:
            return [
                "[]{}#%^*+=".map { Key.character(String($0)) },
                "_\\|~<>€£¥•".map { Key.character(String($0)) },
                [.toNumbers] + ".,?!'".map { Key.character(String($0)) } + [.backspace],
                [.nextKeyboard, .toLetters, .space, .return],
            ]
        }
    }
}
#endif
