package com.caim.write.ui.editor

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.Flag
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Save
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.caim.write.engine.model.SuggestionCategory
import com.caim.write.engine.model.WritingSuggestion
import com.caim.write.ui.components.CategoryFilterRow
import com.caim.write.ui.components.ScoreRing
import com.caim.write.ui.components.ToneChipRow
import com.caim.write.ui.components.categoryColor
import com.caim.write.ui.rewrite.RewriteBottomSheet
import com.caim.write.ui.suggestions.SuggestionsBottomSheet
import com.caim.write.ui.theme.AtmosphereBrushDark
import com.caim.write.ui.theme.AtmosphereBrushLight
import com.caim.write.ui.theme.Fraunces

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditorScreen(
    viewModel: EditorViewModel,
    onOpenHistory: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenGoals: () -> Unit,
) {
    val state by viewModel.state.collectAsState()
    val snackbar = remember { SnackbarHostState() }
    val context = LocalContext.current
    val dark = isSystemInDarkTheme()
    val visible = viewModel.visibleSuggestions()
    val counts = SuggestionCategory.entries.associateWith { cat ->
        state.analysis?.suggestions.orEmpty()
            .count { it.category == cat && it.id !in state.dismissedIds }
    }
    val totalIssues = visible.size.let {
        // total across all categories ignoring filter
        state.analysis?.suggestions.orEmpty().count { s -> s.id !in state.dismissedIds } 
    }

    LaunchedEffect(state.snackbarMessage) {
        val msg = state.snackbarMessage ?: return@LaunchedEffect
        snackbar.showSnackbar(msg)
        viewModel.consumeSnackbar()
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { viewModel.requestRewrite() },
                containerColor = MaterialTheme.colorScheme.secondary,
                contentColor = MaterialTheme.colorScheme.onSecondary,
            ) {
                Icon(Icons.Outlined.AutoAwesome, contentDescription = "Rewrite")
            }
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(if (dark) AtmosphereBrushDark else AtmosphereBrushLight)
                .padding(padding)
                .statusBarsPadding()
                .navigationBarsPadding()
                .imePadding(),
        ) {
            Column(Modifier = Modifier.fillMaxSize()) {
                TopBar(
                    title = state.title.ifBlank { "CAIm Write" },
                    onHistory = onOpenHistory,
                    onSettings = onOpenSettings,
                    onGoals = onOpenGoals,
                    onSave = { viewModel.saveDocument() },
                    onCopy = {
                        copyText(context, state.text)
                        viewModel.notify("Copied to clipboard")
                    },
                    onShare = { shareText(context, state.text) },
                    analyzing = state.isAnalyzing,
                )

                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp),
                ) {
                    state.analysis?.let { analysis ->
                        ScoreRing(analysis.scores, modifier = Modifier.fillMaxWidth())
                        Spacer(Modifier.height(10.dp))
                        ToneChipRow(analysis.tone.primary, analysis.tone.secondary)
                        Spacer(Modifier.height(14.dp))
                    }

                    BasicTextField(
                        value = state.title,
                        onValueChange = viewModel::onTitleChange,
                        textStyle = TextStyle(
                            fontFamily = Fraunces,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 26.sp,
                            color = MaterialTheme.colorScheme.onBackground,
                        ),
                        cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                        decorationBox = { inner ->
                            if (state.title.isEmpty()) {
                                Text(
                                    "Untitled draft",
                                    style = MaterialTheme.typography.headlineMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.55f),
                                )
                            }
                            inner()
                        },
                        modifier = Modifier.fillMaxWidth(),
                    )

                    Spacer(Modifier.height(12.dp))

                    val underlineTransform = remember(state.analysis, state.dismissedIds) {
                        SuggestionUnderlineTransformation(
                            suggestions = state.analysis?.suggestions.orEmpty()
                                .filter { it.id !in state.dismissedIds },
                        )
                    }

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(18.dp))
                            .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.92f))
                            .padding(16.dp),
                    ) {
                        BasicTextField(
                            value = state.text,
                            onValueChange = viewModel::onTextChange,
                            textStyle = MaterialTheme.typography.bodyLarge.copy(
                                color = MaterialTheme.colorScheme.onSurface,
                            ),
                            cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                            visualTransformation = underlineTransform,
                            decorationBox = { inner ->
                                if (state.text.isEmpty()) {
                                    Text(
                                        "Start writing or paste text. CAIm Write checks spelling, grammar, clarity, and tone as you go.",
                                        style = MaterialTheme.typography.bodyLarge,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.55f),
                                    )
                                }
                                inner()
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(320.dp)
                                .pointerInput(state.text) {
                                    detectTapGestures(
                                        onLongPress = { offset ->
                                            // Approximate word under tap via character index heuristic
                                            val approxIndex = ((offset.y / 26f).toInt() * 40)
                                                .coerceIn(0, state.text.length)
                                            val word = wordAt(state.text, approxIndex)
                                            if (word.isNotBlank()) viewModel.lookupWord(word)
                                        },
                                    )
                                },
                        )
                    }

                    AnimatedVisibility(
                        visible = state.wordAlternatives != null,
                        enter = fadeIn() + slideInVertically(),
                        exit = fadeOut(),
                    ) {
                        val alts = state.wordAlternatives
                        if (alts != null) {
                            WordAlternativesCard(
                                word = alts.word,
                                alternatives = alts.alternatives,
                                onPick = viewModel::applyWordAlternative,
                                onDismiss = { viewModel.lookupWord("") },
                            )
                        }
                    }

                    Spacer(Modifier.height(16.dp))
                    CategoryFilterRow(
                        counts = counts,
                        selected = state.selectedCategory,
                        total = totalIssues,
                        onSelect = viewModel::selectCategory,
                    )
                    Spacer(Modifier.height(10.dp))

                    SuggestionsPreview(
                        suggestions = visible.take(4),
                        total = totalIssues,
                        onOpenAll = { viewModel.setShowSuggestionsSheet(true) },
                        onAccept = { viewModel.acceptSuggestion(it) },
                        onSelect = { viewModel.selectSuggestion(it.id) },
                    )

                    Spacer(Modifier.height(88.dp))
                }
            }
        }
    }

    if (state.showSuggestionsSheet) {
        SuggestionsBottomSheet(
            suggestions = visible,
            selectedId = state.selectedSuggestionId,
            onDismissRequest = { viewModel.setShowSuggestionsSheet(false) },
            onAccept = { viewModel.acceptSuggestion(it) },
            onDismissSuggestion = { viewModel.dismissSuggestion(it) },
            onAcceptAll = { viewModel.acceptAllVisible() },
            onDismissAll = { viewModel.dismissAllVisible() },
            onSelect = { viewModel.selectSuggestion(it) },
        )
    }

    if (state.showRewriteSheet) {
        RewriteBottomSheet(
            options = state.rewriteOptions,
            loading = state.isRewriting,
            onDismissRequest = { viewModel.setShowRewriteSheet(false) },
            onApply = viewModel::applyRewrite,
        )
    }
}

@Composable
private fun TopBar(
    title: String,
    onHistory: () -> Unit,
    onSettings: () -> Unit,
    onGoals: () -> Unit,
    onSave: () -> Unit,
    onCopy: () -> Unit,
    onShare: () -> Unit,
    analyzing: Boolean,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f).padding(start = 8.dp)) {
            Text(
                "CAIm Write",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.primary,
            )
            Text(
                if (analyzing) "Analyzing…" else title,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        IconButton(onClick = onGoals) { Icon(Icons.Outlined.Flag, "Goals") }
        IconButton(onClick = onHistory) { Icon(Icons.Outlined.History, "History") }
        IconButton(onClick = onSave) { Icon(Icons.Outlined.Save, "Save") }
        IconButton(onClick = onCopy) { Icon(Icons.Outlined.ContentCopy, "Copy") }
        IconButton(onClick = onShare) { Icon(Icons.Outlined.Share, "Share") }
        IconButton(onClick = onSettings) { Icon(Icons.Outlined.Settings, "Settings") }
    }
}

@Composable
private fun SuggestionsPreview(
    suggestions: List<WritingSuggestion>,
    total: Int,
    onOpenAll: () -> Unit,
    onAccept: (WritingSuggestion) -> Unit,
    onSelect: (WritingSuggestion) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.9f))
            .padding(14.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                if (total == 0) "Looking sharp" else "$total suggestions",
                style = MaterialTheme.typography.titleMedium,
            )
            TextButton(onClick = onOpenAll) { Text("See all") }
        }
        if (suggestions.isEmpty()) {
            Text(
                "No open issues in this filter. Keep writing — CAIm Write watches in real time.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            suggestions.forEach { suggestion ->
                SuggestionRow(
                    suggestion = suggestion,
                    onAccept = { onAccept(suggestion) },
                    onClick = { onSelect(suggestion) },
                )
                Spacer(Modifier.height(8.dp))
            }
        }
    }
}

@Composable
fun SuggestionRow(
    suggestion: WritingSuggestion,
    onAccept: () -> Unit,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f))
            .padding(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .height(36.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(categoryColor(suggestion.category))
                .padding(horizontal = 3.dp),
        )
        Spacer(Modifier.padding(6.dp))
        Column(
            modifier = Modifier
                .weight(1f)
                .pointerInput(suggestion.id) {
                    detectTapGestures(onTap = { onClick() })
                },
        ) {
            Text(suggestion.message, style = MaterialTheme.typography.labelLarge)
            Text(
                suggestion.explanation,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (suggestion.replacements.isNotEmpty() && suggestion.replacements.first().isNotEmpty()) {
                Text(
                    buildAnnotatedString {
                        withStyle(SpanStyle(color = MaterialTheme.colorScheme.onSurfaceVariant)) {
                            append(suggestion.original)
                            append(" → ")
                        }
                        withStyle(SpanStyle(fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary)) {
                            append(suggestion.replacements.first())
                        }
                    },
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
        if (suggestion.replacements.isNotEmpty()) {
            TextButton(onClick = onAccept) { Text("Fix") }
        }
    }
}

@Composable
private fun WordAlternativesCard(
    word: String,
    alternatives: List<String>,
    onPick: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 12.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(MaterialTheme.colorScheme.primaryContainer)
            .padding(12.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text("Alternatives for “$word”", style = MaterialTheme.typography.titleMedium)
            TextButton(onClick = onDismiss) { Text("Close") }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            alternatives.take(5).forEach { alt ->
                TextButton(onClick = { onPick(alt) }) { Text(alt) }
            }
        }
    }
}

private class SuggestionUnderlineTransformation(
    private val suggestions: List<WritingSuggestion>,
) : VisualTransformation {
    override fun filter(text: androidx.compose.ui.text.AnnotatedString): TransformedText {
        val built = buildAnnotatedString {
            append(text.text)
            suggestions.forEach { s ->
                if (s.range.start in 0..text.length && s.range.end in 0..text.length) {
                    addStyle(
                        SpanStyle(
                            textDecoration = TextDecoration.Underline,
                            color = categoryColor(s.category),
                        ),
                        s.range.start,
                        s.range.end,
                    )
                }
            }
        }
        return TransformedText(built, OffsetMapping.Identity)
    }
}

private fun wordAt(text: String, index: Int): String {
    if (text.isEmpty()) return ""
    var i = index.coerceIn(0, text.lastIndex)
    while (i > 0 && text[i].isLetterOrDigit()) i--
    if (i < text.lastIndex && !text[i].isLetterOrDigit()) i++
    var j = i
    while (j < text.length && (text[j].isLetterOrDigit() || text[j] == '\'')) j++
    return text.substring(i, j)
}

private fun copyText(context: Context, text: String) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    clipboard.setPrimaryClip(ClipData.newPlainText("CAIm Write", text))
}

private fun shareText(context: Context, text: String) {
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, text)
    }
    context.startActivity(Intent.createChooser(intent, "Share cleaned text"))
}
