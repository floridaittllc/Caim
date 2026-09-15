package com.caim.write.engine.clarity

import com.caim.write.engine.model.SuggestionCategory
import com.caim.write.engine.model.SuggestionKind
import com.caim.write.engine.model.TextRange
import com.caim.write.engine.model.WritingSuggestion
import java.util.UUID

/**
 * Clarity and conciseness suggestions: filler, wordy phrases, weak hedges, passive voice.
 */
class ClarityChecker {

    fun analyze(text: String): List<WritingSuggestion> {
        if (text.isBlank()) return emptyList()
        val out = mutableListOf<WritingSuggestion>()
        out += wordyPhrases(text)
        out += fillers(text)
        out += hedges(text)
        out += passiveVoice(text)
        out += redundantPairs(text)
        return out.sortedBy { it.range.start }
    }

    private fun wordyPhrases(text: String): List<WritingSuggestion> {
        val phrases = listOf(
            "in order to" to "to",
            "due to the fact that" to "because",
            "in spite of the fact that" to "although",
            "at this point in time" to "now",
            "at the present time" to "now",
            "for the purpose of" to "to",
            "in the event that" to "if",
            "with regard to" to "about",
            "with respect to" to "about",
            "in relation to" to "about",
            "a large number of" to "many",
            "a majority of" to "most",
            "the majority of" to "most",
            "in close proximity to" to "near",
            "has the ability to" to "can",
            "is able to" to "can",
            "make a decision" to "decide",
            "make a recommendation" to "recommend",
            "take into consideration" to "consider",
            "come to a conclusion" to "conclude",
            "it is important to note that" to "",
            "it should be noted that" to "",
            "needless to say" to "",
            "as a matter of fact" to "",
            "for all intents and purposes" to "essentially",
            "in light of the fact that" to "because",
            "on a daily basis" to "daily",
            "on a regular basis" to "regularly",
            "in a timely manner" to "promptly",
            "prior to" to "before",
            "subsequent to" to "after",
            "in the near future" to "soon",
            "at a later date" to "later",
            "the fact that" to "that",
            "in my opinion" to "I think",
            "it is clear that" to "",
            "there is no doubt that" to "",
            "in order for" to "for",
            "with the exception of" to "except",
            "in the absence of" to "without",
            "is required to" to "must",
            "is going to" to "will",
            "are going to" to "will",
            "was able to" to "could",
            "were able to" to "could",
        )
        val out = mutableListOf<WritingSuggestion>()
        for ((phrase, replacement) in phrases) {
            val regex = Regex("""\b${Regex.escape(phrase)}\b""", RegexOption.IGNORE_CASE)
            for (match in regex.findAll(text)) {
                val original = match.value
                val fixed = when {
                    replacement.isEmpty() -> ""
                    original.first().isUpperCase() -> replacement.replaceFirstChar { it.uppercase() }
                    else -> replacement
                }
                out += WritingSuggestion(
                    id = UUID.randomUUID().toString(),
                    kind = SuggestionKind.CONCISENESS,
                    category = SuggestionCategory.CLARITY,
                    range = TextRange(match.range.first, match.range.last + 1),
                    original = original,
                    replacements = listOf(fixed.ifEmpty { "∅ (delete)" }).let {
                        if (fixed.isEmpty()) listOf("") else listOf(fixed)
                    },
                    message = if (fixed.isEmpty()) "Remove unnecessary phrase" else "Tighten wording",
                    explanation = if (fixed.isEmpty()) {
                        "“$original” adds little meaning and can be removed."
                    } else {
                        "Prefer “$fixed” over “$original” for clearer writing."
                    },
                    priority = 70,
                )
            }
        }
        return out
    }

    private fun fillers(text: String): List<WritingSuggestion> {
        val fillerWords = listOf(
            "basically", "literally", "actually", "really", "very", "just",
            "simply", "honestly", "frankly", "clearly", "obviously",
            "totally", "absolutely", "definitely", "certainly",
        )
        val out = mutableListOf<WritingSuggestion>()
        for (filler in fillerWords) {
            val regex = Regex("""\b$filler\b""", RegexOption.IGNORE_CASE)
            for (match in regex.findAll(text)) {
                // Skip "very" before strong adjectives we'll keep as engagement elsewhere
                out += WritingSuggestion(
                    id = UUID.randomUUID().toString(),
                    kind = SuggestionKind.CONCISENESS,
                    category = SuggestionCategory.CLARITY,
                    range = TextRange(match.range.first, match.range.last + 1),
                    original = match.value,
                    replacements = listOf(""),
                    message = "Consider removing filler",
                    explanation = "“${match.value}” often weakens the sentence. Remove it or replace with a stronger word.",
                    priority = 45,
                )
            }
        }
        return out
    }

    private fun hedges(text: String): List<WritingSuggestion> {
        val hedges = listOf(
            "I think that" to "I think",
            "I believe that" to "I believe",
            "it seems that" to "",
            "it appears that" to "",
            "sort of" to "",
            "kind of" to "",
            "a bit" to "",
            "somewhat" to "",
            "more or less" to "",
            "in a way" to "",
        )
        val out = mutableListOf<WritingSuggestion>()
        for ((phrase, replacement) in hedges) {
            val regex = Regex("""\b${Regex.escape(phrase)}\b""", RegexOption.IGNORE_CASE)
            for (match in regex.findAll(text)) {
                out += WritingSuggestion(
                    id = UUID.randomUUID().toString(),
                    kind = SuggestionKind.CLARITY,
                    category = SuggestionCategory.CLARITY,
                    range = TextRange(match.range.first, match.range.last + 1),
                    original = match.value,
                    replacements = listOf(replacement),
                    message = "Reduce hedging for clearer delivery",
                    explanation = "Hedging softens your point. Tighten if you intend to sound direct.",
                    priority = 50,
                )
            }
        }
        return out
    }

    private fun passiveVoice(text: String): List<WritingSuggestion> {
        val out = mutableListOf<WritingSuggestion>()
        val pattern = Regex(
            """\b(am|is|are|was|were|be|been|being)\s+(\w+ed|written|done|made|seen|given|taken|known|shown|found|told|built|sent|used)\b""",
            RegexOption.IGNORE_CASE,
        )
        for (match in pattern.findAll(text)) {
            out += WritingSuggestion(
                id = UUID.randomUUID().toString(),
                kind = SuggestionKind.PASSIVE_VOICE,
                category = SuggestionCategory.CLARITY,
                range = TextRange(match.range.first, match.range.last + 1),
                original = match.value,
                replacements = emptyList(),
                message = "Possible passive voice",
                explanation = "Passive constructions can hide the actor. Prefer an active verb when clarity matters.",
                priority = 40,
            )
        }
        return out
    }

    private fun redundantPairs(text: String): List<WritingSuggestion> {
        val pairs = listOf(
            "each and every" to "every",
            "first and foremost" to "first",
            "null and void" to "void",
            "safe and sound" to "safe",
            "various different" to "various",
            "past history" to "history",
            "future plans" to "plans",
            "end result" to "result",
            "final outcome" to "outcome",
            "basic fundamentals" to "fundamentals",
            "completely eliminate" to "eliminate",
            "advance planning" to "planning",
            "close proximity" to "proximity",
            "true fact" to "fact",
            "unexpected surprise" to "surprise",
        )
        val out = mutableListOf<WritingSuggestion>()
        for ((phrase, replacement) in pairs) {
            val regex = Regex("""\b${Regex.escape(phrase)}\b""", RegexOption.IGNORE_CASE)
            for (match in regex.findAll(text)) {
                val original = match.value
                val fixed = if (original.first().isUpperCase()) {
                    replacement.replaceFirstChar { it.uppercase() }
                } else replacement
                out += WritingSuggestion(
                    id = UUID.randomUUID().toString(),
                    kind = SuggestionKind.CONCISENESS,
                    category = SuggestionCategory.CLARITY,
                    range = TextRange(match.range.first, match.range.last + 1),
                    original = original,
                    replacements = listOf(fixed),
                    message = "Remove redundancy",
                    explanation = "“$original” repeats meaning; “$fixed” is enough.",
                    priority = 65,
                )
            }
        }
        return out
    }
}
