import XCTest
@testable import GrammarKit

final class TokenizerTests: XCTestCase {
    func testSimpleSplit() {
        let tokens = Tokenizer.words(in: "hello world")
        XCTAssertEqual(tokens.map { $0.text }, ["hello", "world"])
        XCTAssertEqual(tokens[0].range, 0..<5)
        XCTAssertEqual(tokens[1].range, 6..<11)
    }

    func testOffsetsMapBackToText() {
        let text = "the cat sat"
        for token in Tokenizer.words(in: text) {
            let start = text.index(text.startIndex, offsetBy: token.range.lowerBound)
            let end = text.index(text.startIndex, offsetBy: token.range.upperBound)
            XCTAssertEqual(String(text[start..<end]), token.text)
        }
    }

    func testContractionsKeepInteriorApostrophe() {
        let tokens = Tokenizer.words(in: "don't you're it's")
        XCTAssertEqual(tokens.map { $0.text }, ["don't", "you're", "it's"])
    }

    func testPunctuationAndNumbersAreSeparators() {
        let tokens = Tokenizer.words(in: "hi, there! 42 ok")
        XCTAssertEqual(tokens.map { $0.text }, ["hi", "there", "ok"])
    }

    func testTrailingApostropheTrimmed() {
        let tokens = Tokenizer.words(in: "'quoted'")
        XCTAssertEqual(tokens.map { $0.text }, ["quoted"])
    }

    func testEmptyString() {
        XCTAssertTrue(Tokenizer.words(in: "").isEmpty)
        XCTAssertTrue(Tokenizer.words(in: "   ,.!").isEmpty)
    }
}
