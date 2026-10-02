import Foundation

public enum GrammarUpdate: Equatable, Sendable {
    /// Nothing worth checking before the cursor.
    case idle
    case checking(text: String)
    case result(GrammarCheckResult)
    case failed(text: String, error: InferenceError)
}

/// Debounces typing, checks the current chunk once the user pauses, and cancels
/// the in-flight check as soon as the text changes again.
@MainActor
public final class BackgroundGrammarChecker {
    public typealias Check = (String) async throws -> GrammarCheckResult
    public typealias Sleep = @Sendable (UInt64) async throws -> Void

    public var debounceNanoseconds: UInt64
    public var maxCharacters: Int
    public var onUpdate: ((GrammarUpdate) -> Void)?

    private let check: Check
    private let sleep: Sleep
    private var task: Task<Void, Never>?
    private var generation = 0
    private var pendingText: String?
    private var hasSeenText = false
    private var lastResult: GrammarCheckResult?

    public init(
        debounceNanoseconds: UInt64 = 600_000_000,
        maxCharacters: Int = GrammarContext.defaultMaxCharacters,
        sleep: @escaping Sleep = { try await Task.sleep(nanoseconds: $0) },
        check: @escaping Check
    ) {
        self.debounceNanoseconds = debounceNanoseconds
        self.maxCharacters = maxCharacters
        self.sleep = sleep
        self.check = check
    }

    public convenience init(router: InferenceRouter, debounceNanoseconds: UInt64 = 600_000_000) {
        self.init(debounceNanoseconds: debounceNanoseconds) { text in
            try await router.checkGrammar(text)
        }
    }

    /// Call after every keystroke / `textDidChange`.
    public func textDidChange(contextBefore: String?) {
        let chunk = GrammarContext.chunk(fromContextBefore: contextBefore, maxCharacters: maxCharacters)
        if hasSeenText, chunk == pendingText {
            return
        }
        cancelInFlight()
        hasSeenText = true
        pendingText = chunk
        guard let chunk else {
            lastResult = nil
            onUpdate?(.idle)
            return
        }
        if let lastResult, lastResult.text == chunk {
            onUpdate?(.result(lastResult))
            return
        }
        generation += 1
        let current = generation
        let delay = debounceNanoseconds
        task = Task { [weak self, sleep, check] in
            do {
                try await sleep(delay)
            } catch {
                return
            }
            guard let self, self.generation == current, !Task.isCancelled else {
                return
            }
            self.onUpdate?(.checking(text: chunk))
            let update: GrammarUpdate
            do {
                let result = try await check(chunk)
                self.lastResult = result
                update = .result(result)
            } catch is CancellationError {
                return
            } catch let error as InferenceError {
                update = .failed(text: chunk, error: error)
            } catch {
                update = .failed(text: chunk, error: .transport(String(describing: error)))
            }
            guard self.generation == current, !Task.isCancelled else {
                return
            }
            self.onUpdate?(update)
        }
    }

    /// Records a locally applied fix so the next keystroke does not re-check unchanged text.
    public func accept(_ snapshot: GrammarSnapshot) {
        cancelInFlight()
        hasSeenText = true
        pendingText = snapshot.text
        lastResult = GrammarCheckResult(text: snapshot.text, issues: snapshot.issues, backend: snapshot.backend ?? .onDevice)
    }

    public func cancel() {
        cancelInFlight()
        hasSeenText = false
        pendingText = nil
    }

    private func cancelInFlight() {
        generation += 1
        task?.cancel()
        task = nil
    }
}
