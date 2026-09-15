package com.caim.write.engine

import com.caim.write.engine.model.Formality
import com.caim.write.engine.model.RewriteStyle
import com.caim.write.engine.model.SuggestionCategory
import com.caim.write.engine.model.SuggestionIntensity
import com.caim.write.engine.model.SuggestionKind
import com.caim.write.engine.model.WritingGoals
import com.caim.write.engine.model.EngineSettings
import com.caim.write.engine.rewrite.OfflineRewriteEngine
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class SpellingAndGrammarTest {
    private val engine = CaimWriteEngine()

    @Test
    fun `detects common misspellings`() {
        val result = engine.analyze("I will recieve the package tommorow.")
        val originals = result.suggestions.map { it.original.lowercase() }
        assertTrue(originals.contains("recieve"))
        assertTrue(originals.contains("tommorow"))
        assertTrue(result.suggestions.any { it.kind == SuggestionKind.SPELLING })
    }

    @Test
    fun `fixes its vs it's confusable`() {
        val result = engine.analyze("Its a great day for writing.")
        val hit = result.suggestions.first { it.original.equals("Its", ignoreCase = true) }
        assertEquals("It's", hit.replacements.first())
    }

    @Test
    fun `flags subject verb disagreement`() {
        val result = engine.analyze("They is ready to ship.")
        assertTrue(result.suggestions.any { it.message.contains("agreement", ignoreCase = true) })
    }

    @Test
    fun `applies spelling fix`() {
        val text = "This is definately wrong."
        val result = engine.analyze(text)
        val suggestion = result.suggestions.first { it.original.equals("definately", ignoreCase = true) }
        val fixed = engine.applySuggestion(text, suggestion)
        assertTrue(fixed.contains("definitely", ignoreCase = true))
        assertFalse(fixed.contains("definately", ignoreCase = true))
    }
}

class ClarityTest {
    private val engine = CaimWriteEngine()

    @Test
    fun `suggests concise alternative for wordy phrase`() {
        val result = engine.analyze(
            "We will call you in order to confirm the details due to the fact that schedules changed.",
            EngineSettings(intensity = SuggestionIntensity.COMPREHENSIVE),
        )
        assertTrue(result.suggestions.any { it.category == SuggestionCategory.CLARITY })
        assertTrue(
            result.suggestions.any {
                it.original.contains("in order to", ignoreCase = true) ||
                    it.original.contains("due to the fact that", ignoreCase = true)
            },
        )
    }

    @Test
    fun `applyAll removes multiple clarity issues`() {
        val text = "In order to proceed, we will make a decision at this point in time."
        val result = engine.analyze(text, EngineSettings(intensity = SuggestionIntensity.COMPREHENSIVE))
        val clarity = result.suggestions.filter {
            it.category == SuggestionCategory.CLARITY && it.replacements.isNotEmpty()
        }
        val cleaned = engine.applyAll(text, clarity)
        assertFalse(cleaned.contains("in order to", ignoreCase = true))
        assertFalse(cleaned.contains("at this point in time", ignoreCase = true))
    }
}

class ToneTest {
    private val engine = CaimWriteEngine()

    @Test
    fun `detects friendly tone`() {
        val tone = engine.analyze("Hey! Thanks so much — I'm so glad to help you with this.").tone
        assertTrue(
            tone.primary.name.contains("FRIENDLY") ||
                tone.secondary.any { it.name.contains("FRIENDLY") } ||
                tone.scores.filterValues { it > 0.1 }.keys.any {
                    it.name == "FRIENDLY" || it.name == "INFORMAL" || it.name == "OPTIMISTIC"
                },
        )
    }

    @Test
    fun `detects formal tone`() {
        val tone = engine.analyze(
            "Furthermore, we hereby request your assistance regarding the aforementioned matter. Sincerely.",
        ).tone
        assertTrue(
            tone.primary.name == "FORMAL" ||
                tone.scores.getValue(com.caim.write.engine.model.ToneLabel.FORMAL) > 0.15,
        )
    }
}

class RewriteEngineTest {
    private val rewriter = OfflineRewriteEngine()

    @Test
    fun `shorten removes wordy phrases`() {
        val input = "In order to improve clarity, we need to make a decision at this point in time."
        val out = rewriter.rewriteOne(input, RewriteStyle.SHORTEN).text
        assertFalse(out.contains("in order to", ignoreCase = true))
        assertFalse(out.contains("at this point in time", ignoreCase = true))
        assertTrue(out.length < input.length)
    }

    @Test
    fun `professional strips informal markers`() {
        val input = "Hey guys, gonna fix this asap lol."
        val out = rewriter.rewriteOne(input, RewriteStyle.PROFESSIONAL).text.lowercase()
        assertFalse(out.contains("gonna"))
        assertFalse(out.contains("lol"))
        assertFalse(out.contains("hey guys"))
    }

    @Test
    fun `confident removes hedges`() {
        val input = "I think we should maybe try to ship the feature."
        val out = rewriter.rewriteOne(input, RewriteStyle.CONFIDENT).text.lowercase()
        assertFalse(out.contains("i think"))
        assertFalse(out.contains("maybe"))
    }

    @Test
    fun `friendly adds warmth`() {
        val input = "Please send the report by Friday."
        val out = rewriter.rewriteOne(input, RewriteStyle.FRIENDLY).text.lowercase()
        assertTrue(out.contains("thank") || out.contains("appreciate") || out.length >= input.length)
    }

    @Test
    fun `goals formality affects professional rewrite`() {
        val input = "Can you help me get the files about the launch?"
        val formal = rewriter.rewriteOne(
            input,
            RewriteStyle.PROFESSIONAL,
            WritingGoals(formality = Formality.FORMAL),
        ).text.lowercase()
        assertTrue(
            formal.contains("assist") || formal.contains("obtain") || formal.contains("regarding"),
        )
    }

    @Test
    fun `all six styles return non-blank distinct outputs`() {
        val input = "We need to basically fix the thing in order to help users."
        val options = rewriter.rewrite(input)
        assertEquals(6, options.size)
        assertTrue(options.all { it.text.isNotBlank() })
        // At least some stylistic divergence expected
        assertTrue(options.map { it.text }.toSet().size >= 3)
    }
}

class VocabularyTest {
    private val engine = CaimWriteEngine()

    @Test
    fun `returns alternatives for common words`() {
        val alts = engine.wordAlternatives("important")
        assertTrue(alts != null && alts.alternatives.isNotEmpty())
        assertTrue(alts!!.alternatives.any { it.equals("essential", ignoreCase = true) })
    }
}

class ScoringTest {
    private val engine = CaimWriteEngine()

    @Test
    fun `clean text scores high`() {
        val scores = engine.analyze("The team delivered the project on schedule.").scores
        assertTrue(scores.overall >= 85)
    }

    @Test
    fun `messy text scores lower on correctness`() {
        val clean = engine.analyze("The report is ready.").scores.correctness
        val messy = engine.analyze("Teh report is definately not ready tommorow.").scores.correctness
        assertTrue(messy < clean)
    }
}
