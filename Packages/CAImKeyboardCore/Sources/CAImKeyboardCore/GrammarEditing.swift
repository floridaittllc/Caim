import Foundation

public enum GrammarContext {
    public static let defaultMaxCharacters = 300

    /// The text to check: the current paragraph before the cursor, capped at
    /// `maxCharacters` and started on a sentence (or word) boundary.
    /// Always a suffix of `contextBefore`, so issue offsets map back to the document.
    public static func chunk(fromContextBefore contextBefore: String?, maxCharacters: Int = defaultMaxCharacters) -> String? {
        guard let contextBefore, !contextBefore.isEmpty else {
            return nil
        }
        var characters = Array(contextBefore)
        if let newline = characters.lastIndex(where: { $0.isNewline }) {
            characters = Array(characters[(newline + 1)...])
        }
        if characters.count > maxCharacters {
            let window = Array(characters.suffix(maxCharacters))
            let sentenceStart = window.indices.first { index in
                index > 0 && isSentenceEnd(window[index - 1]) && window[index].isWhitespace
            }
            let wordStart = window.indices.first { index in
                index > 0 && window[index - 1].isWhitespace && !window[index].isWhitespace
            }
            let start = sentenceStart ?? wordStart ?? 0
            characters = Array(window[start...])
        }
        while let first = characters.first, first.isWhitespace {
            characters.removeFirst()
        }
        let words = String(characters).split(whereSeparator: { $0.isWhitespace }).filter { word in
            word.contains { $0.isLetter }
        }
        guard words.count >= 2 else {
            return nil
        }
        return String(characters)
    }

    private static func isSentenceEnd(_ character: Character) -> Bool {
        character == "." || character == "!" || character == "?" || character == "…"
    }
}

/// Steps to replace an issue that sits before the cursor using only
/// `adjustTextPosition` (UTF-16 offsets), `deleteBackward` and `insertText`.
public struct ProxyEditPlan: Equatable, Sendable {
    /// UTF-16 units to move left before deleting (text after the issue).
    public var moveBack: Int
    /// `deleteBackward` calls, one per Character of `original`.
    public var deleteCount: Int
    public var insert: String
    /// UTF-16 units to move right afterwards to restore the cursor.
    public var moveForward: Int

    public init(moveBack: Int, deleteCount: Int, insert: String, moveForward: Int) {
        self.moveBack = moveBack
        self.deleteCount = deleteCount
        self.insert = insert
        self.moveForward = moveForward
    }

    /// nil when the document changed since `checkedText` was captured.
    public static func make(issue: GrammarIssue, checkedText: String, currentContextBefore: String?) -> ProxyEditPlan? {
        guard let current = currentContextBefore, current.hasSuffix(checkedText) else {
            return nil
        }
        let characters = Array(checkedText)
        guard issue.range.lowerBound >= 0,
              issue.range.upperBound <= characters.count,
              String(characters[issue.range]) == issue.original
        else {
            return nil
        }
        let tail = String(characters[issue.range.upperBound...])
        let tailUTF16 = tail.utf16.count
        return ProxyEditPlan(
            moveBack: tailUTF16,
            deleteCount: issue.original.count,
            insert: issue.replacement,
            moveForward: tailUTF16
        )
    }
}

/// A checked chunk and its open issues. Applying one shifts the rest.
public struct GrammarSnapshot: Equatable, Sendable {
    public var text: String
    public var issues: [GrammarIssue]
    public var backend: InferenceBackend?

    public init(text: String, issues: [GrammarIssue], backend: InferenceBackend? = nil) {
        self.text = text
        self.issues = issues
        self.backend = backend
    }

    public func applying(_ issue: GrammarIssue) -> GrammarSnapshot {
        var characters = Array(text)
        guard issue.range.upperBound <= characters.count else {
            return self
        }
        characters.replaceSubrange(issue.range, with: Array(issue.replacement))
        let delta = issue.replacement.count - issue.original.count
        var remaining: [GrammarIssue] = []
        for other in issues where other != issue {
            if other.range.overlaps(issue.range) {
                continue
            }
            var shifted = other
            if other.range.lowerBound >= issue.range.upperBound {
                shifted.range = (other.range.lowerBound + delta)..<(other.range.upperBound + delta)
            }
            remaining.append(shifted)
        }
        return GrammarSnapshot(text: String(characters), issues: remaining, backend: backend)
    }
}

public enum GrammarIssueMerger {
    /// `primary` wins; `secondary` issues that overlap it are dropped.
    public static func merge(primary: [GrammarIssue], secondary: [GrammarIssue]) -> [GrammarIssue] {
        let extra = secondary.filter { candidate in
            !primary.contains { $0.range.overlaps(candidate.range) }
        }
        return (primary + extra).sorted { $0.range.lowerBound < $1.range.lowerBound }
    }
}

public enum TextOffsets {
    /// Converts a UTF-16 range (NSRange / UITextChecker) into a Character range.
    public static func characterRange(utf16Location: Int, utf16Length: Int, in text: String) -> Range<Int>? {
        let utf16 = text.utf16
        guard utf16Location >= 0, utf16Length >= 0, utf16Location + utf16Length <= utf16.count else {
            return nil
        }
        let startUTF16 = utf16.index(utf16.startIndex, offsetBy: utf16Location)
        let endUTF16 = utf16.index(startUTF16, offsetBy: utf16Length)
        guard let start = startUTF16.samePosition(in: text), let end = endUTF16.samePosition(in: text) else {
            return nil
        }
        let lower = text.distance(from: text.startIndex, to: start)
        let upper = text.distance(from: text.startIndex, to: end)
        return lower..<upper
    }
}
