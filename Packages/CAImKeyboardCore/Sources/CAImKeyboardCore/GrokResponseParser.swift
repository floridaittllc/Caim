import Foundation

public struct GrokCorrection: Equatable, Sendable {
    public var original: String
    public var suggestion: String
    public var reason: String

    public init(original: String, suggestion: String, reason: String) {
        self.original = original
        self.suggestion = suggestion
        self.reason = reason
    }
}

public struct GrokRewrite: Equatable, Sendable {
    public var rewritten: String
    public var suggestions: [String]
    public var corrections: [GrokCorrection]
    public var model: String?
    public var warning: String?

    public init(
        rewritten: String,
        suggestions: [String],
        corrections: [GrokCorrection],
        model: String? = nil,
        warning: String? = nil
    ) {
        self.rewritten = rewritten
        self.suggestions = suggestions
        self.corrections = corrections
        self.model = model
        self.warning = warning
    }
}

public enum GrokParseError: Error, Equatable, Sendable {
    case api(String)
    case empty
    case malformed
}

/// Parses xAI Chat Completions payloads and model text into rewrite + suggestions.
/// Foundation JSON only — unit tests pass a fixture and never open a socket.
public enum GrokResponseParser {
    public static let systemPrompt = [
        "You are CAIm, a writing assistant for a mobile keyboard.",
        "Return ONLY valid JSON with this shape:",
        "{\"rewritten\":\"string\",\"suggestions\":[\"string\"],\"corrections\":[{\"original\":\"string\",\"suggestion\":\"string\",\"reason\":\"string\"}]}",
        "Fix grammar and spelling in corrections. Do not wrap JSON in markdown.",
    ].joined(separator: " ")

    public static func userPrompt(text: String, style: String) -> String {
        "Rewrite the text in a \(style) style.\n\nText:\n\(text)"
    }

    public static func parseChatCompletion(_ data: Data) throws -> GrokRewrite {
        let object: Any
        do {
            object = try JSONSerialization.jsonObject(with: data)
        } catch {
            throw GrokParseError.malformed
        }
        guard let root = object as? [String: Any] else {
            throw GrokParseError.malformed
        }
        if let error = root["error"] as? [String: Any],
           let message = error["message"] as? String,
           !message.isEmpty
        {
            throw GrokParseError.api(message)
        }
        let model = root["model"] as? String
        let content = firstChoiceContent(root) ?? ""
        return try parseMessageContent(content, model: model)
    }

    public static func parseMessageContent(_ content: String, model: String? = nil) throws -> GrokRewrite {
        let trimmed = content.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            throw GrokParseError.empty
        }

        if let parsed = extractJSONObject(from: trimmed) as? [String: Any] {
            return rewrite(from: parsed, rawContent: trimmed, model: model)
        }

        return GrokRewrite(
            rewritten: trimmed,
            suggestions: [],
            corrections: [],
            model: model,
            warning: "Response was not structured JSON; using raw text."
        )
    }

    public static func extractJSONObject(from content: String) -> Any? {
        let trimmed = content.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            return nil
        }
        if let direct = parseJSON(trimmed) {
            return direct
        }
        if let fenced = firstCapture(pattern: "```(?:json)?\\s*([\\s\\S]*?)```", in: trimmed),
           let parsed = parseJSON(fenced.trimmingCharacters(in: .whitespacesAndNewlines))
        {
            return parsed
        }
        if let start = trimmed.firstIndex(of: "{"),
           let end = trimmed.lastIndex(of: "}"),
           start < end
        {
            let slice = String(trimmed[start...end])
            if let parsed = parseJSON(slice) {
                return parsed
            }
        }
        return nil
    }

    private static func rewrite(from record: [String: Any], rawContent: String, model: String?) -> GrokRewrite {
        let rewritten = asString(record["rewritten"])
            ?? asString(record["text"])
            ?? asString(record["result"])
            ?? rawContent
        let corrections = parseCorrections(record["corrections"])
        var suggestions = parseSuggestions(record["suggestions"])
        if suggestions.isEmpty {
            suggestions = corrections.map(\.suggestion)
        }
        return GrokRewrite(
            rewritten: rewritten,
            suggestions: suggestions,
            corrections: corrections,
            model: model,
            warning: nil
        )
    }

    private static func parseCorrections(_ raw: Any?) -> [GrokCorrection] {
        guard let items = raw as? [Any] else {
            return []
        }
        var corrections: [GrokCorrection] = []
        for item in items {
            guard let record = item as? [String: Any],
                  let original = asString(record["original"]),
                  let suggestion = asString(record["suggestion"])
            else {
                continue
            }
            let reason = asString(record["reason"]) ?? "Suggested fix"
            corrections.append(GrokCorrection(original: original, suggestion: suggestion, reason: reason))
        }
        return corrections
    }

    private static func parseSuggestions(_ raw: Any?) -> [String] {
        guard let items = raw as? [Any] else {
            return []
        }
        var suggestions: [String] = []
        for item in items {
            if let text = item as? String, !text.isEmpty {
                suggestions.append(text)
                continue
            }
            if let record = item as? [String: Any] {
                if let text = asString(record["suggestion"]) ?? asString(record["text"]), !text.isEmpty {
                    suggestions.append(text)
                }
            }
        }
        return suggestions
    }

    private static func asString(_ value: Any?) -> String? {
        value as? String
    }

    private static func parseJSON(_ text: String) -> Any? {
        guard let data = text.data(using: .utf8) else {
            return nil
        }
        return try? JSONSerialization.jsonObject(with: data)
    }

    private static func firstChoiceContent(_ root: [String: Any]) -> String? {
        guard let choices = root["choices"] as? [Any],
              let first = choices.first as? [String: Any],
              let message = first["message"] as? [String: Any]
        else {
            return nil
        }
        return message["content"] as? String
    }

    private static func firstCapture(pattern: String, in text: String) -> String? {
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else {
            return nil
        }
        let range = NSRange(text.startIndex..., in: text)
        guard let match = regex.firstMatch(in: text, options: [], range: range),
              match.numberOfRanges > 1,
              let capture = Range(match.range(at: 1), in: text)
        else {
            return nil
        }
        return String(text[capture])
    }
}
