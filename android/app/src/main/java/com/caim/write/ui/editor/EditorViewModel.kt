package com.caim.write.ui.editor

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.caim.write.data.local.SettingsStore
import com.caim.write.data.repository.DocumentRepository
import com.caim.write.engine.CaimWriteEngine
import com.caim.write.engine.model.AnalysisResult
import com.caim.write.engine.model.EngineSettings
import com.caim.write.engine.model.RewriteOption
import com.caim.write.engine.model.RewriteStyle
import com.caim.write.engine.model.SuggestionCategory
import com.caim.write.engine.model.SuggestionIntensity
import com.caim.write.engine.model.WordAlternative
import com.caim.write.engine.model.WritingGoals
import com.caim.write.engine.model.WritingSuggestion
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class EditorUiState(
    val documentId: String? = null,
    val title: String = "",
    val text: String = "",
    val analysis: AnalysisResult? = null,
    val isAnalyzing: Boolean = false,
    val selectedCategory: SuggestionCategory? = null,
    val selectedSuggestionId: String? = null,
    val dismissedIds: Set<String> = emptySet(),
    val rewriteOptions: List<RewriteOption> = emptyList(),
    val isRewriting: Boolean = false,
    val rewriteSource: String? = null,
    val goals: WritingGoals = WritingGoals(),
    val intensity: SuggestionIntensity = SuggestionIntensity.BALANCED,
    val enabledCategories: Set<SuggestionCategory> = SuggestionCategory.entries.toSet(),
    val language: String = "en-US",
    val wordAlternatives: WordAlternative? = null,
    val selectedWord: String? = null,
    val snackbarMessage: String? = null,
    val showSuggestionsSheet: Boolean = false,
    val showRewriteSheet: Boolean = false,
    val showGoalsSheet: Boolean = false,
)

class EditorViewModel(
    private val engine: CaimWriteEngine,
    private val documents: DocumentRepository,
    private val settings: SettingsStore,
) : ViewModel() {

    private val _state = MutableStateFlow(EditorUiState())
    val state: StateFlow<EditorUiState> = _state.asStateFlow()

    private var analyzeJob: Job? = null

    init {
        viewModelScope.launch {
            combine(
                settings.goals,
                settings.intensity,
                settings.enabledCategories,
                settings.language,
            ) { goals, intensity, categories, language ->
                EngineBundle(goals, intensity, categories, language)
            }.collect { bundle ->
                _state.update {
                    it.copy(
                        goals = bundle.goals,
                        intensity = bundle.intensity,
                        enabledCategories = bundle.categories,
                        language = bundle.language,
                    )
                }
                scheduleAnalyze(_state.value.text)
            }
        }
    }

    fun loadDocument(id: String) {
        viewModelScope.launch {
            val doc = documents.get(id) ?: return@launch
            _state.update {
                it.copy(
                    documentId = doc.id,
                    title = doc.title,
                    text = doc.body,
                    dismissedIds = emptySet(),
                    selectedSuggestionId = null,
                )
            }
            scheduleAnalyze(doc.body, immediate = true)
        }
    }

    fun newDocument() {
        _state.update {
            EditorUiState(
                goals = it.goals,
                intensity = it.intensity,
                enabledCategories = it.enabledCategories,
                language = it.language,
            )
        }
    }

    fun onTextChange(text: String) {
        _state.update { it.copy(text = text, wordAlternatives = null, selectedWord = null) }
        scheduleAnalyze(text)
    }

    fun onTitleChange(title: String) {
        _state.update { it.copy(title = title) }
    }

    fun selectCategory(category: SuggestionCategory?) {
        _state.update { it.copy(selectedCategory = category) }
    }

    fun selectSuggestion(id: String?) {
        _state.update { it.copy(selectedSuggestionId = id, showSuggestionsSheet = id != null) }
    }

    fun dismissSuggestion(id: String) {
        _state.update {
            it.copy(
                dismissedIds = it.dismissedIds + id,
                selectedSuggestionId = if (it.selectedSuggestionId == id) null else it.selectedSuggestionId,
            )
        }
    }

    fun dismissAllVisible() {
        val ids = visibleSuggestions().map { it.id }.toSet()
        _state.update { it.copy(dismissedIds = it.dismissedIds + ids, selectedSuggestionId = null) }
    }

    fun acceptSuggestion(suggestion: WritingSuggestion, replacementIndex: Int = 0) {
        val current = _state.value.text
        val next = engine.applySuggestion(current, suggestion, replacementIndex)
        _state.update {
            it.copy(
                text = next,
                dismissedIds = it.dismissedIds + suggestion.id,
                selectedSuggestionId = null,
                snackbarMessage = "Suggestion applied",
            )
        }
        scheduleAnalyze(next, immediate = true)
    }

    fun acceptAllVisible() {
        val current = _state.value.text
        val suggestions = visibleSuggestions().filter { it.replacements.isNotEmpty() }
        val next = engine.applyAll(current, suggestions)
        _state.update {
            it.copy(
                text = next,
                dismissedIds = it.dismissedIds + suggestions.map { s -> s.id },
                selectedSuggestionId = null,
                snackbarMessage = "Accepted ${suggestions.size} suggestions",
            )
        }
        scheduleAnalyze(next, immediate = true)
    }

    fun requestRewrite(selection: String? = null) {
        val source = selection?.takeIf { it.isNotBlank() } ?: _state.value.text
        if (source.isBlank()) {
            _state.update { it.copy(snackbarMessage = "Add some text to rewrite") }
            return
        }
        _state.update {
            it.copy(
                isRewriting = true,
                showRewriteSheet = true,
                rewriteSource = source,
                rewriteOptions = emptyList(),
            )
        }
        viewModelScope.launch {
            val options = engine.rewrite(source, RewriteStyle.entries, _state.value.goals)
            _state.update {
                it.copy(
                    isRewriting = false,
                    rewriteOptions = options,
                )
            }
        }
    }

    fun applyRewrite(option: RewriteOption) {
        val source = _state.value.rewriteSource
        val current = _state.value.text
        val next = if (source != null && source != current && current.contains(source)) {
            current.replaceFirst(source, option.text)
        } else {
            option.text
        }
        _state.update {
            it.copy(
                text = next,
                showRewriteSheet = false,
                rewriteOptions = emptyList(),
                rewriteSource = null,
                snackbarMessage = "Applied ${option.style.displayName} rewrite",
            )
        }
        scheduleAnalyze(next, immediate = true)
    }

    fun updateGoals(goals: WritingGoals) {
        viewModelScope.launch {
            settings.setGoals(goals)
            _state.update { it.copy(goals = goals, showGoalsSheet = false, snackbarMessage = "Goals updated") }
        }
    }

    fun lookupWord(word: String) {
        val clean = word.trim().trim(',', '.', '!', '?', ';', ':', '"', '\'')
        if (clean.isBlank()) {
            _state.update { it.copy(selectedWord = null, wordAlternatives = null) }
            return
        }
        val alts = engine.wordAlternatives(clean)
        _state.update { it.copy(selectedWord = clean, wordAlternatives = alts) }
    }

    fun notify(message: String) {
        _state.update { it.copy(snackbarMessage = message) }
    }

    fun applyWordAlternative(replacement: String) {
        val word = _state.value.selectedWord ?: return
        val regex = Regex("""\b${Regex.escape(word)}\b""")
        val next = regex.replaceFirst(_state.value.text, replacement)
        _state.update {
            it.copy(
                text = next,
                wordAlternatives = null,
                selectedWord = null,
                snackbarMessage = "Replaced “$word”",
            )
        }
        scheduleAnalyze(next, immediate = true)
    }

    fun saveDocument() {
        viewModelScope.launch {
            val s = _state.value
            val saved = documents.save(s.title, s.text, s.documentId)
            _state.update {
                it.copy(
                    documentId = saved.id,
                    title = saved.title,
                    snackbarMessage = "Draft saved",
                )
            }
        }
    }

    fun setShowSuggestionsSheet(show: Boolean) {
        _state.update { it.copy(showSuggestionsSheet = show) }
    }

    fun setShowRewriteSheet(show: Boolean) {
        _state.update { it.copy(showRewriteSheet = show) }
    }

    fun setShowGoalsSheet(show: Boolean) {
        _state.update { it.copy(showGoalsSheet = show) }
    }

    fun consumeSnackbar() {
        _state.update { it.copy(snackbarMessage = null) }
    }

    fun visibleSuggestions(): List<WritingSuggestion> {
        val s = _state.value
        val all = s.analysis?.suggestions.orEmpty().filter { it.id !in s.dismissedIds }
        val cat = s.selectedCategory
        return if (cat == null) all else all.filter { it.category == cat }
    }

    private fun scheduleAnalyze(text: String, immediate: Boolean = false) {
        analyzeJob?.cancel()
        analyzeJob = viewModelScope.launch {
            if (!immediate) delay(280)
            _state.update { it.copy(isAnalyzing = true) }
            val settingsBundle = EngineSettings(
                language = _state.value.language,
                intensity = _state.value.intensity,
                enabledCategories = _state.value.enabledCategories,
            )
            val result = engine.analyze(text, settingsBundle)
            _state.update {
                it.copy(
                    analysis = result,
                    isAnalyzing = false,
                    // Drop dismissals that no longer exist
                    dismissedIds = it.dismissedIds.intersect(result.suggestions.map { s -> s.id }.toSet()),
                )
            }
        }
    }

    private data class EngineBundle(
        val goals: WritingGoals,
        val intensity: SuggestionIntensity,
        val categories: Set<SuggestionCategory>,
        val language: String,
    )
}

class EditorViewModelFactory(
    private val engine: CaimWriteEngine,
    private val documents: DocumentRepository,
    private val settings: SettingsStore,
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(EditorViewModel::class.java)) {
            return EditorViewModel(engine, documents, settings) as T
        }
        error("Unknown ViewModel: ${modelClass.name}")
    }
}
