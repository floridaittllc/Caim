import Foundation

/// Where a grammar check or rewrite runs.
public enum InferenceBackend: String, CaseIterable, Sendable {
    /// Apple Foundation Models in the keyboard extension (iOS 26+).
    case onDevice
    /// Any OpenAI-compatible server, e.g. RunPod Serverless vLLM or a vLLM Pod.
    case selfHosted
    /// xAI Grok chat completions.
    case grok

    public var displayName: String {
        switch self {
        case .onDevice:
            return "On-device"
        case .selfHosted:
            return "Self-hosted"
        case .grok:
            return "Grok"
        }
    }
}

public enum RewriteMode: String, CaseIterable, Sendable {
    case professional
    case casual
    case shorten
    case expand
    case fix
}

public enum GrammarCategory: String, CaseIterable, Sendable {
    case spelling
    case grammar
    case punctuation
    case style
    case wordChoice = "word_choice"
    case other

    /// Accepts the schema values plus common model spellings ("word choice", "Typo").
    public init(lenient raw: String?) {
        let normalized = (raw ?? "")
            .lowercased()
            .replacingOccurrences(of: "-", with: "_")
            .replacingOccurrences(of: " ", with: "_")
        switch normalized {
        case "spelling", "typo", "misspelling":
            self = .spelling
        case "grammar", "agreement", "tense":
            self = .grammar
        case "punctuation", "capitalization":
            self = .punctuation
        case "style", "clarity", "tone":
            self = .style
        case "word_choice", "wordchoice", "usage":
            self = .wordChoice
        default:
            self = .other
        }
    }
}

/// One fix inside the checked text. `range` counts Swift `Character`s.
public struct GrammarIssue: Equatable, Sendable {
    public var range: Range<Int>
    public var original: String
    public var replacement: String
    public var category: GrammarCategory
    public var explanation: String

    public init(
        range: Range<Int>,
        original: String,
        replacement: String,
        category: GrammarCategory,
        explanation: String
    ) {
        self.range = range
        self.original = original
        self.replacement = replacement
        self.category = category
        self.explanation = explanation
    }
}

public struct GrammarCheckResult: Equatable, Sendable {
    public var text: String
    public var issues: [GrammarIssue]
    public var backend: InferenceBackend
    public var attempts: [InferenceAttempt]

    public init(text: String, issues: [GrammarIssue], backend: InferenceBackend, attempts: [InferenceAttempt] = []) {
        self.text = text
        self.issues = issues
        self.backend = backend
        self.attempts = attempts
    }
}

public struct RewriteRouteResult: Equatable, Sendable {
    public var rewrite: GrokRewrite
    public var backend: InferenceBackend
    public var attempts: [InferenceAttempt]

    public init(rewrite: GrokRewrite, backend: InferenceBackend, attempts: [InferenceAttempt] = []) {
        self.rewrite = rewrite
        self.backend = backend
        self.attempts = attempts
    }
}

public struct InferenceAttempt: Equatable, Sendable {
    public enum Outcome: Equatable, Sendable {
        case skipped(String)
        case failed(InferenceError)
        case succeeded
    }

    public var backend: InferenceBackend
    public var outcome: Outcome

    public init(backend: InferenceBackend, outcome: Outcome) {
        self.backend = backend
        self.outcome = outcome
    }
}

public enum InferenceError: Error, Equatable, Sendable {
    case notConfigured(String)
    case http(status: Int, message: String)
    case transport(String)
    case malformed
    case empty
    case noProviderSucceeded([InferenceAttempt])

    public var userMessage: String {
        switch self {
        case .notConfigured(let detail):
            return detail
        case .http(let status, let message):
            return message.isEmpty ? "HTTP \(status)" : "HTTP \(status): \(message)"
        case .transport(let detail):
            return detail
        case .malformed:
            return "Response was not usable JSON"
        case .empty:
            return "Empty response"
        case .noProviderSucceeded(let attempts):
            if attempts.isEmpty {
                return "No AI provider is configured"
            }
            return attempts.map { attempt in
                switch attempt.outcome {
                case .skipped(let reason):
                    return "\(attempt.backend.displayName): \(reason)"
                case .failed(let error):
                    return "\(attempt.backend.displayName): \(error.userMessage)"
                case .succeeded:
                    return "\(attempt.backend.displayName): ok"
                }
            }.joined(separator: "; ")
        }
    }
}

/// A backend the router can call. Implementations must throw `CancellationError`
/// when cancelled so the router stops instead of falling through to the next provider.
public protocol InferenceProvider: AnyObject {
    var backend: InferenceBackend { get }
    /// Cheap, synchronous readiness check (configured, permitted, model present).
    /// Returns nil when ready, or a short reason the provider is skipped.
    var unavailableReason: String? { get }
    func checkGrammar(_ text: String) async throws -> [GrammarIssue]
    func rewrite(_ text: String, mode: RewriteMode) async throws -> GrokRewrite
}
