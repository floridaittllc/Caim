package com.caim.write

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.lifecycle.viewmodel.compose.viewModel
import com.caim.write.ui.navigation.CaimNavHost
import com.caim.write.ui.theme.CaimWriteTheme
import com.caim.write.ui.editor.EditorViewModel
import com.caim.write.ui.editor.EditorViewModelFactory

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val app = application.caimApp
        setContent {
            val darkModePref by app.settings.darkMode.collectAsState(initial = "system")
            val darkTheme = when (darkModePref) {
                "light" -> false
                "dark" -> true
                else -> isSystemInDarkTheme()
            }
            CaimWriteTheme(darkTheme = darkTheme) {
                val factory = remember {
                    EditorViewModelFactory(app.engine, app.documents, app.settings)
                }
                val editorVm: EditorViewModel = viewModel(factory = factory)
                CaimNavHost(
                    editorViewModel = editorVm,
                    settingsStore = app.settings,
                    documentRepository = app.documents,
                )
            }
        }
    }
}
