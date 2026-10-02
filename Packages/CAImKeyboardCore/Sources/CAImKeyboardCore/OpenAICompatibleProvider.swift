import Foundation

public enum StructuredOutputMode: String, Sendable {
    /// `response_format: {type: json_schema}` — vLLM structured outputs, OpenAI, xAI.
    case jsonSchema
    /// `response_format: {type: json_object}`.
    case jsonObject
    /// Prompt-only JSON; the parser copes with fences and prose.
    case none
}

public struct OpenAICompatibleEndpoint: Equatable, Sendable {
    public var baseURL: URL
    public var apiKey: String
    public var model: String
    public var structuredOutput: StructuredOutputMode
    public var grammarTimeout: TimeInterval
    public var rewriteTimeout: TimeInterval

    public init(
        baseURL: URL,
        apiKey: String,
        model: String,
        structuredOutput: StructuredOutputMode = .jsonSchema,
        grammarTimeout: TimeInterval = 12,
        rewriteTimeout: TimeInterval = 30
    ) {
        self.baseURL = baseURL
        self.apiKey = apiKey
        self.model = model
        self.structuredOutput = structuredOutput
        self.grammarTimeout = grammarTimeout
        self.rewriteTimeout = rewriteTimeout
    }

    public var chatCompletionsURL: URL {
        baseURL.appendingPathComponent("chat").appendingPathComponent("completions")
    }

    /// Self-hosted endpoint from user input. Accepts a RunPod endpoint id,
    /// `https://api.runpod.ai/v2/<id>`, any `.../v1` base, or a full `/chat/completions` URL.
    public static func selfHosted(
        baseURL raw: String,
        apiKey: String,
        model: String? = nil
    ) -> OpenAICompatibleEndpoint? {
        guard let url = normalizedBaseURL(raw) else {
            return nil
        }
        let trimmedModel = model?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return OpenAICompatibleEndpoint(
            baseURL: url,
            apiKey: apiKey.trimmingCharacters(in: .whitespacesAndNewlines),
            model: trimmedModel.isEmpty ? InferencePrompts.servedModelName : trimmedModel
        )
    }

    public static func runpodServerless(endpointID: String, apiKey: String, model: String? = nil) -> OpenAICompatibleEndpoint? {
        selfHosted(baseURL: endpointID, apiKey: apiKey, model: model)
    }

    public static func grok(apiKey: String, model: String = "grok-3") -> OpenAICompatibleEndpoint {
        OpenAICompatibleEndpoint(
            baseURL: URL(string: "https://api.x.ai/v1")!,
            apiKey: apiKey,
            model: model,
            structuredOutput: .jsonSchema
        )
    }

    /// Mirrors `normalize_base_url` in `server/runpod/smoke_test.py` and `lib/inference/endpoint.ts`.
    public static func normalizedBaseURL(_ raw: String) -> URL? {
        var text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if text.isEmpty {
            return nil
        }
        if text.unicodeScalars.allSatisfy({ $0.isASCII && CharacterSet.alphanumerics.contains($0) }) {
            return URL(string: "https://api.runpod.ai/v2/\(text)/openai/v1")
        }
        if !text.contains("://") {
            text = "https://" + text
        }
        guard var components = URLComponents(string: text),
              let scheme = components.scheme?.lowercased(),
              scheme == "https" || scheme == "http",
              let host = components.host,
              !host.isEmpty
        else {
            return nil
        }
        var path = components.path
        while path.hasSuffix("/") {
            path.removeLast()
        }
        if path.hasSuffix("/chat/completions") {
            path.removeLast("/chat/completions".count)
        }
        if path.range(of: "^/v2/[^/]+$", options: .regularExpression) != nil {
            path += "/openai/v1"
        }
        components.path = path
        components.query = nil
        components.fragment = nil
        return components.url
    }
}

/// Chat-completions client for any OpenAI-compatible server.
public final class OpenAICompatibleProvider: InferenceProvider {
    public let backend: InferenceBackend
    public var endpoint: OpenAICompatibleEndpoint
    public var transport: any GrokTransport
    /// False when the keyboard lacks Full Access, so no network is allowed.
    public var networkAllowed: Bool

    public init(
        backend: InferenceBackend,
        endpoint: OpenAICompatibleEndpoint,
        transport: any GrokTransport,
        networkAllowed: Bool = true
    ) {
        self.backend = backend
        self.endpoint = endpoint
        self.transport = transport
        self.networkAllowed = networkAllowed
    }

    public var unavailableReason: String? {
        if !networkAllowed {
            return "Full Access is off"
        }
        if endpoint.apiKey.isEmpty {
            return "No API key"
        }
        return nil
    }

    public func checkGrammar(_ text: String) async throws -> [GrammarIssue] {
        let data = try await complete(
            system: InferencePrompts.grammarSystem,
            user: InferencePrompts.grammarUser(text: text),
            schemaName: "grammar_issues",
            schema: InferencePrompts.grammarSchema,
            maxTokens: InferencePrompts.grammarMaxTokens,
            temperature: InferencePrompts.grammarTemperature,
            timeout: endpoint.grammarTimeout
        )
        return try GrammarResponseParser.parseChatCompletion(data, text: text)
    }

    public func rewrite(_ text: String, mode: RewriteMode) async throws -> GrokRewrite {
        let data = try await complete(
            system: InferencePrompts.rewriteSystem,
            user: InferencePrompts.rewriteUser(text: text, mode: mode),
            schemaName: "rewrite",
            schema: InferencePrompts.rewriteSchema,
            maxTokens: InferencePrompts.rewriteMaxTokens,
            temperature: InferencePrompts.rewriteTemperature,
            timeout: endpoint.rewriteTimeout
        )
        do {
            return try GrokResponseParser.parseChatCompletion(data)
        } catch GrokParseError.api(let message) {
            throw InferenceError.http(status: 200, message: message)
        } catch GrokParseError.empty {
            throw InferenceError.empty
        } catch {
            throw InferenceError.malformed
        }
    }

    public func buildRequest(
        system: String,
        user: String,
        schemaName: String,
        schema: [String: Any],
        maxTokens: Int,
        temperature: Double,
        timeout: TimeInterval,
        structuredOutput: StructuredOutputMode
    ) throws -> GrokHTTPRequest {
        var payload: [String: Any] = [
            "model": endpoint.model,
            "temperature": temperature,
            "max_tokens": maxTokens,
            "messages": [
                ["role": "system", "content": system],
                ["role": "user", "content": user],
            ],
        ]
        switch structuredOutput {
        case .jsonSchema:
            payload["response_format"] = [
                "type": "json_schema",
                "json_schema": ["name": schemaName, "schema": schema, "strict": true] as [String: Any],
            ] as [String: Any]
        case .jsonObject:
            payload["response_format"] = ["type": "json_object"]
        case .none:
            break
        }
        return GrokHTTPRequest(
            url: endpoint.chatCompletionsURL,
            method: "POST",
            headers: [
                "Content-Type": "application/json",
                "Authorization": "Bearer \(endpoint.apiKey)",
            ],
            body: try JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys]),
            timeout: timeout
        )
    }

    private func complete(
        system: String,
        user: String,
        schemaName: String,
        schema: [String: Any],
        maxTokens: Int,
        temperature: Double,
        timeout: TimeInterval
    ) async throws -> Data {
        var mode = endpoint.structuredOutput
        while true {
            let request = try buildRequest(
                system: system,
                user: user,
                schemaName: schemaName,
                schema: schema,
                maxTokens: maxTokens,
                temperature: temperature,
                timeout: timeout,
                structuredOutput: mode
            )
            let response: GrokHTTPResponse
            do {
                response = try await transport.send(request)
            } catch is CancellationError {
                throw CancellationError()
            } catch {
                if Task.isCancelled {
                    throw CancellationError()
                }
                throw InferenceError.transport(String(describing: error))
            }
            if (200..<300).contains(response.statusCode) {
                return response.body
            }
            // Servers without structured outputs reject response_format with 400/422; retry once as plain JSON.
            if mode != .none, response.statusCode == 400 || response.statusCode == 422 {
                mode = .none
                continue
            }
            throw InferenceError.http(status: response.statusCode, message: Self.errorMessage(response.body))
        }
    }

    static func errorMessage(_ body: Data) -> String {
        guard let root = (try? JSONSerialization.jsonObject(with: body)) as? [String: Any] else {
            return String(data: body.prefix(200), encoding: .utf8) ?? ""
        }
        if let error = root["error"] as? [String: Any], let message = error["message"] as? String {
            return message
        }
        if let message = (root["error"] ?? root["message"] ?? root["detail"]) as? String {
            return message
        }
        return ""
    }
}
