// GrammarChecker.swift
// Public entry point that orchestrates tokenization, spell checking and the
// grammar rules into a single ordered list of suggestions.
//
// Pure Swift stdlib only — no Foundation. Builds on Linux and iOS alike.

/// The main Grammarly-style engine. Create one (optionally with a custom
/// dictionary) and call `check(_:)` as the user types.
///
/// ```swift
/// let checker = GrammarChecker()
/// let issues = checker.check("i dont no if its correct")
/// for issue in issues { print(issue.message, issue.replacements) }
/// ```
public struct GrammarChecker {
    public let spellChecker: SpellChecker

    /// - Parameter dictionary: recognized words. Defaults to the built-in
    ///   `Lexicon.words`. Pass a larger list for production use.
    public init(dictionary: Set<String> = Lexicon.words,
                frequency: [String: Int] = Lexicon.frequency,
                maxSuggestions: Int = 5) {
        self.spellChecker = SpellChecker(dictionary: dictionary,
                                         frequency: frequency,
                                         maxSuggestions: maxSuggestions)
    }

    /// Analyses `text` and returns every detected issue, ordered by position
    /// in the text (and by category when two issues start at the same offset).
    public func check(_ text: String) -> [Suggestion] {
        let tokens = Tokenizer.words(in: text)

        // 1) Grammar / punctuation / style rules that never conflict with
        //    spelling (they act on recognized words or on raw characters).
        var suggestions: [Suggestion] = []
        suggestions += GrammarRules.missingApostrophe(text: text, tokens: tokens)
        suggestions += GrammarRules.confusableWords(text: text, tokens: tokens)
        suggestions += GrammarRules.articleAgreement(text: text, tokens: tokens)
        suggestions += GrammarRules.duplicatedWords(text: text, tokens: tokens)
        suggestions += GrammarRules.punctuationSpacing(text: text)

        // 2) Spell checking. Skip tokens that a contraction rule already owns
        //    (e.g. "dont" -> "don't") so we don't double-flag them.
        var misspelledRanges: Set<Range<Int>> = []
        for token in tokens {
            let lower = token.lowercased
            if Lexicon.missingApostrophe[lower] != nil { continue }
            guard spellChecker.isMisspelled(token.text) else { continue }
            misspelledRanges.insert(token.range)
            let replacements = spellChecker.suggestions(for: token.text)
            let message = replacements.isEmpty
                ? "\u{201C}\(token.text)\u{201D} may be misspelled."
                : "\u{201C}\(token.text)\u{201D} may be misspelled. Did you mean \u{201C}\(replacements[0])\u{201D}?"
            suggestions.append(Suggestion(
                range: token.range,
                message: message,
                replacements: replacements,
                category: .spelling))
        }

        // 3) Capitalization, but never on a token another rule already covers
        //    (avoids e.g. capitalizing a misspelling into "Teh").
        let coveredRanges = Set(suggestions.map { $0.range })
        for suggestion in GrammarRules.capitalization(text: text, tokens: tokens) {
            if coveredRanges.contains(suggestion.range) { continue }
            if misspelledRanges.contains(suggestion.range) { continue }
            suggestions.append(suggestion)
        }

        // 4) Deterministic ordering: by start offset, then category.
        suggestions.sort { lhs, rhs in
            if lhs.range.lowerBound != rhs.range.lowerBound {
                return lhs.range.lowerBound < rhs.range.lowerBound
            }
            return categoryPriority(lhs.category) < categoryPriority(rhs.category)
        }
        return suggestions
    }

    /// Convenience: apply the top replacement of each non-overlapping
    /// suggestion to produce a corrected string. Useful for demos/tests.
    public func autocorrect(_ text: String) -> String {
        return check(text).applyingFirstReplacements(to: text)
    }

    private func categoryPriority(_ category: SuggestionCategory) -> Int {
        switch category {
        case .spelling: return 0
        case .grammar: return 1
        case .capitalization: return 2
        case .punctuation: return 3
        case .style: return 4
        }
    }
}
