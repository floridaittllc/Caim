import XCTest
@testable import GrammarKit

final class EditDistanceTests: XCTestCase {
    func testLevenshteinBasics() {
        XCTAssertEqual(EditDistance.levenshtein("", ""), 0)
        XCTAssertEqual(EditDistance.levenshtein("abc", "abc"), 0)
        XCTAssertEqual(EditDistance.levenshtein("", "abc"), 3)
        XCTAssertEqual(EditDistance.levenshtein("abc", ""), 3)
        XCTAssertEqual(EditDistance.levenshtein("kitten", "sitting"), 3)
        XCTAssertEqual(EditDistance.levenshtein("flaw", "lawn"), 2)
    }

    func testLevenshteinTranspositionCostsTwo() {
        // A transposition is two edits under plain Levenshtein.
        XCTAssertEqual(EditDistance.levenshtein("teh", "the"), 2)
    }

    func testDamerauTreatsTranspositionAsOne() {
        XCTAssertEqual(EditDistance.damerauLevenshtein("teh", "the"), 1)
        XCTAssertEqual(EditDistance.damerauLevenshtein("recieve", "receive"), 1)
        XCTAssertEqual(EditDistance.damerauLevenshtein("abc", "abc"), 0)
    }

    func testDamerauIsSymmetricForSubstitutions() {
        XCTAssertEqual(EditDistance.damerauLevenshtein("cat", "bat"), 1)
        XCTAssertEqual(EditDistance.damerauLevenshtein("bat", "cat"), 1)
    }
}
