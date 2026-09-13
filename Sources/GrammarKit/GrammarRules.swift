// GrammarRules.swift
// Rule-based grammar, capitalization and punctuation checks operating on the
// tokenized text. Pure Swift stdlib only — no Foundation.

enum GrammarRules {

    // MARK: Missing apostrophe in contractions ("dont" -> "don't")

    static func missingApostrophe(text: String, tokens: [Token]) -> [Suggestion] {
        var out: [Suggestion] = []
        for token in tokens {
            if let fixed = Lexicon.missingApostrophe[token.lowercased] {
                let cased = matchCase(of: token.text, to: fixed)
                out.append(Suggestion(
                    range: token.range,
                    message: "Missing apostrophe: use \u{201C}\(cased)\u{201D}.",
                    replacements: [cased],
                    category: .punctuation))
            }
        }
        return out
    }

    // MARK: Confusable words (your/you're, its/it's, then/than)

    private static let youreContext: Set<String> = [
        "welcome", "right", "wrong", "going", "gonna", "kidding", "awesome",
        "sure", "correct", "so", "too", "very", "really", "not", "able",
    ]
    private static let itsContext: Set<String> = [
        "a", "an", "the", "not", "going", "been", "time", "so", "very",
        "really", "my", "always", "never", "too", "just", "still", "only",
    ]
    private static let comparativeContext: Set<String> = [
        "better", "rather", "other", "more", "less", "worse", "greater",
        "fewer", "bigger", "smaller", "faster", "slower", "higher", "lower",
        "longer", "shorter", "older", "younger", "taller", "sooner",
    ]

    static func confusableWords(text: String, tokens: [Token]) -> [Suggestion] {
        var out: [Suggestion] = []
        for i in tokens.indices {
            let token = tokens[i]
            let lower = token.lowercased
            let next = i + 1 < tokens.count ? tokens[i + 1].lowercased : nil
            let prev = i > 0 ? tokens[i - 1].lowercased : nil

            switch lower {
            case "your":
                if let n = next, youreContext.contains(n) {
                    out.append(Suggestion(
                        range: token.range,
                        message: "Did you mean \u{201C}you\u{2019}re\u{201D} (you are)?",
                        replacements: [matchCase(of: token.text, to: "you're")],
                        category: .grammar))
                }
            case "its":
                if let n = next, itsContext.contains(n) {
                    out.append(Suggestion(
                        range: token.range,
                        message: "Did you mean \u{201C}it\u{2019}s\u{201D} (it is)?",
                        replacements: [matchCase(of: token.text, to: "it's")],
                        category: .grammar))
                }
            case "then":
                let prevIsComparative = (prev.map { comparativeContext.contains($0) } ?? false)
                    || (prev.map { $0.hasSuffix("er") && $0.count > 3 } ?? false)
                if prevIsComparative {
                    out.append(Suggestion(
                        range: token.range,
                        message: "Use \u{201C}than\u{201D} for comparisons.",
                        replacements: [matchCase(of: token.text, to: "than")],
                        category: .grammar))
                }
            default:
                break
            }
        }
        return out
    }

    // MARK: a / an agreement

    static func articleAgreement(text: String, tokens: [Token]) -> [Suggestion] {
        var out: [Suggestion] = []
        for i in tokens.indices where i + 1 < tokens.count {
            let article = tokens[i].lowercased
            guard article == "a" || article == "an" else { continue }
            let nextWord = tokens[i + 1].text
            let vowelSound = startsWithVowelSound(nextWord)
            if article == "a" && vowelSound {
                out.append(Suggestion(
                    range: tokens[i].range,
                    message: "Use \u{201C}an\u{201D} before a vowel sound.",
                    replacements: [matchCase(of: tokens[i].text, to: "an")],
                    category: .grammar))
            } else if article == "an" && !vowelSound {
                out.append(Suggestion(
                    range: tokens[i].range,
                    message: "Use \u{201C}a\u{201D} before a consonant sound.",
                    replacements: [matchCase(of: tokens[i].text, to: "a")],
                    category: .grammar))
            }
        }
        return out
    }

    static func startsWithVowelSound(_ word: String) -> Bool {
        let w = word.lowercased()
        guard let first = w.first else { return false }
        let vowels: Set<Character> = ["a", "e", "i", "o", "u"]
        // Words that start with a written vowel but a consonant sound.
        let consonantSoundVowelStart = ["uni", "use", "usu", "uro", "ube", "ubi",
                                        "eu", "ewe", "one", "once", "uk"]
        // Words that start with a silent 'h' (vowel sound).
        let silentH = ["hour", "honest", "honor", "honour", "heir"]

        if vowels.contains(first) {
            for prefix in consonantSoundVowelStart where w.hasPrefix(prefix) { return false }
            return true
        } else if first == "h" {
            for s in silentH where w.hasPrefix(s) { return true }
            return false
        }
        return false
    }

    // MARK: Duplicated words ("the the")

    static func duplicatedWords(text: String, tokens: [Token]) -> [Suggestion] {
        var out: [Suggestion] = []
        guard tokens.count >= 2 else { return out }
        for i in 1..<tokens.count {
            let prev = tokens[i - 1]
            let cur = tokens[i]
            if prev.lowercased == cur.lowercased && cur.lowercased.count > 1 {
                // Remove the duplicate together with the separator before it.
                let range = prev.range.upperBound..<cur.range.upperBound
                out.append(Suggestion(
                    range: range,
                    message: "Duplicated word \u{201C}\(cur.text)\u{201D}.",
                    replacements: [""],
                    category: .style))
            }
        }
        return out
    }

    // MARK: Capitalization (sentence start + standalone "i")

    static func capitalization(text: String, tokens: [Token]) -> [Suggestion] {
        var out: [Suggestion] = []
        let chars = Array(text)

        func isSentenceStart(_ token: Token) -> Bool {
            var idx = token.range.lowerBound - 1
            while idx >= 0 {
                let c = chars[idx]
                if c == " " || c == "\n" || c == "\t" || c == "\"" ||
                    c == "'" || c == "(" || c == "\u{201C}" || c == "\u{2018}" {
                    idx -= 1
                    continue
                }
                return c == "." || c == "!" || c == "?"
            }
            return true // reached the beginning of the text
        }

        for token in tokens {
            guard let first = token.text.first else { continue }

            // Standalone lowercase "i" -> "I".
            if token.text == "i" {
                out.append(Suggestion(
                    range: token.range,
                    message: "Capitalize the pronoun \u{201C}I\u{201D}.",
                    replacements: ["I"],
                    category: .capitalization))
                continue
            }

            if isSentenceStart(token), first.isLowercase, first.isLetter {
                let fixed = first.uppercased() + token.text.dropFirst()
                out.append(Suggestion(
                    range: token.range,
                    message: "Capitalize the first word of a sentence.",
                    replacements: [fixed],
                    category: .capitalization))
            }
        }
        return out
    }

    // MARK: Punctuation spacing

    static func punctuationSpacing(text: String) -> [Suggestion] {
        var out: [Suggestion] = []
        let chars = Array(text)
        let closing: Set<Character> = [",", ".", "!", "?", ";", ":"]

        var i = 0
        while i < chars.count {
            let c = chars[i]

            // 1) Space(s) before a closing punctuation mark -> remove them.
            if closing.contains(c), i > 0, chars[i - 1] == " " {
                var start = i - 1
                while start - 1 >= 0 && chars[start - 1] == " " { start -= 1 }
                out.append(Suggestion(
                    range: start..<i,
                    message: "Remove the space before \u{201C}\(c)\u{201D}.",
                    replacements: [""],
                    category: .punctuation))
            }

            // 2) Missing space after a closing punctuation mark that is
            //    immediately followed by a letter -> insert one (skip decimals
            //    like 3.14 and abbreviations handled by requiring a letter).
            if closing.contains(c), i + 1 < chars.count {
                let nextChar = chars[i + 1]
                if nextChar.isLetter {
                    out.append(Suggestion(
                        range: (i + 1)..<(i + 1),
                        message: "Add a space after \u{201C}\(c)\u{201D}.",
                        replacements: [" "],
                        category: .punctuation))
                }
            }
            i += 1
        }
        return out
    }

    // MARK: Helpers

    /// Applies the capitalization pattern of `original` onto `replacement`.
    static func matchCase(of original: String, to replacement: String) -> String {
        guard let first = original.first else { return replacement }
        if first.isUppercase {
            return replacement.prefix(1).uppercased() + replacement.dropFirst()
        }
        return replacement
    }
}
