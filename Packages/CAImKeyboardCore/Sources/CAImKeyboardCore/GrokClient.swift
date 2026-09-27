import Foundation

public struct GrokHTTPRequest: Equatable, Sendable {
    public var url: URL
    public var method: String
    public var headers: [String: String]
    public var body: Data
    public var timeout: TimeInterval

    public init(
        url: URL,
        method: String,
        headers: [String: String],
        body: Data,
        timeout: TimeInterval = 20
    ) {
        self.url = url
        self.method = method
        self.headers = headers
        self.body = body
        self.timeout = timeout
    }
}

public struct GrokHTTPResponse: Equatable, Sendable {
    public var statusCode: Int
    public var body: Data

    public init(statusCode: Int, body: Data) {
        self.statusCode = statusCode
        self.body = body
    }
}

/// Network boundary. Tests supply a fixture; URLSession is a separate type.
public protocol GrokTransport: AnyObject {
    func send(_ request: GrokHTTPRequest) async throws -> GrokHTTPResponse
}

public final class GrokRewriteClient {
    public var endpoint: URL
    public var apiKey: String
    public var model: String
    public var transport: any GrokTransport

    public init(
        apiKey: String,
        transport: any GrokTransport,
        model: String = "grok-3",
        endpoint: URL? = nil
    ) {
        self.apiKey = apiKey
        self.transport = transport
        self.model = model
        self.endpoint = endpoint ?? URL(string: "https://api.x.ai/v1/chat/completions")!
    }

    public func rewrite(_ text: String, style: String = "professional") async throws -> GrokRewrite {
        let payload: [String: Any] = [
            "model": model,
            "temperature": 0.3,
            "messages": [
                ["role": "system", "content": GrokResponseParser.systemPrompt],
                ["role": "user", "content": GrokResponseParser.userPrompt(text: text, style: style)],
            ],
        ]
        let body = try JSONSerialization.data(withJSONObject: payload)
        let response = try await transport.send(
            GrokHTTPRequest(
                url: endpoint,
                method: "POST",
                headers: [
                    "Content-Type": "application/json",
                    "Authorization": "Bearer \(apiKey)",
                ],
                body: body
            )
        )

        if !(200..<300).contains(response.statusCode) {
            if let root = try? JSONSerialization.jsonObject(with: response.body) as? [String: Any],
               let error = root["error"] as? [String: Any],
               let message = error["message"] as? String,
               !message.isEmpty
            {
                throw GrokParseError.api(message)
            }
            throw GrokParseError.api("HTTP \(response.statusCode)")
        }

        return try GrokResponseParser.parseChatCompletion(response.body)
    }
}
