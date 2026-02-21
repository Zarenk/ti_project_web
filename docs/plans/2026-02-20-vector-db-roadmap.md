# Roadmap Tecnico: Vector DB para IA (Help + Escalabilidad General)

## 1) Objetivo

Migrar la busqueda semantica actual (embeddings `Float[]` + cosine en memoria) a una arquitectura vectorial indexada en PostgreSQL (`pgvector`) para:

- Reducir latencia en consultas IA.
- Escalar mejor con mas entradas y concurrencia.
- Mantener aislamiento multi-tenant (organizacion/empresa).
- Preparar base reutilizable para otros modulos IA (legal, documentos, soporte, etc.).

---

## 2) Estado actual (real en codigo)

- Existe `HelpEmbedding` en Prisma con `embedding Float[]`.
- `HelpEmbeddingService` carga embeddings en memoria y calcula similitud coseno en loop.
- `HelpService` usa ese resultado para respuesta directa o contexto RAG.
- Hay diseño previo de pgvector en docs, pero en BD actual la columna esta en `DOUBLE PRECISION[]`, no `vector(N)` indexado ANN.

Implicancia:
- Funciona bien en corpus pequeno/mediano.
- Escala linealmente con el numero de embeddings.
- Sin indice ANN, la p95 sube al crecer datos y usuarios concurrentes.

---

## 3) Por que mejora usar vectores indexados

No mejora "por magia", mejora por estructura de consulta:

- Actual: O(n) por consulta (scan en memoria).
- Con ANN (`ivfflat` o `hnsw`): recuperacion top-k aproximada con indice.
- Menor latencia p95 en volumen alto.
- Menor presion de CPU en backend para similitud.

Cuando se nota:
- > 5k-10k embeddings.
- Multiples tenants y filtros.
- Uso simultaneo del asistente en horarios pico.

---

## 4) Diseno objetivo

### 4.1 Extension y tipo de columna

- Instalar/activar `pgvector` en PostgreSQL.
- Definir `embedding` como `vector(D)` (D = dimension real del modelo).
- Mantener metadatos: `sourceType`, `sourceId`, `section`, `question`, `answer`.

### 4.2 Multi-tenant first

Agregar columnas para filtro estricto:

- `organizationId Int`
- `companyId Int?` (nullable para conocimiento a nivel org)

Regla:
- Toda consulta vectorial debe filtrar primero por tenant.

### 4.3 Indices

- ANN principal:
  - `ivfflat` (mas simple) o
  - `hnsw` (mejor recall/latencia en lectura).
- Indices B-Tree para filtros:
  - `(organizationId, companyId, section)`
  - `(sourceType, sourceId)` unique.

### 4.4 Estrategia de retrieval

- Hibrido recomendado:
  - Vector top-k + keyword fallback.
  - Fusion por score (ej. RRF o weighted merge).
- Mantener fallback robusto cuando IA o embeddings fallen.

---

## 5) Fases de implementacion

## Fase 0 - Baseline y medicion (sin romper nada)

- Medir estado actual:
  - `latency p50/p95/p99` de `help.ask`.
  - `recall@k` sobre set de preguntas reales.
  - tasa `no-match`.
- Definir SLO objetivo:
  - p95 <= 300-500ms en retrieval semantico.

Exit criteria:
- Dashboard base con metricas y muestra representativa.

## Fase 1 - Migracion de esquema

- Nueva columna vectorial (o nueva tabla `HelpEmbeddingVector` temporal).
- Backfill desde embeddings existentes.
- Columnas tenant obligatorias.
- Indices ANN + filtros.

Exit criteria:
- Backfill 100% exitoso.
- Query vectorial devuelve mismos sourceId top-k esperados en test canario.

## Fase 2 - Servicio dual-read (canary)

- `HelpEmbeddingService` en modo dual:
  - lectura primaria actual (in-memory),
  - lectura sombra vector SQL (comparativa).
- Log de divergencias top-k.

Exit criteria:
- Divergencia aceptable (umbral definido).
- Sin regresion de respuestas en pruebas controladas.

## Fase 3 - Cutover controlado

- Feature flag por tenant:
  - `%` trafico en vector SQL.
- Fallback automatico a modo anterior ante error.

Exit criteria:
- p95 y error rate dentro de SLO.
- Sin degradacion funcional reportada.

## Fase 4 - Optimizacion

- Ajuste de `k`, umbrales por tipo de pregunta, boosts por seccion.
- Hibrido vector + keyword.
- Cache de query embeddings y/o resultados top-k por TTL corto.

Exit criteria:
- Mejoras estables durante 2-4 semanas de carga real.

---

## 6) Cambios de codigo (alto nivel)

Backend:

- `prisma/schema.prisma`
  - `HelpEmbedding` vector + tenant columns.
- Nueva migracion SQL para pgvector + indices.
- `help-embedding.service.ts`
  - Query vectorial SQL con filtros tenant.
  - Dual-read y feature flags.
- `help.service.ts`
  - Incluir tenant en retrieval.
  - Mantener fallback.

Ops/Config:

- Variables de entorno:
  - `HELP_VECTOR_ENABLED`
  - `HELP_VECTOR_READ_PERCENT`
  - `HELP_VECTOR_TOPK`
  - `HELP_VECTOR_THRESHOLD`
  - `HELP_EMBEDDING_DIM`

---

## 7) Seguridad y aislamiento

- Nunca consultar embeddings sin `organizationId`.
- `companyId` aplicado cuando contexto de empresa existe.
- Auditoria:
  - registrar tenant, top-k ids, latencia, source final.
- No mezclar contexto entre tenants en cache.

---

## 8) Riesgos y mitigacion

- Riesgo: dimension mismatch embeddings.
  - Mitigacion: validacion estricta al insertar.
- Riesgo: baja calidad por ANN approx.
  - Mitigacion: tuning de indice + hibrido + canary comparativo.
- Riesgo: regresion en respuestas.
  - Mitigacion: dual-read + fallback + feature flag por tenant.
- Riesgo: costo de reindexado.
  - Mitigacion: backfill por lotes y ventana controlada.

---

## 9) KPIs de exito

- `p95 retrieval latency` mejora >= 40% vs baseline.
- `recall@3` igual o mejor que baseline.
- `no-match rate` no aumenta.
- `fallback rate` < 2-5% post-estabilizacion.

---

## 10) Recomendacion final

Implementar en modo incremental con dual-read y canary por tenant, sin big-bang.

Orden recomendado:
1. Baseline.
2. Esquema + indices + backfill.
3. Dual-read comparativo.
4. Cutover progresivo por feature flag.
5. Hibrido y tuning final.

Este enfoque reduce riesgo operativo y permite validar mejora real de rendimiento antes de retirar el motor actual.
