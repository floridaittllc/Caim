package com.caim.write.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.caim.write.engine.model.SuggestionCategory
import com.caim.write.engine.model.ToneLabel
import com.caim.write.engine.model.WritingScores
import com.caim.write.ui.theme.ClarityAmber
import com.caim.write.ui.theme.CorrectnessRed
import com.caim.write.ui.theme.DeliveryBlue
import com.caim.write.ui.theme.EngagementTeal

fun categoryColor(category: SuggestionCategory): Color = when (category) {
    SuggestionCategory.CORRECTNESS -> CorrectnessRed
    SuggestionCategory.CLARITY -> ClarityAmber
    SuggestionCategory.ENGAGEMENT -> EngagementTeal
    SuggestionCategory.DELIVERY -> DeliveryBlue
}

@Composable
fun ScoreRing(
    scores: WritingScores,
    modifier: Modifier = Modifier,
) {
    val animated by animateFloatAsState(
        targetValue = scores.overall / 100f,
        animationSpec = tween(600),
        label = "score",
    )
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(20.dp))
            .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.88f))
            .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.35f), RoundedCornerShape(20.dp))
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f + animated * 0.2f)),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = scores.overall.toString(),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
            )
        }
        Spacer(Modifier.width(12.dp))
        Column {
            Text("Writing score", style = MaterialTheme.typography.labelMedium)
            Text(
                "C ${scores.correctness} · Cl ${scores.clarity} · E ${scores.engagement} · D ${scores.delivery}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
fun ToneChipRow(
    primary: ToneLabel,
    secondary: List<ToneLabel>,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        ToneChip(primary, emphasized = true)
        secondary.take(2).forEach { ToneChip(it, emphasized = false) }
    }
}

@Composable
fun ToneChip(label: ToneLabel, emphasized: Boolean) {
    val bg by animateColorAsState(
        if (emphasized) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
        label = "toneBg",
    )
    val fg by animateColorAsState(
        if (emphasized) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
        label = "toneFg",
    )
    val scale by animateFloatAsState(if (emphasized) 1f else 0.96f, label = "toneScale")
    Text(
        text = label.displayName,
        modifier = Modifier
            .scale(scale)
            .clip(RoundedCornerShape(999.dp))
            .background(bg)
            .padding(horizontal = 12.dp, vertical = 6.dp),
        color = fg,
        style = MaterialTheme.typography.labelMedium,
    )
}

@Composable
fun CategoryFilterRow(
    counts: Map<SuggestionCategory, Int>,
    selected: SuggestionCategory?,
    total: Int,
    onSelect: (SuggestionCategory?) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        FilterPill(
            label = "All · $total",
            selected = selected == null,
            color = MaterialTheme.colorScheme.primary,
            onClick = { onSelect(null) },
        )
        SuggestionCategory.entries.forEach { cat ->
            val count = counts[cat] ?: 0
            FilterPill(
                label = "${cat.displayName.take(4)} · $count",
                selected = selected == cat,
                color = categoryColor(cat),
                onClick = { onSelect(if (selected == cat) null else cat) },
            )
        }
    }
}

@Composable
private fun FilterPill(
    label: String,
    selected: Boolean,
    color: Color,
    onClick: () -> Unit,
) {
    val bg = if (selected) color else MaterialTheme.colorScheme.surface
    val fg = if (selected) Color.White else MaterialTheme.colorScheme.onSurface
    Text(
        text = label,
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(bg)
            .border(1.dp, color.copy(alpha = if (selected) 0f else 0.45f), RoundedCornerShape(999.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 7.dp),
        color = fg,
        style = MaterialTheme.typography.labelMedium,
    )
}

@Composable
fun SectionLabel(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleMedium,
        modifier = Modifier.padding(bottom = 8.dp),
    )
}

@Composable
fun VerticalSpace(height: Int = 12) {
    Spacer(modifier = Modifier.height(height.dp))
}
