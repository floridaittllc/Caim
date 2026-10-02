import XCTest
@testable import CAImKeyboardCore

final class GrammarResponseParserTests: XCTestCase {
    private let text = "Their going to the libary tomorow."

    func testParsesStructuredIssuesWithExactOffsets() throws {
        let content = #"{"issues":[{"start":0,"end":5,"original":"Their","replacement":"They're","category":"grammar","explanation":"Contraction of they are"},{"start":19,"end":25,"original":"libary","replacement":"library","category":"spelling","explanation":"Typo"}]}"#
        let issues = try GrammarResponseParser.parseContent(content, text: text)
        XCTAssertEqual(issues.count, 2)
        XCTAssertEqual(issues[0], GrammarIssue(range: 0..<5, original: "Their", replacement: "They're", category: .grammar, explanation: "Contraction of they are"))
        XCTAssertEqual(issues[1].range, 19..<25)
        XCTAssertEqual(issues[1].category, .spelling)
    }

    func testRelocatesWrongOffsetsUsingOriginalText() throws {
        let content = #"{"issues":[{"start":3,"end":9,"original":"tomorow","replacement":"tomorrow","category":"spelling","explanation":""}]}"#
        let issues = try GrammarResponseParser.parseContent(content, text: text)
        XCTAssertEqual(issues.map(\.range), [26..<33])
    }

    func testPicksOccurrenceNearestToHint() throws {
        let sample = "the cat and the dog and the bird"
        let content = #"{"issues":[{"start":22,"end":25,"original":"the","replacement":"a","category":"style","explanation":""}]}"#
        let issues = try GrammarResponseParser.parseContent(content, text: sample)
        XCTAssertEqual(issues.map(\.range), [24..<27])
    }

    func testPrefersWholeWordMatches() throws {
        let sample = "theirs is their car"
        let content = #"{"issues":[{"original":"their","replacement":"there","category":"grammar"}]}"#
        let issues = try GrammarResponseParser.parseContent(content, text: sample)
        XCTAssertEqual(issues.map(\.range), [10..<15])
    }

    func testDropsUnlocatableNoOpAndOverlappingIssues() throws {
        let content = #"""
        {"issues":[
          {"start":0,"end":5,"original":"Their","replacement":"They're","category":"grammar","explanation":""},
          {"start":0,"end":11,"original":"Their going","replacement":"They're going","category":"grammar","explanation":""},
          {"start":6,"end":11,"original":"going","replacement":"going","category":"style","explanation":""},
          {"start":0,"end":3,"original":"unicorn","replacement":"horse","category":"style","explanation":""}
        ]}
        """#
        let issues = try GrammarResponseParser.parseContent(content, text: text)
        XCTAssertEqual(issues.map(\.original), ["Their"])
    }

    func testHandlesCodeFencesAndProse() throws {
        let content = """
        Sure! Here are the problems:
        ```json
        {"issues":[{"start":26,"end":33,"original":"tomorow","replacement":"tomorrow","category":"Spelling","explanation":"typo"}]}
        ```
        """
        let issues = try GrammarResponseParser.parseContent(content, text: text)
        XCTAssertEqual(issues.map(\.replacement), ["tomorrow"])
        XCTAssertEqual(issues.first?.category, .spelling)
    }

    func testSalvagesCompleteIssuesFromTruncatedReply() throws {
        let content = #"{"issues":[{"start":0,"end":5,"original":"Their","replacement":"They're","category":"grammar","explanation":"use {they are}"},{"start":19,"end":25,"original":"libary","replacement":"lib"#
        let issues = try GrammarResponseParser.parseContent(content, text: text)
        XCTAssertEqual(issues.map(\.original), ["Their"])
        XCTAssertEqual(issues.first?.explanation, "use {they are}")
    }

    func testAcceptsTopLevelArrayAndAlternateKeys() throws {
        let content = #"[{"offset":19,"length":6,"text":"libary","suggestion":"library","type":"typo","reason":"spelling"}]"#
        let issues = try GrammarResponseParser.parseContent(content, text: text)
        XCTAssertEqual(issues, [GrammarIssue(range: 19..<25, original: "libary", replacement: "library", category: .spelling, explanation: "spelling")])
    }

    func testEmptyIssueListIsValid() throws {
        XCTAssertEqual(try GrammarResponseParser.parseContent(#"{"issues":[]}"#, text: text), [])
        XCTAssertEqual(try GrammarResponseParser.parseContent("```json\n{\"issues\": []}\n```", text: text), [])
    }

    func testMalformedAndEmptyContentThrow() {
        XCTAssertThrowsError(try GrammarResponseParser.parseContent("Looks good to me!", text: text)) { error in
            XCTAssertEqual(error as? InferenceError, .malformed)
        }
        XCTAssertThrowsError(try GrammarResponseParser.parseContent("  \n", text: text)) { error in
            XCTAssertEqual(error as? InferenceError, .empty)
        }
    }

    func testCharacterOffsetsWithEmoji() throws {
        let sample = "👍🏽 their here"
        let content = #"{"issues":[{"start":3,"end":8,"original":"their","replacement":"they're","category":"grammar","explanation":""}]}"#
        let issues = try GrammarResponseParser.parseContent(content, text: sample)
        XCTAssertEqual(issues.map(\.range), [2..<7])
    }

    func testChatCompletionErrorObject() {
        let body = Data(#"{"error":{"message":"model overloaded"}}"#.utf8)
        XCTAssertThrowsError(try GrammarResponseParser.parseChatCompletion(body, text: text)) { error in
            XCTAssertEqual(error as? InferenceError, .http(status: 200, message: "model overloaded"))
        }
    }

    func testCapsIssueCount() throws {
        let sample = String(repeating: "teh ", count: 12)
        let items = (0..<12).map { index in
            #"{"start":\#(index * 4),"end":\#(index * 4 + 3),"original":"teh","replacement":"the","category":"spelling","explanation":""}"#
        }
        let content = #"{"issues":[\#(items.joined(separator: ","))]}"#
        let issues = try GrammarResponseParser.parseContent(content, text: sample)
        XCTAssertEqual(issues.count, GrammarResponseParser.maxIssues)
    }
}
