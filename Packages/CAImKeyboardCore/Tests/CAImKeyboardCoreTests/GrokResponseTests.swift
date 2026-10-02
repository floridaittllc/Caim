import XCTest
@testable import CAImKeyboardCore

final class GrokResponseTests: XCTestCase {
    func testParsesRewrittenTextAndSuggestions() throws {
        let content = """
        {"rewritten":"Hello","suggestions":["Hello","Hi there"],"corrections":[{"original":"helo","suggestion":"Hello","reason":"spelling"}]}
        """
        let result = try GrokResponseParser.parseMessageContent(content, model: "grok-3")
        XCTAssertEqual(result.rewritten, "Hello")
        XCTAssertEqual(result.suggestions, ["Hello", "Hi there"])
        XCTAssertEqual(result.corrections.count, 1)
        XCTAssertEqual(result.corrections[0].original, "helo")
        XCTAssertEqual(result.corrections[0].suggestion, "Hello")
        XCTAssertEqual(result.corrections[0].reason, "spelling")
        XCTAssertEqual(result.model, "grok-3")
        XCTAssertNil(result.warning)
    }

    func testCorrectionsFillSuggestionsWhenArrayMissing() throws {
        let content = """
        {"rewritten":"I cannot believe this works.","corrections":[{"original":"cant","suggestion":"cannot","reason":"spelling"}]}
        """
        let result = try GrokResponseParser.parseMessageContent(content)
        XCTAssertEqual(result.rewritten, "I cannot believe this works.")
        XCTAssertEqual(result.suggestions, ["cannot"])
    }

    func testParsesFencedJSONAndTextAlias() throws {
        let fenced = """
        Here you go:
        ```json
        {"text":"Hi","suggestions":["Hi"]}
        ```
        """
        let parsed = GrokResponseParser.extractJSONObject(from: fenced) as? [String: Any]
        XCTAssertEqual(parsed?["text"] as? String, "Hi")
        let result = try GrokResponseParser.parseMessageContent(fenced)
        XCTAssertEqual(result.rewritten, "Hi")
        XCTAssertEqual(result.suggestions, ["Hi"])
    }

    func testProseFallsBackToRawText() throws {
        XCTAssertNil(GrokResponseParser.extractJSONObject(from: "just text"))
        let result = try GrokResponseParser.parseMessageContent("Plain rewrite")
        XCTAssertEqual(result.rewritten, "Plain rewrite")
        XCTAssertEqual(result.suggestions, [])
        XCTAssertEqual(result.warning, "Response was not structured JSON; using raw text.")
    }

    func testChatCompletionEnvelope() throws {
        let payload = """
        {"model":"grok-3","choices":[{"message":{"content":"{\\"rewritten\\":\\"Hello\\",\\"suggestions\\":[\\"Hello\\"]}"}}]}
        """
        let result = try GrokResponseParser.parseChatCompletion(Data(payload.utf8))
        XCTAssertEqual(result.model, "grok-3")
        XCTAssertEqual(result.rewritten, "Hello")
        XCTAssertEqual(result.suggestions, ["Hello"])
    }

    func testAPIErrorAndEmptyAndMalformed() {
        XCTAssertThrowsError(
            try GrokResponseParser.parseChatCompletion(Data(#"{"error":{"message":"Unauthorized"}}"#.utf8))
        ) { error in
            XCTAssertEqual(error as? GrokParseError, .api("Unauthorized"))
        }
        XCTAssertThrowsError(try GrokResponseParser.parseMessageContent("   ")) { error in
            XCTAssertEqual(error as? GrokParseError, .empty)
        }
        XCTAssertThrowsError(try GrokResponseParser.parseChatCompletion(Data("not-json".utf8))) { error in
            XCTAssertEqual(error as? GrokParseError, .malformed)
        }
    }

    func testRewriteClientUsesFixtureTransportWithoutURLSession() async throws {
        let envelope = """
        {"model":"grok-3","choices":[{"message":{"content":"{\\"rewritten\\":\\"Hello\\",\\"suggestions\\":[\\"Hello\\",\\"Hi\\"]}"}}]}
        """
        let transport = FixtureTransport(statusCode: 200, body: Data(envelope.utf8))
        let client = GrokRewriteClient(apiKey: "test-key", transport: transport)
        let result = try await client.rewrite("helo", style: "casual")

        XCTAssertEqual(result.rewritten, "Hello")
        XCTAssertEqual(result.suggestions, ["Hello", "Hi"])
        XCTAssertEqual(result.model, "grok-3")

        let sent = try XCTUnwrap(transport.lastRequest)
        XCTAssertEqual(sent.headers["Authorization"], "Bearer test-key")
        XCTAssertEqual(sent.method, "POST")
        let sentObject = try XCTUnwrap(JSONSerialization.jsonObject(with: sent.body) as? [String: Any])
        let messages = try XCTUnwrap(sentObject["messages"] as? [[String: Any]])
        XCTAssertEqual(
            messages.last?["content"] as? String,
            "Rewrite the text in a casual style.\n\nText:\nhelo"
        )
    }

    func testHTTPErrorUsesErrorMessage() async {
        let transport = FixtureTransport(
            statusCode: 401,
            body: Data(#"{"error":{"message":"Unauthorized"}}"#.utf8)
        )
        let client = GrokRewriteClient(apiKey: "bad", transport: transport)
        do {
            _ = try await client.rewrite("hi")
            XCTFail("expected API error")
        } catch let error as GrokParseError {
            XCTAssertEqual(error, .api("Unauthorized"))
        } catch {
            XCTFail("unexpected error \(error)")
        }
    }

    func testURLSessionTransportConstructsOnLinux() {
        _ = URLSessionGrokTransport()
    }
}

final class FixtureTransport: GrokTransport {
    let statusCode: Int
    let body: Data
    var lastRequest: GrokHTTPRequest?

    init(statusCode: Int, body: Data) {
        self.statusCode = statusCode
        self.body = body
    }

    func send(_ request: GrokHTTPRequest) async throws -> GrokHTTPResponse {
        lastRequest = request
        return GrokHTTPResponse(statusCode: statusCode, body: body)
    }
}
