import Foundation

public struct TextSelection: Equatable, Sendable {
    public var start: Int
    public var end: Int

    public init(start: Int, end: Int) {
        self.start = start
        self.end = end
    }
}

/// Plain-text buffer with a cursor or selection. Offsets count Swift characters.
public struct ComposerState: Equatable, Sendable {
    public var text: String
    public var selection: TextSelection

    public init(text: String = "", selection: TextSelection? = nil) {
        self.text = text
        let end = text.count
        if let selection {
            self.selection = TextSelection(
                start: Self.clamp(selection.start, limit: end),
                end: Self.clamp(selection.end, limit: end)
            )
        } else {
            self.selection = TextSelection(start: end, end: end)
        }
    }

    public init(text: String, cursor: Int) {
        self.init(text: text, selection: TextSelection(start: cursor, end: cursor))
    }

    public mutating func insert(_ chunk: String) {
        var chars = Array(text)
        let (start, end) = orderedRange(in: chars.count)
        let inserted = Array(chunk)
        chars.replaceSubrange(start..<end, with: inserted)
        text = String(chars)
        let caret = start + inserted.count
        selection = TextSelection(start: caret, end: caret)
    }

    public mutating func deleteBackward() {
        var chars = Array(text)
        let (start, end) = orderedRange(in: chars.count)
        if start != end {
            chars.removeSubrange(start..<end)
            text = String(chars)
            selection = TextSelection(start: start, end: start)
            return
        }
        guard start > 0 else {
            return
        }
        chars.remove(at: start - 1)
        text = String(chars)
        selection = TextSelection(start: start - 1, end: start - 1)
    }

    public mutating func moveLeft() {
        let start = max(0, selection.start - 1)
        selection = TextSelection(start: start, end: start)
    }

    public mutating func moveRight() {
        let start = min(text.count, selection.start + 1)
        selection = TextSelection(start: start, end: start)
    }

    public mutating func moveHome() {
        selection = TextSelection(start: 0, end: 0)
    }

    public mutating func moveEnd() {
        let end = text.count
        selection = TextSelection(start: end, end: end)
    }

    public mutating func clearAll() {
        text = ""
        selection = TextSelection(start: 0, end: 0)
    }

    private func orderedRange(in count: Int) -> (Int, Int) {
        var start = Self.clamp(selection.start, limit: count)
        var end = Self.clamp(selection.end, limit: count)
        if start > end {
            swap(&start, &end)
        }
        return (start, end)
    }

    private static func clamp(_ index: Int, limit: Int) -> Int {
        min(max(0, index), limit)
    }
}
