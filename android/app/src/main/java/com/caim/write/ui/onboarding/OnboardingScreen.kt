package com.caim.write.ui.onboarding

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier.modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.caim.write.data.local.SettingsStore
import com.caim.write.ui.theme.AtmosphereBrushDark
import com.caim.write.ui.theme.AtmosphereBrushLight
import kotlinx.coroutines.launch

private data class OnboardingPage(
    val title: String,
    val body: String,
    val accent: String,
)

@Composable
fun OnboardingScreen(
    onFinished: () -> Unit,
    settingsStore: SettingsStore,
) {
    val pages = remember {
        listOf(
            OnboardingPage(
                title = "CAIm Write",
                body = "A premium writing assistant — spelling, grammar, clarity, and tone in one calm editor.",
                accent = "Brand-first writing",
            ),
            OnboardingPage(
                title = "See every issue",
                body = "Color-coded underlines for Correctness, Clarity, Engagement, and Delivery. Tap Fix or Accept all.",
                accent = "Grammarly-class suggestions",
            ),
            OnboardingPage(
                title = "Stronger rewrites",
                body = "Professional, Casual, Shorten, Expand, Friendly, and Confident — powered by a real offline rewrite engine, with optional OpenAI.",
                accent = "Better than thesaurus mode",
            ),
        )
    }
    var index by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    val dark = isSystemInDarkTheme()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(if (dark) AtmosphereBrushDark else AtmosphereBrushLight)
            .statusBarsPadding()
            .padding(24.dp),
        verticalArrangement = Arrangement.SpaceBetween,
    ) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            TextButton(
                onClick = {
                    scope.launch {
                        settingsStore.setOnboarded(true)
                        onFinished()
                    }
                },
            ) { Text("Skip") }
        }

        AnimatedContent(
            targetState = index,
            transitionSpec = {
                (slideInHorizontally { it / 3 } + fadeIn()) togetherWith
                    (slideOutHorizontally { -it / 3 } + fadeOut())
            },
            label = "onboarding",
            modifier = Modifier.weight(1f),
        ) { pageIndex ->
            val page = pages[pageIndex]
            Column(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(
                    modifier = Modifier
                        .size(96.dp)
                        .clip(RoundedCornerShape(28.dp))
                        .background(MaterialTheme.colorScheme.primary),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        "CW",
                        style = MaterialTheme.typography.headlineLarge,
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                }
                Spacer(Modifier.height(28.dp))
                Text(
                    page.accent,
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.secondary,
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    page.title,
                    style = MaterialTheme.typography.displayMedium,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(12.dp))
                Text(
                    page.body,
                    style = MaterialTheme.typography.bodyLarge,
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
            ) {
                pages.indices.forEach { i ->
                    Box(
                        modifier = Modifier
                            .padding(4.dp)
                            .size(if (i == index) 10.dp else 8.dp)
                            .clip(CircleShape)
                            .background(
                                if (i == index) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.outline.copy(alpha = 0.4f),
                            ),
                    )
                }
            }
            Spacer(Modifier.height(16.dp))
            Button(
                onClick = {
                    if (index < pages.lastIndex) {
                        index++
                    } else {
                        scope.launch {
                            settingsStore.setOnboarded(true)
                            onFinished()
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (index < pages.lastIndex) "Continue" else "Start writing")
            }
        }
    }
}
