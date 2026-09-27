#if canImport(UIKit)
import UIKit
import CAImKeyboardCore

/// Maps `KeyboardModel` effects onto `UITextDocumentProxy`.
/// The model itself is pure Swift and is what `swift test` runs on Linux.
/// This file compiles only where UIKit exists (Xcode / iOS SDK).
enum KeyboardEngineAdapter {
    static func apply(
        key: KeyDef,
        model: inout KeyboardModel,
        proxy: UITextDocumentProxy,
        onNextKeyboard: () -> Void,
        onRewrite: () -> Void
    ) {
        switch model.handle(key) {
        case .insert(let text):
            proxy.insertText(text)
        case .deleteBackward:
            proxy.deleteBackward()
        case .moveCursor(let delta):
            proxy.adjustTextPosition(byCharacterOffset: delta)
        case .moveToStart:
            let offset = utf16Length(proxy.documentContextBeforeInput)
            if offset > 0 {
                proxy.adjustTextPosition(byCharacterOffset: -offset)
            }
        case .moveToEnd:
            let offset = utf16Length(proxy.documentContextAfterInput)
            if offset > 0 {
                proxy.adjustTextPosition(byCharacterOffset: offset)
            }
        case .clearDocument:
            let after = utf16Length(proxy.documentContextAfterInput)
            if after > 0 {
                proxy.adjustTextPosition(byCharacterOffset: after)
            }
            let before = utf16Length(proxy.documentContextBeforeInput)
            for _ in 0..<before {
                proxy.deleteBackward()
            }
        case .nextKeyboard:
            onNextKeyboard()
        case .rewrite:
            onRewrite()
        case .none:
            break
        }
    }

    /// `adjustTextPosition` counts UTF-16 code units, matching `NSString.length`.
    private static func utf16Length(_ text: String?) -> Int {
        (text as NSString?)?.length ?? 0
    }
}
#endif
