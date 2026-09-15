package com.caim.write.engine.vocabulary

import com.caim.write.engine.model.WordAlternative

/**
 * Curated synonym / alternative dictionary for tap-to-replace vocabulary help.
 */
object VocabularyDictionary {
    private val synonyms: Map<String, List<String>> = mapOf(
        "good" to listOf("strong", "solid", "effective", "excellent", "sound"),
        "bad" to listOf("poor", "weak", "flawed", "harmful", "problematic"),
        "big" to listOf("large", "substantial", "significant", "major", "considerable"),
        "small" to listOf("modest", "minor", "limited", "compact", "slight"),
        "important" to listOf("critical", "essential", "key", "vital", "significant"),
        "show" to listOf("demonstrate", "illustrate", "reveal", "indicate", "display"),
        "help" to listOf("assist", "support", "aid", "enable", "facilitate"),
        "get" to listOf("obtain", "receive", "secure", "earn", "gain"),
        "make" to listOf("create", "produce", "build", "generate", "craft"),
        "use" to listOf("utilize", "apply", "employ", "leverage", "adopt"),
        "need" to listOf("require", "must have", "call for", "demand"),
        "want" to listOf("prefer", "seek", "aim for", "desire"),
        "think" to listOf("believe", "consider", "conclude", "reason"),
        "say" to listOf("state", "note", "explain", "argue", "remark"),
        "start" to listOf("begin", "launch", "initiate", "commence", "open"),
        "end" to listOf("finish", "conclude", "close", "complete", "wrap up"),
        "change" to listOf("adjust", "modify", "revise", "transform", "shift"),
        "problem" to listOf("issue", "challenge", "obstacle", "concern", "setback"),
        "idea" to listOf("concept", "proposal", "approach", "notion", "plan"),
        "thing" to listOf("item", "point", "factor", "element", "aspect"),
        "very" to listOf("highly", "especially", "particularly", "notably"),
        "really" to listOf("truly", "genuinely", "clearly", "notably"),
        "a lot" to listOf("considerably", "substantially", "greatly", "significantly"),
        "happy" to listOf("pleased", "glad", "delighted", "satisfied"),
        "sad" to listOf("disappointed", "unhappy", "downcast", "upset"),
        "fast" to listOf("quick", "rapid", "swift", "prompt"),
        "slow" to listOf("gradual", "measured", "unhurried", "delayed"),
        "hard" to listOf("difficult", "challenging", "demanding", "tough"),
        "easy" to listOf("straightforward", "simple", "clear", "effortless"),
        "nice" to listOf("pleasant", "thoughtful", "enjoyable", "appealing"),
        "great" to listOf("excellent", "outstanding", "remarkable", "impressive"),
        "new" to listOf("recent", "fresh", "novel", "updated"),
        "old" to listOf("previous", "former", "earlier", "established"),
        "look" to listOf("examine", "review", "consider", "inspect"),
        "find" to listOf("discover", "identify", "locate", "uncover"),
        "give" to listOf("provide", "offer", "deliver", "share"),
        "tell" to listOf("inform", "explain", "notify", "share"),
        "ask" to listOf("request", "inquire", "pose", "raise"),
        "try" to listOf("attempt", "endeavor", "pursue", "test"),
        "keep" to listOf("maintain", "retain", "preserve", "continue"),
        "let" to listOf("allow", "enable", "permit", "grant"),
        "seem" to listOf("appear", "look", "come across as"),
        "feel" to listOf("sense", "believe", "perceive", "experience"),
        "improve" to listOf("strengthen", "enhance", "refine", "upgrade"),
        "reduce" to listOf("cut", "lower", "decrease", "trim"),
        "increase" to listOf("raise", "grow", "expand", "boost"),
        "ensure" to listOf("make sure", "confirm", "guarantee", "secure"),
        "provide" to listOf("offer", "supply", "deliver", "share"),
        "consider" to listOf("weigh", "review", "evaluate", "assess"),
        "recommend" to listOf("suggest", "advise", "propose", "endorse"),
        "because" to listOf("since", "as", "given that"),
        "however" to listOf("still", "yet", "even so", "nonetheless"),
        "also" to listOf("plus", "additionally", "as well", "furthermore"),
        "but" to listOf("yet", "still", "however", "though"),
        "about" to listOf("regarding", "concerning", "on", "around"),
    )

    fun alternativesFor(word: String): WordAlternative? {
        val key = word.lowercase().trim()
        val list = synonyms[key] ?: return null
        val cased = list.map { matchCase(word, it) }
        return WordAlternative(
            word = word,
            alternatives = cased,
            contextHint = "Stronger or more precise alternatives",
        )
    }

    fun hasEntry(word: String): Boolean = synonyms.containsKey(word.lowercase().trim())

    private fun matchCase(original: String, replacement: String): String {
        if (original.isEmpty()) return replacement
        if (original.all { it.isUpperCase() }) return replacement.uppercase()
        if (original.first().isUpperCase()) {
            return replacement.replaceFirstChar { it.uppercase() }
        }
        return replacement
    }
}
