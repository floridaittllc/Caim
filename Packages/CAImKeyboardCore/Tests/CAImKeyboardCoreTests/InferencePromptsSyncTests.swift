import XCTest
@testable import CAImKeyboardCore

/// The RunPod smoke test and the app's connection test read `server/runpod/prompts.json`;
/// the keyboard compiles `InferencePrompts`. They must stay identical.
final class InferencePromptsSyncTests: XCTestCase {
    private func loadPromptsJSON() throws -> [String: Any] {
        let url = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .appendingPathComponent("../../../../server/runpod/prompts.json")
            .standardizedFileURL
        let data = try Data(contentsOf: url)
        return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    func testGrammarPromptMatchesServer() throws {
        let root = try loadPromptsJSON()
        XCTAssertEqual(root["servedModelName"] as? String, InferencePrompts.servedModelName)
        let grammar = try XCTUnwrap(root["grammar"] as? [String: Any])
        XCTAssertEqual(grammar["system"] as? String, InferencePrompts.grammarSystem)
        XCTAssertEqual(
            (grammar["userTemplate"] as? String)?.replacingOccurrences(of: "{{text}}", with: "X"),
            InferencePrompts.grammarUser(text: "X")
        )
        XCTAssertEqual(grammar["maxTokens"] as? Int, InferencePrompts.grammarMaxTokens)
        XCTAssertEqual(grammar["temperature"] as? Double, InferencePrompts.grammarTemperature)
        XCTAssertEqual(grammar["schema"] as? NSDictionary, InferencePrompts.grammarSchema as NSDictionary)
    }

    func testRewritePromptMatchesServer() throws {
        let root = try loadPromptsJSON()
        let rewrite = try XCTUnwrap(root["rewrite"] as? [String: Any])
        XCTAssertEqual(rewrite["system"] as? String, InferencePrompts.rewriteSystem)
        XCTAssertEqual(rewrite["maxTokens"] as? Int, InferencePrompts.rewriteMaxTokens)
        XCTAssertEqual(rewrite["temperature"] as? Double, InferencePrompts.rewriteTemperature)
        XCTAssertEqual(rewrite["schema"] as? NSDictionary, InferencePrompts.rewriteSchema as NSDictionary)
        let modes = try XCTUnwrap(rewrite["modes"] as? [String: String])
        XCTAssertEqual(Set(modes.keys), Set(RewriteMode.allCases.map(\.rawValue)))
        let template = try XCTUnwrap(rewrite["userTemplate"] as? String)
        for mode in RewriteMode.allCases {
            XCTAssertEqual(modes[mode.rawValue], InferencePrompts.rewriteInstruction(mode))
            XCTAssertEqual(
                template
                    .replacingOccurrences(of: "{{instruction}}", with: modes[mode.rawValue] ?? "")
                    .replacingOccurrences(of: "{{text}}", with: "X"),
                InferencePrompts.rewriteUser(text: "X", mode: mode)
            )
        }
    }
}
