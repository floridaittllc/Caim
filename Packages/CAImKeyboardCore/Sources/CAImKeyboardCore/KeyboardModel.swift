import Foundation

public enum EngineEffect: Equatable, Sendable {
    case insert(String)
    case deleteBackward
    case moveCursor(by: Int)
    case moveToStart
    case moveToEnd
    case clearDocument
    case nextKeyboard
    case rewrite
    case none
}

/// Shift, caps, QWERTY, cursor edits, and PIN mode. No UIKit.
public struct KeyboardModel: Equatable, Sendable {
    public var shiftOn: Bool
    public var capsOn: Bool
    public var composer: ComposerState
    public var mode: KeyboardMode
    public var pin: PinBuffer

    public init(
        mode: KeyboardMode = .full,
        composer: ComposerState = ComposerState(),
        shiftOn: Bool = false,
        capsOn: Bool = false,
        pin: PinBuffer = PinBuffer()
    ) {
        self.mode = mode
        self.composer = composer
        self.shiftOn = shiftOn
        self.capsOn = capsOn
        self.pin = pin
    }

    public var rows: [[KeyDef]] {
        switch mode {
        case .full:
            return KeyboardLayout.qwertyRows
        case .pin:
            return KeyboardLayout.pinRows
        }
    }

    public func key(id: String) -> KeyDef? {
        for row in rows {
            if let match = row.first(where: { $0.id == id }) {
                return match
            }
        }
        return nil
    }

    public func displayLabel(for key: KeyDef) -> String {
        if key.action != nil || key.insert == nil {
            return key.label
        }
        return KeyboardLayout.resolveInsert(key, shifted: shiftOn, caps: capsOn) ?? key.label
    }

    public mutating func handle(_ key: KeyDef) -> EngineEffect {
        switch mode {
        case .full:
            return handleFull(key)
        case .pin:
            return handlePin(key)
        }
    }

    private mutating func handleFull(_ key: KeyDef) -> EngineEffect {
        if let action = key.action {
            switch action {
            case .backspace:
                composer.deleteBackward()
                return .deleteBackward
            case .shift:
                shiftOn.toggle()
                return .none
            case .caps:
                capsOn.toggle()
                return .none
            case .escape, .clear:
                composer.clearAll()
                return .clearDocument
            case .left:
                let before = composer.selection.start
                composer.moveLeft()
                let delta = composer.selection.start - before
                return delta == 0 ? .none : .moveCursor(by: delta)
            case .right:
                let before = composer.selection.start
                composer.moveRight()
                let delta = composer.selection.start - before
                return delta == 0 ? .none : .moveCursor(by: delta)
            case .home:
                composer.moveHome()
                return .moveToStart
            case .end:
                composer.moveEnd()
                return .moveToEnd
            case .nextKeyboard:
                return .nextKeyboard
            case .rewrite:
                return .rewrite
            case .space, .tab, .enter:
                break
            }
        }

        guard let chunk = KeyboardLayout.resolveInsert(key, shifted: shiftOn, caps: capsOn) else {
            return .none
        }
        composer.insert(chunk)
        if shiftOn && key.action != .space {
            shiftOn = false
        }
        return .insert(chunk)
    }

    private mutating func handlePin(_ key: KeyDef) -> EngineEffect {
        if let action = key.action {
            switch action {
            case .backspace:
                guard !pin.digits.isEmpty else {
                    return .none
                }
                pin.backspace()
                syncComposerFromPin()
                return .deleteBackward
            case .clear, .escape:
                pin.clear()
                syncComposerFromPin()
                return .clearDocument
            case .shift, .caps, .tab, .enter, .space, .left, .right, .home, .end, .nextKeyboard, .rewrite:
                return .none
            }
        }

        let raw = key.insert ?? ""
        guard pin.insert(raw) else {
            return .none
        }
        syncComposerFromPin()
        return .insert(raw)
    }

    private mutating func syncComposerFromPin() {
        composer = ComposerState(text: pin.digits, cursor: pin.digits.count)
    }
}
