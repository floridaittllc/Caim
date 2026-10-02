import XCTest
@testable import CAImKeyboardCore

final class KeyboardModelTests: XCTestCase {
    func testQWERTYNumberRowIsAlwaysVisible() {
        let labels = KeyboardLayout.qwertyRows[0].map(\.label)
        XCTAssertEqual(
            labels,
            ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "⌫"]
        )
    }

    func testQWERTYLetterRows() {
        let rowQ = KeyboardLayout.qwertyRows[1].compactMap(\.insert).joined()
        let rowA = KeyboardLayout.qwertyRows[2].compactMap(\.insert).joined()
        let rowZ = KeyboardLayout.qwertyRows[3].compactMap(\.insert).joined()
        XCTAssertEqual(rowQ, "qwertyuiop[]\\")
        XCTAssertEqual(rowA, "asdfghjkl;'")
        XCTAssertEqual(rowZ, "zxcvbnm,./")
    }

    func testShiftAndCapsResolveLettersAndSymbols() {
        let model = KeyboardModel()
        let q = model.key(id: "q")!
        let one = model.key(id: "1")!

        XCTAssertEqual(KeyboardLayout.resolveInsert(q, shifted: false, caps: false), "q")
        XCTAssertEqual(KeyboardLayout.resolveInsert(q, shifted: true, caps: false), "Q")
        XCTAssertEqual(KeyboardLayout.resolveInsert(q, shifted: false, caps: true), "Q")
        XCTAssertEqual(KeyboardLayout.resolveInsert(q, shifted: true, caps: true), "q")
        XCTAssertEqual(KeyboardLayout.resolveInsert(one, shifted: true, caps: false), "!")
    }

    func testDisplayLabelFollowsShift() {
        var model = KeyboardModel()
        model.shiftOn = true
        XCTAssertEqual(model.displayLabel(for: model.key(id: "1")!), "!")
        XCTAssertEqual(model.displayLabel(for: model.key(id: "q")!), "Q")
        XCTAssertEqual(model.displayLabel(for: model.key(id: "space")!), "space")
    }

    func testOneShotShiftClearsAfterLetterButNotAfterSpace() {
        var model = KeyboardModel()
        XCTAssertEqual(model.handle(model.key(id: "lshift")!), .none)
        XCTAssertTrue(model.shiftOn)
        XCTAssertEqual(model.handle(model.key(id: "q")!), .insert("Q"))
        XCTAssertFalse(model.shiftOn)
        XCTAssertEqual(model.composer.text, "Q")

        XCTAssertEqual(model.handle(model.key(id: "lshift")!), .none)
        XCTAssertEqual(model.handle(model.key(id: "space")!), .insert(" "))
        XCTAssertTrue(model.shiftOn)
        XCTAssertEqual(model.composer.text, "Q ")
    }

    func testCapsStaysOnUntilToggled() {
        var model = KeyboardModel()
        _ = model.handle(model.key(id: "caps")!)
        XCTAssertEqual(model.handle(model.key(id: "a")!), .insert("A"))
        XCTAssertTrue(model.capsOn)
        XCTAssertEqual(model.handle(model.key(id: "a")!), .insert("A"))
        XCTAssertEqual(model.composer.text, "AA")
    }

    func testInsertAtCursorAndReplaceSelection() {
        var model = KeyboardModel(composer: ComposerState(text: "ac", cursor: 1))
        XCTAssertEqual(model.handle(model.key(id: "b")!), .insert("b"))
        XCTAssertEqual(model.composer.text, "abc")
        XCTAssertEqual(model.composer.selection, TextSelection(start: 2, end: 2))

        model.composer.selection = TextSelection(start: 1, end: 3)
        XCTAssertEqual(model.handle(model.key(id: "z")!), .insert("z"))
        XCTAssertEqual(model.composer.text, "az")
        XCTAssertEqual(model.composer.selection.start, 2)
    }

    func testBackspaceDeletesBeforeCursorOrSelection() {
        var model = KeyboardModel(composer: ComposerState(text: "abc", cursor: 2))
        XCTAssertEqual(model.handle(model.key(id: "backspace")!), .deleteBackward)
        XCTAssertEqual(model.composer.text, "ac")
        XCTAssertEqual(model.composer.selection.start, 1)

        model.composer.selection = TextSelection(start: 0, end: 2)
        XCTAssertEqual(model.handle(model.key(id: "backspace")!), .deleteBackward)
        XCTAssertEqual(model.composer.text, "")

        XCTAssertEqual(model.handle(model.key(id: "backspace")!), .deleteBackward)
        XCTAssertEqual(model.composer.text, "")
        XCTAssertEqual(model.composer.selection.start, 0)
    }

    func testCursorMovementThenInsert() {
        var model = KeyboardModel(composer: ComposerState(text: "ac", cursor: 2))
        XCTAssertEqual(model.handle(model.key(id: "left")!), .moveCursor(by: -1))
        XCTAssertEqual(model.composer.selection.start, 1)
        XCTAssertEqual(model.handle(model.key(id: "b")!), .insert("b"))
        XCTAssertEqual(model.composer.text, "abc")

        XCTAssertEqual(model.handle(model.key(id: "home")!), .moveToStart)
        XCTAssertEqual(model.composer.selection.start, 0)
        XCTAssertEqual(model.handle(model.key(id: "end")!), .moveToEnd)
        XCTAssertEqual(model.composer.selection.start, 3)
        XCTAssertEqual(model.handle(model.key(id: "right")!), .none)
    }

    func testEnterTabAndEscape() {
        var model = KeyboardModel()
        XCTAssertEqual(model.handle(model.key(id: "tab")!), .insert("\t"))
        XCTAssertEqual(model.handle(model.key(id: "enter")!), .insert("\n"))
        XCTAssertEqual(model.composer.text, "\t\n")
        XCTAssertEqual(model.handle(model.key(id: "esc")!), .clearDocument)
        XCTAssertEqual(model.composer.text, "")
    }

    func testPinAcceptsDigitsOnlyUpToMaxLength() {
        var model = KeyboardModel(mode: .pin)
        XCTAssertEqual(KeyboardLayout.pinRows.count, 4)
        for digit in ["1", "2", "3", "4", "5", "6", "7", "8"] {
            XCTAssertEqual(model.handle(model.key(id: digit)!), .insert(digit))
        }
        XCTAssertEqual(model.pin.digits, "12345678")
        XCTAssertEqual(model.composer.text, "12345678")

        XCTAssertEqual(model.handle(model.key(id: "9")!), .none)
        XCTAssertEqual(model.pin.digits, "12345678")

        let letter = KeyDef(id: "q", label: "Q", insert: "q")
        XCTAssertEqual(model.handle(letter), .none)
        let bang = KeyDef(id: "bang", label: "!", insert: "!")
        XCTAssertEqual(model.handle(bang), .none)
        let space = KeyDef(id: "space", label: "space", action: .space, special: true)
        XCTAssertEqual(model.handle(space), .none)
        XCTAssertEqual(model.pin.digits, "12345678")
    }

    func testPinBackspaceAndClear() {
        var model = KeyboardModel(mode: .pin)
        _ = model.handle(model.key(id: "4")!)
        _ = model.handle(model.key(id: "2")!)
        XCTAssertEqual(model.handle(model.key(id: "backspace")!), .deleteBackward)
        XCTAssertEqual(model.pin.digits, "4")
        XCTAssertEqual(model.handle(model.key(id: "clear")!), .clearDocument)
        XCTAssertEqual(model.pin.digits, "")
        XCTAssertEqual(model.composer.text, "")
        XCTAssertEqual(model.handle(model.key(id: "backspace")!), .none)
    }

    func testPinBufferRejectsMultiCharacterAndNonDigits() {
        var pin = PinBuffer()
        XCTAssertFalse(pin.insert("12"))
        XCTAssertFalse(pin.insert("a"))
        XCTAssertFalse(pin.insert(" "))
        XCTAssertTrue(pin.insert("0"))
        XCTAssertEqual(pin.digits, "0")
        pin = PinBuffer(digits: "12ab34567890")
        XCTAssertEqual(pin.digits, "12345678")
    }
}
