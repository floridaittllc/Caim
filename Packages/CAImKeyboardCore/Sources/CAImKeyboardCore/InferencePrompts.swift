import Foundation

/// Prompts and JSON schemas shared by every backend.
/// Must match `server/runpod/prompts.json`; `InferencePromptsSyncTests` enforces it.
public enum InferencePrompts {
    public static let servedModelName = "caim-grammar"

    public static let grammarSystem = #"You are CAIm's grammar checker inside a phone keyboard. Find spelling, grammar, punctuation and word-choice mistakes in the user's text. Return ONLY JSON shaped as {"issues":[{"start":0,"end":0,"original":"","replacement":"","category":"grammar","explanation":""}]}. start and end are 0-based character offsets into the text (end exclusive) and original must equal the text between them exactly. Keep each span as small as possible. category is one of spelling, grammar, punctuation, style, word_choice. Explanations stay under 12 words. Do not flag names, slang or casual tone unless clearly wrong. The text may stop mid-sentence, so ignore missing final punctuation. Report at most 8 issues. Return {"issues":[]} when the text is correct. No markdown."#

    public static let grammarMaxTokens = 512
    public static let grammarTemperature = 0.0

    public static func grammarUser(text: String) -> String {
        "Text:\n\(text)"
    }

    public static let grammarSchemaJSON = #"""
    {
      "type": "object",
      "properties": {
        "issues": {
          "type": "array",
          "maxItems": 8,
          "items": {
            "type": "object",
            "properties": {
              "start": { "type": "integer" },
              "end": { "type": "integer" },
              "original": { "type": "string" },
              "replacement": { "type": "string" },
              "category": {
                "type": "string",
                "enum": ["spelling", "grammar", "punctuation", "style", "word_choice"]
              },
              "explanation": { "type": "string" }
            },
            "required": ["start", "end", "original", "replacement", "category", "explanation"],
            "additionalProperties": false
          }
        }
      },
      "required": ["issues"],
      "additionalProperties": false
    }
    """#

    public static let rewriteSystem = #"You are CAIm, a writing assistant inside a phone keyboard. Rewrite the user's text as instructed and keep their meaning, language and point of view. Return ONLY JSON shaped as {"rewritten":"","suggestions":[""],"corrections":[{"original":"","suggestion":"","reason":""}]}. rewritten is the single best version. suggestions holds up to 2 alternative versions. corrections lists spelling or grammar fixes you made. No markdown."#

    public static let rewriteMaxTokens = 768
    public static let rewriteTemperature = 0.3

    public static func rewriteInstruction(_ mode: RewriteMode) -> String {
        switch mode {
        case .professional:
            return "Rewrite in a clear, polished, professional tone."
        case .casual:
            return "Rewrite in a relaxed, friendly, casual tone."
        case .shorten:
            return "Make it noticeably shorter while keeping the meaning."
        case .expand:
            return "Expand it with a little more detail while keeping the same voice."
        case .fix:
            return "Fix only spelling, grammar and punctuation. Change nothing else."
        }
    }

    public static func rewriteUser(text: String, mode: RewriteMode) -> String {
        "Instruction: \(rewriteInstruction(mode))\n\nText:\n\(text)"
    }

    public static let rewriteSchemaJSON = #"""
    {
      "type": "object",
      "properties": {
        "rewritten": { "type": "string" },
        "suggestions": { "type": "array", "maxItems": 2, "items": { "type": "string" } },
        "corrections": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "original": { "type": "string" },
              "suggestion": { "type": "string" },
              "reason": { "type": "string" }
            },
            "required": ["original", "suggestion", "reason"],
            "additionalProperties": false
          }
        }
      },
      "required": ["rewritten", "suggestions", "corrections"],
      "additionalProperties": false
    }
    """#

    public static var grammarSchema: [String: Any] {
        parseSchema(grammarSchemaJSON)
    }

    public static var rewriteSchema: [String: Any] {
        parseSchema(rewriteSchemaJSON)
    }

    private static func parseSchema(_ json: String) -> [String: Any] {
        guard let data = json.data(using: .utf8),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else {
            return [:]
        }
        return object
    }
}
