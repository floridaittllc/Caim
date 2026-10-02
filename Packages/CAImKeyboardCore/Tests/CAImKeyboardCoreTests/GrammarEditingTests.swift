import XCTest
@testable import CAImKeyboardCore

final class GrammarEditingTests: XCTestCase {
    func testChunkIsCurrentParagraphSuffix() {
        let context = "Dear team,\n\n  Their going to be late"
        let chunk = GrammarContext.chunk(fromContextBefore: context)
        XCTAssertEqual(chunk, "Their going to be late")
        XCTAssertTrue(context.hasSuffix(chunk ?? "-"))
    }

    func testChunkStartsAtSentenceBoundaryWhenTruncated() {
        let context = "This is the first sentence. Second one is here and their late"
        let chunk = GrammarContext.chunk(fromContextBefore: context, maxCharacters: 40)
        XCTAssertEqual(chunk, "Second one is here and their late")
    }

    func testChunkFallsBackToWordBoundary() {
        let context = "abcdefgh ijklmnop qrstuvwx yz and more words"
        let chunk = GrammarContext.chunk(fromContextBefore: context, maxCharacters: 30)
        XCTAssertEqual(chunk, "qrstuvwx yz and more words")
    }

    func testChunkNeedsTwoWords() {
        XCTAssertNil(GrammarContext.chunk(fromContextBefore: nil))
        XCTAssertNil(GrammarContext.chunk(fromContextBefore: ""))
        XCTAssertNil(GrammarContext.chunk(fromContextBefore: "Hello"))
        XCTAssertNil(GrammarContext.chunk(fromContextBefore: "Fine.\n42 !!"))
        XCTAssertEqual(GrammarContext.chunk(fromContextBefore: "Hi there "), "Hi there ")
    }

    func testEditPlanForIssueBeforeCursor() {
        let checked = "Their going to the libary 👍🏽 now"
        let target = issue(19..<25, "libary", "library", .spelling)
        let plan = ProxyEditPlan.make(issue: target, checkedText: checked, currentContextBefore: "Hello. " + checked)
        let tail = " 👍🏽 now"
        XCTAssertEqual(plan, ProxyEditPlan(moveBack: tail.utf16.count, deleteCount: 6, insert: "library", moveForward: tail.utf16.count))
        XCTAssertEqual(plan?.moveBack, 9)
    }

    func testEditPlanAtCursorNeedsNoMovement() {
        let plan = ProxyEditPlan.make(issue: issue(4..<7, "teh", "the"), checkedText: "and teh", currentContextBefore: "and teh")
        XCTAssertEqual(plan, ProxyEditPlan(moveBack: 0, deleteCount: 3, insert: "the", moveForward: 0))
    }

    func testEditPlanRejectsStaleText() {
        let target = issue(0..<5, "Their", "They're")
        XCTAssertNil(ProxyEditPlan.make(issue: target, checkedText: "Their going", currentContextBefore: "Their going!"))
        XCTAssertNil(ProxyEditPlan.make(issue: target, checkedText: "Their going", currentContextBefore: nil))
        XCTAssertNil(ProxyEditPlan.make(issue: issue(0..<5, "There", "They're"), checkedText: "Their going", currentContextBefore: "Their going"))
    }

    func testSnapshotApplyingShiftsLaterIssues() {
        let snapshot = GrammarSnapshot(
            text: "Their going to the libary",
            issues: [issue(0..<5, "Their", "They're"), issue(19..<25, "libary", "library", .spelling)],
            backend: .selfHosted
        )
        let next = snapshot.applying(snapshot.issues[0])
        XCTAssertEqual(next.text, "They're going to the libary")
        XCTAssertEqual(next.issues, [issue(21..<27, "libary", "library", .spelling)])
        XCTAssertEqual(Array(next.text)[21..<27].map(String.init).joined(), "libary")
        XCTAssertEqual(next.applying(next.issues[0]).text, "They're going to the library")
    }

    func testMergePrefersPrimaryOnOverlap() {
        let remote = [issue(0..<5, "Their", "They're")]
        let local = [issue(0..<5, "Their", "Thier", .spelling), issue(19..<25, "libary", "library", .spelling)]
        let merged = GrammarIssueMerger.merge(primary: remote, secondary: local)
        XCTAssertEqual(merged.map(\.replacement), ["They're", "library"])
    }

    func testUTF16ToCharacterRange() {
        let text = "👍🏽 helo"
        let utf16Start = "👍🏽 ".utf16.count
        XCTAssertEqual(TextOffsets.characterRange(utf16Location: utf16Start, utf16Length: 4, in: text), 2..<6)
        XCTAssertNil(TextOffsets.characterRange(utf16Location: 1, utf16Length: 1, in: text))
        XCTAssertNil(TextOffsets.characterRange(utf16Location: 0, utf16Length: 99, in: text))
    }
}
