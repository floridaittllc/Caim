package com.caim.write.engine.rewrite

import com.caim.write.engine.model.RewriteOption
import com.caim.write.engine.model.RewriteStyle
import com.caim.write.engine.model.WritingGoals
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put

/**
 * Optional OpenAI-backed rewriter. Falls back to [OfflineRewriteEngine] when
 * no API key is present or the request fails.
 */
class RewriteService(
    private val offline: OfflineRewriteEngine = OfflineRewriteEngine(),
    private val apiKeyProvider: () -> String? = { System.getenv("OPENAI_API_KEY") },
    private val model: String = "gpt-4o-mini",
) {
    suspend fun rewrite(
        text: String,
        styles: List<RewriteStyle> = RewriteStyle.entries,
        goals: WritingGoals = WritingGoals(),
    ): List<RewriteOption> = withContext(Dispatchers.IO) {
        val key = apiKeyProvider()?.trim().orEmpty()
        if (key.isEmpty()) {
            return@withContext offline.rewrite(text, styles, goals)
        }
        try {
            val apiResults = callOpenAi(key, text, styles, goals)
            if (apiResults.size == styles.size) apiResults else offline.rewrite(text, styles, goals)
        } catch (_: Exception) {
            offline.rewrite(text, styles, goals)
        }
    }

    fun rewriteOffline(
        text: String,
        styles: List<RewriteStyle> = RewriteStyle.entries,
        goals: WritingGoals = WritingGoals(),
    ): List<RewriteOption> = offline.rewrite(text, styles, goals)

    private fun callOpenAi(
        apiKey: String,
        text: String,
        styles: List<RewriteStyle>,
        goals: WritingGoals,
    ): List<RewriteOption> {
        val styleList = styles.joinToString(", ") { it.name }
        val system = """
            You are CAIm Write, a premium writing assistant. Rewrite the user's text
            into each requested style. Return ONLY valid JSON:
            {"rewrites":[{"style":"PROFESSIONAL","text":"...","rationale":"..."}, ...]}
            Styles: $styleList
            Goals — audience: ${goals.audience}, formality: ${goals.formality}, domain: ${goals.domain}, intent: ${goals.intent}.
            Keep meaning. Improve clarity, rhythm, and word choice. No markdown.
        """.trimIndent()

        val body = buildJsonObject {
            put("model", model)
            put("temperature", 0.4)
            put(
                "messages",
                JsonArray(
                    listOf(
                        buildJsonObject {
                            put("role", "system")
                            put("content", system)
                        },
                        buildJsonObject {
                            put("role", "user")
                            put("content", text)
                        },
                    ),
                ),
            )
            put(
                "response_format",
                buildJsonObject { put("type", "json_object") },
            )
        }

        val conn = (URL("https://api.openai.com/v1/chat/completions").openConnection() as HttpURLConnection)
        conn.requestMethod = "POST"
        conn.setRequestProperty("Authorization", "Bearer $apiKey")
        conn.setRequestProperty("Content-Type", "application/json")
        conn.doOutput = true
        conn.connectTimeout = 12_000
        conn.readTimeout = 30_000
        conn.outputStream.use { os ->
            os.write(Json.encodeToString(JsonObject.serializer(), body).toByteArray(Charsets.UTF_8))
        }
        val code = conn.responseCode
        val raw = (if (code in 200..299) conn.inputStream else conn.errorStream)
            .bufferedReader()
            .readText()
        if (code !in 200..299) error("OpenAI HTTP $code: $raw")

        val root = Json.parseToJsonElement(raw).jsonObject
        val content = root["choices"]!!
            .jsonArray.first()
            .jsonObject["message"]!!
            .jsonObject["content"]!!
            .jsonPrimitive.content

        val parsed = Json.parseToJsonElement(content).jsonObject
        val rewrites = parsed["rewrites"]!!.jsonArray
        return rewrites.mapNotNull { el ->
            val obj = el.jsonObject
            val styleName = obj["style"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
            val style = runCatching { RewriteStyle.valueOf(styleName) }.getOrNull() ?: return@mapNotNull null
            val rewritten = obj["text"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
            val rationale = obj["rationale"]?.jsonPrimitive?.contentOrNull ?: style.description
            RewriteOption(style, rewritten, rationale)
        }.sortedBy { styles.indexOf(it.style) }
    }
}
