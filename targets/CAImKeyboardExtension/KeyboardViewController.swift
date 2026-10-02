import UIKit
import CAImKeyboardCore

/// Custom keyboard entry point. Inserts text via `textDocumentProxy`.
/// Editing rules come from `CAImKeyboardCore.KeyboardModel` (see `Packages/CAImKeyboardCore`).
/// `KeyboardEngineAdapter` is the UIKit side of that call and is wrapped in `canImport(UIKit)`.
/// `KeyboardAssistant` runs the background grammar check shown in `GrammarToolbarView`.
/// Network providers (RunPod, Grok) need Open Access (RequestsOpenAccess) + App Group settings.
final class KeyboardViewController: UIInputViewController {
    private var keyboardView: KeyboardView!
    private let toolbar = GrammarToolbarView(frame: .zero)
    private let assistant = KeyboardAssistant()
    private var model = KeyboardModel()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.10, green: 0.14, blue: 0.20, alpha: 1)

        toolbar.translatesAutoresizingMaskIntoConstraints = false
        toolbar.onApply = { [weak self] in
            guard let self else { return }
            self.assistant.applyFirstIssue(proxy: self.textDocumentProxy)
        }
        assistant.onToolbarChange = { [weak self] state in
            self?.toolbar.render(state)
        }
        view.addSubview(toolbar)

        keyboardView = KeyboardView(frame: .zero)
        keyboardView.translatesAutoresizingMaskIntoConstraints = false
        keyboardView.onKey = { [weak self] key in
            self?.handle(key)
        }
        view.addSubview(keyboardView)
        keyboardView.render(model)

        NSLayoutConstraint.activate([
            toolbar.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 4),
            toolbar.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -4),
            toolbar.topAnchor.constraint(equalTo: view.topAnchor, constant: 2),
            toolbar.heightAnchor.constraint(equalToConstant: 34),
            keyboardView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 4),
            keyboardView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -4),
            keyboardView.topAnchor.constraint(equalTo: toolbar.bottomAnchor, constant: 2),
            keyboardView.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -4),
            view.heightAnchor.constraint(greaterThanOrEqualToConstant: 296),
        ])
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        assistant.reload(hasFullAccess: hasFullAccess)
        assistant.textDidChange(proxy: textDocumentProxy)
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        assistant.stop()
    }

    override func textDidChange(_ textInput: UITextInput?) {
        super.textDidChange(textInput)
        assistant.textDidChange(proxy: textDocumentProxy)
    }

    private func handle(_ key: KeyDef) {
        KeyboardEngineAdapter.apply(
            key: key,
            model: &model,
            proxy: textDocumentProxy,
            onNextKeyboard: { [weak self] in
                self?.advanceToNextInputMode()
            },
            onRewrite: { [weak self] in
                guard let self else { return }
                self.assistant.rewrite(proxy: self.textDocumentProxy)
            }
        )
        keyboardView.render(model)
        assistant.textDidChange(proxy: textDocumentProxy)
    }
}
