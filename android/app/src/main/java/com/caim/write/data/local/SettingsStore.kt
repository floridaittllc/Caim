package com.caim.write.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.caim.write.engine.model.Audience
import com.caim.write.engine.model.DomainStyle
import com.caim.write.engine.model.Formality
import com.caim.write.engine.model.SuggestionCategory
import com.caim.write.engine.model.SuggestionIntensity
import com.caim.write.engine.model.WritingGoals
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "caim_write_prefs")

class SettingsStore(private val context: Context) {

    private object Keys {
        val ONBOARDED = booleanPreferencesKey("onboarded")
        val LANGUAGE = stringPreferencesKey("language")
        val INTENSITY = stringPreferencesKey("intensity")
        val CATEGORIES = stringSetPreferencesKey("categories")
        val AUDIENCE = stringPreferencesKey("audience")
        val FORMALITY = stringPreferencesKey("formality")
        val DOMAIN = stringPreferencesKey("domain")
        val INTENT = stringPreferencesKey("intent")
        val DARK_MODE = stringPreferencesKey("dark_mode") // system|light|dark
    }

    val onboarded: Flow<Boolean> = context.dataStore.data.map { it[Keys.ONBOARDED] ?: false }

    val language: Flow<String> = context.dataStore.data.map { it[Keys.LANGUAGE] ?: "en-US" }

    val intensity: Flow<SuggestionIntensity> = context.dataStore.data.map {
        runCatching { SuggestionIntensity.valueOf(it[Keys.INTENSITY] ?: SuggestionIntensity.BALANCED.name) }
            .getOrDefault(SuggestionIntensity.BALANCED)
    }

    val enabledCategories: Flow<Set<SuggestionCategory>> = context.dataStore.data.map { prefs ->
        val stored = prefs[Keys.CATEGORIES]
        if (stored.isNullOrEmpty()) {
            SuggestionCategory.entries.toSet()
        } else {
            stored.mapNotNull { name ->
                runCatching { SuggestionCategory.valueOf(name) }.getOrNull()
            }.toSet().ifEmpty { SuggestionCategory.entries.toSet() }
        }
    }

    val goals: Flow<WritingGoals> = context.dataStore.data.map { prefs ->
        WritingGoals(
            audience = runCatching {
                Audience.valueOf(prefs[Keys.AUDIENCE] ?: Audience.GENERAL.name)
            }.getOrDefault(Audience.GENERAL),
            formality = runCatching {
                Formality.valueOf(prefs[Keys.FORMALITY] ?: Formality.NEUTRAL.name)
            }.getOrDefault(Formality.NEUTRAL),
            domain = runCatching {
                DomainStyle.valueOf(prefs[Keys.DOMAIN] ?: DomainStyle.GENERAL.name)
            }.getOrDefault(DomainStyle.GENERAL),
            intent = prefs[Keys.INTENT] ?: "Inform",
        )
    }

    val darkMode: Flow<String> = context.dataStore.data.map { it[Keys.DARK_MODE] ?: "system" }

    suspend fun setOnboarded(value: Boolean) {
        context.dataStore.edit { it[Keys.ONBOARDED] = value }
    }

    suspend fun setLanguage(value: String) {
        context.dataStore.edit { it[Keys.LANGUAGE] = value }
    }

    suspend fun setIntensity(value: SuggestionIntensity) {
        context.dataStore.edit { it[Keys.INTENSITY] = value.name }
    }

    suspend fun setCategories(categories: Set<SuggestionCategory>) {
        context.dataStore.edit { it[Keys.CATEGORIES] = categories.map { c -> c.name }.toSet() }
    }

    suspend fun setGoals(goals: WritingGoals) {
        context.dataStore.edit {
            it[Keys.AUDIENCE] = goals.audience.name
            it[Keys.FORMALITY] = goals.formality.name
            it[Keys.DOMAIN] = goals.domain.name
            it[Keys.INTENT] = goals.intent
        }
    }

    suspend fun setDarkMode(mode: String) {
        context.dataStore.edit { it[Keys.DARK_MODE] = mode }
    }
}
