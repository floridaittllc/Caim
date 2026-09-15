package com.caim.write.engine.model

enum class SuggestionCategory {
    CORRECTNESS,
    CLARITY,
    ENGAGEMENT,
    DELIVERY;

    val displayName: String
        get() = when (this) {
            CORRECTNESS -> "Correctness"
            CLARITY -> "Clarity"
            ENGAGEMENT -> "Engagement"
            DELIVERY -> "Delivery"
        }
}

enum class SuggestionKind {
    SPELLING,
    GRAMMAR,
    PUNCTUATION,
    CONCISENESS,
    CLARITY,
    WORD_CHOICE,
    TONE,
    PASSIVE_VOICE,
    FORMALITY;

    val category: SuggestionCategory
        get() = when (this) {
            SPELLING, GRAMMAR, PUNCTUATION -> SuggestionCategory.CORRECTNESS
            CONCISENESS, CLARITY, PASSIVE_VOICE -> SuggestionCategory.CLARITY
            WORD_CHOICE -> SuggestionCategory.ENGAGEMENT
            TONE, FORMALITY -> SuggestionCategory.DELIVERY
        }
}

enum class RewriteStyle {
    PROFESSIONAL,
    CASUAL,
    SHORTEN,
    EXPAND,
    FRIENDLY,
    CONFIDENT;

    val displayName: String
        get() = when (this) {
            PROFESSIONAL -> "Professional"
            CASUAL -> "Casual"
            SHORTEN -> "Shorten"
            EXPAND -> "Expand"
            FRIENDLY -> "Friendly"
            CONFIDENT -> "Confident"
        }

    val description: String
        get() = when (this) {
            PROFESSIONAL -> "Clear, polished, workplace-ready"
            CASUAL -> "Relaxed and conversational"
            SHORTEN -> "Cut fluff; keep the point"
            EXPAND -> "Add detail and flow"
            FRIENDLY -> "Warm and approachable"
            CONFIDENT -> "Direct and assertive"
        }
}

enum class ToneLabel {
    FORMAL,
    INFORMAL,
    CONFIDENT,
    FRIENDLY,
    OPTIMISTIC,
    CONCERNED,
    DIRECT,
    TENTATIVE,
    NEUTRAL;

    val displayName: String
        get() = when (this) {
            FORMAL -> "Formal"
            INFORMAL -> "Informal"
            CONFIDENT -> "Confident"
            FRIENDLY -> "Friendly"
            OPTIMISTIC -> "Optimistic"
            CONCERNED -> "Concerned"
            DIRECT -> "Direct"
            TENTATIVE -> "Tentative"
            NEUTRAL -> "Neutral"
        }
}

enum class Audience {
    GENERAL,
    KNOWLEDGEABLE,
    EXPERT,
    STUDENT;

    val displayName: String
        get() = when (this) {
            GENERAL -> "General"
            KNOWLEDGEABLE -> "Knowledgeable"
            EXPERT -> "Expert"
            STUDENT -> "Student"
        }
}

enum class Formality {
    CASUAL,
    NEUTRAL,
    FORMAL;

    val displayName: String
        get() = when (this) {
            CASUAL -> "Casual"
            NEUTRAL -> "Neutral"
            FORMAL -> "Formal"
        }
}

enum class DomainStyle {
    GENERAL,
    ACADEMIC,
    BUSINESS,
    TECHNICAL,
    CREATIVE;

    val displayName: String
        get() = when (this) {
            GENERAL -> "General"
            ACADEMIC -> "Academic"
            BUSINESS -> "Business"
            TECHNICAL -> "Technical"
            CREATIVE -> "Creative"
        }
}

enum class SuggestionIntensity {
    MINIMAL,
    BALANCED,
    COMPREHENSIVE;

    val displayName: String
        get() = when (this) {
            MINIMAL -> "Minimal"
            BALANCED -> "Balanced"
            COMPREHENSIVE -> "Comprehensive"
        }
}

data class TextRange(
    val start: Int,
    val end: Int,
) {
    init {
        require(start >= 0 && end >= start) { "Invalid range: $start..$end" }
    }

    val length: Int get() = end - start
}

data class WritingSuggestion(
    val id: String,
    val kind: SuggestionKind,
    val category: SuggestionCategory,
    val range: TextRange,
    val original: String,
    val replacements: List<String>,
    val message: String,
    val explanation: String,
    val priority: Int = 50,
)

data class ToneProfile(
    val primary: ToneLabel,
    val secondary: List<ToneLabel>,
    val scores: Map<ToneLabel, Double>,
)

data class AnalysisResult(
    val text: String,
    val suggestions: List<WritingSuggestion>,
    val tone: ToneProfile,
    val scores: WritingScores,
)

data class WritingScores(
    val correctness: Int,
    val clarity: Int,
    val engagement: Int,
    val delivery: Int,
) {
    val overall: Int
        get() = ((correctness + clarity + engagement + delivery) / 4.0).toInt()
}

data class RewriteOption(
    val style: RewriteStyle,
    val text: String,
    val rationale: String,
)

data class WritingGoals(
    val audience: Audience = Audience.GENERAL,
    val formality: Formality = Formality.NEUTRAL,
    val domain: DomainStyle = DomainStyle.GENERAL,
    val intent: String = "Inform",
)

data class EngineSettings(
    val language: String = "en-US",
    val intensity: SuggestionIntensity = SuggestionIntensity.BALANCED,
    val enabledCategories: Set<SuggestionCategory> = SuggestionCategory.entries.toSet(),
)

data class WordAlternative(
    val word: String,
    val alternatives: List<String>,
    val contextHint: String? = null,
)
