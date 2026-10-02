import UIKit
import CAImKeyboardCore

/// Custom keyboard entry point. Inserts text via `textDocumentProxy`.
/// Editing rules come from `CAImKeyboardCore.KeyboardModel` (see `Packages/CAImKeyboardCore`).
/// `KeyboardEngineAdapter` is the UIKit side of that call and is wrapped in `canImport(UIKit)`.
/// Full network/Grok calls require Open Access (RequestsOpenAccess) + App Group shared key.
final class KeyboardViewController: UIInputViewController {
    private var keyboardView: KeyboardView!
    private var model = KeyboardModel()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.10, green: 0.14, blue: 0.20, alpha: 1)

        keyboardView = KeyboardView(frame: .zero)
        keyboardView.translatesAutoresizingMaskIntoConstraints = false
        keyboardView.onKey = { [weak self] key in
            self?.handle(key)
        }
        view.addSubview(keyboardView)
        keyboardView.render(model)

        NSLayoutConstraint.activate([
            keyboardView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 4),
            keyboardView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -4),
            keyboardView.topAnchor.constraint(equalTo: view.topAnchor, constant: 4),
            keyboardView.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -4),
            view.heightAnchor.constraint(greaterThanOrEqualToConstant: 260),
        ])
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
                GrokKeyboardClient.shared.rewriteSelectedOrNearby(proxy: self.textDocumentProxy)
            }
        )
        keyboardView.render(model)
    }
}
