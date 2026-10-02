import UIKit
import CAImKeyboardCore

/// Instant, offline spelling via `UITextChecker`. Runs on every pause before the
/// model replies; model issues replace overlapping local ones.
final class LocalSpellChecker {
    private let checker = UITextChecker()
    private let language: String

    init(preferredLanguage: String? = nil) {
        let available = UITextChecker.availableLanguages
        let candidates: [String?] = [preferredLanguage?.replacingOccurrences(of: "-", with: "_"), "en_US", available.first]
        language = candidates.compactMap { $0 }.first { available.contains($0) } ?? "en_US"
    }

    func issues(in text: String, limit: Int = 4) -> [GrammarIssue] {
        let length = (text as NSString).length
        var issues: [GrammarIssue] = []
        var offset = 0
        while offset < length, issues.count < limit {
            let range = checker.rangeOfMisspelledWord(
                in: text,
                range: NSRange(location: 0, length: length),
                startingAt: offset,
                wrap: false,
                language: language
            )
            guard range.location != NSNotFound, range.length > 0 else {
                break
            }
            offset = range.location + range.length
            // The word touching the cursor is probably still being typed.
            if offset == length {
                break
            }
            guard let guess = checker.guesses(forWordRange: range, in: text, language: language)?.first,
                  let characters = TextOffsets.characterRange(
                      utf16Location: range.location,
                      utf16Length: range.length,
                      in: text
                  )
            else {
                continue
            }
            issues.append(
                GrammarIssue(
                    range: characters,
                    original: (text as NSString).substring(with: range),
                    replacement: guess,
                    category: .spelling,
                    explanation: "Spelling"
                )
            )
        }
        return issues
    }
}
