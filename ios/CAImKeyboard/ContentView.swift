// ContentView.swift
// Host-app UI: setup instructions plus a live text sandbox that runs the same
// GrammarKit engine the keyboard extension uses. This lets a developer see the
// engine working even before enabling the system keyboard.

import SwiftUI
import GrammarKit

struct ContentView: View {
    @State private var text: String = "i dont think this is teh correct answer"

    private let checker = GrammarChecker()

    private var suggestions: [Suggestion] {
        checker.check(text)
    }

    var body: some View {
        NavigationView {
            Form {
                Section("Try it") {
                    TextEditor(text: $text)
                        .frame(minHeight: 90)
                        .font(.body)
                    Button {
                        text = checker.autocorrect(text)
                    } label: {
                        Label("Auto-correct everything", systemImage: "wand.and.stars")
                    }
                    .disabled(suggestions.isEmpty)
                }

                Section("Suggestions (\(suggestions.count))") {
                    if suggestions.isEmpty {
                        Label("No issues found", systemImage: "checkmark.seal")
                            .foregroundColor(.green)
                    } else {
                        ForEach(Array(suggestions.enumerated()), id: \.offset) { _, s in
                            SuggestionRow(suggestion: s, text: text) { replacement in
                                apply(replacement, for: s)
                            }
                        }
                    }
                }

                Section("Enable the CAIm keyboard") {
                    instruction(1, "Open the iOS Settings app.")
                    instruction(2, "Go to General \u{2192} Keyboard \u{2192} Keyboards.")
                    instruction(3, "Tap \u{201C}Add New Keyboard\u{2026}\u{201D} and choose CAIm Keyboard.")
                    instruction(4, "Switch to CAIm with the \u{1F310} globe key in any text field.")
                    Text("Open access is not required \u{2014} grammar checking runs entirely on-device.")
                        .font(.footnote)
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("CAIm")
        }
        .navigationViewStyle(.stack)
    }

    private func instruction(_ n: Int, _ body: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Text("\(n).").bold().frame(width: 20, alignment: .trailing)
            Text(body)
        }
    }

    private func apply(_ replacement: String, for suggestion: Suggestion) {
        guard let range = suggestion.stringRange(in: text) else { return }
        text.replaceSubrange(range, with: replacement)
    }
}

/// A single row in the suggestions list, showing the message and tappable
/// replacement chips.
struct SuggestionRow: View {
    let suggestion: Suggestion
    let text: String
    let onApply: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .foregroundColor(color)
                Text(suggestion.category.rawValue.capitalized)
                    .font(.caption).bold()
                    .foregroundColor(color)
                if let fragment = suggestion.matchedText(in: text), !fragment.isEmpty {
                    Text("\u{201C}\(fragment)\u{201D}")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            Text(suggestion.message).font(.subheadline)
            if !suggestion.replacements.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack {
                        ForEach(suggestion.replacements.prefix(4), id: \.self) { rep in
                            Button(rep.isEmpty ? "(remove)" : rep) { onApply(rep) }
                                .buttonStyle(.bordered)
                                .font(.footnote)
                        }
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }

    private var icon: String {
        switch suggestion.category {
        case .spelling: return "textformat.abc"
        case .grammar: return "text.badge.checkmark"
        case .capitalization: return "characters.uppercase"
        case .punctuation: return "questionmark.circle"
        case .style: return "sparkles"
        }
    }

    private var color: Color {
        switch suggestion.category {
        case .spelling: return .red
        case .grammar: return .blue
        case .capitalization: return .orange
        case .punctuation: return .purple
        case .style: return .teal
        }
    }
}

#Preview {
    ContentView()
}
