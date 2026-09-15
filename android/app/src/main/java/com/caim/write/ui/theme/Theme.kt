package com.caim.write.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// Brand palette — ink / sea / coral / foam (not purple AI sludge)
val CaimInk = Color(0xFF1A1F1C)
val CaimFoam = Color(0xFFF3F0E8)
val CaimSea = Color(0xFF0F6E56)
val CaimSeaDeep = Color(0xFF0A4F3D)
val CaimCoral = Color(0xFFC45C26)
val CaimSand = Color(0xFFE7E1D3)
val CaimMist = Color(0xFFD9E5DF)
val CaimNight = Color(0xFF101412)
val CaimNightCard = Color(0xFF1C2320)
val CaimMoon = Color(0xFFE8EDE9)

val CorrectnessRed = Color(0xFFB42318)
val ClarityAmber = Color(0xFFB54708)
val EngagementTeal = Color(0xFF0E7C66)
val DeliveryBlue = Color(0xFF175CD3)

private val LightColors = lightColorScheme(
    primary = CaimSea,
    onPrimary = Color.White,
    primaryContainer = CaimMist,
    onPrimaryContainer = CaimSeaDeep,
    secondary = CaimCoral,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFF6D7C5),
    onSecondaryContainer = Color(0xFF5C2A0E),
    tertiary = CaimInk,
    background = CaimFoam,
    onBackground = CaimInk,
    surface = Color.White,
    onSurface = CaimInk,
    surfaceVariant = CaimSand,
    onSurfaceVariant = Color(0xFF4A524C),
    outline = Color(0xFFB7B2A5),
    error = CorrectnessRed,
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF5DCAA8),
    onPrimary = CaimNight,
    primaryContainer = CaimSeaDeep,
    onPrimaryContainer = CaimMist,
    secondary = Color(0xFFE08A55),
    onSecondary = CaimNight,
    secondaryContainer = Color(0xFF5C2A0E),
    onSecondaryContainer = Color(0xFFF6D7C5),
    tertiary = CaimMoon,
    background = CaimNight,
    onBackground = CaimMoon,
    surface = CaimNightCard,
    onSurface = CaimMoon,
    surfaceVariant = Color(0xFF2A322E),
    onSurfaceVariant = Color(0xFFB5BDB8),
    outline = Color(0xFF5A635E),
    error = Color(0xFFFFB4AB),
)

val Fraunces = FontFamily.Serif
val SourceSans = FontFamily.SansSerif

val AtmosphereBrushLight = Brush.verticalGradient(
    colors = listOf(
        Color(0xFFF7F4EC),
        Color(0xFFE8F0EB),
        Color(0xFFF3EDE3),
    ),
)

val AtmosphereBrushDark = Brush.verticalGradient(
    colors = listOf(
        Color(0xFF0E1311),
        Color(0xFF15201B),
        Color(0xFF121816),
    ),
)

@Composable
fun CaimWriteTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colors = if (darkTheme) DarkColors else LightColors
    MaterialTheme(
        colorScheme = colors,
        typography = CaimTypography,
        content = content,
    )
}

val CaimTypography = Typography(
    displayLarge = TextStyle(
        fontFamily = Fraunces,
        fontWeight = FontWeight.SemiBold,
        fontSize = 40.sp,
        lineHeight = 44.sp,
        letterSpacing = (-0.5).sp,
    ),
    displayMedium = TextStyle(
        fontFamily = Fraunces,
        fontWeight = FontWeight.SemiBold,
        fontSize = 32.sp,
        lineHeight = 36.sp,
    ),
    headlineLarge = TextStyle(
        fontFamily = Fraunces,
        fontWeight = FontWeight.SemiBold,
        fontSize = 28.sp,
        lineHeight = 34.sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = Fraunces,
        fontWeight = FontWeight.Medium,
        fontSize = 22.sp,
        lineHeight = 28.sp,
    ),
    titleLarge = TextStyle(
        fontFamily = Fraunces,
        fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp,
        lineHeight = 26.sp,
    ),
    titleMedium = TextStyle(
        fontFamily = SourceSans,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 22.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = SourceSans,
        fontWeight = FontWeight.Normal,
        fontSize = 17.sp,
        lineHeight = 26.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = SourceSans,
        fontWeight = FontWeight.Normal,
        fontSize = 15.sp,
        lineHeight = 22.sp,
    ),
    bodySmall = TextStyle(
        fontFamily = SourceSans,
        fontWeight = FontWeight.Normal,
        fontSize = 13.sp,
        lineHeight = 18.sp,
    ),
    labelLarge = TextStyle(
        fontFamily = SourceSans,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        lineHeight = 18.sp,
    ),
    labelMedium = TextStyle(
        fontFamily = SourceSans,
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp,
        lineHeight = 16.sp,
    ),
)
