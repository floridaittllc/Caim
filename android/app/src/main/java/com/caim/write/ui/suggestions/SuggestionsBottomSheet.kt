package com.caim.write.ui.suggestions

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier.modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.caim.write.engine.model.WritingSuggestion
import com.caim.write.ui.editor.SuggestionRow

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SuggestionsBottomSheet(
    suggestions: List<WritingSuggestion>,
    selectedId: String?,
    onDismissRequest: () -> Unit,
    onAccept: (WritingSuggestion) -> Unit,
    onDismissSuggestion: (String) -> Unit,
    onAcceptAll: () -> Unit,
    onDismissAll: () -> Unit,
    onSelect: (String) -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        sheetState = sheetState,
    ) {
        Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
            Text("Suggestions", style = MaterialTheme.typography.headlineMedium)
            Text(
                "${suggestions.size} open · tap Fix to apply · Dismiss to ignore",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = onAcceptAll,
                    enabled = suggestions.any { it.replacements.isNotEmpty() },
                ) { Text("Accept all") }
                OutlinedButton(onClick = onDismissAll, enabled = suggestions.isNotEmpty()) {
                    Text("Dismiss all")
                }
            }
            Spacer(Modifier.height(12.dp))
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(420.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(suggestions, key = { it.id }) { suggestion ->
                    val selected = suggestion.id == selectedId
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(
                                if (selected) MaterialTheme.colorScheme.primaryContainer
                                else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                            )
                            .padding(8.dp),
                    ) {
                        SuggestionRow(
                            suggestion = suggestion,
                            onAccept = { onAccept(suggestion) },
                            onClick = { onSelect(suggestion.id) },
                        )
                        if (selected) {
                            Text(
                                suggestion.explanation,
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.padding(horizontal = 8.dp),
                            )
                            if (suggestion.replacements.size > 1) {
                                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    suggestion.replacements.forEachIndexed { index, replacement ->
                                        TextButton(onClick = { onAccept(suggestion.copy(replacements = listOf(replacement))) }) {
                                            Text(if (replacement.isEmpty()) "Delete" else replacement)
                                        }
                                        // Use index to keep when exhaustive unused warning away
                                        @Suppress("UNUSED_EXPRESSION")
                                        index
                                    }
                                }
                            }
                            TextButton(onClick = { onDismissSuggestion(suggestion.id) }) {
                                Text("Dismiss")
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}
