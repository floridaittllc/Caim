import Foundation
@testable import CAImKeyboardCore

final class RecordingTransport: GrokTransport {
    var responses: [GrokHTTPResponse]
    var error: Error?
    private(set) var requests: [GrokHTTPRequest] = []

    init(responses: [GrokHTTPResponse] = [], error: Error? = nil) {
        self.responses = responses
        self.error = error
    }

    func send(_ request: GrokHTTPRequest) async throws -> GrokHTTPResponse {
        requests.append(request)
        if let error {
            throw error
        }
        guard !responses.isEmpty else {
            return GrokHTTPResponse(statusCode: 500, body: Data())
        }
        return responses.removeFirst()
    }

    func payload(_ index: Int = 0) -> [String: Any] {
        (try? JSONSerialization.jsonObject(with: requests[index].body)) as? [String: Any] ?? [:]
    }
}

func chatCompletion(_ content: String, model: String = "caim-grammar") -> GrokHTTPResponse {
    let root: [String: Any] = [
        "model": model,
        "choices": [["message": ["role": "assistant", "content": content]]],
    ]
    return GrokHTTPResponse(statusCode: 200, body: try! JSONSerialization.data(withJSONObject: root))
}

final class StubProvider: InferenceProvider {
    let backend: InferenceBackend
    var unavailableReason: String?
    var grammarResult: Result<[GrammarIssue], Error>
    var delayNanoseconds: UInt64 = 0
    private(set) var grammarCalls: [String] = []

    init(_ backend: InferenceBackend, unavailable: String? = nil, grammar: Result<[GrammarIssue], Error> = .success([])) {
        self.backend = backend
        self.unavailableReason = unavailable
        self.grammarResult = grammar
    }

    func checkGrammar(_ text: String) async throws -> [GrammarIssue] {
        grammarCalls.append(text)
        if delayNanoseconds > 0 {
            try await Task.sleep(nanoseconds: delayNanoseconds)
        }
        return try grammarResult.get()
    }

    func rewrite(_ text: String, mode: RewriteMode) async throws -> GrokRewrite {
        _ = try grammarResult.get()
        return GrokRewrite(rewritten: "\(backend.rawValue):\(mode.rawValue)", suggestions: [], corrections: [])
    }
}

func issue(_ range: Range<Int>, _ original: String, _ replacement: String, _ category: GrammarCategory = .grammar) -> GrammarIssue {
    GrammarIssue(range: range, original: original, replacement: replacement, category: category, explanation: "")
}
