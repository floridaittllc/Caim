package com.caim.write.data.repository

import com.caim.write.data.local.DocumentDao
import com.caim.write.data.local.DocumentEntity
import kotlinx.coroutines.flow.Flow
import java.util.UUID

class DocumentRepository(
    private val dao: DocumentDao,
) {
    fun observeDocuments(): Flow<List<DocumentEntity>> = dao.observeAll()

    suspend fun get(id: String): DocumentEntity? = dao.getById(id)

    suspend fun save(title: String, body: String, existingId: String? = null): DocumentEntity {
        val now = System.currentTimeMillis()
        val id = existingId ?: UUID.randomUUID().toString()
        val existing = existingId?.let { dao.getById(it) }
        val entity = DocumentEntity(
            id = id,
            title = title.ifBlank { deriveTitle(body) },
            body = body,
            createdAt = existing?.createdAt ?: now,
            updatedAt = now,
            wordCount = body.split(Regex("""\s+""")).count { it.isNotBlank() },
        )
        dao.upsert(entity)
        return entity
    }

    suspend fun delete(id: String) = dao.delete(id)

    private fun deriveTitle(body: String): String {
        val first = body.lineSequence().firstOrNull { it.isNotBlank() }?.trim().orEmpty()
        return when {
            first.isBlank() -> "Untitled draft"
            first.length <= 42 -> first
            else -> first.take(39).trimEnd() + "…"
        }
    }
}
