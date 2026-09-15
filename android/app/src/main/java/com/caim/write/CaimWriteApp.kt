package com.caim.write

import android.app.Application
import androidx.room.Room
import com.caim.write.data.local.CaimDatabase
import com.caim.write.data.local.SettingsStore
import com.caim.write.data.repository.DocumentRepository
import com.caim.write.engine.CaimWriteEngine
import com.caim.write.engine.rewrite.RewriteService

class CaimWriteApp : Application() {
    lateinit var database: CaimDatabase
        private set
    lateinit var documents: DocumentRepository
        private set
    lateinit var settings: SettingsStore
        private set
    lateinit var engine: CaimWriteEngine
        private set

    override fun onCreate() {
        super.onCreate()
        database = Room.databaseBuilder(
            this,
            CaimDatabase::class.java,
            "caim_write.db",
        ).fallbackToDestructiveMigration().build()
        documents = DocumentRepository(database.documentDao())
        settings = SettingsStore(this)
        engine = CaimWriteEngine(
            rewriteService = RewriteService(
                apiKeyProvider = {
                    BuildConfig.OPENAI_API_KEY.ifBlank { System.getenv("OPENAI_API_KEY") }
                },
            ),
        )
    }
}

val Application.caimApp: CaimWriteApp
    get() = this as CaimWriteApp
