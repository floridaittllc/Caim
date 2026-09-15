package com.caim.write.engine.tone

import com.caim.write.engine.model.ToneLabel
import com.caim.write.engine.model.ToneProfile
import kotlin.math.max

/**
 * Lexicon-based tone detection producing Grammarly-like tone chips.
 */
class ToneDetector {

    fun detect(text: String): ToneProfile {
        if (text.isBlank()) {
            return ToneProfile(
                primary = ToneLabel.NEUTRAL,
                secondary = emptyList(),
                scores = ToneLabel.entries.associateWith { if (it == ToneLabel.NEUTRAL) 1.0 else 0.0 },
            )
        }

        val tokens = tokenize(text)
        val scores = mutableMapOf<ToneLabel, Double>().withDefault { 0.0 }

        fun bump(label: ToneLabel, amount: Double = 1.0) {
            scores[label] = scores.getValue(label) + amount
        }

        for (token in tokens) {
            when {
                token in FORMAL -> bump(ToneLabel.FORMAL)
                token in INFORMAL -> bump(ToneLabel.INFORMAL, 1.2)
                token in CONFIDENT -> bump(ToneLabel.CONFIDENT)
                token in FRIENDLY -> bump(ToneLabel.FRIENDLY)
                token in OPTIMISTIC -> bump(ToneLabel.OPTIMISTIC)
                token in CONCERNED -> bump(ToneLabel.CONCERNED)
                token in DIRECT -> bump(ToneLabel.DIRECT)
                token in TENTATIVE -> bump(ToneLabel.TENTATIVE, 1.1)
            }
        }

        // Structural cues
        val lower = text.lowercase()
        if (Regex("""\b(please|kindly|would you|could you)\b""").containsMatchIn(lower)) {
            bump(ToneLabel.FRIENDLY, 1.5)
            bump(ToneLabel.FORMAL, 0.5)
        }
        if (Regex("""\b(must|need to|require|immediately|asap)\b""").containsMatchIn(lower)) {
            bump(ToneLabel.DIRECT, 1.5)
            bump(ToneLabel.CONFIDENT, 0.8)
        }
        if (Regex("""\b(maybe|perhaps|might|possibly|i guess|not sure)\b""").containsMatchIn(lower)) {
            bump(ToneLabel.TENTATIVE, 1.5)
        }
        if (Regex("""[!]+""").containsMatchIn(text)) {
            bump(ToneLabel.FRIENDLY, 0.8)
            bump(ToneLabel.INFORMAL, 0.6)
        }
        if (Regex("""\b(dear|regards|sincerely|respectfully)\b""").containsMatchIn(lower)) {
            bump(ToneLabel.FORMAL, 2.0)
        }
        if (Regex("""\b(hey|hi there|lol|haha|gonna|wanna|kinda)\b""").containsMatchIn(lower)) {
            bump(ToneLabel.INFORMAL, 2.0)
            bump(ToneLabel.FRIENDLY, 1.0)
        }
        if (Regex("""\b(excited|thrilled|looking forward|great news|delighted)\b""").containsMatchIn(lower)) {
            bump(ToneLabel.OPTIMISTIC, 2.0)
        }
        if (Regex("""\b(unfortunately|concerned|worried|issue|problem|risk)\b""").containsMatchIn(lower)) {
            bump(ToneLabel.CONCERNED, 1.8)
        }

        val total = scores.values.sum().coerceAtLeast(0.01)
        val normalized = ToneLabel.entries.associateWith { label ->
            (scores.getValue(label) / total).coerceIn(0.0, 1.0)
        }

        val ranked = normalized.entries
            .filter { it.value > 0.08 }
            .sortedByDescending { it.value }

        val primary = ranked.firstOrNull()?.key ?: ToneLabel.NEUTRAL
        val secondary = ranked.drop(1).take(2).map { it.key }

        val withNeutral = if (ranked.isEmpty() || (ranked.first().value < 0.15 && tokens.size < 8)) {
            normalized.toMutableMap().also {
                it[ToneLabel.NEUTRAL] = max(it.getValue(ToneLabel.NEUTRAL), 0.55)
            }
        } else normalized

        val finalPrimary = if (withNeutral.getValue(ToneLabel.NEUTRAL) >= 0.5 &&
            ranked.firstOrNull()?.value ?: 0.0 < 0.2
        ) {
            ToneLabel.NEUTRAL
        } else primary

        return ToneProfile(
            primary = finalPrimary,
            secondary = secondary.filter { it != finalPrimary },
            scores = withNeutral,
        )
    }

    private fun tokenize(text: String): List<String> =
        Regex("""\b[\w']+\b""")
            .findAll(text.lowercase())
            .map { it.value }
            .toList()

    companion object {
        private val FORMAL = setOf(
            "furthermore", "therefore", "consequently", "regarding", "pursuant",
            "hereby", "thus", "hence", "accordingly", "nevertheless", "moreover",
            "assistance", "inquire", "commence", "terminate", "indicate",
        )
        private val INFORMAL = setOf(
            "gonna", "wanna", "gotta", "kinda", "yeah", "yep", "nope", "ok", "okay",
            "cool", "awesome", "btw", "lol", "hey", "folks",
        )
        private val CONFIDENT = setOf(
            "will", "definitely", "certainly", "clearly", "proven", "ensure",
            "guarantee", "confident", "strong", "decisive", "committed",
        )
        private val FRIENDLY = setOf(
            "thanks", "thank", "appreciate", "glad", "happy", "welcome",
            "please", "cheers", "warm", "kindly", "helpful",
        )
        private val OPTIMISTIC = setOf(
            "excited", "opportunity", "improve", "progress", "success", "growth",
            "bright", "promising", "optimistic", "thrilled", "delighted",
        )
        private val CONCERNED = setOf(
            "unfortunately", "regret", "issue", "problem", "risk", "delay",
            "concern", "worried", "critical", "urgent", "failure",
        )
        private val DIRECT = setOf(
            "must", "need", "require", "now", "immediately", "do", "stop",
            "start", "send", "confirm", "decide",
        )
        private val TENTATIVE = setOf(
            "maybe", "perhaps", "might", "could", "possibly", "seem", "seems",
            "apparently", "roughly", "approximately", "guess",
        )
    }
}
