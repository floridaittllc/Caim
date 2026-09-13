// SpellChecker.swift
// Dictionary-based spell checking with edit-distance ranked corrections.
//
// Pure Swift stdlib only — no Foundation.

/// Checks individual words against a dictionary and proposes ranked
/// corrections for words it does not recognize.
public struct SpellChecker {
    /// Recognized words, lowercased.
    public let dictionary: Set<String>
    /// Optional frequency scores (higher == more common) used to break ties
    /// between equally-close corrections.
    public let frequency: [String: Int]
    /// Maximum number of correction candidates returned per word.
    public let maxSuggestions: Int

    public init(dictionary: Set<String> = Lexicon.words,
                frequency: [String: Int] = Lexicon.frequency,
                maxSuggestions: Int = 5) {
        // Normalize to lowercase so lookups are case-insensitive.
        self.dictionary = Set(dictionary.map { $0.lowercased() })
        self.frequency = frequency
        self.maxSuggestions = maxSuggestions
    }

    /// True if `word` is not recognized and looks like something we can check
    /// (alphabetic, not a single protected letter).
    public func isMisspelled(_ word: String) -> Bool {
        let lower = word.lowercased()
        if lower.isEmpty { return false }
        if Lexicon.neverFlag.contains(lower) { return false }
        // Ignore tokens containing digits (e.g. "h1", handled elsewhere).
        if word.contains(where: { $0.isNumber }) { return false }
        return !dictionary.contains(lower)
    }

    /// Returns up to `maxSuggestions` corrections for `word`, best first.
    /// Ranking: smaller edit distance first, then higher frequency, then
    /// alphabetical. Capitalization of the original word is preserved.
    public func suggestions(for word: String) -> [String] {
        let lower = word.lowercased()
        // Directly-known common misspelling takes precedence.
        if let fixed = Lexicon.commonMisspellings[lower] {
            return [matchCase(of: word, to: fixed)]
        }

        let maxDistance = lower.count <= 4 ? 1 : 2
        var scored: [(word: String, distance: Int, freq: Int)] = []
        for candidate in dictionary {
            // Cheap length pre-filter before the O(n*m) distance computation.
            if abs(candidate.count - lower.count) > maxDistance { continue }
            let distance = EditDistance.damerauLevenshtein(lower, candidate)
            if distance <= maxDistance {
                scored.append((candidate, distance, frequency[candidate] ?? 0))
            }
        }

        scored.sort { lhs, rhs in
            if lhs.distance != rhs.distance { return lhs.distance < rhs.distance }
            if lhs.freq != rhs.freq { return lhs.freq > rhs.freq }
            return lhs.word < rhs.word
        }

        return scored.prefix(maxSuggestions).map { matchCase(of: word, to: $0.word) }
    }

    /// Applies the capitalization pattern of `original` to `replacement`:
    /// all-caps -> all-caps, leading-cap -> leading-cap, otherwise unchanged.
    func matchCase(of original: String, to replacement: String) -> String {
        guard let first = original.first else { return replacement }
        let isAllCaps = original.count > 1 && original.allSatisfy { $0.isUppercase || !$0.isLetter }
        if isAllCaps { return replacement.uppercased() }
        if first.isUppercase {
            return replacement.prefix(1).uppercased() + replacement.dropFirst()
        }
        return replacement
    }
}
