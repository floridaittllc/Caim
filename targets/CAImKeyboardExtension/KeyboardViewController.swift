import UIKit

/// Custom keyboard entry point. Inserts text via `textDocumentProxy`.
/// Full network/Grok calls require Open Access (RequestsOpenAccess) + App Group shared key.
final class KeyboardViewController: UIInputViewController {
    private var keyboardView: KeyboardView!
    private var shiftOn = false
    private var capsOn = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.10, green: 0.14, blue: 0.20, alpha: 1)

        keyboardView = KeyboardView(frame: .zero)
        keyboardView.translatesAutoresizingMaskIntoConstraints = false
        keyboardView.onKey = { [weak self] action in
            self?.handle(action)
        }
        view.addSubview(keyboardView)

        NSLayoutConstraint.activate([
            keyboardView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 4),
            keyboardView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -4),
            keyboardView.topAnchor.constraint(equalTo: view.topAnchor, constant: 4),
            keyboardView.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -4),
            view.heightAnchor.constraint(greaterThanOrEqualToConstant: 260),
        ])
    }

    private func handle(_ action: KeyboardAction) {
        switch action {
        case .insert(let text):
            textDocumentProxy.insertText(text)
            if shiftOn {
                shiftOn = false
                keyboardView.setShift(false)
            }
        case .backspace:
            textDocumentProxy.deleteBackward()
        case .shift:
            shiftOn.toggle()
            keyboardView.setShift(shiftOn)
        case .caps:
            capsOn.toggle()
            keyboardView.setCaps(capsOn)
        case .nextKeyboard:
            advanceToNextInputMode()
        case .rewrite:
            // Placeholder: call Grok when Open Access + shared App Group API key are available.
            GrokKeyboardClient.shared.rewriteSelectedOrNearby(proxy: textDocumentProxy)
        }
    }
}
