package com.caim.write.engine.grammar

import com.caim.write.engine.model.SuggestionCategory
import com.caim.write.engine.model.SuggestionKind
import com.caim.write.engine.model.TextRange
import com.caim.write.engine.model.WritingSuggestion
import java.util.UUID

/**
 * Pattern-based grammar and punctuation checker for US English.
 */
class GrammarChecker {

    fun analyze(text: String): List<WritingSuggestion> {
        if (text.isBlank()) return emptyList()
        val out = mutableListOf<WritingSuggestion>()
        out += confusables(text)
        out += agreementPatterns(text)
        out += articlePatterns(text)
        out += doubleWord(text)
        out += spacingPunctuation(text)
        out += capitalization(text)
        return out.sortedBy { it.range.start }
    }

    private fun confusables(text: String): List<WritingSuggestion> {
        val rules = listOf(
            Confusable(
                Regex("""\b(its)\s+(a|an|the|my|your|our|their|this|that|important|own)\b""", RegexOption.IGNORE_CASE),
                group = 1,
                fix = "it's",
                message = "Did you mean “it's” (it is)?",
                explanation = "“Its” is possessive. “It's” means “it is” or “it has”.",
            ),
            Confusable(
                Regex("""\b(it's)\s+(own|purpose|way|place|time|color|colour|value|impact)\b""", RegexOption.IGNORE_CASE),
                group = 1,
                fix = "its",
                message = "Did you mean “its” (possessive)?",
                explanation = "Use “its” for possession, not “it's”.",
            ),
            Confusable(
                Regex("""\b(your)\s+(welcome|right|correct|going|gonna|going to)\b""", RegexOption.IGNORE_CASE),
                group = 1,
                fix = "you're",
                message = "Did you mean “you're” (you are)?",
                explanation = "“Your” is possessive. “You're” means “you are”.",
            ),
            Confusable(
                Regex("""\b(you're)\s+(name|email|team|idea|proposal|opinion|attention)\b""", RegexOption.IGNORE_CASE),
                group = 1,
                fix = "your",
                message = "Did you mean “your” (possessive)?",
                explanation = "Use “your” before a noun you possess.",
            ),
            Confusable(
                Regex("""\b(there)\s+(going|gonna|are|is|was|were)\s+(to|a|an|the|too)\b""", RegexOption.IGNORE_CASE),
                group = 1,
                fix = "they're",
                message = "Did you mean “they're”?",
                explanation = "“They're” = they are. “There” indicates place.",
            ),
            Confusable(
                Regex("""\b(their)\s+(is|are|was|were|will)\b""", RegexOption.IGNORE_CASE),
                group = 1,
                fix = "there",
                message = "Did you mean “there”?",
                explanation = "“There is/are” introduces existence; “their” is possessive.",
            ),
            Confusable(
                Regex("""\b(affect)\s+(on|upon)\b""", RegexOption.IGNORE_CASE),
                group = 1,
                fix = "effect",
                message = "Did you mean “effect on”?",
                explanation = "“Effect” is usually the noun; “affect” is usually the verb.",
            ),
            Confusable(
                Regex("""\b(then)\s+(I|we|they|you|he|she)\s+(am|are|is|was|were|will|can|should)\b"""),
                group = 1,
                fix = "than",
                message = "Compare with “than”, not “then”?",
                explanation = "“Than” is for comparisons; “then” is for time/sequence.",
            ),
            Confusable(
                Regex("""\b(loose)\s+(the|my|your|our|their|a|an)\b""", RegexOption.IGNORE_CASE),
                group = 1,
                fix = "lose",
                message = "Did you mean “lose”?",
                explanation = "“Lose” means to misplace or be defeated; “loose” means not tight.",
            ),
            Confusable(
                Regex("""\b(alot)\b""", RegexOption.IGNORE_CASE),
                group = 1,
                fix = "a lot",
                message = "Write “a lot” as two words",
                explanation = "“Alot” is not a standard English word.",
            ),
            Confusable(
                Regex("""\b(aswell)\b""", RegexOption.IGNORE_CASE),
                group = 1,
                fix = "as well",
                message = "Write “as well” as two words",
                explanation = "“As well” should be spaced.",
            ),
            Confusable(
                Regex("""\b(inorder)\s+to\b""", RegexOption.IGNORE_CASE),
                group = 1,
                fix = "in order",
                message = "Write “in order” as two words",
                explanation = "Use “in order to”, not “inorder to”.",
            ),
            Confusable(
                Regex("""\b(would of|could of|should of|must of)\b""", RegexOption.IGNORE_CASE),
                group = 1,
                fixFn = { m -> m.replace(Regex("""\bof\b""", RegexOption.IGNORE_CASE), "have") },
                message = "Use “have”, not “of”",
                explanation = "This is a mishearing of the contraction “'ve” (have).",
            ),
            Confusable(
                Regex("""\b(irregardless)\b""", RegexOption.IGNORE_CASE),
                group = 1,
                fix = "regardless",
                message = "Prefer “regardless”",
                explanation = "“Irregardless” is nonstandard; use “regardless”.",
            ),
            Confusable(
                Regex("""\b(could care less)\b""", RegexOption.IGNORE_CASE),
                group = 1,
                fix = "couldn't care less",
                message = "Did you mean “couldn't care less”?",
                explanation = "The idiomatic phrase is “couldn't care less”.",
            ),
        )

        val suggestions = mutableListOf<WritingSuggestion>()
        for (rule in rules) {
            for (match in rule.pattern.findAll(text)) {
                val g = match.groups[rule.group] ?: continue
                val original = g.value
                val replacement = rule.fixFn?.invoke(original)
                    ?: rule.fix?.let { matchCase(original, it) }
                    ?: continue
                if (replacement.equals(original, ignoreCase = false)) continue
                suggestions += WritingSuggestion(
                    id = UUID.randomUUID().toString(),
                    kind = SuggestionKind.GRAMMAR,
                    category = SuggestionCategory.CORRECTNESS,
                    range = TextRange(g.range.first, g.range.last + 1),
                    original = original,
                    replacements = listOf(replacement),
                    message = rule.message,
                    explanation = rule.explanation,
                    priority = 85,
                )
            }
        }
        return suggestions
    }

    private fun agreementPatterns(text: String): List<WritingSuggestion> {
        val patterns = listOf(
            Triple(
                Regex("""\b(He|She|It)\s+(are|were)\b"""),
                "is" to "was",
                "Subject-verb agreement",
            ),
            Triple(
                Regex("""\b(They|We|You)\s+(is|was)\b"""),
                "are" to "were",
                "Subject-verb agreement",
            ),
            Triple(
                Regex("""\b(I)\s+(are|is)\b"""),
                "am" to "am",
                "Subject-verb agreement",
            ),
        )
        val out = mutableListOf<WritingSuggestion>()
        for ((regex, fixes, msg) in patterns) {
            for (match in regex.findAll(text)) {
                val verb = match.groupValues[2]
                val replacement = when (verb.lowercase()) {
                    "are", "is" -> if (match.groupValues[1] == "I") "am" else fixes.first
                    "were", "was" -> if (match.groupValues[1] == "I") "was" else fixes.second
                    else -> continue
                }
                val verbGroup = match.groups[2]!!
                out += WritingSuggestion(
                    id = UUID.randomUUID().toString(),
                    kind = SuggestionKind.GRAMMAR,
                    category = SuggestionCategory.CORRECTNESS,
                    range = TextRange(verbGroup.range.first, verbGroup.range.last + 1),
                    original = verb,
                    replacements = listOf(replacement),
                    message = msg,
                    explanation = "The verb should agree with the subject “${match.groupValues[1]}”.",
                    priority = 88,
                )
            }
        }

        // this/these + noun number cues
        for (match in Regex("""\b(this)\s+(\w+s)\b""", RegexOption.IGNORE_CASE).findAll(text)) {
            val noun = match.groupValues[2]
            if (noun.lowercase() in NON_PLURAL_S) continue
            val g = match.groups[1]!!
            out += WritingSuggestion(
                id = UUID.randomUUID().toString(),
                kind = SuggestionKind.GRAMMAR,
                category = SuggestionCategory.CORRECTNESS,
                range = TextRange(g.range.first, g.range.last + 1),
                original = g.value,
                replacements = listOf(matchCase(g.value, "these")),
                message = "Use “these” with plural nouns",
                explanation = "“This” pairs with singular nouns; “these” with plurals.",
                priority = 70,
            )
        }
        return out
    }

    private fun articlePatterns(text: String): List<WritingSuggestion> {
        val out = mutableListOf<WritingSuggestion>()
        val anBeforeVowel = Regex("""\b(a)\s+([aeiou]\w*)\b""", RegexOption.IGNORE_CASE)
        for (match in anBeforeVowel.findAll(text)) {
            val word = match.groupValues[2].lowercase()
            if (word in CONSONANT_SOUND_EXCEPTIONS) continue
            val g = match.groups[1]!!
            out += WritingSuggestion(
                id = UUID.randomUUID().toString(),
                kind = SuggestionKind.GRAMMAR,
                category = SuggestionCategory.CORRECTNESS,
                range = TextRange(g.range.first, g.range.last + 1),
                original = g.value,
                replacements = listOf(matchCase(g.value, "an")),
                message = "Use “an” before a vowel sound",
                explanation = "“An” is used before words that begin with a vowel sound.",
                priority = 75,
            )
        }
        val aBeforeConsonant = Regex("""\b(an)\s+([bcdfghjklmnpqrstvwxyz]\w*)\b""", RegexOption.IGNORE_CASE)
        for (match in aBeforeConsonant.findAll(text)) {
            val word = match.groupValues[2].lowercase()
            if (word in VOWEL_SOUND_EXCEPTIONS) continue
            val g = match.groups[1]!!
            out += WritingSuggestion(
                id = UUID.randomUUID().toString(),
                kind = SuggestionKind.GRAMMAR,
                category = SuggestionCategory.CORRECTNESS,
                range = TextRange(g.range.first, g.range.last + 1),
                original = g.value,
                replacements = listOf(matchCase(g.value, "a")),
                message = "Use “a” before a consonant sound",
                explanation = "“A” is used before words that begin with a consonant sound.",
                priority = 75,
            )
        }
        return out
    }

    private fun doubleWord(text: String): List<WritingSuggestion> {
        val out = mutableListOf<WritingSuggestion>()
        val regex = Regex("""\b(\w+)\s+\1\b""", RegexOption.IGNORE_CASE)
        for (match in regex.findAll(text)) {
            val word = match.groupValues[1]
            if (word.lowercase() in ALLOWED_DOUBLES) continue
            out += WritingSuggestion(
                id = UUID.randomUUID().toString(),
                kind = SuggestionKind.GRAMMAR,
                category = SuggestionCategory.CORRECTNESS,
                range = TextRange(match.range.first, match.range.last + 1),
                original = match.value,
                replacements = listOf(word),
                message = "Repeated word",
                explanation = "“$word” appears twice in a row.",
                priority = 80,
            )
        }
        return out
    }

    private fun spacingPunctuation(text: String): List<WritingSuggestion> {
        val out = mutableListOf<WritingSuggestion>()
        for (match in Regex("""\s+([,.!?;:])""").findAll(text)) {
            out += WritingSuggestion(
                id = UUID.randomUUID().toString(),
                kind = SuggestionKind.PUNCTUATION,
                category = SuggestionCategory.CORRECTNESS,
                range = TextRange(match.range.first, match.range.last + 1),
                original = match.value,
                replacements = listOf(match.groupValues[1]),
                message = "Remove space before punctuation",
                explanation = "Punctuation should follow the word with no space.",
                priority = 60,
            )
        }
        for (match in Regex("""([,.!?;:])(\S)""").findAll(text)) {
            val punct = match.groupValues[1]
            val next = match.groupValues[2]
            if (punct == "." && next == ".") continue // ellipsis / decimals handled loosely
            if (punct == "," && next.any { it.isDigit() }) continue
            out += WritingSuggestion(
                id = UUID.randomUUID().toString(),
                kind = SuggestionKind.PUNCTUATION,
                category = SuggestionCategory.CORRECTNESS,
                range = TextRange(match.range.first, match.range.last + 1),
                original = match.value,
                replacements = listOf("$punct $next"),
                message = "Add a space after punctuation",
                explanation = "Add a space after “$punct”.",
                priority = 55,
            )
        }
        return out
    }

    private fun capitalization(text: String): List<WritingSuggestion> {
        val out = mutableListOf<WritingSuggestion>()
        // Sentence start after .!? + space
        val regex = Regex("""(^|[.!?]\s+)([a-z])""")
        for (match in regex.findAll(text)) {
            val letterGroup = match.groups[2]!!
            val letter = letterGroup.value
            out += WritingSuggestion(
                id = UUID.randomUUID().toString(),
                kind = SuggestionKind.GRAMMAR,
                category = SuggestionCategory.CORRECTNESS,
                range = TextRange(letterGroup.range.first, letterGroup.range.last + 1),
                original = letter,
                replacements = listOf(letter.uppercase()),
                message = "Capitalize the start of the sentence",
                explanation = "Sentences should begin with a capital letter.",
                priority = 65,
            )
        }
        return out
    }

    private fun matchCase(original: String, replacement: String): String {
        if (original.isEmpty()) return replacement
        if (original.all { it.isUpperCase() }) return replacement.uppercase()
        if (original.first().isUpperCase()) {
            return replacement.replaceFirstChar { it.uppercase() }
        }
        return replacement.lowercase().let {
            // preserve apostrophe contractions casing softly
            if (replacement.any { ch -> ch.isUpperCase() }) {
                replacement.replaceFirstChar { c ->
                    if (original.first().isUpperCase()) c.uppercaseChar() else c.lowercaseChar()
                }
            } else it.replaceFirstChar { c ->
                if (original.first().isUpperCase()) c.uppercaseChar() else c
            }
        }
    }

    private data class Confusable(
        val pattern: Regex,
        val group: Int,
        val fix: String? = null,
        val fixFn: ((String) -> String)? = null,
        val message: String,
        val explanation: String,
    )

    companion object {
        private val NON_PLURAL_S = setOf(
            "this", "thus", "bus", "news", "physics", "mathematics", "series",
            "species", "means", "analysis", "basis", "crisis", "thesis",
        )
        private val CONSONANT_SOUND_EXCEPTIONS = setOf(
            "university", "unique", "european", "one", "once", "user", "usual",
            "utility", "ukulele", "eulogy", "euphemism", "euro",
        )
        private val VOWEL_SOUND_EXCEPTIONS = setOf(
            "hour", "honest", "honor", "honour", "heir", "herb",
        )
        private val ALLOWED_DOUBLES = setOf("had", "that", "in", "is", "so")
    }
}
