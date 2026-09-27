import UIKit
import CAImKeyboardCore

/// Renders `KeyboardModel.rows` and asks the controller to run the shared engine.
final class KeyboardView: UIView {
    var onKey: ((KeyDef) -> Void)?

    private let stack = UIStackView()
    private var keyButtons: [UIButton] = []
    private var keysByID: [String: KeyDef] = [:]
    private var builtSignature = ""

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
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func render(_ model: KeyboardModel) {
        let signature = model.rows.map { row in
            row.map(\.id).joined(separator: ",")
        }.joined(separator: "|")
        if signature != builtSignature {
            rebuild(model)
            builtSignature = signature
        }
        refreshLabels(model)
    }

    private func rebuild(_ model: KeyboardModel) {
        stack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        keyButtons.removeAll()
        keysByID.removeAll()

        for row in model.rows {
            let rowStack = UIStackView()
            rowStack.axis = .horizontal
            rowStack.spacing = 3
            rowStack.distribution = .fillEqually

            for key in row {
                let button = UIButton(type: .system)
                button.setTitle(model.displayLabel(for: key), for: .normal)
                button.setTitleColor(.white, for: .normal)
                button.titleLabel?.font = .systemFont(ofSize: 14, weight: .semibold)
                button.titleLabel?.adjustsFontSizeToFitWidth = true
                button.titleLabel?.minimumScaleFactor = 0.6
                button.backgroundColor = key.special
                    ? UIColor(white: 0.14, alpha: 1)
                    : UIColor(white: 0.22, alpha: 1)
                button.layer.cornerRadius = 5
                button.accessibilityIdentifier = key.id
                button.addTarget(self, action: #selector(tapped(_:)), for: .touchUpInside)
                rowStack.addArrangedSubview(button)
                keyButtons.append(button)
                keysByID[key.id] = key
            }
            stack.addArrangedSubview(rowStack)
        }
    }

    private func refreshLabels(_ model: KeyboardModel) {
        for button in keyButtons {
            guard let id = button.accessibilityIdentifier, let key = keysByID[id] else {
                continue
            }
            button.setTitle(model.displayLabel(for: key), for: .normal)
            let active = (key.action == .shift && model.shiftOn) || (key.action == .caps && model.capsOn)
            button.backgroundColor = active
                ? UIColor(red: 0.20, green: 0.45, blue: 0.85, alpha: 1)
                : (key.special ? UIColor(white: 0.14, alpha: 1) : UIColor(white: 0.22, alpha: 1))
        }
    }

    @objc private func tapped(_ sender: UIButton) {
        guard let id = sender.accessibilityIdentifier, let key = keysByID[id] else {
            return
        }
        onKey?(key)
    }
}
