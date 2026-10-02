import Foundation
import CAImKeyboardCore
#if canImport(FoundationModels)
import FoundationModels
#endif

/// Apple Foundation Models (iOS 26+, Apple Intelligence devices) as the first grammar backend.
///
/// Apple does not document keyboard extensions as a supported host, and extensions
/// run under a tight memory limit (~50–70 MB). Inference runs in a system process, but
/// to stay safe the provider is gated on `SystemLanguageModel.default.availability`,
/// a user toggle in the app, and turns itself off for the session after repeated
/// failures so the router falls through to the self-hosted endpoint.
final class OnDeviceGrammarProvider: InferenceProvider {
    let backend: InferenceBackend = .onDevice

    private let maxFailures = 2
    private var failures = 0

    var unavailableReason: String? {
        if failures >= maxFailures {
            return "Disabled after errors"
        }
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            return Self.availabilityReason()
        }
        return "Requires iOS 26"
        #else
        return "Built without Foundation Models"
        #endif
    }

    func checkGrammar(_ text: String) async throws -> [GrammarIssue] {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            return try await guarded {
                try await Self.generateIssues(text)
            }
        }
        #endif
        throw InferenceError.notConfigured("On-device model unavailable")
    }

    func rewrite(_ text: String, mode: RewriteMode) async throws -> GrokRewrite {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            return try await guarded {
                try await Self.generateRewrite(text, mode: mode)
            }
        }
        #endif
        throw InferenceError.notConfigured("On-device model unavailable")
    }

    private func guarded<Value>(_ work: () async throws -> Value) async throws -> Value {
        do {
            let value = try await work()
            failures = 0
            return value
        } catch {
            if error is CancellationError || Task.isCancelled {
                throw CancellationError()
            }
            failures += 1
            if let inference = error as? InferenceError {
                throw inference
            }
            throw InferenceError.transport("On-device: \(error.localizedDescription)")
        }
    }
}

#if canImport(FoundationModels)
@available(iOS 26.0, *)
@Generable
struct OnDeviceGrammarIssue {
    @Guide(description: "The exact wrong text copied from the input, as short as possible")
    var original: String
    @Guide(description: "The corrected text that replaces original")
    var replacement: String
    @Guide(description: "One of: spelling, grammar, punctuation, style, word_choice")
    var category: String
    @Guide(description: "Why it is wrong, under 12 words")
    var explanation: String
}

@available(iOS 26.0, *)
@Generable
struct OnDeviceGrammarReport {
    @Guide(description: "Mistakes found in the text; empty when the text is correct")
    var issues: [OnDeviceGrammarIssue]
}

@available(iOS 26.0, *)
@Generable
struct OnDeviceRewrite {
    @Guide(description: "The rewritten text")
    var rewritten: String
}

@available(iOS 26.0, *)
extension OnDeviceGrammarProvider {
    static let grammarInstructions = """
    You check grammar inside a phone keyboard. List spelling, grammar, punctuation and \
    word-choice mistakes in the user's text. Copy each wrong span exactly into original. \
    Do not flag names, slang or casual tone. The text may stop mid-sentence, so ignore \
    missing final punctuation. Return no issues when the text is correct.
    """

    static func availabilityReason() -> String? {
        let availability = SystemLanguageModel.default.availability
        guard case .unavailable(let reason) = availability else {
            return nil
        }
        switch reason {
        case .deviceNotEligible:
            return "Device not eligible"
        case .appleIntelligenceNotEnabled:
            return "Apple Intelligence is off"
        case .modelNotReady:
            return "Model not ready"
        @unknown default:
            return "Unavailable"
        }
    }

    static func generateIssues(_ text: String) async throws -> [GrammarIssue] {
        let session = LanguageModelSession(instructions: grammarInstructions)
        let response = try await session.respond(
            to: InferencePrompts.grammarUser(text: text),
            generating: OnDeviceGrammarReport.self,
            options: GenerationOptions(temperature: 0)
        )
        let raw: [[String: Any]] = response.content.issues.map { issue in
            [
                "original": issue.original,
                "replacement": issue.replacement,
                "category": issue.category,
                "explanation": issue.explanation,
            ]
        }
        return GrammarResponseParser.reconcile(raw, text: text)
    }

    static func generateRewrite(_ text: String, mode: RewriteMode) async throws -> GrokRewrite {
        let session = LanguageModelSession(
            instructions: "You rewrite text typed on a phone keyboard. Keep the meaning, language and point of view."
        )
        let response = try await session.respond(
            to: InferencePrompts.rewriteUser(text: text, mode: mode),
            generating: OnDeviceRewrite.self,
            options: GenerationOptions(temperature: 0.3)
        )
        let rewritten = response.content.rewritten.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !rewritten.isEmpty else {
            throw InferenceError.empty
        }
        return GrokRewrite(rewritten: rewritten, suggestions: [], corrections: [], model: "apple-on-device")
    }
}
#endif
