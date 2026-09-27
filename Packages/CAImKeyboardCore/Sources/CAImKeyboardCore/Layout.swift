import Foundation

public enum KeyAction: String, Equatable, Sendable {
    case backspace
    case enter
    case space
    case shift
    case caps
    case tab
    case escape
    case left
    case right
    case home
    case end
    case nextKeyboard
    case rewrite
    case clear
}

public struct KeyDef: Equatable, Identifiable, Sendable {
    public var id: String
    public var label: String
    public var insert: String?
    public var width: Double
    public var action: KeyAction?
    public var special: Bool

    public init(
        id: String,
        label: String,
        insert: String? = nil,
        action: KeyAction? = nil,
        width: Double = 1,
        special: Bool = false
    ) {
        self.id = id
        self.label = label
        self.insert = insert
        self.width = width
        self.action = action
        self.special = special
    }
}

public enum KeyboardMode: Equatable, Sendable {
    case full
    case pin
}

/// Hardware QWERTY (always-visible number row) and the PIN pad.
/// Glyph choice for shift/caps lives here so Linux tests and the iOS extension agree.
public enum KeyboardLayout {
    public static let shiftMap: [String: String] = [
        "`": "~",
        "1": "!",
        "2": "@",
        "3": "#",
        "4": "$",
        "5": "%",
        "6": "^",
        "7": "&",
        "8": "*",
        "9": "(",
        "0": ")",
        "-": "_",
        "=": "+",
        "[": "{",
        "]": "}",
        "\\": "|",
        ";": ":",
        "'": "\"",
        ",": "<",
        ".": ">",
        "/": "?",
    ]

    public static let qwertyRows: [[KeyDef]] = [
        [
            KeyDef(id: "grave", label: "`", insert: "`"),
            KeyDef(id: "1", label: "1", insert: "1"),
            KeyDef(id: "2", label: "2", insert: "2"),
            KeyDef(id: "3", label: "3", insert: "3"),
            KeyDef(id: "4", label: "4", insert: "4"),
            KeyDef(id: "5", label: "5", insert: "5"),
            KeyDef(id: "6", label: "6", insert: "6"),
            KeyDef(id: "7", label: "7", insert: "7"),
            KeyDef(id: "8", label: "8", insert: "8"),
            KeyDef(id: "9", label: "9", insert: "9"),
            KeyDef(id: "0", label: "0", insert: "0"),
            KeyDef(id: "minus", label: "-", insert: "-"),
            KeyDef(id: "equals", label: "=", insert: "="),
            KeyDef(id: "backspace", label: "⌫", action: .backspace, width: 1.5, special: true),
        ],
        [
            KeyDef(id: "tab", label: "Tab", action: .tab, width: 1.4, special: true),
            KeyDef(id: "q", label: "Q", insert: "q"),
            KeyDef(id: "w", label: "W", insert: "w"),
            KeyDef(id: "e", label: "E", insert: "e"),
            KeyDef(id: "r", label: "R", insert: "r"),
            KeyDef(id: "t", label: "T", insert: "t"),
            KeyDef(id: "y", label: "Y", insert: "y"),
            KeyDef(id: "u", label: "U", insert: "u"),
            KeyDef(id: "i", label: "I", insert: "i"),
            KeyDef(id: "o", label: "O", insert: "o"),
            KeyDef(id: "p", label: "P", insert: "p"),
            KeyDef(id: "lbrack", label: "[", insert: "["),
            KeyDef(id: "rbrack", label: "]", insert: "]"),
            KeyDef(id: "bslash", label: "\\", insert: "\\", width: 1.2),
        ],
        [
            KeyDef(id: "caps", label: "Caps", action: .caps, width: 1.6, special: true),
            KeyDef(id: "a", label: "A", insert: "a"),
            KeyDef(id: "s", label: "S", insert: "s"),
            KeyDef(id: "d", label: "D", insert: "d"),
            KeyDef(id: "f", label: "F", insert: "f"),
            KeyDef(id: "g", label: "G", insert: "g"),
            KeyDef(id: "h", label: "H", insert: "h"),
            KeyDef(id: "j", label: "J", insert: "j"),
            KeyDef(id: "k", label: "K", insert: "k"),
            KeyDef(id: "l", label: "L", insert: "l"),
            KeyDef(id: "semi", label: ";", insert: ";"),
            KeyDef(id: "quote", label: "'", insert: "'"),
            KeyDef(id: "enter", label: "Enter", action: .enter, width: 1.8, special: true),
        ],
        [
            KeyDef(id: "lshift", label: "Shift", action: .shift, width: 2.1, special: true),
            KeyDef(id: "z", label: "Z", insert: "z"),
            KeyDef(id: "x", label: "X", insert: "x"),
            KeyDef(id: "c", label: "C", insert: "c"),
            KeyDef(id: "v", label: "V", insert: "v"),
            KeyDef(id: "b", label: "B", insert: "b"),
            KeyDef(id: "n", label: "N", insert: "n"),
            KeyDef(id: "m", label: "M", insert: "m"),
            KeyDef(id: "comma", label: ",", insert: ","),
            KeyDef(id: "period", label: ".", insert: "."),
            KeyDef(id: "slash", label: "/", insert: "/"),
            KeyDef(id: "rshift", label: "Shift", action: .shift, width: 2.1, special: true),
        ],
        [
            KeyDef(id: "next", label: "🌐", action: .nextKeyboard, width: 1.2, special: true),
            KeyDef(id: "esc", label: "Esc", action: .escape, width: 1.2, special: true),
            KeyDef(id: "home", label: "Home", action: .home, width: 1.2, special: true),
            KeyDef(id: "end", label: "End", action: .end, width: 1.2, special: true),
            KeyDef(id: "left", label: "←", action: .left, special: true),
            KeyDef(id: "space", label: "space", action: .space, width: 4.2, special: true),
            KeyDef(id: "right", label: "→", action: .right, special: true),
            KeyDef(id: "caim", label: "CAIm", action: .rewrite, width: 1.4, special: true),
            KeyDef(id: "rewrite", label: "✦", action: .rewrite, special: true),
        ],
    ]

    public static let pinRows: [[KeyDef]] = [
        [
            KeyDef(id: "1", label: "1", insert: "1"),
            KeyDef(id: "2", label: "2", insert: "2"),
            KeyDef(id: "3", label: "3", insert: "3"),
        ],
        [
            KeyDef(id: "4", label: "4", insert: "4"),
            KeyDef(id: "5", label: "5", insert: "5"),
            KeyDef(id: "6", label: "6", insert: "6"),
        ],
        [
            KeyDef(id: "7", label: "7", insert: "7"),
            KeyDef(id: "8", label: "8", insert: "8"),
            KeyDef(id: "9", label: "9", insert: "9"),
        ],
        [
            KeyDef(id: "clear", label: "Clear", action: .clear, special: true),
            KeyDef(id: "0", label: "0", insert: "0"),
            KeyDef(id: "backspace", label: "⌫", action: .backspace, special: true),
        ],
    ]

    public static func resolveInsert(_ key: KeyDef, shifted: Bool, caps: Bool) -> String? {
        if let action = key.action {
            switch action {
            case .space:
                return " "
            case .tab:
                return "\t"
            case .enter:
                return "\n"
            case .backspace, .shift, .caps, .escape, .left, .right, .home, .end, .nextKeyboard, .rewrite, .clear:
                return nil
            }
        }

        guard let base = key.insert else {
            return nil
        }
        if isLowercaseAZ(base) {
            let upper = shifted != caps
            return upper ? base.uppercased() : base
        }
        if shifted, let mapped = shiftMap[base] {
            return mapped
        }
        return base
    }

    public static func isLowercaseAZ(_ value: String) -> Bool {
        guard value.count == 1, let scalar = value.unicodeScalars.first else {
            return false
        }
        return scalar.value >= 97 && scalar.value <= 122
    }
}
