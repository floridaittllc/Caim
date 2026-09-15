package com.caim.write.ui.goals

import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier.modifier
import androidx.compose.ui.unit.dp
import com.caim.write.data.local.SettingsStore
import com.caim.write.engine.model.Audience
import com.caim.write.engine.model.DomainStyle
import com.caim.write.engine.model.Formality
import com.caim.write.engine.model.WritingGoals
import com.caim.write.ui.components.SectionLabel
import com.caim.write.ui.theme.AtmosphereBrushDark
import com.caim.write.ui.theme.AtmosphereBrushLight

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun GoalsScreen(
    settingsStore: SettingsStore,
    onBack: () -> Unit,
    onSaved: (WritingGoals) -> Unit,
) {
    val current by settingsStore.goals.collectAsState(initial = WritingGoals())
    var audience by remember(current) { mutableStateOf(current.audience) }
    var formality by remember(current) { mutableStateOf(current.formality) }
    var domain by remember(current) { mutableStateOf(current.domain) }
    var intent by remember(current) { mutableStateOf(current.intent) }
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
        Text("Goals", style = MaterialTheme.typography.displayMedium)
        Text(
            "Audience, formality, and domain steer rewrites and delivery — like Grammarly Goals, tuned for CAIm.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(20.dp))

        SectionLabel("Audience")
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Audience.entries.forEach { value ->
                FilterChip(
                    selected = audience == value,
                    onClick = { audience = value },
                    label = { Text(value.displayName) },
                )
            }
        }

        Spacer(Modifier.height(16.dp))
        SectionLabel("Formality")
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Formality.entries.forEach { value ->
                FilterChip(
                    selected = formality == value,
                    onClick = { formality = value },
                    label = { Text(value.displayName) },
                )
            }
        }

        Spacer(Modifier.height(16.dp))
        SectionLabel("Domain")
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            DomainStyle.entries.forEach { value ->
                FilterChip(
                    selected = domain == value,
                    onClick = { domain = value },
                    label = { Text(value.displayName) },
                )
            }
        }

        Spacer(Modifier.height(16.dp))
        SectionLabel("Intent")
        OutlinedTextField(
            value = intent,
            onValueChange = { intent = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Inform, persuade, apologize…") },
        )

        Spacer(Modifier.height(24.dp))
        Button(
            onClick = {
                onSaved(WritingGoals(audience, formality, domain, intent.ifBlank { "Inform" }))
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Save goals")
        }
    }
}
