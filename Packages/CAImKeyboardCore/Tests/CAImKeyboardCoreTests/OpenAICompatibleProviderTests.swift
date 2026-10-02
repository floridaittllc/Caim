import XCTest
@testable import CAImKeyboardCore

final class OpenAICompatibleProviderTests: XCTestCase {
    func testNormalizesRunPodServerlessInputs() {
        let expected = "https://api.runpod.ai/v2/abc123xyz/openai/v1"
        for input in [
            "abc123xyz",
            " abc123xyz ",
            "https://api.runpod.ai/v2/abc123xyz",
            "https://api.runpod.ai/v2/abc123xyz/",
            "api.runpod.ai/v2/abc123xyz",
            "https://api.runpod.ai/v2/abc123xyz/openai/v1",
            "https://api.runpod.ai/v2/abc123xyz/openai/v1/chat/completions",
        ] {
            XCTAssertEqual(OpenAICompatibleEndpoint.normalizedBaseURL(input)?.absoluteString, expected, input)
        }
    }

    func testNormalizesPodAndGenericBases() {
        XCTAssertEqual(
            OpenAICompatibleEndpoint.normalizedBaseURL("https://k3x9-8000.proxy.runpod.net/v1/")?.absoluteString,
            "https://k3x9-8000.proxy.runpod.net/v1"
        )
        XCTAssertEqual(
            OpenAICompatibleEndpoint.normalizedBaseURL("http://192.168.1.20:8000/v1/chat/completions")?.absoluteString,
            "http://192.168.1.20:8000/v1"
        )
        XCTAssertNil(OpenAICompatibleEndpoint.normalizedBaseURL(""))
        XCTAssertNil(OpenAICompatibleEndpoint.normalizedBaseURL("ftp://example.com/v1"))
        XCTAssertNil(OpenAICompatibleEndpoint.normalizedBaseURL("https://"))
    }

    func testRunPodGrammarRequestShape() async throws {
        let transport = RecordingTransport(responses: [chatCompletion(#"{"issues":[]}"#)])
        let endpoint = try XCTUnwrap(OpenAICompatibleEndpoint.runpodServerless(endpointID: "abc123xyz", apiKey: "rp_key"))
        let provider = OpenAICompatibleProvider(backend: .selfHosted, endpoint: endpoint, transport: transport)

        let issues = try await provider.checkGrammar("Their going home.")
        XCTAssertEqual(issues, [])

        let request = try XCTUnwrap(transport.requests.first)
        XCTAssertEqual(request.url.absoluteString, "https://api.runpod.ai/v2/abc123xyz/openai/v1/chat/completions")
        XCTAssertEqual(request.method, "POST")
        XCTAssertEqual(request.headers["Authorization"], "Bearer rp_key")
        XCTAssertEqual(request.headers["Content-Type"], "application/json")
        XCTAssertEqual(request.timeout, 12)

        let payload = transport.payload()
        XCTAssertEqual(payload["model"] as? String, "caim-grammar")
        XCTAssertEqual(payload["temperature"] as? Double, 0)
        XCTAssertEqual(payload["max_tokens"] as? Int, 512)
        let messages = try XCTUnwrap(payload["messages"] as? [[String: String]])
        XCTAssertEqual(messages.map { $0["role"] }, ["system", "user"])
        XCTAssertEqual(messages[0]["content"], InferencePrompts.grammarSystem)
        XCTAssertEqual(messages[1]["content"], "Text:\nTheir going home.")
        let format = try XCTUnwrap(payload["response_format"] as? [String: Any])
        XCTAssertEqual(format["type"] as? String, "json_schema")
        let schema = try XCTUnwrap(format["json_schema"] as? [String: Any])
        XCTAssertEqual(schema["name"] as? String, "grammar_issues")
        XCTAssertEqual(schema["strict"] as? Bool, true)
        XCTAssertNotNil((schema["schema"] as? [String: Any])?["properties"])
    }

    func testCustomModelAndRewriteMode() async throws {
        let transport = RecordingTransport(responses: [chatCompletion(#"{"rewritten":"Hey!","suggestions":[],"corrections":[]}"#)])
        let endpoint = try XCTUnwrap(
            OpenAICompatibleEndpoint.selfHosted(baseURL: "https://pod-8000.proxy.runpod.net/v1", apiKey: "vk", model: "qwen")
        )
        let provider = OpenAICompatibleProvider(backend: .selfHosted, endpoint: endpoint, transport: transport)
        let result = try await provider.rewrite("Hello there.", mode: .casual)
        XCTAssertEqual(result.rewritten, "Hey!")
        let payload = transport.payload()
        XCTAssertEqual(payload["model"] as? String, "qwen")
        let messages = try XCTUnwrap(payload["messages"] as? [[String: String]])
        XCTAssertEqual(messages[1]["content"], "Instruction: Rewrite in a relaxed, friendly, casual tone.\n\nText:\nHello there.")
        XCTAssertEqual(transport.requests[0].timeout, 30)
    }

    func testRetriesWithoutResponseFormatWhenRejected() async throws {
        let transport = RecordingTransport(responses: [
            GrokHTTPResponse(statusCode: 400, body: Data(#"{"error":{"message":"response_format not supported"}}"#.utf8)),
            chatCompletion(#"{"issues":[{"start":0,"end":5,"original":"Their","replacement":"They're","category":"grammar","explanation":"x"}]}"#),
        ])
        let endpoint = try XCTUnwrap(OpenAICompatibleEndpoint.selfHosted(baseURL: "abc", apiKey: "k"))
        let provider = OpenAICompatibleProvider(backend: .selfHosted, endpoint: endpoint, transport: transport)
        let issues = try await provider.checkGrammar("Their going home.")
        XCTAssertEqual(issues.map(\.replacement), ["They're"])
        XCTAssertEqual(transport.requests.count, 2)
        XCTAssertNotNil(transport.payload(0)["response_format"])
        XCTAssertNil(transport.payload(1)["response_format"])
    }

    func testHTTPErrorsSurfaceMessage() async throws {
        let transport = RecordingTransport(responses: [
            GrokHTTPResponse(statusCode: 401, body: Data(#"{"error":"Unauthorized"}"#.utf8)),
        ])
        let endpoint = try XCTUnwrap(OpenAICompatibleEndpoint.selfHosted(baseURL: "abc", apiKey: "bad"))
        let provider = OpenAICompatibleProvider(backend: .selfHosted, endpoint: endpoint, transport: transport)
        do {
            _ = try await provider.checkGrammar("Their going home.")
            XCTFail("expected error")
        } catch let error as InferenceError {
            XCTAssertEqual(error, .http(status: 401, message: "Unauthorized"))
        }
        XCTAssertEqual(transport.requests.count, 1)
    }

    func testTransportFailureBecomesInferenceError() async throws {
        let transport = RecordingTransport(error: URLError(.timedOut))
        let endpoint = try XCTUnwrap(OpenAICompatibleEndpoint.selfHosted(baseURL: "abc", apiKey: "k"))
        let provider = OpenAICompatibleProvider(backend: .selfHosted, endpoint: endpoint, transport: transport)
        do {
            _ = try await provider.checkGrammar("Their going home.")
            XCTFail("expected error")
        } catch let error as InferenceError {
            guard case .transport = error else {
                return XCTFail("unexpected \(error)")
            }
        }
    }

    func testUnavailableWithoutKeyOrFullAccess() throws {
        let endpoint = try XCTUnwrap(OpenAICompatibleEndpoint.selfHosted(baseURL: "abc", apiKey: ""))
        let provider = OpenAICompatibleProvider(backend: .selfHosted, endpoint: endpoint, transport: RecordingTransport())
        XCTAssertEqual(provider.unavailableReason, "No API key")
        provider.endpoint.apiKey = "k"
        XCTAssertNil(provider.unavailableReason)
        provider.networkAllowed = false
        XCTAssertEqual(provider.unavailableReason, "Full Access is off")
    }

    func testGrokEndpoint() {
        let endpoint = OpenAICompatibleEndpoint.grok(apiKey: "xai")
        XCTAssertEqual(endpoint.chatCompletionsURL.absoluteString, "https://api.x.ai/v1/chat/completions")
        XCTAssertEqual(endpoint.model, "grok-3")
    }
}
