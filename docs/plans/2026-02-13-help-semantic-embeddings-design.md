# Busqueda Semantica con Embeddings para el Asistente de Ayuda

## Resumen

Reemplazar la busqueda por tokens del chatbot de ayuda con busqueda semantica basada en sentence embeddings. Usa `paraphrase-multilingual-MiniLM-L12-v2` (384 dims), almacena vectores en PostgreSQL con pgvector, y se integra con el ciclo de auto-aprendizaje existente.

## Arquitectura

```
Usuario escribe pregunta
        |
  Frontend: match exacto local aliases? (cortesia)
    SI -> respuesta instantanea
    NO |
  Backend: POST /help/ask
        |
  Python: genera embedding (384 dims, ~50ms)
        |
  pgvector: top-3 por cosine distance
        |
  distancia <= 0.18? -> responde con KB entry (static/promoted)
  distancia > 0.18?  -> llama AI con top-3 como contexto
```

## Componentes

### 1. Script Python: `backend/ml/help_embeddings.py`

- Modelo: `paraphrase-multilingual-MiniLM-L12-v2`
- Modos: `encode-batch` (array de textos) y `encode-query` (un texto)
- I/O: JSON por stdin/stdout (patron existente en el proyecto)
- Deps: `sentence-transformers`, `torch` (ya instalado)

### 2. PostgreSQL + pgvector

```prisma
model HelpEmbedding {
  id         Int      @id @default(autoincrement())
  sourceType String   // "static" | "promoted"
  sourceId   String   // KB entry ID o HelpKBCandidate ID
  section    String
  question   String
  answer     String
  embedding  Unsupported("vector(384)")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([sourceType, sourceId])
  @@index([section])
}
```

Extension: `CREATE EXTENSION IF NOT EXISTS vector`
Indice: `ivfflat` con `vector_cosine_ops`

### 3. Servicio: `HelpEmbeddingService`

- `syncEmbeddings()` — Al iniciar + cada 6h. Indexa KB estatica + candidatos aprobados
- `embedQuery(text)` — Genera embedding de una pregunta (cache 60s)
- `searchSimilar(embedding, section, limit)` — Query pgvector cosine distance
- `onCandidateApproved(candidate)` — Genera embedding al aprobar candidato

### 4. Integracion con HelpService.ask()

Reemplaza busqueda por `questionNorm` exacto con busqueda semantica.
Graceful degradation: si Python no esta disponible, cae al flujo anterior.

### 5. Frontend (help-assistant-context.tsx)

- Mantiene match exacto de aliases para cortesia (instantaneo)
- Todo lo demas va a backend /help/ask (embeddings)

## Ciclo de aprendizaje

1. Inicio servidor -> syncEmbeddings() indexa KB estatica + aprobados
2. Usuario pregunta -> embedding -> pgvector -> respuesta
3. Feedback positivo 3+ -> candidato PENDING
4. Admin aprueba -> onCandidateApproved() -> embedding generado -> disponible
5. Re-sync cada 6h para consistencia

## Variables de entorno

- `HELP_EMBEDDING_SCRIPT` — default: `ml/help_embeddings.py`
- `HELP_EMBEDDING_BIN` — default: valor de `PYTHON_BIN` o `python`
- `HELP_EMBEDDING_THRESHOLD` — default: `0.18`
- `HELP_EMBEDDING_SYNC_INTERVAL_MS` — default: `21600000` (6h)

## Archivos

| Accion | Archivo |
|--------|---------|
| Crear | `backend/ml/help_embeddings.py` |
| Crear | `backend/ml/help-kb-static.json` |
| Crear | `backend/src/help/help-embedding.service.ts` |
| Crear | Migracion Prisma |
| Modificar | `backend/prisma/schema.prisma` |
| Modificar | `backend/src/help/help.service.ts` |
| Modificar | `backend/src/help/help.module.ts` |
| Modificar | `fronted/src/context/help-assistant-context.tsx` |
