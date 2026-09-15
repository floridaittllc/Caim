package com.caim.write.engine.analysis

import com.caim.write.engine.clarity.ClarityChecker
import com.caim.write.engine.grammar.GrammarChecker
import com.caim.write.engine.model.AnalysisResult
import com.caim.write.engine.model.EngineSettings
import com.caim.write.engine.model.SuggestionCategory
import com.caim.write.engine.model.SuggestionIntensity
import com.caim.write.engine.model.SuggestionKind
import com.caim.write.engine.model.WritingScores
import com.caim.write.engine.model.WritingSuggestion
import com.caim.write.engine.spelling.SpellingChecker
import com.caim.write.engine.tone.ToneDetector
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * Orchestrates spelling, grammar, clarity, and tone into a Grammarly-like analysis.
 */
class WritingAnalyzer(
    private val spelling: SpellingChecker = SpellingChecker(),
    private val grammar: GrammarChecker = GrammarChecker(),
    private val clarity: ClarityChecker = ClarityChecker(),
    private val tone: ToneDetector = ToneDetector(),
    private val engagement: EngagementChecker = EngagementChecker(),
) {
    fun analyze(
        text: String,
        settings: EngineSettings = EngineSettings(),
    ): AnalysisResult {
        if (text.isBlank()) {
            return AnalysisResult(
                text = text,
                suggestions = emptyList(),
                tone = tone.detect(text),
                scores = WritingScores(100, 100, 100, 100),
            )
        }

        val raw = buildList {
            if (SuggestionCategory.CORRECTNESS in settings.enabledCategories) {
                addAll(spelling.analyze(text))
                addAll(grammar.analyze(text))
            }
            if (SuggestionCategory.CLARITY in settings.enabledCategories) {
                addAll(clarity.analyze(text))
            }
            if (SuggestionCategory.ENGAGEMENT in settings.enabledCategories) {
                addAll(engagement.analyze(text))
            }
            if (SuggestionCategory.DELIVERY in settings.enabledCategories) {
                addAll(deliveryHints(text))
            }
        }

        val deduped = dedupeOverlaps(raw)
        val filtered = applyIntensity(deduped, settings.intensity)
        val scores = score(text, filtered)

        return AnalysisResult(
            text = text,
            suggestions = filtered.sortedWith(
                compareByDescending<WritingSuggestion> { it.priority }
                    .thenBy { it.range.start },
            ),
            tone = tone.detect(text),
            scores = scores,
        )
    }

    fun applySuggestion(text: String, suggestion: WritingSuggestion, replacementIndex: Int = 0): String {
        if (suggestion.range.start > text.length || suggestion.range.end > text.length) return text
        val replacement = suggestion.replacements.getOrNull(replacementIndex) ?: return text
        return text.substring(0, suggestion.range.start) +
            replacement +
            text.substring(suggestion.range.end)
    }

    fun applyAll(text: String, suggestions: List<WritingSuggestion>): String {
        var result = text
        // Apply from end to start so ranges stay valid
        val ordered = suggestions
            .filter { it.replacements.isNotEmpty() }
            .sortedByDescending { it.range.start }
        for (suggestion in ordered) {
            if (suggestion.range.end <= result.length && suggestion.range.start >= 0) {
                val slice = result.substring(suggestion.range.start, suggestion.range.end)
                if (slice.equals(suggestion.original, ignoreCase = false) ||
                    slice.equals(suggestion.original, ignoreCase = true)
                ) {
                    result = applySuggestion(result, suggestion)
                }
            }
        }
        // Cleanup double spaces from deletions
        return result.replace(Regex("""[ \t]{2,}"""), " ")
            .replace(Regex("""\s+\n"""), "\n")
            .trim()
    }

    private fun deliveryHints(text: String): List<WritingSuggestion> {
        val out = mutableListOf<WritingSuggestion>()
        // Soften overly blunt openers for delivery polish
        val blunt = Regex("""\b(Do this now|Fix this immediately|You need to)\b""", RegexOption.IGNORE_CASE)
        for (match in blunt.findAll(text)) {
            out += WritingSuggestion(
                id = java.util.UUID.randomUUID().toString(),
                kind = SuggestionKind.TONE,
                category = SuggestionCategory.DELIVERY,
                range = TextRange(match.range.first, match.range.last + 1),
                original = match.value,
                replacements = listOf(
                    when (match.value.lowercase()) {
                        "do this now" -> "Please take care of this soon"
                        "fix this immediately" -> "Please address this as soon as you can"
                        "you need to" -> "Could you"
                        else -> "Please"
                    },
                ),
                message = "Softer delivery",
                explanation = "A slightly softer phrasing can improve how the request lands.",
                priority = 42,
            )
        }
        val slang = Regex("""\b(lol|omg|wtf|idk)\b""", RegexOption.IGNORE_CASE)
        for (match in slang.findAll(text)) {
            out += WritingSuggestion(
                id = java.util.UUID.randomUUID().toString(),
                kind = SuggestionKind.FORMALITY,
                category = SuggestionCategory.DELIVERY,
                range = TextRange(match.range.first, match.range.last + 1),
                original = match.value,
                replacements = listOf(""),
                message = "Remove informal slang for clearer delivery",
                explanation = "Internet slang can undercut professional or neutral tone.",
                priority = 55,
            )
        }
        return out
    }

    private fun dedupeOverlaps(suggestions: List<WritingSuggestion>): List<WritingSuggestion> {
        val sorted = suggestions.sortedWith(
            compareByDescending<WritingSuggestion> { it.priority }
                .thenBy { it.range.start },
        )
        val kept = mutableListOf<WritingSuggestion>()
        for (s in sorted) {
            val overlaps = kept.any { existing ->
                rangesOverlap(existing.range.start, existing.range.end, s.range.start, s.range.end)
            }
            if (!overlaps) kept += s
        }
        return kept
    }

    private fun rangesOverlap(a0: Int, a1: Int, b0: Int, b1: Int): Boolean =
        a0 < b1 && b0 < a1

    private fun applyIntensity(
        suggestions: List<WritingSuggestion>,
        intensity: SuggestionIntensity,
    ): List<WritingSuggestion> {
        return when (intensity) {
            SuggestionIntensity.MINIMAL -> suggestions.filter {
                it.category == SuggestionCategory.CORRECTNESS && it.priority >= 75
            }
            SuggestionIntensity.BALANCED -> suggestions.filter {
                when (it.kind) {
                    SuggestionKind.PASSIVE_VOICE -> false
                    SuggestionKind.CONCISENESS -> it.priority >= 50
                    else -> true
                }
            }
            SuggestionIntensity.COMPREHENSIVE -> suggestions
        }
    }

    private fun score(text: String, suggestions: List<WritingSuggestion>): WritingScores {
        val words = Regex("""\b[\w']+\b""").findAll(text).count().coerceAtLeast(1)
        fun catScore(category: SuggestionCategory): Int {
            val issues = suggestions.count { it.category == category }
            val penalty = (issues.toDouble() / words) * 400.0
            return max(0, (100.0 - penalty).roundToInt())
        }
        return WritingScores(
            correctness = catScore(SuggestionCategory.CORRECTNESS),
            clarity = catScore(SuggestionCategory.CLARITY),
            engagement = catScore(SuggestionCategory.ENGAGEMENT),
            delivery = catScore(SuggestionCategory.DELIVERY).coerceAtLeast(
                // Delivery stays high unless many tone issues
                100 - suggestions.count { it.category == SuggestionCategory.DELIVERY } * 8,
            ).coerceIn(0, 100),
        )
    }
}

class EngagementChecker {
    fun analyze(text: String): List<WritingSuggestion> {
        val out = mutableListOf<WritingSuggestion>()
        // Weak adjectives / vague nouns
        val weak = listOf(
            "good" to listOf("strong", "effective", "clear"),
            "bad" to listOf("weak", "flawed", "harmful"),
            "thing" to listOf("point", "factor", "detail"),
            "stuff" to listOf("details", "materials", "items"),
            "nice" to listOf("thoughtful", "helpful", "welcome"),
            "interesting" to listOf("compelling", "notable", "striking"),
            "a lot of" to listOf("many", "numerous", "substantial"),
        )
        for ((phrase, alts) in weak) {
            val regex = Regex("""\b${Regex.escape(phrase)}\b""", RegexOption.IGNORE_CASE)
            for (match in regex.findAll(text)) {
                out += WritingSuggestion(
                    id = java.util.UUID.randomUUID().toString(),
                    kind = SuggestionKind.WORD_CHOICE,
                    category = SuggestionCategory.ENGAGEMENT,
                    range = com.caim.write.engine.model.TextRange(match.range.first, match.range.last + 1),
                    original = match.value,
                    replacements = alts.map { alt ->
                        if (match.value.first().isUpperCase()) alt.replaceFirstChar { it.uppercase() } else alt
                    },
                    message = "More precise wording",
                    explanation = "“${match.value}” is vague. A sharper word can lift engagement.",
                    priority = 48,
                )
            }
        }
        return out
    }
}
