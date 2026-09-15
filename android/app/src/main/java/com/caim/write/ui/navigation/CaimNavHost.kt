package com.caim.write.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.caim.write.data.local.SettingsStore
import com.caim.write.data.repository.DocumentRepository
import com.caim.write.ui.editor.EditorScreen
import com.caim.write.ui.editor.EditorViewModel
import com.caim.write.ui.goals.GoalsScreen
import com.caim.write.ui.history.HistoryScreen
import com.caim.write.ui.onboarding.OnboardingScreen
import com.caim.write.ui.settings.SettingsScreen

object Routes {
    const val ONBOARDING = "onboarding"
    const val EDITOR = "editor"
    const val EDITOR_DOC = "editor/{docId}"
    const val HISTORY = "history"
    const val SETTINGS = "settings"
    const val GOALS = "goals"

    fun editor(docId: String) = "editor/$docId"
}

@Composable
fun CaimNavHost(
    editorViewModel: EditorViewModel,
    settingsStore: SettingsStore,
    documentRepository: DocumentRepository,
) {
    val navController = rememberNavController()
    val onboarded by settingsStore.onboarded.collectAsState(initial = false)
    val start = if (onboarded) Routes.EDITOR else Routes.ONBOARDING

    NavHost(navController = navController, startDestination = start) {
        composable(Routes.ONBOARDING) {
            OnboardingScreen(
                onFinished = {
                    navController.navigate(Routes.EDITOR) {
                        popUpTo(Routes.ONBOARDING) { inclusive = true }
                    }
                },
                settingsStore = settingsStore,
            )
        }
        composable(Routes.EDITOR) {
            EditorScreen(
                viewModel = editorViewModel,
                onOpenHistory = { navController.navigate(Routes.HISTORY) },
                onOpenSettings = { navController.navigate(Routes.SETTINGS) },
                onOpenGoals = { navController.navigate(Routes.GOALS) },
            )
        }
        composable(
            route = Routes.EDITOR_DOC,
            arguments = listOf(navArgument("docId") { type = NavType.StringType }),
        ) { entry ->
            val docId = entry.arguments?.getString("docId")
            if (docId != null) {
                editorViewModel.loadDocument(docId)
            }
            EditorScreen(
                viewModel = editorViewModel,
                onOpenHistory = { navController.navigate(Routes.HISTORY) },
                onOpenSettings = { navController.navigate(Routes.SETTINGS) },
                onOpenGoals = { navController.navigate(Routes.GOALS) },
            )
        }
        composable(Routes.HISTORY) {
            HistoryScreen(
                repository = documentRepository,
                onBack = { navController.popBackStack() },
                onOpenDocument = { id ->
                    navController.navigate(Routes.editor(id)) {
                        popUpTo(Routes.EDITOR) { inclusive = false }
                    }
                },
                onNewDocument = {
                    editorViewModel.newDocument()
                    navController.navigate(Routes.EDITOR) {
                        popUpTo(Routes.HISTORY) { inclusive = true }
                    }
                },
            )
        }
        composable(Routes.SETTINGS) {
            SettingsScreen(
                settingsStore = settingsStore,
                onBack = { navController.popBackStack() },
            )
        }
        composable(Routes.GOALS) {
            GoalsScreen(
                settingsStore = settingsStore,
                onBack = { navController.popBackStack() },
                onSaved = { goals ->
                    editorViewModel.updateGoals(goals)
                    navController.popBackStack()
                },
            )
        }
    }
}
