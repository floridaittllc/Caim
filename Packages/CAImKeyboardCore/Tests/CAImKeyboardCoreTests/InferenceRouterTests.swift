import XCTest
@testable import CAImKeyboardCore

final class InferenceRouterTests: XCTestCase {
    func testOrderForPreferences() {
        XCTAssertEqual(InferenceRouter.order(for: .auto), [.onDevice, .selfHosted, .grok])
        XCTAssertEqual(InferenceRouter.order(for: .selfHosted), [.selfHosted, .onDevice, .grok])
        XCTAssertEqual(InferenceRouter.order(for: .grok), [.grok, .onDevice, .selfHosted])
        XCTAssertEqual(InferenceRouter.order(for: .selfHosted, allowFallback: false), [.selfHosted])
        XCTAssertEqual(ProviderPreference(lenient: "nonsense"), .auto)
        XCTAssertEqual(ProviderPreference(lenient: "selfHosted"), .selfHosted)
    }

    func testUsesOnDeviceFirstWhenAvailable() async throws {
        let onDevice = StubProvider(.onDevice, grammar: .success([issue(0..<5, "Their", "They're")]))
        let selfHosted = StubProvider(.selfHosted)
        let router = InferenceRouter(providers: [StubProvider(.grok), selfHosted, onDevice])
        let result = try await router.checkGrammar("Their going")
        XCTAssertEqual(result.backend, .onDevice)
        XCTAssertEqual(result.issues.count, 1)
        XCTAssertTrue(selfHosted.grammarCalls.isEmpty)
    }

    func testFallsBackOnDeviceToRunPodToGrok() async throws {
        let onDevice = StubProvider(.onDevice, unavailable: "Apple Intelligence is off")
        let selfHosted = StubProvider(.selfHosted, grammar: .failure(InferenceError.http(status: 503, message: "cold start")))
        let grok = StubProvider(.grok, grammar: .success([]))
        let router = InferenceRouter(providers: [onDevice, selfHosted, grok])

        let result = try await router.checkGrammar("Their going")
        XCTAssertEqual(result.backend, .grok)
        XCTAssertEqual(result.attempts, [
            InferenceAttempt(backend: .onDevice, outcome: .skipped("Apple Intelligence is off")),
            InferenceAttempt(backend: .selfHosted, outcome: .failed(.http(status: 503, message: "cold start"))),
            InferenceAttempt(backend: .grok, outcome: .succeeded),
        ])
        XCTAssertEqual(selfHosted.grammarCalls, ["Their going"])
    }

    func testSelfHostedServesWhenOnDeviceFails() async throws {
        let onDevice = StubProvider(.onDevice, grammar: .failure(InferenceError.malformed))
        let selfHosted = StubProvider(.selfHosted, grammar: .success([issue(0..<5, "Their", "They're")]))
        let grok = StubProvider(.grok)
        let router = InferenceRouter(providers: [onDevice, selfHosted, grok])
        let result = try await router.checkGrammar("Their going")
        XCTAssertEqual(result.backend, .selfHosted)
        XCTAssertTrue(grok.grammarCalls.isEmpty)
    }

    func testThrowsWithAllAttemptsWhenEverythingFails() async {
        let router = InferenceRouter(providers: [
            StubProvider(.selfHosted, grammar: .failure(InferenceError.transport("offline"))),
            StubProvider(.grok, unavailable: "No API key"),
        ])
        do {
            _ = try await router.checkGrammar("Their going")
            XCTFail("expected failure")
        } catch let error as InferenceError {
            guard case .noProviderSucceeded(let attempts) = error else {
                return XCTFail("unexpected \(error)")
            }
            XCTAssertEqual(attempts.map(\.backend), [.selfHosted, .grok])
            XCTAssertEqual(error.userMessage, "Self-hosted: offline; Grok: No API key")
        } catch {
            XCTFail("unexpected \(error)")
        }
    }

    func testNoProvidersConfigured() async {
        let router = InferenceRouter(providers: [])
        do {
            _ = try await router.checkGrammar("Their going")
            XCTFail("expected failure")
        } catch {
            XCTAssertEqual((error as? InferenceError)?.userMessage, "No AI provider is configured")
        }
    }

    func testPreferenceWithoutFallbackStopsAtPreferred() async {
        let grok = StubProvider(.grok)
        let router = InferenceRouter(
            providers: [StubProvider(.selfHosted, grammar: .failure(InferenceError.empty)), grok],
            preference: .selfHosted,
            allowFallback: false
        )
        _ = try? await router.checkGrammar("Their going")
        XCTAssertTrue(grok.grammarCalls.isEmpty)
    }

    func testCancellationDoesNotFallThrough() async {
        let selfHosted = StubProvider(.selfHosted)
        selfHosted.delayNanoseconds = 2_000_000_000
        let grok = StubProvider(.grok)
        let router = InferenceRouter(providers: [selfHosted, grok])
        let task = Task { try await router.checkGrammar("Their going") }
        try? await Task.sleep(nanoseconds: 50_000_000)
        task.cancel()
        let result = await task.result
        switch result {
        case .success:
            XCTFail("expected cancellation")
        case .failure(let error):
            XCTAssertTrue(error is CancellationError, "\(error)")
        }
        XCTAssertTrue(grok.grammarCalls.isEmpty)
    }

    func testRewriteRoutesThroughSamePolicy() async throws {
        let router = InferenceRouter(
            providers: [StubProvider(.selfHosted, unavailable: "No API key"), StubProvider(.grok)],
            preference: .selfHosted
        )
        let result = try await router.rewrite("hi", mode: .shorten)
        XCTAssertEqual(result.backend, .grok)
        XCTAssertEqual(result.rewrite.rewritten, "grok:shorten")
    }

    func testSettingsBuildRouterFromAppGroupValues() {
        let values = [
            InferenceSettings.Key.provider: "selfHosted",
            InferenceSettings.Key.selfHostedBaseURL: "https://api.runpod.ai/v2/abc123",
            InferenceSettings.Key.selfHostedAPIKey: " rp ",
            InferenceSettings.Key.xaiAPIKey: "xai",
            InferenceSettings.Key.backgroundGrammar: "off",
        ]
        let settings = InferenceSettings { values[$0] }
        XCTAssertEqual(settings.preference, .selfHosted)
        XCTAssertFalse(settings.backgroundGrammar)
        XCTAssertTrue(settings.onDeviceEnabled)
        XCTAssertEqual(settings.selfHostedEndpoint?.chatCompletionsURL.absoluteString, "https://api.runpod.ai/v2/abc123/openai/v1/chat/completions")
        XCTAssertEqual(settings.selfHostedEndpoint?.apiKey, "rp")
        XCTAssertEqual(settings.selfHostedEndpoint?.model, "caim-grammar")

        let router = settings.makeRouter(transport: RecordingTransport(), networkAllowed: false, onDevice: StubProvider(.onDevice))
        XCTAssertEqual(router.orderedProviders.map(\.backend), [.selfHosted, .onDevice, .grok])
        XCTAssertEqual(router.orderedProviders.map(\.unavailableReason), ["Full Access is off", nil, "Full Access is off"])

        let empty = InferenceSettings { _ in nil }
        XCTAssertNil(empty.selfHostedEndpoint)
        XCTAssertEqual(empty.makeRouter(transport: RecordingTransport(), networkAllowed: true).providers.count, 0)
    }
}
