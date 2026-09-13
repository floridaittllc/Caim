// SuggestionBar.swift
// The Grammarly-style bar above the keys that surfaces GrammarKit corrections
// for the word at the cursor and applies them on tap.

#if canImport(UIKit)
import UIKit
import GrammarKit

protocol SuggestionBarDelegate: AnyObject {
    /// The user tapped a replacement chip for the given suggestion.
    func suggestionBar(_ bar: SuggestionBar, didSelect replacement: String, for suggestion: Suggestion)
}

final class SuggestionBar: UIView {
    weak var delegate: SuggestionBarDelegate?

    private let stack: UIStackView = {
        let s = UIStackView()
        s.axis = .horizontal
        s.distribution = .fillEqually
        s.spacing = 1
        s.translatesAutoresizingMaskIntoConstraints = false
        return s
    }()

    private let placeholder: UILabel = {
        let l = UILabel()
        l.text = "CAIm \u{2014} start typing"
        l.textAlignment = .center
        l.font = .systemFont(ofSize: 13)
        l.textColor = .secondaryLabel
        l.translatesAutoresizingMaskIntoConstraints = false
        return l
    }()

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        addSubview(placeholder)
        addSubview(stack)
        NSLayoutConstraint.activate([
            placeholder.centerXAnchor.constraint(equalTo: centerXAnchor),
            placeholder.centerYAnchor.constraint(equalTo: centerYAnchor),
            stack.topAnchor.constraint(equalTo: topAnchor, constant: 4),
            stack.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -4),
            stack.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 4),
            stack.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -4),
        ])
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    /// Displays up to three replacement chips for `suggestion`, or the empty
    /// placeholder when `suggestion` is nil / has no replacements.
    func show(_ suggestion: Suggestion?) {
        stack.arrangedSubviews.forEach { $0.removeFromSuperview() }

        guard let suggestion, !suggestion.replacements.isEmpty else {
            placeholder.isHidden = false
            return
        }
        placeholder.isHidden = true

        for replacement in suggestion.replacements.prefix(3) {
            let button = UIButton(type: .system)
            let title = replacement.isEmpty ? "\u{2717} remove" : replacement
            button.setTitle(title, for: .normal)
            button.titleLabel?.font = .systemFont(ofSize: 16, weight: .medium)
            button.setTitleColor(.label, for: .normal)
            button.accessibilityHint = suggestion.message
            button.addAction(UIAction { [weak self] _ in
                guard let self else { return }
                self.delegate?.suggestionBar(self, didSelect: replacement, for: suggestion)
            }, for: .touchUpInside)
            stack.addArrangedSubview(button)
        }
    }
}
#endif
