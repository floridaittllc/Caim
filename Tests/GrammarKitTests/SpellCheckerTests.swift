import XCTest
@testable import GrammarKit

final class SpellCheckerTests: XCTestCase {
    let spell = SpellChecker()

    func testKnownWordsAreNotMisspelled() {
        XCTAssertFalse(spell.isMisspelled("hello"))
        XCTAssertFalse(spell.isMisspelled("Hello"))
        XCTAssertFalse(spell.isMisspelled("WORLD"))
        XCTAssertFalse(spell.isMisspelled("i"))
        XCTAssertFalse(spell.isMisspelled("a"))
    }

    func testUnknownWordIsMisspelled() {
        XCTAssertTrue(spell.isMisspelled("helllo"))
        XCTAssertTrue(spell.isMisspelled("wrold"))
    }

    func testWordsWithDigitsAreIgnored() {
        XCTAssertFalse(spell.isMisspelled("abc123"))
    }

    func testCommonMisspellingMapsDirectly() {
        XCTAssertEqual(spell.suggestions(for: "teh").first, "the")
        XCTAssertEqual(spell.suggestions(for: "recieve").first, "receive")
        XCTAssertEqual(spell.suggestions(for: "seperate").first, "separate")
    }

    func testSuggestionRankingPrefersCommonWord() {
        // "wrold" is one transposition from "world".
        let s = spell.suggestions(for: "wrold")
        XCTAssertEqual(s.first, "world")
    }

    func testSuggestionsRankByEditDistanceThenFrequency() {
        // "th" is distance 1 from both "the" and "to"/"this"? ensure the closest
        // and most common ("the") ranks first.
        let s = spell.suggestions(for: "teh")
        XCTAssertEqual(s.first, "the")
    }

    func testCasePreservationInSuggestions() {
        XCTAssertEqual(spell.suggestions(for: "Teh").first, "The")
        XCTAssertEqual(spell.suggestions(for: "TEH").first, "THE")
    }

    func testCustomDictionary() {
        let custom = SpellChecker(dictionary: ["zap", "zip"])
        XCTAssertTrue(custom.isMisspelled("hello"))
        XCTAssertFalse(custom.isMisspelled("zap"))
        XCTAssertEqual(custom.suggestions(for: "zep").first.map { $0.lowercased() }, "zap")
    }

    func testNoSuggestionsForGibberishReturnsEmpty() {
        // A long random string has no dictionary word within edit distance.
        XCTAssertTrue(spell.suggestions(for: "qzxwvpunk").isEmpty)
    }
}
