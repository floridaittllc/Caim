// KeyboardViewController.swift
// The custom keyboard's principal class. It builds the UI (suggestion bar +
// QWERTY grid), manages shift/plane state, feeds typed text into GrammarKit,
// and applies tapped corrections through the text document proxy.

#if canImport(UIKit)
import UIKit
import GrammarKit

final class KeyboardViewController: UIInputViewController {

    // MARK: State

    private enum ShiftState { case off, on, locked }

    private var shiftState: ShiftState = .on   // start capitalized like the system keyboard
    private var plane: KeyPlane = .letters
    private var lastShiftTapTime: TimeInterval = 0

    private let checker = GrammarChecker()

    // MARK: Views

    private let suggestionBar = SuggestionBar()
    private let keyboardView = KeyboardView()

    // MARK: Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        setUpViews()
        keyboardView.delegate = self
        suggestionBar.delegate = self
        refreshKeyboard()
        updateSuggestions()
    }

    private func setUpViews() {
        let container = UIStackView(arrangedSubviews: [suggestionBar, keyboardView])
        container.axis = .vertical
        container.spacing = 0
        container.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(container)

        NSLayoutConstraint.activate([
            container.topAnchor.constraint(equalTo: view.topAnchor),
            container.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            container.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            container.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            suggestionBar.heightAnchor.constraint(equalToConstant: 44),
            // A comfortable keyboard height for portrait iPhone.
            keyboardView.heightAnchor.constraint(greaterThanOrEqualToConstant: 216),
        ])
        view.backgroundColor = UIColor.systemGray5
    }

    // MARK: Text change hooks

    override func textDidChange(_ textInput: UITextInput?) {
        super.textDidChange(textInput)
        updateSuggestions()
    }

    // MARK: Suggestions

    /// Runs GrammarKit over the text before the cursor and shows the best
    /// suggestion for the word currently being typed.
    private func updateSuggestions() {
        let before = textDocumentProxy.documentContextBeforeInput ?? ""
        suggestionBar.show(currentSuggestion(before: before))
    }

    /// Finds the most relevant suggestion for the word ending at the cursor.
    private func currentSuggestion(before: String) -> Suggestion? {
        guard !before.isEmpty else { return nil }
        let suggestions = checker.check(before)
        let cursor = before.count

        // Prefer a suggestion whose range ends exactly at (or straddles) the
        // cursor — i.e. the word the user just finished typing.
        let atCursor = suggestions.filter {
            $0.range.upperBound == cursor || ($0.range.lowerBound < cursor && $0.range.upperBound >= cursor)
        }
        if let best = atCursor.first(where: { !$0.replacements.isEmpty }) {
            return best
        }
        // Otherwise fall back to the last actionable suggestion in the text.
        return suggestions.last { !$0.replacements.isEmpty }
    }

    // MARK: Key handling

    private func handle(_ key: Key) {
        let proxy = textDocumentProxy
        switch key {
        case .character(let base):
            let isUpper = (shiftState != .off)
            proxy.insertText(isUpper ? base.uppercased() : base)
            if shiftState == .on { shiftState = .off; refreshKeyboard() }

        case .space:
            proxy.insertText(" ")
            if shiftState == .on { shiftState = .off; refreshKeyboard() }

        case .return:
            proxy.insertText("\n")

        case .backspace:
            proxy.deleteBackward()

        case .shift:
            toggleShift()

        case .toNumbers:
            plane = .numbers; refreshKeyboard()
        case .toSymbols:
            plane = .symbols; refreshKeyboard()
        case .toLetters:
            plane = .letters; refreshKeyboard()

        case .nextKeyboard:
            advanceToNextInputMode()
        }
        // Auto-capitalize at the start of a new sentence.
        autoCapitalizeIfNeeded()
        updateSuggestions()
    }

    private func toggleShift() {
        let now = Date().timeIntervalSince1970
        if now - lastShiftTapTime < 0.3 {
            shiftState = .locked            // double tap -> caps lock
        } else {
            switch shiftState {
            case .off: shiftState = .on
            case .on: shiftState = .off
            case .locked: shiftState = .off
            }
        }
        lastShiftTapTime = now
        refreshKeyboard()
    }

    /// Turns shift on when the previous non-space characters indicate the start
    /// of a new sentence (nothing typed yet, or after ". ", "! ", "? ").
    private func autoCapitalizeIfNeeded() {
        guard plane == .letters, shiftState != .locked else { return }
        let before = textDocumentProxy.documentContextBeforeInput ?? ""
        let trimmed = before.drop(while: { $0 == " " })
        let shouldCapitalize: Bool
        if before.isEmpty {
            shouldCapitalize = true
        } else if before.hasSuffix(" ") {
            let priorChar = before.dropLast().last
            shouldCapitalize = priorChar == "." || priorChar == "!" || priorChar == "?"
        } else {
            shouldCapitalize = trimmed.isEmpty
        }
        let newState: ShiftState = shouldCapitalize ? .on : (shiftState == .on ? .off : shiftState)
        if newState != shiftState {
            shiftState = newState
            refreshKeyboard()
        }
    }

    private func refreshKeyboard() {
        keyboardView.plane = plane
        keyboardView.reload()
    }
}

// MARK: - KeyboardViewDelegate

extension KeyboardViewController: KeyboardViewDelegate {
    func keyboardView(_ view: KeyboardView, didTap key: Key) {
        handle(key)
    }

    func keyboardViewIsUppercase(_ view: KeyboardView) -> Bool {
        plane == .letters && shiftState != .off
    }

    func keyboardViewIsShiftLocked(_ view: KeyboardView) -> Bool {
        shiftState == .locked
    }

    func keyboardViewNeedsNextKeyboardKey(_ view: KeyboardView) -> Bool {
        needsInputModeSwitchKey
    }
}

// MARK: - SuggestionBarDelegate

extension KeyboardViewController: SuggestionBarDelegate {
    /// Replaces the word at the cursor with the chosen correction.
    func suggestionBar(_ bar: SuggestionBar, didSelect replacement: String, for suggestion: Suggestion) {
        let proxy = textDocumentProxy
        let before = proxy.documentContextBeforeInput ?? ""

        // Number of trailing characters that belong to the flagged fragment and
        // sit before the cursor.
        let cursor = before.count
        let overlapEnd = min(suggestion.range.upperBound, cursor)
        let overlapStart = suggestion.range.lowerBound
        guard overlapEnd > overlapStart else { return }
        let deleteCount = overlapEnd - overlapStart

        for _ in 0..<deleteCount { proxy.deleteBackward() }
        proxy.insertText(replacement)
        updateSuggestions()
    }
}
#endif
