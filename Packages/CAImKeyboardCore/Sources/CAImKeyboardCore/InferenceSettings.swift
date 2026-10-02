import Foundation

/// Keyboard AI settings written by the Expo app into App Group `group.com.caim.keyboard`.
/// Keys must match `modules/caim-app-group/src/index.ts`.
public struct InferenceSettings: Equatable, Sendable {
    public enum Key {
        public static let provider = "inference_provider"
        public static let selfHostedBaseURL = "selfhosted_base_url"
        public static let selfHostedAPIKey = "selfhosted_api_key"
        public static let selfHostedModel = "selfhosted_model"
        public static let xaiAPIKey = "xai_api_key"
        public static let backgroundGrammar = "background_grammar"
        public static let onDeviceEnabled = "on_device_enabled"
    }

    public var preference: ProviderPreference
    public var selfHostedBaseURL: String
    public var selfHostedAPIKey: String
    public var selfHostedModel: String
    public var xaiAPIKey: String
    public var backgroundGrammar: Bool
    public var onDeviceEnabled: Bool

    public init(
        preference: ProviderPreference = .auto,
        selfHostedBaseURL: String = "",
        selfHostedAPIKey: String = "",
        selfHostedModel: String = "",
        xaiAPIKey: String = "",
        backgroundGrammar: Bool = true,
        onDeviceEnabled: Bool = true
    ) {
        self.preference = preference
        self.selfHostedBaseURL = selfHostedBaseURL
        self.selfHostedAPIKey = selfHostedAPIKey
        self.selfHostedModel = selfHostedModel
        self.xaiAPIKey = xaiAPIKey
        self.backgroundGrammar = backgroundGrammar
        self.onDeviceEnabled = onDeviceEnabled
    }

    public init(read: (String) -> String?) {
        func text(_ key: String) -> String {
            read(key)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        }
        func flag(_ key: String) -> Bool {
            text(key) != "off"
        }
        self.init(
            preference: ProviderPreference(lenient: read(Key.provider)),
            selfHostedBaseURL: text(Key.selfHostedBaseURL),
            selfHostedAPIKey: text(Key.selfHostedAPIKey),
            selfHostedModel: text(Key.selfHostedModel),
            xaiAPIKey: text(Key.xaiAPIKey),
            backgroundGrammar: flag(Key.backgroundGrammar),
            onDeviceEnabled: flag(Key.onDeviceEnabled)
        )
    }

    public var selfHostedEndpoint: OpenAICompatibleEndpoint? {
        guard !selfHostedBaseURL.isEmpty, !selfHostedAPIKey.isEmpty else {
            return nil
        }
        return OpenAICompatibleEndpoint.selfHosted(
            baseURL: selfHostedBaseURL,
            apiKey: selfHostedAPIKey,
            model: selfHostedModel
        )
    }

    /// Router over every configured backend. `onDevice` is supplied by the extension
    /// because Foundation Models is not available to this pure-Swift package.
    public func makeRouter(
        transport: any GrokTransport,
        networkAllowed: Bool,
        onDevice: (any InferenceProvider)? = nil
    ) -> InferenceRouter {
        var providers: [any InferenceProvider] = []
        if onDeviceEnabled, let onDevice {
            providers.append(onDevice)
        }
        if let endpoint = selfHostedEndpoint {
            providers.append(
                OpenAICompatibleProvider(backend: .selfHosted, endpoint: endpoint, transport: transport, networkAllowed: networkAllowed)
            )
        }
        if !xaiAPIKey.isEmpty {
            providers.append(
                OpenAICompatibleProvider(
                    backend: .grok,
                    endpoint: .grok(apiKey: xaiAPIKey),
                    transport: transport,
                    networkAllowed: networkAllowed
                )
            )
        }
        return InferenceRouter(providers: providers, preference: preference)
    }
}
