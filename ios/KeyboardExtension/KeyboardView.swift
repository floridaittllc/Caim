// KeyboardView.swift
// Renders the QWERTY key grid for the current plane/shift state using nested
// UIStackViews and reports key taps back to its delegate.

#if canImport(UIKit)
import UIKit

protocol KeyboardViewDelegate: AnyObject {
    func keyboardView(_ view: KeyboardView, didTap key: Key)
    /// Whether letter keys should render/insert uppercase.
    func keyboardViewIsUppercase(_ view: KeyboardView) -> Bool
    /// Whether shift is locked (caps lock) — used to highlight the shift key.
    func keyboardViewIsShiftLocked(_ view: KeyboardView) -> Bool
    /// Whether to show the globe key (only when other keyboards are installed).
    func keyboardViewNeedsNextKeyboardKey(_ view: KeyboardView) -> Bool
}

/// A self-laying-out keyboard grid. Call `reload()` after state changes.
final class KeyboardView: UIView {
    weak var delegate: KeyboardViewDelegate?
    var plane: KeyPlane = .letters

    private let rowSpacing: CGFloat = 10
    private let keySpacing: CGFloat = 6
    private lazy var columnStack: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.distribution = .fillEqually
        stack.spacing = rowSpacing
        stack.translatesAutoresizingMaskIntoConstraints = false
        return stack
    }()

    override init(frame: CGRect) {
        super.init(frame: frame)
        addSubview(columnStack)
        NSLayoutConstraint.activate([
            columnStack.topAnchor.constraint(equalTo: topAnchor, constant: 8),
            columnStack.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -6),
            columnStack.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 4),
            columnStack.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -4),
        ])
        reload()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    /// Rebuilds the key grid from scratch for the current plane and state.
    func reload() {
        columnStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        let uppercase = delegate?.keyboardViewIsUppercase(self) ?? false

        for row in KeyboardLayout.rows(for: plane) {
            let rowStack = UIStackView()
            rowStack.axis = .horizontal
            rowStack.distribution = .fill
            rowStack.spacing = keySpacing
            rowStack.alignment = .fill

            for key in row {
                if key == .nextKeyboard,
                   delegate?.keyboardViewNeedsNextKeyboardKey(self) == false {
                    continue // Hide the globe when there is nothing to switch to.
                }
                let button = makeButton(for: key, uppercase: uppercase)
                rowStack.addArrangedSubview(button)
            }
            columnStack.addArrangedSubview(rowStack)
        }
    }

    // MARK: Button construction

    private func makeButton(for key: Key, uppercase: Bool) -> UIButton {
        let button = KeyButton(type: .system)
        button.key = key
        button.titleLabel?.font = .systemFont(ofSize: fontSize(for: key), weight: .regular)
        button.setTitle(title(for: key, uppercase: uppercase), for: .normal)
        button.setTitleColor(.label, for: .normal)
        button.backgroundColor = backgroundColor(for: key)
        button.layer.cornerRadius = 6
        button.layer.shadowColor = UIColor.black.cgColor
        button.layer.shadowOpacity = 0.25
        button.layer.shadowRadius = 0
        button.layer.shadowOffset = CGSize(width: 0, height: 1)
        button.addTarget(self, action: #selector(keyTapped(_:)), for: .touchUpInside)

        // Relative widths: character keys flex; special keys are wider.
        switch key {
        case .character:
            button.setContentHuggingPriority(.defaultLow, for: .horizontal)
        case .space:
            button.setContentHuggingPriority(.defaultLow, for: .horizontal)
        case .shift, .backspace, .toNumbers, .toSymbols, .toLetters, .return, .nextKeyboard:
            button.widthAnchor.constraint(greaterThanOrEqualToConstant: 42).isActive = true
        }

        if key == .shift, delegate?.keyboardViewIsShiftLocked(self) == true {
            button.backgroundColor = .systemBlue
            button.tintColor = .white
        }
        return button
    }

    @objc private func keyTapped(_ sender: KeyButton) {
        guard let key = sender.key else { return }
        delegate?.keyboardView(self, didTap: key)
    }

    // MARK: Appearance helpers

    private func title(for key: Key, uppercase: Bool) -> String {
        switch key {
        case .character(let c): return uppercase ? c.uppercased() : c
        case .backspace: return "\u{232B}"          // ⌫
        case .shift: return uppercase ? "\u{21EA}" : "\u{21E7}" // ⇪ / ⇧
        case .toNumbers: return "123"
        case .toSymbols: return "#+="
        case .toLetters: return "ABC"
        case .space: return "space"
        case .return: return "return"
        case .nextKeyboard: return "\u{1F310}"       // 🌐
        }
    }

    private func fontSize(for key: Key) -> CGFloat {
        switch key {
        case .character: return 22
        case .space, .return: return 16
        default: return 18
        }
    }

    private func backgroundColor(for key: Key) -> UIColor {
        switch key {
        case .character, .space:
            return UIColor.systemBackground
        default:
            // Special keys use the darker "function key" shade.
            return UIColor.systemGray3
        }
    }
}

/// A UIButton that remembers which logical key it represents.
private final class KeyButton: UIButton {
    var key: Key?
}
#endif
