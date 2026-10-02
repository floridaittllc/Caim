import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// Live xAI transport. Keyboard unit tests use `GrokTransport` fixtures instead.
public final class URLSessionGrokTransport: GrokTransport {
    public init() {}

    public func send(_ request: GrokHTTPRequest) async throws -> GrokHTTPResponse {
        var urlRequest = URLRequest(url: request.url)
        urlRequest.httpMethod = request.method
        urlRequest.httpBody = request.body
        urlRequest.timeoutInterval = request.timeout
        for (field, value) in request.headers {
            urlRequest.setValue(value, forHTTPHeaderField: field)
        }
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        return GrokHTTPResponse(statusCode: status, body: data)
    }
}
