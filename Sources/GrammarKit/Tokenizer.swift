// Tokenizer.swift
// Splits text into word tokens annotated with character-offset ranges.
//
// Pure Swift stdlib only — no Foundation. We deliberately avoid
// `CharacterSet`/`NSString` so the same code runs on Linux and iOS.

/// A single lexical token extracted from the input text.
public struct Token: Equatable, Sendable {
    /// The exact substring (original casing preserved).
    public let text: String
    /// Half-open character-offset range into the source string.
    public let range: Range<Int>

    public init(text: String, range: Range<Int>) {
        self.text = text
        self.range = range
    }

    /// Lowercased convenience accessor.
    public var lowercased: String { text.lowercased() }
}

public enum Tokenizer {
    /// A character that can appear *inside* a word: letters plus the apostrophe
    /// forms used by contractions ("don't", "you're", "it's"). A leading or
    /// trailing apostrophe is not part of the word and is trimmed.
    private static func isWordCharacter(_ c: Character) -> Bool {
        return c.isLetter || c == "'" || c == "\u{2019}" // ASCII + typographic apostrophe
    }

    /// Extracts word tokens (runs of letters, allowing interior apostrophes).
    /// Numbers, whitespace and punctuation are treated as separators.
    public static func words(in text: String) -> [Token] {
        var tokens: [Token] = []
        var offset = 0
        var currentStart: Int? = nil
        var currentChars: [Character] = []

        func flush(endOffset: Int) {
            guard let start = currentStart else { return }
            // Trim leading/trailing apostrophes that are not real word chars.
            var chars = currentChars
            var s = start
            var e = endOffset
            while let first = chars.first, first == "'" || first == "\u{2019}" {
                chars.removeFirst(); s += 1
            }
            while let last = chars.last, last == "'" || last == "\u{2019}" {
                chars.removeLast(); e -= 1
            }
            if !chars.isEmpty, chars.contains(where: { $0.isLetter }) {
                tokens.append(Token(text: String(chars), range: s..<e))
            }
            currentStart = nil
            currentChars = []
        }

        for c in text {
            if isWordCharacter(c) {
                if currentStart == nil { currentStart = offset }
                currentChars.append(c)
            } else {
                flush(endOffset: offset)
            }
            offset += 1
        }
        flush(endOffset: offset)
        return tokens
    }
}
