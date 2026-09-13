// Suggestion.swift
// Core value types describing a single writing issue detected by GrammarKit.
//
// This file is intentionally free of Foundation and UIKit so that it compiles
// unchanged on Linux (for `swift test`) and on iOS (inside the keyboard
// extension).

/// The class of writing issue a `Suggestion` represents. The UI can use this
/// to pick an icon/color and to let the user filter categories.
public enum SuggestionCategory: String, Sendable, CaseIterable, Equatable {
    /// A word that is not recognized by the dictionary.
    case spelling
    /// A grammatical error (confusable words, article agreement, ...).
    case grammar
    /// A capitalization problem (start of sentence, standalone "i", ...).
    case capitalization
    /// A punctuation/spacing problem.
    case punctuation
    /// A stylistic issue that is not strictly wrong (e.g. duplicated word).
    case style
}

/// A single detected issue in the analysed text.
///
/// `range` is expressed as a half-open interval of **Character offsets** into
/// the original `String` (i.e. counting `Character`s, not UTF-16 or UTF-8 code
/// units). This keeps the type trivially `Codable`/testable and avoids leaking
/// `String.Index`, which is awkward to serialize across a keyboard extension
/// boundary. Use `Suggestion.stringRange(in:)` to convert back to a
/// `Range<String.Index>` when you need to mutate the text.
public struct Suggestion: Sendable, Equatable {
    /// Half-open range of character offsets `[lowerBound, upperBound)`.
    public let range: Range<Int>
    /// Human readable explanation, suitable for display in the suggestion bar.
    public let message: String
    /// Ordered list of replacement candidates, best first. May be empty when
    /// the engine can only flag the problem without proposing a fix.
    public let replacements: [String]
    /// The kind of issue.
    public let category: SuggestionCategory

    public init(range: Range<Int>,
                message: String,
                replacements: [String],
                category: SuggestionCategory) {
        self.range = range
        self.message = message
        self.replacements = replacements
        self.category = category
    }

    /// The substring of `text` that this suggestion refers to, or `nil` if the
    /// range no longer fits the supplied string.
    public func matchedText(in text: String) -> String? {
        guard let r = stringRange(in: text) else { return nil }
        return String(text[r])
    }

    /// Converts the character-offset `range` into a `Range<String.Index>` for
    /// `text`, or `nil` when out of bounds.
    public func stringRange(in text: String) -> Range<String.Index>? {
        guard range.lowerBound >= 0, range.upperBound <= text.count,
              range.lowerBound <= range.upperBound else { return nil }
        let start = text.index(text.startIndex, offsetBy: range.lowerBound)
        let end = text.index(start, offsetBy: range.upperBound - range.lowerBound)
        return start..<end
    }
}

public extension Array where Element == Suggestion {
    /// Applies the first replacement of every non-overlapping suggestion to
    /// `text`, working right-to-left so earlier offsets stay valid. Overlapping
    /// suggestions (later ones) are skipped. Handy for demos and tests.
    func applyingFirstReplacements(to text: String) -> String {
        var result = text
        var lastLowerBound = Int.max
        // Apply from the highest offset down so indices remain stable.
        for suggestion in self.sorted(by: { $0.range.lowerBound > $1.range.lowerBound }) {
            guard let replacement = suggestion.replacements.first else { continue }
            // Skip suggestions that overlap one we already applied.
            guard suggestion.range.upperBound <= lastLowerBound else { continue }
            guard let r = suggestion.stringRange(in: result) else { continue }
            result.replaceSubrange(r, with: replacement)
            lastLowerBound = suggestion.range.lowerBound
        }
        return result
    }
}
