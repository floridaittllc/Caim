import Foundation
import UIKit
import CAImKeyboardCore

/// Keyboard-extension Grok call. Parsing and the HTTP client live in `CAImKeyboardCore`.
/// Requires Full Access + App Group so the host Expo app can store `XAI_API_KEY`.
final class GrokKeyboardClient {
    static let shared = GrokKeyboardClient()

    /// App Group id — must match the host app entitlement and CaimAppGroup module.
    private let appGroupId = "group.com.caim.keyboard"
    private let apiKeyDefaultsKey = "xai_api_key"

    private init() {}

    func rewriteSelectedOrNearby(proxy: UITextDocumentProxy) {
        guard let apiKey = loadApiKey(), !apiKey.isEmpty else {
            proxy.insertText(" [CAIm: enable Full Access + set API key in the CAIm app] ")
            return
        }

        let snippet = proxy.documentContextBeforeInput ?? ""
        let promptText = String(snippet.suffix(280)).trimmingCharacters(in: .whitespacesAndNewlines)
        guard !promptText.isEmpty else {
            proxy.insertText(" [CAIm: type some text first] ")
            return
        }

        let client = GrokRewriteClient(apiKey: apiKey, transport: URLSessionGrokTransport())
        Task {
            do {
                let rewrite = try await client.rewrite(promptText)
                await MainActor.run {
                    proxy.insertText(" → \(rewrite.rewritten)")
                }
            } catch is GrokParseError {
                await MainActor.run {
                    proxy.insertText(" [CAIm: bad Grok response] ")
                }
            } catch {
                await MainActor.run {
                    proxy.insertText(" [CAIm: Grok unreachable] ")
                }
            }
        }
    }

    private func loadApiKey() -> String? {
        if let defaults = UserDefaults(suiteName: appGroupId) {
            return defaults.string(forKey: apiKeyDefaultsKey)
        }
        return nil
    }
}
