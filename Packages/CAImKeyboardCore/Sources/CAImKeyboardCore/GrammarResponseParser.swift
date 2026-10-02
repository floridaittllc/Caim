import Foundation

/// Turns model output into `GrammarIssue`s anchored in the checked text.
///
/// Models get character offsets wrong often, so `original` is authoritative:
/// offsets are kept only when they select exactly `original`, otherwise the
/// nearest occurrence of `original` is used, and unlocatable issues are dropped.
public enum GrammarResponseParser {
    public static let maxIssues = 8

    public static func parseChatCompletion(_ data: Data, text: String) throws -> [GrammarIssue] {
        guard let root = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else {
            throw InferenceError.malformed
        }
        if let error = root["error"] as? [String: Any],
           let message = error["message"] as? String,
           !message.isEmpty
        {
            throw InferenceError.http(status: 200, message: message)
        }
        guard let choices = root["choices"] as? [Any],
              let first = choices.first as? [String: Any],
              let message = first["message"] as? [String: Any]
        else {
            throw InferenceError.malformed
        }
        return try parseContent(message["content"] as? String ?? "", text: text)
    }

    public static func parseContent(_ content: String, text: String) throws -> [GrammarIssue] {
        let trimmed = content.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            throw InferenceError.empty
        }
        guard let raw = rawIssues(from: trimmed) else {
            throw InferenceError.malformed
        }
        return reconcile(raw, text: text)
    }

    /// nil when nothing in `content` looks like an issue list (including an explicit empty one).
    static func rawIssues(from content: String) -> [[String: Any]]? {
        if let whole = GrokResponseParser.extractJSONObject(from: content) {
            if let record = whole as? [String: Any] {
                if let items = (record["issues"] ?? record["errors"] ?? record["corrections"]) as? [Any] {
                    return items.compactMap { $0 as? [String: Any] }
                }
                if isIssueRecord(record) {
                    return [record]
                }
            }
            if let items = whole as? [Any] {
                return items.compactMap { $0 as? [String: Any] }
            }
        }
        if let array = topLevelArray(in: content) {
            return array
        }
        let salvaged = completeObjects(in: content).filter(isIssueRecord)
        return salvaged.isEmpty ? nil : salvaged
    }

    public static func reconcile(_ raw: [[String: Any]], text: String) -> [GrammarIssue] {
        let characters = Array(text)
        var issues: [GrammarIssue] = []
        for record in raw {
            guard let original = string(record, "original", "text", "error", "wrong"),
                  !original.isEmpty,
                  let replacement = string(record, "replacement", "suggestion", "correction", "fix"),
                  replacement != original
            else {
                continue
            }
            let hint = int(record, "start", "offset")
            var end = int(record, "end")
            if end == nil, let hint, let length = int(record, "length") {
                end = hint + length
            }
            guard let range = locate(Array(original), in: characters, start: hint, end: end, taken: issues.map(\.range)) else {
                continue
            }
            issues.append(
                GrammarIssue(
                    range: range,
                    original: original,
                    replacement: replacement,
                    category: GrammarCategory(lenient: string(record, "category", "type")),
                    explanation: string(record, "explanation", "reason", "message") ?? ""
                )
            )
            if issues.count == maxIssues {
                break
            }
        }
        return issues.sorted { $0.range.lowerBound < $1.range.lowerBound }
    }

    private static func locate(
        _ needle: [Character],
        in haystack: [Character],
        start: Int?,
        end: Int?,
        taken: [Range<Int>]
    ) -> Range<Int>? {
        func free(_ range: Range<Int>) -> Bool {
            !taken.contains { $0.overlaps(range) }
        }
        if let start, let end, start >= 0, end <= haystack.count, start < end,
           Array(haystack[start..<end]) == needle
        {
            let range = start..<end
            return free(range) ? range : nil
        }
        guard needle.count <= haystack.count else {
            return nil
        }
        var candidates: [Range<Int>] = []
        for index in 0...(haystack.count - needle.count) where haystack[index] == needle[0] {
            if Array(haystack[index..<(index + needle.count)]) == needle {
                let range = index..<(index + needle.count)
                if free(range) {
                    candidates.append(range)
                }
            }
        }
        let onWordBoundaries = candidates.filter { isWordBoundary(haystack, $0) }
        let pool = onWordBoundaries.isEmpty ? candidates : onWordBoundaries
        guard let hint = start else {
            return pool.first
        }
        return pool.min { abs($0.lowerBound - hint) < abs($1.lowerBound - hint) }
    }

    private static func isWordBoundary(_ characters: [Character], _ range: Range<Int>) -> Bool {
        let before = range.lowerBound == 0 || !isWordCharacter(characters[range.lowerBound - 1])
        let after = range.upperBound == characters.count || !isWordCharacter(characters[range.upperBound])
        return before && after
    }

    private static func isWordCharacter(_ character: Character) -> Bool {
        character.isLetter || character.isNumber || character == "'" || character == "’"
    }

    private static func isIssueRecord(_ record: [String: Any]) -> Bool {
        string(record, "original", "text", "error", "wrong") != nil
            && string(record, "replacement", "suggestion", "correction", "fix") != nil
    }

    private static func topLevelArray(in content: String) -> [[String: Any]]? {
        guard let start = content.firstIndex(of: "["),
              let end = content.lastIndex(of: "]"),
              start < end,
              let data = String(content[start...end]).data(using: .utf8),
              let items = (try? JSONSerialization.jsonObject(with: data)) as? [Any]
        else {
            return nil
        }
        let records = items.compactMap { $0 as? [String: Any] }
        return records.isEmpty && !items.isEmpty ? nil : records
    }

    /// Every balanced `{...}` in `content` that parses as JSON, innermost first.
    /// Recovers the finished issues from a reply cut off by `max_tokens`.
    static func completeObjects(in content: String) -> [[String: Any]] {
        let scalars = Array(content.unicodeScalars)
        var openings: [Int] = []
        var inString = false
        var escaped = false
        var objects: [[String: Any]] = []
        for (index, scalar) in scalars.enumerated() {
            if inString {
                if escaped {
                    escaped = false
                } else if scalar == "\\" {
                    escaped = true
                } else if scalar == "\"" {
                    inString = false
                }
                continue
            }
            switch scalar {
            case "\"":
                inString = true
            case "{":
                openings.append(index)
            case "}":
                guard let open = openings.popLast() else {
                    continue
                }
                var view = String.UnicodeScalarView()
                view.append(contentsOf: scalars[open...index])
                if let data = String(view).data(using: .utf8),
                   let record = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
                {
                    objects.append(record)
                }
            default:
                break
            }
        }
        return objects
    }

    private static func string(_ record: [String: Any], _ keys: String...) -> String? {
        for key in keys {
            if let value = record[key] as? String {
                return value
            }
        }
        return nil
    }

    private static func int(_ record: [String: Any], _ keys: String...) -> Int? {
        for key in keys {
            if let value = record[key] as? Int {
                return value
            }
            if let value = record[key] as? Double {
                return Int(value)
            }
            if let value = record[key] as? String, let parsed = Int(value) {
                return parsed
            }
        }
        return nil
    }
}
