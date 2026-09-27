import Foundation
import UIKit

/// Shared Grok client for the keyboard extension.
/// Requires Full Access + App Group so the host Expo app can store `XAI_API_KEY`.
final class GrokKeyboardClient {
    static let shared = GrokKeyboardClient()

    /// App Group id — must match the Expo host app entitlements after prebuild.
    private let appGroupId = "group.com.caim.keyboard"
    private let apiKeyDefaultsKey = "xai_api_key"
    private let endpoint = URL(string: "https://api.x.ai/v1/chat/completions")!

    private init() {}

    func rewriteSelectedOrNearby(proxy: UITextDocumentProxy) {
        guard let apiKey = loadApiKey(), !apiKey.isEmpty else {
            proxy.insertText(" [CAIm: enable Full Access + set API key in the CAIm app] ")
            return
        }

        // Keyboard extensions have limited context; insert a marker then fetch asynchronously.
        let snippet = proxy.documentContextBeforeInput ?? ""
        let promptText = String(snippet.suffix(280))
        guard !promptText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            proxy.insertText(" [CAIm: type some text first] ")
            return
        }

        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 20

        let body: [String: Any] = [
            "model": "grok-3",
            "temperature": 0.3,
            "messages": [
                [
                    "role": "system",
                    "content": "Return ONLY JSON {\"rewritten\":\"...\"}. Fix grammar briefly.",
                ],
                [
                    "role": "user",
                    "content": "Rewrite professionally:\n\(promptText)",
                ],
            ],
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, _, error in
            DispatchQueue.main.async {
                if error != nil || data == nil {
                    proxy.insertText(" [CAIm: Grok unreachable] ")
                    return
                }
                // Placeholder parse — host app uses structured JSON; extension keeps this minimal.
                if let json = try? JSONSerialization.jsonObject(with: data!) as? [String: Any],
                   let choices = json["choices"] as? [[String: Any]],
                   let message = choices.first?["message"] as? [String: Any],
                   let content = message["content"] as? String
                {
                    let cleaned = content.trimmingCharacters(in: .whitespacesAndNewlines)
                    proxy.insertText(" → \(cleaned)")
                } else {
                    proxy.insertText(" [CAIm: bad Grok response] ")
                }
            }
        }.resume()
    }

    private func loadApiKey() -> String? {
        if let defaults = UserDefaults(suiteName: appGroupId) {
            return defaults.string(forKey: apiKeyDefaultsKey)
        }
        return nil
    }
}
