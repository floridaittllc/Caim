import Foundation

public enum ProviderPreference: String, CaseIterable, Sendable {
    /// on-device -> self-hosted -> Grok
    case auto
    case onDevice
    case selfHosted
    case grok

    public init(lenient raw: String?) {
        self = raw.flatMap(ProviderPreference.init(rawValue:)) ?? .auto
    }
}

/// Tries providers in order and falls through on failure. Cancellation stops the walk.
public final class InferenceRouter {
    public static let defaultOrder: [InferenceBackend] = [.onDevice, .selfHosted, .grok]

    public let providers: [any InferenceProvider]
    public let preference: ProviderPreference
    public let allowFallback: Bool

    public init(providers: [any InferenceProvider], preference: ProviderPreference = .auto, allowFallback: Bool = true) {
        self.providers = providers
        self.preference = preference
        self.allowFallback = allowFallback
    }

    /// The preferred backend first, then the rest in `defaultOrder`.
    public static func order(for preference: ProviderPreference, allowFallback: Bool = true) -> [InferenceBackend] {
        let preferred: InferenceBackend?
        switch preference {
        case .auto:
            preferred = nil
        case .onDevice:
            preferred = .onDevice
        case .selfHosted:
            preferred = .selfHosted
        case .grok:
            preferred = .grok
        }
        guard let preferred else {
            return defaultOrder
        }
        if !allowFallback {
            return [preferred]
        }
        return [preferred] + defaultOrder.filter { $0 != preferred }
    }

    public var orderedProviders: [any InferenceProvider] {
        Self.order(for: preference, allowFallback: allowFallback).flatMap { backend in
            providers.filter { $0.backend == backend }
        }
    }

    public func checkGrammar(_ text: String) async throws -> GrammarCheckResult {
        let (issues, backend, attempts) = try await route { provider in
            try await provider.checkGrammar(text)
        }
        return GrammarCheckResult(text: text, issues: issues, backend: backend, attempts: attempts)
    }

    public func rewrite(_ text: String, mode: RewriteMode) async throws -> RewriteRouteResult {
        let (rewrite, backend, attempts) = try await route { provider in
            try await provider.rewrite(text, mode: mode)
        }
        return RewriteRouteResult(rewrite: rewrite, backend: backend, attempts: attempts)
    }

    private func route<Value>(
        _ call: (any InferenceProvider) async throws -> Value
    ) async throws -> (Value, InferenceBackend, [InferenceAttempt]) {
        var attempts: [InferenceAttempt] = []
        for provider in orderedProviders {
            try Task.checkCancellation()
            if let reason = provider.unavailableReason {
                attempts.append(InferenceAttempt(backend: provider.backend, outcome: .skipped(reason)))
                continue
            }
            do {
                let value = try await call(provider)
                attempts.append(InferenceAttempt(backend: provider.backend, outcome: .succeeded))
                return (value, provider.backend, attempts)
            } catch is CancellationError {
                throw CancellationError()
            } catch let error as InferenceError {
                try Task.checkCancellation()
                attempts.append(InferenceAttempt(backend: provider.backend, outcome: .failed(error)))
            } catch {
                try Task.checkCancellation()
                attempts.append(
                    InferenceAttempt(backend: provider.backend, outcome: .failed(.transport(String(describing: error))))
                )
            }
        }
        throw InferenceError.noProviderSucceeded(attempts)
    }
}
