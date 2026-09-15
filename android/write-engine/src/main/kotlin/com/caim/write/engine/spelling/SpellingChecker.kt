package com.caim.write.engine.spelling

import com.caim.write.engine.model.SuggestionCategory
import com.caim.write.engine.model.SuggestionKind
import com.caim.write.engine.model.TextRange
import com.caim.write.engine.model.WritingSuggestion
import java.util.UUID

class SpellingChecker {
    fun analyze(text: String): List<WritingSuggestion> {
        if (text.isBlank()) return emptyList()
        val suggestions = mutableListOf<WritingSuggestion>()
        val regex = Regex("""\b[\w']+\b""")
        for (match in regex.findAll(text)) {
            val token = match.value
            if (token.any { it.isDigit() }) continue
            // Skip all-caps acronyms of length 2-5
            if (token.length in 2..5 && token.all { it.isUpperCase() }) continue

            val correction = CommonMisspellings.correctionFor(token) ?: continue
            if (correction.equals(token, ignoreCase = false)) continue

            suggestions += WritingSuggestion(
                id = UUID.randomUUID().toString(),
                kind = SuggestionKind.SPELLING,
                category = SuggestionCategory.CORRECTNESS,
                range = TextRange(match.range.first, match.range.last + 1),
                original = token,
                replacements = listOf(correction),
                message = "Spelling: “$token” → “$correction”",
                explanation = "This looks like a common misspelling of “$correction”.",
                priority = 90,
            )
        }
        return suggestions
    }
}
