# Instalación de pgvector

## Estado Actual

El schema de Prisma está configurado con `embedding Bytes` temporalmente en `JurisprudenceEmbedding.embedding`.

Una vez instalada la extensión pgvector, se debe cambiar a:
```prisma
embedding Unsupported("vector(1536)")
```

## Instalación Local (Desarrollo)

### Windows + PostgreSQL

1. Descargar pgvector para Windows desde: https://github.com/pgvector/pgvector/releases
2. Copiar `vector.dll` a `C:\Program Files\PostgreSQL\17\lib\`
3. Copiar `vector.control` y `vector--*.sql` a `C:\Program Files\PostgreSQL\17\share\extension\`
4. Conectarse a la base de datos:
   ```bash
   psql -U postgres -d ecoterra
   ```
5. Ejecutar:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
6. Verificar instalación:
   ```sql
   SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
   ```

### PostgreSQL en Docker/Linux

```bash
# En el Dockerfile o comando de inicio:
apt-get update && apt-get install -y postgresql-server-dev-all build-essential git
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
make install
```

## Instalación en Producción (Railway)

Railway probablemente ya tiene pgvector disponible. Verificar con:
```sql
SELECT * FROM pg_available_extensions WHERE name = 'vector';
```

Si está disponible, simplemente ejecutar:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## Migración del Schema

Una vez instalado pgvector:

1. Editar `backend/prisma/schema.prisma` línea ~3041:
   ```prisma
   model JurisprudenceEmbedding {
     // ...
     embedding Unsupported("vector(1536)")  // Cambiar de Bytes a vector
     // ...
   }
   ```

2. Crear migración:
   ```bash
   cd backend
   npx prisma migrate dev --name change_embedding_to_vector
   ```

3. La migración debe incluir:
   ```sql
   -- Crear columna temporal con tipo vector
   ALTER TABLE "JurisprudenceEmbedding" ADD COLUMN "embedding_new" vector(1536);

   -- Convertir datos de Bytes a vector (si hay datos existentes)
   -- UPDATE "JurisprudenceEmbedding" SET "embedding_new" = ...::vector;

   -- Eliminar columna antigua
   ALTER TABLE "JurisprudenceEmbedding" DROP COLUMN "embedding";

   -- Renombrar nueva columna
   ALTER TABLE "JurisprudenceEmbedding" RENAME COLUMN "embedding_new" TO "embedding";

   -- Crear índice HNSW para búsqueda vectorial eficiente
   CREATE INDEX "idx_jurisprudence_embedding_vector"
     ON "JurisprudenceEmbedding"
     USING hnsw (embedding vector_cosine_ops)
     WITH (m = 16, ef_construction = 64);

   -- Índices adicionales para filtrado pre-rankeo
   CREATE INDEX "idx_jurisprudence_embedding_version"
     ON "JurisprudenceEmbedding" ("embeddingModel", "embeddingVersion", "organizationId");
   ```

4. Generar client:
   ```bash
   npx prisma generate
   ```

## Notas Importantes

- **Tipo de embedding**: vector(1536) para OpenAI text-embedding-3-small
- **Índice HNSW**: Requerido para búsqueda rápida con >1000 embeddings
- **Parámetros HNSW**:
  - `m = 16` (conexiones por nodo, mayor = más preciso pero más memoria)
  - `ef_construction = 64` (calidad del índice durante construcción)
- **Búsqueda**: Usar operador `<=>` para distancia coseno
  ```sql
  SELECT * FROM "JurisprudenceEmbedding"
  WHERE "organizationId" = 1
  ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
  LIMIT 5;
  ```

## Referencias

- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [Prisma + pgvector](https://www.prisma.io/docs/orm/prisma-schema/data-model/unsupported-types)
- [HNSW Index Tuning](https://github.com/pgvector/pgvector#hnsw)
