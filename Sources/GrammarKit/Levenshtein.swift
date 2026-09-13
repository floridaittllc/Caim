// Levenshtein.swift
// Edit-distance utilities used to rank spelling corrections.
//
// Pure Swift stdlib only — no Foundation.

public enum EditDistance {
    /// Classic Levenshtein (insert/delete/substitute cost 1) using two rolling
    /// rows so memory is O(min(m, n)). Operates on `Character`s so it is
    /// Unicode-correct for user-visible characters.
    public static func levenshtein(_ a: String, _ b: String) -> Int {
        if a == b { return 0 }
        let s = Array(a)
        let t = Array(b)
        if s.isEmpty { return t.count }
        if t.isEmpty { return s.count }

        var previous = Array(0...t.count)
        var current = [Int](repeating: 0, count: t.count + 1)

        for i in 1...s.count {
            current[0] = i
            for j in 1...t.count {
                let cost = s[i - 1] == t[j - 1] ? 0 : 1
                current[j] = min(
                    previous[j] + 1,        // deletion
                    current[j - 1] + 1,     // insertion
                    previous[j - 1] + cost  // substitution
                )
            }
            swap(&previous, &current)
        }
        return previous[t.count]
    }

    /// Damerau–Levenshtein: like Levenshtein but treats a transposition of two
    /// adjacent characters as a single edit. This matters a lot for typing
    /// errors ("teh" -> "the" is one transposition, not two substitutions).
    public static func damerauLevenshtein(_ a: String, _ b: String) -> Int {
        if a == b { return 0 }
        let s = Array(a)
        let t = Array(b)
        if s.isEmpty { return t.count }
        if t.isEmpty { return s.count }

        let n = s.count
        let m = t.count
        var d = [[Int]](repeating: [Int](repeating: 0, count: m + 1), count: n + 1)

        for i in 0...n { d[i][0] = i }
        for j in 0...m { d[0][j] = j }

        for i in 1...n {
            for j in 1...m {
                let cost = s[i - 1] == t[j - 1] ? 0 : 1
                d[i][j] = min(
                    d[i - 1][j] + 1,        // deletion
                    d[i][j - 1] + 1,        // insertion
                    d[i - 1][j - 1] + cost  // substitution
                )
                if i > 1, j > 1, s[i - 1] == t[j - 2], s[i - 2] == t[j - 1] {
                    d[i][j] = min(d[i][j], d[i - 2][j - 2] + 1) // transposition
                }
            }
        }
        return d[n][m]
    }
}
