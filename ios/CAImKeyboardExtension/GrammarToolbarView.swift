import UIKit
import CAImKeyboardCore

/// Strip above the keys: issue count / status on the left, a tappable fix chip on the right.
final class GrammarToolbarView: UIView {
    enum State: Equatable {
        case hidden
        case status(String)
        case issues(first: GrammarIssue, count: Int, source: String)
    }

    var onApply: (() -> Void)?

    private let statusLabel = UILabel()
    private let chip = UIButton(type: .custom)

    override init(frame: CGRect) {
        super.init(frame: frame)
        statusLabel.font = .systemFont(ofSize: 12, weight: .medium)
        statusLabel.textColor = UIColor(white: 0.75, alpha: 1)
        statusLabel.lineBreakMode = .byTruncatingTail
        statusLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        var config = UIButton.Configuration.filled()
        config.baseBackgroundColor = UIColor(red: 0.20, green: 0.45, blue: 0.85, alpha: 1)
        config.baseForegroundColor = .white
        config.cornerStyle = .capsule
        config.contentInsets = NSDirectionalEdgeInsets(top: 4, leading: 12, bottom: 4, trailing: 12)
        config.titleLineBreakMode = .byTruncatingMiddle
        config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { attributes in
            var updated = attributes
            updated.font = .systemFont(ofSize: 14, weight: .semibold)
            return updated
        }
        chip.configuration = config
        chip.accessibilityIdentifier = "grammar-apply"
        chip.addTarget(self, action: #selector(applyTapped), for: .touchUpInside)
        chip.setContentCompressionResistancePriority(.required, for: .horizontal)

        let stack = UIStackView(arrangedSubviews: [statusLabel, chip])
        stack.axis = .horizontal
        stack.spacing = 8
        stack.alignment = .center
        stack.translatesAutoresizingMaskIntoConstraints = false
        addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 6),
            stack.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -6),
            stack.topAnchor.constraint(equalTo: topAnchor, constant: 2),
            stack.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -2),
            chip.widthAnchor.constraint(lessThanOrEqualTo: widthAnchor, multiplier: 0.65),
        ])
        render(.hidden)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func render(_ state: State) {
        switch state {
        case .hidden:
            statusLabel.text = nil
            chip.isHidden = true
        case .status(let text):
            statusLabel.text = text
            chip.isHidden = true
        case .issues(let first, let count, let source):
            let noun = count == 1 ? "issue" : "issues"
            let detail = first.explanation.isEmpty ? source : "\(first.explanation) · \(source)"
            statusLabel.text = "\(count) \(noun) · \(detail)"
            chip.configuration?.title = "\(first.original) → \(first.replacement)"
            chip.accessibilityLabel = "Replace \(first.original) with \(first.replacement)"
            chip.isHidden = false
        }
    }

    @objc private func applyTapped() {
        onApply?()
    }
}
