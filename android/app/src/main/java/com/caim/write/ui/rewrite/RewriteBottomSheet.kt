package com.caim.write.ui.rewrite

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier.modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.caim.write.engine.model.RewriteOption

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RewriteBottomSheet(
    options: List<RewriteOption>,
    loading: Boolean,
    onDismissRequest: () -> Unit,
    onApply: (RewriteOption) -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        sheetState = sheetState,
    ) {
        Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
            Text("Rewrite", style = MaterialTheme.typography.headlineMedium)
            Text(
                "Six premium styles — clarity transforms, tone lexicons, and goal-aware polish. Offline by default; OpenAI used when OPENAI_API_KEY is set.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(16.dp))
            if (loading) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(220.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator()
                        Spacer(Modifier.height(12.dp))
                        Text("Crafting stronger rewrites…")
                    }
                }
            } else {
                AnimatedVisibility(visible = options.isNotEmpty(), enter = fadeIn()) {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(460.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        items(options, key = { it.style.name }) { option ->
                            RewriteCard(option = option, onApply = { onApply(option) })
                        }
                    }
                }
            }
            Spacer(Modifier.height(28.dp))
        }
    }
}

@Composable
private fun RewriteCard(
    option: RewriteOption,
    onApply: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f))
            .padding(14.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(option.style.displayName, style = MaterialTheme.typography.titleMedium)
                Text(
                    option.rationale,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Button(onClick = onApply) { Text("Use") }
        }
        Spacer(Modifier.height(10.dp))
        Text(option.text, style = MaterialTheme.typography.bodyLarge)
    }
}
