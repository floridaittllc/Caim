package com.caim.write.engine

import com.caim.write.engine.analysis.WritingAnalyzer
import com.caim.write.engine.model.EngineSettings
import com.caim.write.engine.model.RewriteStyle
import com.caim.write.engine.model.WordAlternative
import com.caim.write.engine.model.WritingGoals
import com.caim.write.engine.rewrite.OfflineRewriteEngine
import com.caim.write.engine.rewrite.RewriteService
import com.caim.write.engine.vocabulary.VocabularyDictionary

/**
 * Public façade for CAIm Write's local-first writing intelligence.
 */
class CaimWriteEngine(
    val analyzer: WritingAnalyzer = WritingAnalyzer(),
    val rewriteService: RewriteService = RewriteService(),
    private val offlineRewrite: OfflineRewriteEngine = OfflineRewriteEngine(),
) {
    fun analyze(text: String, settings: EngineSettings = EngineSettings()) =
        analyzer.analyze(text, settings)

    fun applySuggestion(
        text: String,
        suggestion: com.caim.write.engine.model.WritingSuggestion,
        replacementIndex: Int = 0,
    ) = analyzer.applySuggestion(text, suggestion, replacementIndex)

    fun applyAll(
        text: String,
        suggestions: List<com.caim.write.engine.model.WritingSuggestion>,
    ) = analyzer.applyAll(text, suggestions)

    fun rewriteOffline(
        text: String,
        styles: List<RewriteStyle> = RewriteStyle.entries,
        goals: WritingGoals = WritingGoals(),
    ) = offlineRewrite.rewrite(text, styles, goals)

    suspend fun rewrite(
        text: String,
        styles: List<RewriteStyle> = RewriteStyle.entries,
        goals: WritingGoals = WritingGoals(),
    ) = rewriteService.rewrite(text, styles, goals)

    fun wordAlternatives(word: String): WordAlternative? =
        VocabularyDictionary.alternativesFor(word)
}
