package com.caim.write.engine.rewrite

import com.caim.write.engine.model.DomainStyle
import com.caim.write.engine.model.Formality
import com.caim.write.engine.model.RewriteOption
import com.caim.write.engine.model.RewriteStyle
import com.caim.write.engine.model.WritingGoals

/**
 * Offline premium rewrite engine.
 *
 * Goes beyond synonym swaps: applies clarity transforms, tone lexicons,
 * sentence restructuring templates, and goal-aware adjustments.
 */
class OfflineRewriteEngine {

    fun rewrite(
        text: String,
        styles: List<RewriteStyle> = RewriteStyle.entries,
        goals: WritingGoals = WritingGoals(),
    ): List<RewriteOption> {
        if (text.isBlank()) return emptyList()
        return styles.map { style ->
            val rewritten = transform(text.trim(), style, goals)
            RewriteOption(
                style = style,
                text = rewritten,
                rationale = rationaleFor(style, goals),
            )
        }
    }

    fun rewriteOne(
        text: String,
        style: RewriteStyle,
        goals: WritingGoals = WritingGoals(),
    ): RewriteOption {
        val rewritten = transform(text.trim(), style, goals)
        return RewriteOption(style, rewritten, rationaleFor(style, goals))
    }

    private fun transform(text: String, style: RewriteStyle, goals: WritingGoals): String {
        var result = normalizeWhitespace(text)
        result = applyClarityPasses(result)
        result = when (style) {
            RewriteStyle.PROFESSIONAL -> toProfessional(result, goals)
            RewriteStyle.CASUAL -> toCasual(result, goals)
            RewriteStyle.SHORTEN -> toShorten(result)
            RewriteStyle.EXPAND -> toExpand(result, goals)
            RewriteStyle.FRIENDLY -> toFriendly(result, goals)
            RewriteStyle.CONFIDENT -> toConfident(result, goals)
        }
        result = applyGoalPolish(result, goals, style)
        result = finalizeSentences(result)
        return result
    }

    private fun applyClarityPasses(text: String): String {
        var t = text
        for ((from, to) in CLARITY_REPLACEMENTS) {
            t = Regex("""\b${Regex.escape(from)}\b""", RegexOption.IGNORE_CASE)
                .replace(t) { match ->
                    preserveLeadCase(match.value, to)
                }
        }
        // Collapse doubled spaces created by deletions
        t = t.replace(Regex("""\s{2,}"""), " ")
        t = t.replace(Regex("""\s+([,.!?;:])"""), "$1")
        return t.trim()
    }

    private fun toProfessional(text: String, goals: WritingGoals): String {
        var t = text
        for ((from, to) in PROFESSIONAL_LEXICON) {
            t = replaceWord(t, from, to)
        }
        t = stripInformalMarkers(t)
        t = weakenHedges(t, aggressive = false)
        if (goals.domain == DomainStyle.BUSINESS || goals.formality == Formality.FORMAL) {
            t = ensureCourteousClose(t)
        }
        return t
    }

    private fun toCasual(text: String, goals: WritingGoals): String {
        var t = text
        for ((from, to) in CASUAL_LEXICON) {
            t = replaceWord(t, from, to)
        }
        t = t.replace(Regex("""\bI would like to\b""", RegexOption.IGNORE_CASE), "I'd like to")
        t = t.replace(Regex("""\bDo not\b"""), "Don't")
        t = t.replace(Regex("""\bdo not\b"""), "don't")
        t = t.replace(Regex("""\bcannot\b""", RegexOption.IGNORE_CASE)) {
            preserveLeadCase(it.value, "can't")
        }
        if (goals.formality != Formality.FORMAL && !t.contains("!")) {
            // Keep punctuation natural; don't force exclamation
        }
        return t
    }

    private fun toShorten(text: String): String {
        var t = applyClarityPasses(text)
        for ((from, to) in SHORTEN_EXTRA) {
            t = Regex("""\b${Regex.escape(from)}\b""", RegexOption.IGNORE_CASE)
                .replace(t) { preserveLeadCase(it.value, to) }
        }
        // Drop leading soft openers
        t = t.replace(Regex("""^(Well,|So,|Basically,|Honestly,)\s+""", RegexOption.IGNORE_CASE), "")
        // Prefer shorter sentences: split on ; and drop empty clauses
        val sentences = splitSentences(t)
        val compacted = sentences.map { sentence ->
            sentence
                .replace(Regex("""\b(that|which)\s+(is|are|was|were)\b""", RegexOption.IGNORE_CASE), "")
                .replace(Regex("""\s{2,}"""), " ")
                .trim()
        }.filter { it.isNotBlank() }
        return compacted.joinToString(" ").let { finalizeSentences(it) }
    }

    private fun toExpand(text: String, goals: WritingGoals): String {
        val sentences = splitSentences(applyClarityPasses(text))
        if (sentences.isEmpty()) return text
        val expanded = sentences.mapIndexed { index, sentence ->
            var s = sentence.trim().trimEnd('.', '!', '?')
            when {
                index == 0 && !s.lowercase().startsWith("i ") && goals.domain == DomainStyle.BUSINESS -> {
                    "To clarify, $s. This helps ensure we're aligned on next steps"
                }
                s.split(" ").size < 8 -> {
                    "$s, which provides useful context for the reader"
                }
                else -> {
                    "$s. In short, the key point remains clear"
                }
            }
        }
        return finalizeSentences(expanded.joinToString(". "))
    }

    private fun toFriendly(text: String, goals: WritingGoals): String {
        var t = toCasual(text, goals)
        for ((from, to) in FRIENDLY_LEXICON) {
            t = replaceWord(t, from, to)
        }
        if (!Regex("""\b(thanks|thank you|appreciate)\b""", RegexOption.IGNORE_CASE).containsMatchIn(t)) {
            val sentences = splitSentences(t).toMutableList()
            if (sentences.isNotEmpty()) {
                val last = sentences.last().trimEnd('.', '!', '?')
                sentences[sentences.lastIndex] = "$last. Thanks so much"
                t = sentences.joinToString(" ")
            }
        }
        return finalizeSentences(t)
    }

    private fun toConfident(text: String, goals: WritingGoals): String {
        var t = text
        t = weakenHedges(t, aggressive = true)
        for ((from, to) in CONFIDENT_LEXICON) {
            t = replaceWord(t, from, to)
        }
        t = t.replace(Regex("""\bI think we should\b""", RegexOption.IGNORE_CASE), "We should")
        t = t.replace(Regex("""\bI believe we can\b""", RegexOption.IGNORE_CASE), "We can")
        t = t.replace(Regex("""\bIt might be better to\b""", RegexOption.IGNORE_CASE), "We should")
        t = t.replace(Regex("""\bWe might want to\b""", RegexOption.IGNORE_CASE), "We will")
        t = t.replace(Regex("""\btry to\b""", RegexOption.IGNORE_CASE), "will")
        if (goals.formality == Formality.FORMAL) {
            t = replaceWord(t, "will", "will")
        }
        return finalizeSentences(t)
    }

    private fun applyGoalPolish(text: String, goals: WritingGoals, style: RewriteStyle): String {
        var t = text
        when (goals.formality) {
            Formality.FORMAL -> {
                if (style != RewriteStyle.CASUAL && style != RewriteStyle.FRIENDLY) {
                    t = stripInformalMarkers(t)
                    for ((from, to) in FORMAL_GOAL_LEXICON) {
                        t = replaceWord(t, from, to)
                    }
                }
            }
            Formality.CASUAL -> {
                if (style != RewriteStyle.PROFESSIONAL) {
                    t = t.replace(Regex("""\bI am\b"""), "I'm")
                    t = t.replace(Regex("""\bwe are\b""", RegexOption.IGNORE_CASE)) {
                        preserveLeadCase(it.value, "we're")
                    }
                }
            }
            Formality.NEUTRAL -> Unit
        }
        when (goals.domain) {
            DomainStyle.ACADEMIC -> {
                t = replaceWord(t, "show", "demonstrate")
                t = replaceWord(t, "a lot", "considerably")
                t = replaceWord(t, "get", "obtain")
            }
            DomainStyle.BUSINESS -> {
                t = replaceWord(t, "stuff", "materials")
                t = replaceWord(t, "guys", "team")
                t = replaceWord(t, "asap", "as soon as possible")
            }
            DomainStyle.TECHNICAL -> {
                t = replaceWord(t, "thing", "component")
                t = replaceWord(t, "fix", "resolve")
                t = replaceWord(t, "break", "fail")
            }
            DomainStyle.CREATIVE -> {
                t = replaceWord(t, "said", "noted")
                t = replaceWord(t, "very", "strikingly")
            }
            DomainStyle.GENERAL -> Unit
        }
        return t
    }

    private fun weakenHedges(text: String, aggressive: Boolean): String {
        var t = text
        val patterns = if (aggressive) {
            listOf(
                Regex("""\bI think that\b""", RegexOption.IGNORE_CASE) to "",
                Regex("""\bI think\b""", RegexOption.IGNORE_CASE) to "",
                Regex("""\bI believe that\b""", RegexOption.IGNORE_CASE) to "",
                Regex("""\bI believe\b""", RegexOption.IGNORE_CASE) to "",
                Regex("""\bmaybe\b""", RegexOption.IGNORE_CASE) to "",
                Regex("""\bperhaps\b""", RegexOption.IGNORE_CASE) to "",
                Regex("""\bsort of\b""", RegexOption.IGNORE_CASE) to "",
                Regex("""\bkind of\b""", RegexOption.IGNORE_CASE) to "",
                Regex("""\ba bit\b""", RegexOption.IGNORE_CASE) to "",
                Regex("""\bit seems that\b""", RegexOption.IGNORE_CASE) to "",
                Regex("""\bit appears that\b""", RegexOption.IGNORE_CASE) to "",
            )
        } else {
            listOf(
                Regex("""\bI think that\b""", RegexOption.IGNORE_CASE) to "I think",
                Regex("""\bit seems that\b""", RegexOption.IGNORE_CASE) to "",
                Regex("""\bbasically\b""", RegexOption.IGNORE_CASE) to "",
            )
        }
        for ((regex, replacement) in patterns) {
            t = regex.replace(t, replacement)
        }
        return t.replace(Regex("""\s{2,}"""), " ").trim()
    }

    private fun stripInformalMarkers(text: String): String {
        var t = text
        val informal = listOf("lol", "haha", "btw", "gonna", "wanna", "gotta", "kinda", "yeah")
        for (word in informal) {
            t = Regex("""\b${Regex.escape(word)}\b""", RegexOption.IGNORE_CASE)
                .replace(t) { mr ->
                    when (word) {
                        "gonna" -> preserveLeadCase(mr.value, "going to")
                        "wanna" -> preserveLeadCase(mr.value, "want to")
                        "gotta" -> preserveLeadCase(mr.value, "have to")
                        "kinda" -> preserveLeadCase(mr.value, "somewhat")
                        "yeah" -> preserveLeadCase(mr.value, "yes")
                        "btw" -> preserveLeadCase(mr.value, "by the way")
                        else -> ""
                    }
                }
        }
        return t.replace(Regex("""\s{2,}"""), " ").trim()
    }

    private fun ensureCourteousClose(text: String): String {
        if (Regex("""\b(regards|thank you|thanks|sincerely)\b""", RegexOption.IGNORE_CASE)
                .containsMatchIn(text)
        ) {
            return text
        }
        // Only append for email-like multi-sentence notes
        val sentences = splitSentences(text)
        return if (sentences.size >= 2 && text.length > 80) {
            finalizeSentences("$text Thank you.")
        } else text
    }

    private fun replaceWord(text: String, from: String, to: String): String {
        if (from.contains(" ")) {
            return Regex("""\b${Regex.escape(from)}\b""", RegexOption.IGNORE_CASE)
                .replace(text) { preserveLeadCase(it.value, to) }
        }
        return Regex("""\b${Regex.escape(from)}\b""", RegexOption.IGNORE_CASE)
            .replace(text) { preserveLeadCase(it.value, to) }
    }

    private fun preserveLeadCase(original: String, replacement: String): String {
        if (replacement.isEmpty()) return ""
        if (original.isEmpty()) return replacement
        if (original.all { it.isUpperCase() } && original.length > 1) return replacement.uppercase()
        return if (original.first().isUpperCase()) {
            replacement.replaceFirstChar { it.uppercase() }
        } else {
            replacement
        }
    }

    private fun normalizeWhitespace(text: String): String =
        text.replace(Regex("""[ \t]+"""), " ")
            .replace(Regex("""\n{3,}"""), "\n\n")
            .trim()

    private fun splitSentences(text: String): List<String> {
        if (text.isBlank()) return emptyList()
        return Regex("""(?<=[.!?])\s+""")
            .split(text)
            .map { it.trim() }
            .filter { it.isNotEmpty() }
    }

    private fun finalizeSentences(text: String): String {
        var t = text.replace(Regex("""\s{2,}"""), " ").trim()
        t = t.replace(Regex("""\s+([,.!?;:])"""), "$1")
        t = t.replace(Regex("""([.!?])([A-Za-z])"""), "$1 $2")
        // Capitalize sentence starts
        t = Regex("""(^|[.!?]\s+)([a-z])""").replace(t) { mr ->
            mr.groupValues[1] + mr.groupValues[2].uppercase()
        }
        if (t.isNotEmpty() && t.last() !in ".!?") {
            t += "."
        }
        return t
    }

    private fun rationaleFor(style: RewriteStyle, goals: WritingGoals): String {
        val goalNote = " Goals: ${goals.audience.displayName} · ${goals.formality.displayName} · ${goals.domain.displayName}."
        return style.description + goalNote
    }

    companion object {
        private val CLARITY_REPLACEMENTS = listOf(
            "in order to" to "to",
            "due to the fact that" to "because",
            "at this point in time" to "now",
            "for the purpose of" to "to",
            "in the event that" to "if",
            "a large number of" to "many",
            "has the ability to" to "can",
            "is able to" to "can",
            "make a decision" to "decide",
            "take into consideration" to "consider",
            "it is important to note that" to "",
            "needless to say," to "",
            "needless to say" to "",
            "as a matter of fact," to "",
            "as a matter of fact" to "",
            "in spite of the fact that" to "although",
            "with regard to" to "about",
            "prior to" to "before",
            "subsequent to" to "after",
            "in a timely manner" to "promptly",
            "on a regular basis" to "regularly",
            "on a daily basis" to "daily",
            "is going to" to "will",
            "are going to" to "will",
        )

        private val SHORTEN_EXTRA = listOf(
            "in my opinion" to "",
            "I just wanted to" to "I",
            "I wanted to" to "I",
            "I would like to" to "I",
            "please be advised that" to "",
            "for your information" to "",
            "at the end of the day" to "",
            "the fact that" to "that",
        )

        private val PROFESSIONAL_LEXICON = listOf(
            "hey" to "hello",
            "guys" to "everyone",
            "kids" to "children",
            "awesome" to "excellent",
            "cool" to "effective",
            "stuff" to "materials",
            "fix" to "resolve",
            "get back to you" to "follow up",
            "asap" to "as soon as possible",
            "ok" to "all right",
            "okay" to "all right",
            "help" to "assist",
            "tell" to "inform",
            "need" to "require",
        )

        private val CASUAL_LEXICON = listOf(
            "therefore" to "so",
            "however" to "but",
            "furthermore" to "also",
            "assist" to "help",
            "inquire" to "ask",
            "commence" to "start",
            "terminate" to "end",
            "regarding" to "about",
            "utilize" to "use",
            "obtain" to "get",
        )

        private val FRIENDLY_LEXICON = listOf(
            "require" to "need",
            "inform" to "let you know",
            "request" to "ask",
            "submit" to "send",
            "issue" to "snag",
        )

        private val CONFIDENT_LEXICON = listOf(
            "try" to "will",
            "might" to "will",
            "maybe" to "",
            "hopefully" to "",
            "I hope to" to "I will",
            "we hope to" to "we will",
            "could potentially" to "can",
            "it is possible that" to "",
        )

        private val FORMAL_GOAL_LEXICON = listOf(
            "get" to "obtain",
            "help" to "assist",
            "ask" to "request",
            "tell" to "inform",
            "start" to "begin",
            "end" to "conclude",
            "about" to "regarding",
        )
    }
}
