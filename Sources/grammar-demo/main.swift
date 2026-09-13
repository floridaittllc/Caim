// grammar-demo
// A tiny command-line front-end for GrammarKit. It runs the engine over a set
// of sample sentences (or any sentence passed as arguments) and prints the
// detected issues plus an auto-corrected version. This is the tangible,
// runnable end-to-end proof of the engine on Linux, since the iPhone keyboard
// UI cannot be executed on this VM.

import GrammarKit

let checker = GrammarChecker()

func analyze(_ text: String) {
    print("\nINPUT : \(text)")
    let suggestions = checker.check(text)
    if suggestions.isEmpty {
        print("  (no issues found)")
    } else {
        for s in suggestions {
            let fragment = s.matchedText(in: text) ?? ""
            let fixes = s.replacements.isEmpty ? "-" : s.replacements.joined(separator: ", ")
            let where_ = "[\(s.range.lowerBound)..<\(s.range.upperBound)]"
            print("  • \(pad(s.category.rawValue, 14)) \(where_) \"\(fragment)\" -> \(fixes)")
            print("      \(s.message)")
        }
    }
    print("OUTPUT: \(checker.autocorrect(text))")
}

func pad(_ s: String, _ width: Int) -> String {
    s.count >= width ? s : s + String(repeating: " ", count: width - s.count)
}

// Sentences after the executable name are analysed directly; otherwise use a
// curated demo set that exercises every category of rule.
let userArgs = Array(CommandLine.arguments.dropFirst())

let samples: [String] = userArgs.isEmpty ? [
    "i dont think this is teh correct answer",
    "your going to love this restaraunt , its amazing",
    "she is a honest person and i beleive her",
    "this is better then that and the the results are wierd",
    "helo world.this sentence needs alot of help",
] : [userArgs.joined(separator: " ")]

print("GrammarKit demo — analysing \(samples.count) sample(s)")
print(String(repeating: "=", count: 60))
for sample in samples { analyze(sample) }
print(String(repeating: "=", count: 60))
print("Done.")
