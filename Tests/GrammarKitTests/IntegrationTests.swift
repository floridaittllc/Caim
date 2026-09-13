import XCTest
@testable import GrammarKit

final class IntegrationTests: XCTestCase {
    let checker = GrammarChecker()

    func testAutocorrectFixesMultipleIssues() {
        let input = "i dont think this is teh answer"
        let output = checker.autocorrect(input)
        // "dont" -> "don't", "teh" -> "the", standalone "i" -> "I".
        XCTAssertTrue(output.contains("don't"), output)
        XCTAssertTrue(output.contains("the answer"), output)
        XCTAssertTrue(output.hasPrefix("I "), output)
    }

    func testSuggestionMatchedTextIsAccurate() {
        let text = "this is teh test"
        for s in checker.check(text) {
            let matched = s.matchedText(in: text)
            XCTAssertNotNil(matched)
            // The reported offsets must line up with the reported fragment.
            XCTAssertEqual(matched?.count, s.range.upperBound - s.range.lowerBound)
        }
    }

    func testApplyingFirstReplacementsSkipsOverlaps() {
        // Two suggestions in a row still produce a sensible string.
        let text = "your going to a apple"
        let output = checker.autocorrect(text)
        XCTAssertTrue(output.contains("you're"), output)
        XCTAssertTrue(output.contains("an apple"), output)
    }

    func testEmptyAndWhitespaceInputProduceNoCrash() {
        XCTAssertTrue(checker.check("").isEmpty)
        XCTAssertTrue(checker.check("     ").isEmpty)
        XCTAssertEqual(checker.autocorrect(""), "")
    }

    func testUnicodeContentIsHandled() {
        // Emoji and accented characters must not break offset math.
        let text = "café teh 😀 dont"
        let suggestions = checker.check(text)
        for s in suggestions {
            XCTAssertNotNil(s.matchedText(in: text))
        }
        XCTAssertTrue(suggestions.contains { $0.matchedText(in: text) == "teh" })
        XCTAssertTrue(suggestions.contains { $0.matchedText(in: text) == "dont" })
    }
}
