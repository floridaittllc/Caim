import XCTest
@testable import GrammarKit

final class GrammarCheckerTests: XCTestCase {
    let checker = GrammarChecker()

    // Helper: does any suggestion of `category` propose `replacement` for the
    // token whose text equals `matched`?
    private func find(_ text: String,
                      category: SuggestionCategory,
                      matched: String) -> Suggestion? {
        return checker.check(text).first {
            $0.category == category && ($0.matchedText(in: text) == matched)
        }
    }

    // MARK: Spelling

    func testSpellingSuggestionSurfacesCorrection() {
        let s = find("this is teh answer", category: .spelling, matched: "teh")
        XCTAssertNotNil(s)
        XCTAssertEqual(s?.replacements.first, "the")
    }

    // MARK: Missing apostrophe (punctuation)

    func testMissingApostrophe() {
        let s = find("i dont know", category: .punctuation, matched: "dont")
        XCTAssertEqual(s?.replacements.first, "don't")
    }

    func testMissingApostropheCapitalPreserved() {
        let s = find("Dont go", category: .punctuation, matched: "Dont")
        XCTAssertEqual(s?.replacements.first, "Don't")
    }

    func testContractionNotDoubleFlaggedAsSpelling() {
        let all = checker.check("i dont know")
        let dontSuggestions = all.filter { $0.matchedText(in: "i dont know") == "dont" }
        // Exactly one suggestion (the punctuation one), not also a spelling one.
        XCTAssertEqual(dontSuggestions.count, 1)
        XCTAssertEqual(dontSuggestions.first?.category, .punctuation)
    }

    // MARK: Confusable words (grammar)

    func testYourVsYoure() {
        let s = find("your going home", category: .grammar, matched: "your")
        XCTAssertEqual(s?.replacements.first, "you're")
    }

    func testYourPossessiveIsNotFlagged() {
        // "your book" is correct — no grammar suggestion for "your".
        XCTAssertNil(find("your book is nice", category: .grammar, matched: "your"))
    }

    func testItsVsItsContraction() {
        let s = find("its a good day", category: .grammar, matched: "its")
        XCTAssertEqual(s?.replacements.first, "it's")
    }

    func testItsPossessiveNotFlagged() {
        XCTAssertNil(find("the dog wagged its tail", category: .grammar, matched: "its"))
    }

    func testThenVsThan() {
        let s = find("this is better then that", category: .grammar, matched: "then")
        XCTAssertEqual(s?.replacements.first, "than")
    }

    // MARK: Article agreement (a / an)

    func testAnBeforeVowel() {
        let s = find("this is a apple", category: .grammar, matched: "a")
        XCTAssertEqual(s?.replacements.first, "an")
    }

    func testABeforeConsonant() {
        let s = find("this is an cat", category: .grammar, matched: "an")
        XCTAssertEqual(s?.replacements.first, "a")
    }

    func testAnBeforeSilentH() {
        let s = find("she is a honest person", category: .grammar, matched: "a")
        XCTAssertEqual(s?.replacements.first, "an")
    }

    func testABeforeConsonantSoundVowelLetter() {
        // "university" starts with a "you" sound -> "a university" is correct,
        // so "an university" should be corrected to "a".
        let s = find("i go to an university", category: .grammar, matched: "an")
        XCTAssertEqual(s?.replacements.first, "a")
    }

    func testAUniversityIsNotFlagged() {
        XCTAssertNil(find("i go to a university", category: .grammar, matched: "a"))
    }

    func testCorrectArticlesNotFlagged() {
        XCTAssertNil(find("this is an apple", category: .grammar, matched: "an"))
        XCTAssertNil(find("this is a cat", category: .grammar, matched: "a"))
    }

    // MARK: Duplicated words (style)

    func testDuplicatedWord() {
        let text = "the the results"
        let s = checker.check(text).first { $0.category == .style }
        XCTAssertNotNil(s)
        XCTAssertEqual(s?.replacements.first, "")
        // Applying the fix removes the duplicate.
        XCTAssertEqual(checker.autocorrect(text).contains("the the"), false)
    }

    // MARK: Capitalization

    func testSentenceStartCapitalization() {
        let s = find("hello world", category: .capitalization, matched: "hello")
        XCTAssertEqual(s?.replacements.first, "Hello")
    }

    func testCapitalizationAfterPeriod() {
        let text = "Hello world. this is fine."
        let s = checker.check(text).first {
            $0.category == .capitalization && $0.matchedText(in: text) == "this"
        }
        XCTAssertEqual(s?.replacements.first, "This")
    }

    func testStandaloneICapitalized() {
        let s = find("i am here", category: .capitalization, matched: "i")
        XCTAssertEqual(s?.replacements.first, "I")
    }

    func testAlreadyCapitalizedNotFlagged() {
        XCTAssertNil(find("Hello world", category: .capitalization, matched: "Hello"))
    }

    // MARK: Punctuation spacing

    func testSpaceBeforePunctuationRemoved() {
        let text = "hello , world"
        let s = checker.check(text).first {
            $0.category == .punctuation && $0.replacements.first == ""
        }
        XCTAssertNotNil(s)
    }

    func testMissingSpaceAfterPunctuationInserted() {
        let text = "hello.world"
        let s = checker.check(text).first {
            $0.category == .punctuation && $0.replacements.first == " "
        }
        XCTAssertNotNil(s)
    }

    // MARK: Clean input

    func testCleanSentenceHasNoIssues() {
        let issues = checker.check("I have a good day at work.")
        XCTAssertTrue(issues.isEmpty, "unexpected: \(issues.map { $0.message })")
    }

    // MARK: Ordering

    func testSuggestionsAreOrderedByPosition() {
        let text = "teh cat and teh dog"
        let s = checker.check(text)
        let lowerBounds = s.map { $0.range.lowerBound }
        XCTAssertEqual(lowerBounds, lowerBounds.sorted())
    }
}
