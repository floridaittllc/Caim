import UIKit

enum KeyboardAction {
    case insert(String)
    case backspace
    case shift
    case caps
    case nextKeyboard
    case rewrite
}

/// Hardware-style QWERTY with always-visible number row (not iOS Messages layers).
final class KeyboardView: UIView {
    var onKey: ((KeyboardAction) -> Void)?

    private var shiftOn = false
    private var capsOn = false
    private let stack = UIStackView()
    private var keyButtons: [UIButton] = []

    private let rows: [[String]] = [
        ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "⌫"],
        ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]"],
        ["caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "return"],
        ["shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "shift"],
        ["🌐", "CAIm", "space", "rewrite"],
    ]

    private let shiftMap: [String: String] = [
        "`": "~", "1": "!", "2": "@", "3": "#", "4": "$", "5": "%", "6": "^",
        "7": "&", "8": "*", "9": "(", "0": ")", "-": "_", "=": "+",
        "[": "{", "]": "}", ";": ":", "'": "\"", ",": "<", ".": ">", "/": "?",
    ]

    override init(frame: CGRect) {
        super.init(frame: frame)
        stack.axis = .vertical
        stack.spacing = 4
        stack.translatesAutoresizingMaskIntoConstraints = false
        addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: trailingAnchor),
            stack.topAnchor.constraint(equalTo: topAnchor),
            stack.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])
        rebuild()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func setShift(_ on: Bool) {
        shiftOn = on
        refreshLabels()
    }

    func setCaps(_ on: Bool) {
        capsOn = on
        refreshLabels()
    }

    private func rebuild() {
        stack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        keyButtons.removeAll()

        for row in rows {
            let rowStack = UIStackView()
            rowStack.axis = .horizontal
            rowStack.spacing = 3
            rowStack.distribution = .fillEqually

            for key in row {
                let button = UIButton(type: .system)
                button.setTitle(display(for: key), for: .normal)
                button.setTitleColor(.white, for: .normal)
                button.titleLabel?.font = .systemFont(ofSize: 14, weight: .semibold)
                button.backgroundColor = UIColor(white: 0.22, alpha: 1)
                button.layer.cornerRadius = 5
                button.accessibilityIdentifier = key
                button.addTarget(self, action: #selector(tapped(_:)), for: .touchUpInside)
                if ["shift", "caps", "⌫", "return", "🌐", "CAIm", "rewrite", "space"].contains(key) {
                    button.backgroundColor = UIColor(white: 0.14, alpha: 1)
                }
                rowStack.addArrangedSubview(button)
                keyButtons.append(button)
            }
            stack.addArrangedSubview(rowStack)
        }
    }

    private func display(for key: String) -> String {
        switch key {
        case "space": return "space"
        case "return": return "return"
        case "rewrite": return "✦"
        case "CAIm": return "CAIm"
        default:
            if key.count == 1, key.rangeOfCharacter(from: .letters) != nil {
                let upper = shiftOn != capsOn
                return upper ? key.uppercased() : key.lowercased()
            }
            if shiftOn, let alt = shiftMap[key] {
                return alt
            }
            return key
        }
    }

    private func refreshLabels() {
        for button in keyButtons {
            guard let key = button.accessibilityIdentifier else { continue }
            button.setTitle(display(for: key), for: .normal)
        }
    }

    @objc private func tapped(_ sender: UIButton) {
        guard let key = sender.accessibilityIdentifier else { return }
        switch key {
        case "⌫":
            onKey?(.backspace)
        case "shift":
            onKey?(.shift)
        case "caps":
            onKey?(.caps)
        case "return":
            onKey?(.insert("\n"))
        case "space":
            onKey?(.insert(" "))
        case "🌐":
            onKey?(.nextKeyboard)
        case "rewrite", "CAIm":
            onKey?(.rewrite)
        default:
            let text = display(for: key)
            onKey?(.insert(text))
        }
    }
}
