import Foundation
import UIKit
import CAImKeyboardCore

/// Background grammar + rewrite for the keyboard. Routing, parsing and debouncing
/// live in `CAImKeyboardCore`; this class owns the UIKit pieces.
///
/// Settings arrive through App Group `group.com.caim.keyboard`, which iOS only
/// exposes to the keyboard with Full Access. Without it, only the on-device model
/// and local spelling run.
@MainActor
final class KeyboardAssistant {
    static let appGroupId = "group.com.caim.keyboard"

    var onToolbarChange: ((GrammarToolbarView.State) -> Void)?

    private let transport = URLSessionGrokTransport()
    private let onDevice = OnDeviceGrammarProvider()
    private let spelling = LocalSpellChecker()
    private var settings = InferenceSettings()
    private var router = InferenceRouter(providers: [])
    private var checker: BackgroundGrammarChecker?
    private var hasFullAccess = false

    private var snapshot: GrammarSnapshot?
    private var localIssues: [GrammarIssue] = []
    private var remote: GrammarCheckResult?
    private var rewriteTask: Task<Void, Never>?

    func reload(hasFullAccess: Bool) {
        self.hasFullAccess = hasFullAccess
        let defaults = hasFullAccess ? UserDefaults(suiteName: Self.appGroupId) : nil
        settings = InferenceSettings { defaults?.string(forKey: $0) }
        router = settings.makeRouter(transport: transport, networkAllowed: hasFullAccess, onDevice: onDevice)
        checker?.cancel()
        let checker = BackgroundGrammarChecker(router: router)
        checker.onUpdate = { [weak self] update in
            self?.handle(update)
        }
        self.checker = checker
        remote = nil
    }

    func stop() {
        checker?.cancel()
        rewriteTask?.cancel()
    }

    /// Call after every key and from `textDidChange(_:)`.
    func textDidChange(proxy: UITextDocumentProxy) {
        let context = proxy.documentContextBeforeInput
        guard let chunk = GrammarContext.chunk(fromContextBefore: context) else {
            snapshot = nil
            localIssues = []
            remote = nil
            checker?.textDidChange(contextBefore: context)
            publish(.hidden)
            return
        }
        localIssues = spelling.issues(in: chunk)
        if remote?.text != chunk {
            remote = nil
        }
        rebuildSnapshot(text: chunk)
        if settings.backgroundGrammar {
            checker?.textDidChange(contextBefore: context)
        }
    }

    func applyFirstIssue(proxy: UITextDocumentProxy) {
        guard let snapshot, let issue = snapshot.issues.first else {
            return
        }
        guard let plan = ProxyEditPlan.make(
            issue: issue,
            checkedText: snapshot.text,
            currentContextBefore: proxy.documentContextBeforeInput
        ) else {
            textDidChange(proxy: proxy)
            return
        }
        if plan.moveBack > 0 {
            proxy.adjustTextPosition(byCharacterOffset: -plan.moveBack)
        }
        for _ in 0..<plan.deleteCount {
            proxy.deleteBackward()
        }
        proxy.insertText(plan.insert)
        if plan.moveForward > 0 {
            proxy.adjustTextPosition(byCharacterOffset: plan.moveForward)
        }

        let next = snapshot.applying(issue)
        if let remote {
            let shifted = GrammarSnapshot(text: remote.text, issues: remote.issues, backend: remote.backend).applying(issue)
            self.remote = GrammarCheckResult(text: shifted.text, issues: shifted.issues, backend: remote.backend)
            checker?.accept(shifted)
        }
        localIssues = spelling.issues(in: next.text)
        rebuildSnapshot(text: next.text)
    }

    func rewrite(proxy: UITextDocumentProxy) {
        let selected = proxy.selectedText?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let before = String((proxy.documentContextBeforeInput ?? "").suffix(280))
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let source = selected.isEmpty ? before : selected
        guard !source.isEmpty else {
            publish(.status("Type or select some text first"))
            return
        }
        rewriteTask?.cancel()
        publish(.status("Rewriting…"))
        let router = self.router
        rewriteTask = Task { [weak self] in
            do {
                let result = try await router.rewrite(source, mode: .professional)
                guard let self, !Task.isCancelled else {
                    return
                }
                if selected.isEmpty {
                    proxy.insertText(" → \(result.rewrite.rewritten)")
                } else {
                    proxy.insertText(result.rewrite.rewritten)
                }
                self.publish(.status("Rewritten · \(self.sourceName(result.backend))"))
            } catch is CancellationError {
                return
            } catch {
                self?.publish(.status(self?.failureMessage(error) ?? "Rewrite failed"))
            }
        }
    }

    private func handle(_ update: GrammarUpdate) {
        switch update {
        case .idle:
            break
        case .checking(let text):
            if snapshot?.text == text, snapshot?.issues.isEmpty == true {
                publish(.status("Checking…"))
            }
        case .result(let result):
            guard snapshot?.text == result.text else {
                return
            }
            remote = result
            rebuildSnapshot(text: result.text)
        case .failed(let text, let error):
            guard snapshot?.text == text, snapshot?.issues.isEmpty == true else {
                return
            }
            publish(.status(failureMessage(error)))
        }
    }

    private func rebuildSnapshot(text: String) {
        let remoteIssues = remote?.text == text ? remote?.issues ?? [] : []
        let issues = GrammarIssueMerger.merge(primary: remoteIssues, secondary: localIssues)
        snapshot = GrammarSnapshot(text: text, issues: issues, backend: remote?.backend)
        if let first = issues.first {
            let fromRemote = remoteIssues.contains(first)
            let source = fromRemote ? sourceName(remote?.backend ?? .onDevice) : "Spelling"
            publish(.issues(first: first, count: issues.count, source: source))
        } else if let remote, remote.text == text {
            publish(.status("✓ Looks good · \(sourceName(remote.backend))"))
        } else {
            publish(.hidden)
        }
    }

    private func sourceName(_ backend: InferenceBackend) -> String {
        switch backend {
        case .onDevice:
            return "On-device"
        case .selfHosted:
            return settings.selfHostedBaseURL.lowercased().contains("runpod") ? "RunPod" : "Self-hosted"
        case .grok:
            return "Grok"
        }
    }

    private func failureMessage(_ error: Error) -> String {
        if !hasFullAccess {
            return "Allow Full Access in Settings for AI grammar"
        }
        if case .noProviderSucceeded(let attempts)? = error as? InferenceError, attempts.isEmpty {
            return "Add an AI endpoint in the CAIm app"
        }
        return "AI grammar unavailable right now"
    }

    private func publish(_ state: GrammarToolbarView.State) {
        onToolbarChange?(state)
    }
}
