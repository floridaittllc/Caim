package com.caim.write.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier.modifier
import androidx.compose.ui.unit.dp
import com.caim.write.data.local.SettingsStore
import com.caim.write.engine.model.SuggestionCategory
import com.caim.write.engine.model.SuggestionIntensity
import com.caim.write.ui.components.SectionLabel
import com.caim.write.ui.theme.AtmosphereBrushDark
import com.caim.write.ui.theme.AtmosphereBrushLight
import kotlinx.coroutines.launch

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SettingsScreen(
    settingsStore: SettingsStore,
    onBack: () -> Unit,
) {
    val language by settingsStore.language.collectAsState(initial = "en-US")
    val intensity by settingsStore.intensity.collectAsState(initial = SuggestionIntensity.BALANCED)
    val categories by settingsStore.enabledCategories.collectAsState(initial = SuggestionCategory.entries.toSet())
    val darkMode by settingsStore.darkMode.collectAsState(initial = "system")
    val scope = rememberCoroutineScope()
    val dark = isSystemInDarkTheme()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(if (dark) AtmosphereBrushDark else AtmosphereBrushLight)
            .statusBarsPadding()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
    ) {
        IconButton(onClick = onBack) {
            Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back")
        }
        Text("Settings", style = MaterialTheme.typography.displayMedium)
        Text(
            "Tune suggestion intensity and categories. Analysis stays local-first.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Spacer(Modifier.height(20.dp))
        SectionLabel("Language")
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("en-US").forEach { code ->
                FilterChip(
                    selected = language == code,
                    onClick = { scope.launch { settingsStore.setLanguage(code) } },
                    label = { Text(code) },
                )
            }
        }

        Spacer(Modifier.height(16.dp))
        SectionLabel("Suggestion intensity")
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SuggestionIntensity.entries.forEach { value ->
                FilterChip(
                    selected = intensity == value,
                    onClick = { scope.launch { settingsStore.setIntensity(value) } },
                    label = { Text(value.displayName) },
                )
            }
        }

        Spacer(Modifier.height(16.dp))
        SectionLabel("Categories")
        SuggestionCategory.entries.forEach { category ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(category.displayName, modifier = Modifier.weight(1f))
                Switch(
                    checked = category in categories,
                    onCheckedChange = { checked ->
                        scope.launch {
                            val next = categories.toMutableSet()
                            if (checked) next += category else next -= category
                            settingsStore.setCategories(next)
                        }
                    },
                )
            }
        }

        Spacer(Modifier.height(16.dp))
        SectionLabel("Appearance")
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("system" to "System", "light" to "Light", "dark" to "Dark").forEach { (key, label) ->
                FilterChip(
                    selected = darkMode == key,
                    onClick = { scope.launch { settingsStore.setDarkMode(key) } },
                    label = { Text(label) },
                )
            }
        }

        Spacer(Modifier.height(24.dp))
        Text("About CAIm Write", style = MaterialTheme.typography.titleMedium)
        Text(
            "A Grammarly-class writing assistant under the CAIm brand. Spelling, grammar, clarity, tone, vocabulary, goals, and multi-style rewrites run offline. Set OPENAI_API_KEY (env or gradle property) for optional LLM rewrites with automatic offline fallback.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
