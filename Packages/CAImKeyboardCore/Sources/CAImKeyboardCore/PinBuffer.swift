import Foundation

/// Digits-only PIN. Rejects letters and symbols and stops at `maxLength`.
public struct PinBuffer: Equatable, Sendable {
    public static let maxLength = 8

    public private(set) var digits: String

    public init(digits: String = "") {
        self.digits = String(digits.filter(Self.isASCIIDigit).prefix(Self.maxLength))
    }

    @discardableResult
    public mutating func insert(_ raw: String) -> Bool {
        guard raw.count == 1, let character = raw.first, Self.isASCIIDigit(character) else {
            return false
        }
        guard digits.count < Self.maxLength else {
            return false
        }
        digits.append(character)
        return true
    }

    public mutating func backspace() {
        if !digits.isEmpty {
            digits.removeLast()
        }
    }

    public mutating func clear() {
        digits.removeAll()
    }

    public static func isASCIIDigit(_ character: Character) -> Bool {
        character.isASCII && character.isNumber
    }
}
