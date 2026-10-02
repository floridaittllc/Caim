import XCTest
@testable import CAImKeyboardCore

@MainActor
final class BackgroundGrammarCheckerTests: XCTestCase {
    private func makeChecker(
        debounceMs: UInt64 = 30,
        checkDelayMs: UInt64 = 0,
        calls: @escaping (String) -> Void = { _ in }
    ) -> (BackgroundGrammarChecker, () -> [GrammarUpdate]) {
        var updates: [GrammarUpdate] = []
        let checker = BackgroundGrammarChecker(debounceNanoseconds: debounceMs * 1_000_000) { text in
            calls(text)
            if checkDelayMs > 0 {
                try await Task.sleep(nanoseconds: checkDelayMs * 1_000_000)
            }
            return GrammarCheckResult(text: text, issues: [issue(0..<5, "Their", "They're")], backend: .selfHosted)
        }
        checker.onUpdate = { updates.append($0) }
        return (checker, { updates })
    }

    private func wait(_ ms: UInt64) async {
        try? await Task.sleep(nanoseconds: ms * 1_000_000)
    }

    func testDebouncesRapidTypingIntoOneCheck() async {
        var checked: [String] = []
        let (checker, updates) = makeChecker(calls: { checked.append($0) })
        checker.textDidChange(contextBefore: "Their g")
        checker.textDidChange(contextBefore: "Their go")
        checker.textDidChange(contextBefore: "Their going")
        await wait(150)
        XCTAssertEqual(checked, ["Their going"])
        guard case .result(let result)? = updates().last else {
            return XCTFail("expected result, got \(updates())")
        }
        XCTAssertEqual(result.text, "Their going")
        XCTAssertEqual(result.issues.count, 1)
    }

    func testNewInputCancelsInFlightCheck() async {
        var checked: [String] = []
        let (checker, updates) = makeChecker(debounceMs: 10, checkDelayMs: 200, calls: { checked.append($0) })
        checker.textDidChange(contextBefore: "Their going")
        await wait(60)
        XCTAssertEqual(checked, ["Their going"])
        checker.textDidChange(contextBefore: "Their going home")
        await wait(350)
        XCTAssertEqual(checked, ["Their going", "Their going home"])
        let results = updates().compactMap { update -> String? in
            if case .result(let result) = update {
                return result.text
            }
            return nil
        }
        XCTAssertEqual(results, ["Their going home"])
    }

    func testIdleForUncheckableText() async {
        let (checker, updates) = makeChecker()
        checker.textDidChange(contextBefore: "Hi")
        XCTAssertEqual(updates(), [.idle])
    }

    func testReusesLastResultForSameText() async {
        var calls = 0
        let (checker, updates) = makeChecker(calls: { _ in calls += 1 })
        checker.textDidChange(contextBefore: "Their going")
        await wait(120)
        checker.textDidChange(contextBefore: "Their going ")
        checker.textDidChange(contextBefore: "Their going")
        await wait(120)
        XCTAssertEqual(calls, 1)
        guard case .result(let result)? = updates().last else {
            return XCTFail("expected cached result")
        }
        XCTAssertEqual(result.text, "Their going")
    }

    func testFailuresAreReported() async {
        let checker = BackgroundGrammarChecker(debounceNanoseconds: 1_000_000) { _ in
            throw InferenceError.noProviderSucceeded([])
        }
        var updates: [GrammarUpdate] = []
        checker.onUpdate = { updates.append($0) }
        checker.textDidChange(contextBefore: "Their going")
        await wait(80)
        XCTAssertEqual(updates.last, .failed(text: "Their going", error: .noProviderSucceeded([])))
    }

    func testAcceptedFixSkipsRecheck() async {
        var calls = 0
        let (checker, _) = makeChecker(calls: { _ in calls += 1 })
        checker.accept(GrammarSnapshot(text: "They're going", issues: []))
        checker.textDidChange(contextBefore: "They're going")
        await wait(80)
        XCTAssertEqual(calls, 0)
    }
}
