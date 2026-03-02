# Plan de Entrenamiento ML Local — RTX 3080 Laptop

**Fecha:** 2026-02-24 (actualizado con diagnostico real)
**Hardware:** NVIDIA RTX 3080 Laptop (8-16 GB VRAM)
**Objetivo:** Mejorar los subsistemas ML existentes + crear modelos nuevos con datos transaccionales, entrenando localmente.

> **Nota:** No se toca el sistema de extraccion de facturas — funciona correctamente.

---

## DIAGNOSTICO: Estado Real de los Datos (2026-02-24)

Antes de entrenar hay que ser honestos sobre que datos existen:

### Datos Disponibles

| Tabla | Registros | Usable para ML? |
|-------|-----------|-----------------|
| Sales | **3,415** | SI — listo para entrenar hoy |
| Product | **897** | SI — listo para entrenar hoy |
| InventoryHistory | **miles** | SI — time series listo |
| SalesDetail | **miles** | SI — baskets listos |
| Client | **cientos** | SI — segmentacion posible |
| HelpMessage (con feedback) | **0** | NO — pipeline roto |
| HelpLearningSession | **0** | NO — nunca se implemento el envio al backend |
| HelpEmbedding | **0** | NO — Python deps no instaladas |
| HelpSynonymRule | **0** | NO — tabla muerta, sin codigo de insercion |
| HelpKBCandidate | **0** | NO — condiciones de creacion casi imposibles |
| JurisprudenceDocument | **0** | NO — pipeline incompleto (6 blockers) |
| JurisprudenceQuery | **0** | NO — depende de documentos |
| JurisprudenceEmbedding | **0** | NO — depende de documentos |
| AdGeneration | **9** | NO — 0 con selectedIndex (no se guarda) |

### Diagnostico de Pipelines Rotos

#### Help Assistant — 5 problemas

| # | Tabla | Problema | Archivo |
|---|-------|---------|---------|
| 1 | `HelpLearningSession` | Frontend solo escribe a localStorage, nunca llama al backend. Hay `// TODO: Enviar al backend` sin implementar | `fronted/src/context/help-assistant-context.tsx` ~linea 272 |
| 2 | `HelpMessage` | Queries respondidas localmente no llegan al backend. `syncQueue` puede fallar si `NEXT_PUBLIC_BACKEND_URL` esta mal | `fronted/src/context/help-assistant-context.tsx` |
| 3 | `HelpEmbedding` | `sentence_transformers` no instalado o `HELP_EMBEDDING_BIN` no configurado. Falla silenciosamente | `backend/src/help/help-embedding.service.ts` |
| 4 | `HelpSynonymRule` | No existe codigo que inserte registros en ninguna parte del codebase. Tabla muerta | N/A |
| 5 | `HelpKBCandidate` | Requiere: query falle local + respuesta AI + 3x thumbs up misma pregunta. Casi imposible | `backend/src/help/help.service.ts` |

**Fix requerido para Help:**
1. Implementar batch POST desde frontend a `/help/learning/sessions` (el TODO pendiente)
2. Verificar `NEXT_PUBLIC_BACKEND_URL` en `fronted/.env`
3. Instalar `sentence_transformers` y configurar `HELP_EMBEDDING_BIN`
4. Implementar insercion de sinonimos en backend o bajar `PROMOTION_THRESHOLD`

#### Jurisprudencia — 6 blockers en cadena

| # | Blocker | Detalle | Estado |
|---|---------|---------|--------|
| 1 | `JurisprudenceConfig` no existe | No hay seed, no hay UI para crearla | **FIXED** — RAG service ahora auto-crea config con upsert |
| 2 | Upload crashea | `publishDate` es `DateTime` requerido en BD pero opcional en form | **FIXED** — publishDate ahora es opcional en schema y controller |
| 3 | Sin extraccion de texto | Diagnostico INCORRECTO — `extractAndProcess()` SI se llama fire-and-forget en linea 227 del controller | N/A |
| 4 | Sin worker de extraccion | Diagnostico INCORRECTO — no se necesita worker, la llamada directa funciona | N/A |
| 5 | Scraper es placeholder | `scrapeCourt()` SI esta implementado pero depende de que existan URLs de cortes reales | Config/data |
| 6 | Necesita `OPENAI_API_KEY` | Para generar embeddings de documentos | Config — agregar a `.env` |

#### Ads — selectedIndex nunca se persiste (**FIXED**)

~~`selectedIndex` es solo estado React (`useState`). No existe:~~
- ~~Endpoint `PATCH /ads/generations/:id/selected` en backend~~
- ~~Llamada API en frontend para guardar la seleccion~~
- ~~El backend usa `adGen.selectedIndex ?? 0` al publicar (siempre variacion 0)~~

**Resuelto:** PATCH endpoint + frontend fire-and-forget implementados

### Conclusion del Diagnostico

**Las Fases 1-3 del plan original NO se pueden ejecutar hasta reparar los pipelines de datos.**
El plan se reestructura en dos caminos paralelos:

- **Camino A:** Reparar pipelines para que acumulen datos (prerequisito para Fases 1-3)
- **Camino B:** Entrenar modelos nuevos con los 3,415 ventas + 897 productos que SI existen

---

## Resumen Ejecutivo (Actualizado)

### Camino A — Reparar Pipelines (prerequisito)

| Pipeline | Fixes necesarios | Estado |
|----------|-----------------|--------|
| Ads (A.1) | PATCH endpoint + frontend fire-and-forget | **COMPLETADO** |
| Help Assistant (A.2) | Batch endpoint + backend sender + flush pipeline | **COMPLETADO** |
| Jurisprudencia (A.3) | Config auto-create + publishDate fix | **COMPLETADO** |

**Pendiente de configuracion (no es codigo):**
- Help: Instalar `sentence_transformers` y configurar `HELP_EMBEDDING_BIN`
- Jurisprudencia: Configurar `OPENAI_API_KEY` en `.env` para embeddings
- Jurisprudencia: Agregar URLs reales de cortes al scraper config

**Despues de configurar:** esperar 1-3 meses para acumular datos suficientes, luego ejecutar Fases 1-3.

### Camino B — Modelos Entrenables HOY (datos transaccionales)

| Modelo | Que hace | Datos disponibles | VRAM | Dificultad |
|--------|---------|-------------------|------|------------|
| Prediccion de demanda | Que producto se vende la proxima semana | InventoryHistory + Sales (miles) | ~1 GB | Media |
| Market basket analysis | "Quien compro X tambien compro Y" | Sales → SalesDetail (3,415 baskets) | CPU | Baja |
| Deteccion de precios anomalos | Alertar precios raros | SalesDetail vs EntryDetail vs Product | CPU | Baja |
| Clasificacion de productos | Auto-asignar categoria desde nombre | Product.name → categoryId (897 pares) | ~1 GB | Baja |
| Segmentacion de clientes RFM | Agrupar clientes por valor | Client → Sales (agregaciones) | CPU | Baja |

**Todo cabe en la RTX 3080.** No se necesita Colab para ninguna fase.

---

## Prerequisitos Comunes

### 1. Entorno Python para ML (separado del backend)

```bash
# Crear entorno virtual dedicado para training
cd backend/ml
python -m venv .venv-training
source .venv-training/Scripts/activate  # Windows

# Dependencias base
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
pip install sentence-transformers scikit-learn pandas numpy joblib
pip install psycopg2-binary  # conexion directa a PostgreSQL local
pip install jupyter notebook ipywidgets tqdm matplotlib
```

### 2. Script de Conexion a BD Local

```python
# backend/ml/db_connection.py
import psycopg2
import pandas as pd
import os

def get_connection():
    """Conexion directa a PostgreSQL local."""
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "ecoterra"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "")
    )

def query_to_df(sql: str, params=None) -> pd.DataFrame:
    """Ejecuta query y retorna DataFrame."""
    conn = get_connection()
    try:
        return pd.read_sql(sql, conn, params=params)
    finally:
        conn.close()
```

### 3. Estructura de Directorios

```
backend/ml/
├── db_connection.py              # Conexion a BD
├── training/                     # Notebooks de entrenamiento
│   ├── 01-help-embeddings.ipynb
│   ├── 02-help-query-classifier.ipynb
│   ├── 03-help-synonyms.ipynb
│   ├── 04-help-threshold-optimizer.ipynb
│   ├── 05-juris-embeddings.ipynb
│   ├── 06-juris-section-classifier.ipynb
│   ├── 07-juris-reranker.ipynb
│   ├── 08-juris-benchmark.ipynb
│   ├── 09-ads-preference.ipynb
│   ├── 10-ads-visual-cache.ipynb
│   └── 11-ads-prompt-optimizer.ipynb
├── models/                       # Modelos entrenados (.pkl, .pt)
│   ├── help/
│   ├── juris/
│   └── ads/
├── exports/                      # Datos exportados para training
│   ├── help/
│   ├── juris/
│   └── ads/
└── .venv-training/               # Entorno virtual (no commitear)
```

---

## Fase 1: Help Assistant — Embeddings + RAG

**Prioridad:** ALTA (dataset maduro con feedback labels, mejora inmediata)
**Tiempo estimado:** 2-3 dias de trabajo
**VRAM:** ~2 GB

### 1.1 Fine-tuning de Embeddings con Feedback Real

**Que tenemos:**
- `HelpMessage` con campo `feedback` (POSITIVE/NEGATIVE) — datos etiquetados gratis
- `HelpEmbedding` con embeddings actuales (modelo generico multilingual)
- `HelpKBCandidate` con respuestas promovidas al KB

**Que hacemos:**
- Exportar pares `(pregunta, respuesta, feedback)` desde `HelpMessage`
- Fine-tuning contrastivo del modelo `paraphrase-multilingual-MiniLM-L12-v2`
- Pares POSITIVE: acercar pregunta ↔ respuesta (positive pairs)
- Pares NEGATIVE: alejar pregunta ↔ respuesta (hard negatives)
- Resultado: embeddings que entienden vocabulario especifico de los usuarios

**Script de exportacion:**

```python
# backend/ml/training/export_help_data.py
from db_connection import query_to_df

def export_help_feedback():
    """Exporta pares pregunta-respuesta con feedback."""
    df = query_to_df("""
        SELECT
            m1.content AS question,
            m2.content AS answer,
            m2.feedback,
            m2.score,
            m2.section,
            m2.source
        FROM "HelpMessage" m1
        JOIN "HelpMessage" m2
            ON m1."sessionId" = m2."sessionId"
            AND m1.role = 'USER'
            AND m2.role = 'ASSISTANT'
            AND m2.feedback IS NOT NULL
        ORDER BY m2."createdAt" DESC
    """)
    df.to_csv("../exports/help/feedback_pairs.csv", index=False)
    print(f"Exportados {len(df)} pares con feedback")
    print(f"  POSITIVE: {len(df[df.feedback == 'POSITIVE'])}")
    print(f"  NEGATIVE: {len(df[df.feedback == 'NEGATIVE'])}")
    return df
```

**Notebook de entrenamiento (resumen):**

```python
# 01-help-embeddings.ipynb — Pasos clave

from sentence_transformers import SentenceTransformer, InputExample, losses
from torch.utils.data import DataLoader

# 1. Cargar modelo base (el mismo que ya usa el backend)
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

# 2. Construir training examples desde feedback
train_examples = []
for _, row in df.iterrows():
    label = 1.0 if row.feedback == 'POSITIVE' else 0.0
    train_examples.append(InputExample(
        texts=[row.question, row.answer], label=label
    ))

# 3. Fine-tuning contrastivo
train_dataloader = DataLoader(train_examples, shuffle=True, batch_size=16)
train_loss = losses.CosineSimilarityLoss(model)

model.fit(
    train_objectives=[(train_dataloader, train_loss)],
    epochs=3,
    warmup_steps=100,
    output_path="../models/help/embeddings-finetuned"
)
```

**Integracion al backend:**
- Cambiar `HELP_EMBEDDING_SCRIPT` para cargar modelo desde `models/help/embeddings-finetuned/` en vez del modelo generico de HuggingFace
- O modificar `help_embeddings.py` para aceptar `--model-path` como argumento

### 1.2 Clasificador de Queries Invalidas

**Que tenemos:**
- `HelpLearningSession` con campos booleanos: `isInvalidQuery`, `isMetaQuestion`, `matchFound`, `wasHelpful`

**Que hacemos:**
- Entrenar clasificador que detecta queries invalidas/meta ANTES de buscar embeddings
- Ahorro: evita llamadas a Claude Haiku para queries basura ("asdf", "hola", "test")

**Script de exportacion:**

```python
def export_help_sessions():
    """Exporta sesiones de aprendizaje para clasificador."""
    df = query_to_df("""
        SELECT
            query, "queryNorm", section,
            "matchFound", confidence, "wasHelpful",
            "isInvalidQuery", "isMetaQuestion",
            source, urgency, "userType"
        FROM "HelpLearningSession"
        WHERE query IS NOT NULL
    """)
    df.to_csv("../exports/help/learning_sessions.csv", index=False)
    print(f"Exportadas {len(df)} sesiones")
    return df
```

**Modelo:** TF-IDF + LogisticRegression (no necesita GPU, entrena en segundos)

**Entregable:** `models/help/query_classifier.pkl`

### 1.3 Expansion Automatica de Sinonimos

**Que tenemos:**
- `HelpSynonymRule` con pares `canonical ↔ synonym` + `confidence`
- Corpus de queries de `HelpLearningSession`

**Que hacemos:**
- Entrenar FastText en espanol con el corpus de queries
- Generar candidatos de sinonimos por similaridad vectorial
- Filtrar por threshold de confianza
- Exportar como JSON para importar al backend

**Entregable:** `models/help/synonym_candidates.json`

### 1.4 Threshold Optimo por Seccion

**Que tenemos:**
- `HelpLearningSession` con `confidence` + `wasHelpful` + `section`

**Que hacemos:**
- Analisis estadistico: para cada seccion, encontrar el threshold que maximiza F1
- Generar mapa `{ section: optimalThreshold }`

**Entregable:** `models/help/section_thresholds.json`

**Uso:** `HelpEmbeddingService` lee el JSON y aplica threshold dinamico por seccion en vez del fijo 0.82

---

## Fase 2: Jurisprudencia RAG — Busqueda Legal

**Prioridad:** ALTA (vertical legal necesita precision en busqueda)
**Tiempo estimado:** 3-5 dias de trabajo
**VRAM:** ~4-6 GB

### 2.1 Fine-tuning de Embeddings Legales

**Que tenemos:**
- `JurisprudenceDocumentSection` con `sectionText` estructurado por tipo
- `JurisprudenceQuery` con `query`, `answer`, `documentsUsed` (JSON con IDs de docs relevantes)
- `JurisprudenceEmbedding` con `chunkText` actual

**Que hacemos:**
- Exportar pares `(query, seccion_relevante)` desde `JurisprudenceQuery.documentsUsed`
- Fine-tuning contrastivo del mismo `MiniLM-L12-v2` (o modelo legal si existe)
- Hard negatives: secciones del mismo documento que NO fueron citadas

**Script de exportacion:**

```python
def export_juris_training_data():
    """Exporta pares query-documento para fine-tuning."""
    # Queries con documentos usados
    queries = query_to_df("""
        SELECT id, query, answer, "documentsUsed", confidence,
               "userFeedback", "hasValidCitations"
        FROM "JurisprudenceQuery"
        WHERE "documentsUsed" IS NOT NULL
    """)

    # Secciones de documentos
    sections = query_to_df("""
        SELECT ds.id, ds."documentId", ds."sectionType",
               ds."sectionText", ds."structureType"
        FROM "JurisprudenceDocumentSection" ds
        WHERE ds."sectionText" IS NOT NULL
          AND LENGTH(ds."sectionText") > 50
    """)

    queries.to_csv("../exports/juris/queries.csv", index=False)
    sections.to_csv("../exports/juris/sections.csv", index=False)
    return queries, sections
```

**Notebook:** Fine-tuning contrastivo similar a Help, pero con datos legales.

**Entregable:** `models/juris/legal-embeddings-finetuned/`

### 2.2 Clasificador de Secciones de Documento

**Que tenemos:**
- `JurisprudenceDocumentSection` con `sectionType` y `structureType` etiquetados

**Que hacemos:**
- Entrenar clasificador que predice tipo de seccion desde texto
- Tipos: CONSIDERANDO, FUNDAMENTOS, FALLO, ANTECEDENTES, etc.
- Uso: mejorar el chunking automatico de documentos nuevos

**Modelo:** TF-IDF + SVM o small BERT (cabe en <1 GB VRAM)

**Entregable:** `models/juris/section_classifier.pkl`

### 2.3 Reranker Cross-Encoder

**Que tenemos:**
- Pares `(query, seccion)` con labels implicitos de `documentsUsed`

**Que hacemos:**
- Fine-tunear `cross-encoder/ms-marco-MiniLM-L-6-v2` con pares legales
- El reranker recibe (query, candidato) y produce score de relevancia
- Flujo mejorado: embeddings → top-20 → reranker → top-5 → LLM

**VRAM:** ~2 GB para el cross-encoder. Cabe perfecto en RTX 3080.

**Entregable:** `models/juris/legal-reranker/`

**Integracion:** Nuevo paso en el pipeline de busqueda de jurisprudencia entre retrieval y generacion.

### 2.4 Benchmark de Evaluacion

**Que tenemos:**
- `JurisprudenceQuery` con `hasValidCitations`, `userFeedback`, `documentsUsed`

**Que hacemos:**
- Construir test set automatico: queries con feedback positivo + documentos usados como ground truth
- Medir Recall@5, Recall@10, MRR (Mean Reciprocal Rank)
- Comparar: embeddings actuales vs fine-tuned vs fine-tuned + reranker
- Resultado: numeros concretos de mejora

**Entregable:** `training/08-juris-benchmark.ipynb` con metricas comparativas

---

## Fase 3: Ad Generation — Optimizacion de Publicidad

**Prioridad:** MEDIA (funciona bien pero se puede optimizar costos y calidad)
**Tiempo estimado:** 2-3 dias de trabajo
**VRAM:** ~2-4 GB

### 3.1 Modelo de Preferencia de Copy

**Que tenemos:**
- `AdGeneration` con `variations` (JSON, 3 variaciones) + `selectedIndex` (cual eligio el usuario)
- Metadata: `tone`, `style`, productId con relacion a `Product` (category, brand)

**Que hacemos:**
- Exportar `(categoria, marca, tono, estilo, texto_variacion, fue_seleccionada)`
- Entrenar clasificador binario: predice si una variacion sera seleccionada
- Uso: rankear variaciones antes de mostrar, o guiar el prompt de Gemini

**Script de exportacion:**

```python
def export_ad_preferences():
    """Exporta datos de preferencia de variaciones publicitarias."""
    df = query_to_df("""
        SELECT
            ag.id,
            ag.tone,
            ag.style,
            ag."selectedIndex",
            ag.variations,
            ag.analysis,
            p.name AS product_name,
            c.name AS category_name,
            b.name AS brand_name
        FROM "AdGeneration" ag
        LEFT JOIN "Product" p ON ag."productId" = p.id
        LEFT JOIN "Category" c ON p."categoryId" = c.id
        LEFT JOIN "Brand" b ON p."brandId" = b.id
        WHERE ag."selectedIndex" IS NOT NULL
          AND ag.variations IS NOT NULL
    """)
    df.to_csv("../exports/ads/ad_preferences.csv", index=False)
    return df
```

**Modelo:** TF-IDF sobre texto de variaciones + features categoricas → LogisticRegression o XGBoost

**Entregable:** `models/ads/copy_preference.pkl`

### 3.2 Cache Visual Inteligente

**Que tenemos:**
- `AdGeneration.analysis` (JSON con `dominantColors`, `productType`, `mood`, `targetAudience`)
- Imagenes de productos en `Product.images`

**Que hacemos:**
- Fine-tunear ResNet-18 como clasificador visual de productos
- Categorias: electronica, ropa, alimentos, cosmeticos, etc. (derivadas de `Category`)
- Si un producto nuevo es visualmente similar a uno ya analizado, reusar el `analysis` sin llamar a Gemini Vision
- Ahorro estimado: ~50% menos llamadas a Gemini Vision para catalogo con categorias repetidas

**VRAM:** ~1 GB. ResNet-18 es muy liviano.

**Entregable:** `models/ads/visual_classifier.pt`

### 3.3 Optimizador de Prompts por Datos

**Que tenemos:**
- Variaciones seleccionadas vs rechazadas en `AdGeneration`

**Que hacemos:**
- Analisis estadistico (no necesita GPU):
  - Largo promedio de titulo en seleccionadas vs rechazadas
  - Hashtags mas frecuentes en seleccionadas
  - CTAs que convierten mejor por categoria
  - Tono optimo por tipo de producto
- Generar prompt templates basados en datos reales

**Entregable:** `models/ads/prompt_templates.json` con templates optimizados por categoria/tono

---

---

## CAMINO A: Reparar Pipelines de Recoleccion de Datos

> Prerequisito obligatorio antes de ejecutar Fases 1-3. Sin datos, no hay entrenamiento.

### A.1 Fix Ads — selectedIndex (0.5 dias)

**El mas facil y rapido.** Solo falta un endpoint y una llamada.

**Backend — agregar endpoint:**
```typescript
// En ads.controller.ts
@Patch(':id/selected')
@UseGuards(JwtAuthGuard)
async selectVariation(
  @Param('id', ParseIntPipe) id: number,
  @Body('selectedIndex') selectedIndex: number,
) {
  return this.adsService.updateSelectedIndex(id, selectedIndex);
}
```

**Backend — agregar metodo en servicio:**
```typescript
// En ads.service.ts
async updateSelectedIndex(id: number, selectedIndex: number) {
  return this.prisma.adGeneration.update({
    where: { id },
    data: { selectedIndex },
  });
}
```

**Frontend — llamar al guardar seleccion:**
```typescript
// En ads.api.tsx — nueva funcion
export async function selectAdVariation(generationId: number, selectedIndex: number) {
  return authFetch(`${BACKEND_URL}/api/ads/generations/${generationId}/selected`, {
    method: 'PATCH',
    body: JSON.stringify({ selectedIndex }),
  });
}
```

**Frontend — disparar en el click:**
```typescript
// En el componente de promocion, cuando el usuario clickea una variacion
const handleSelectVariation = async (index: number) => {
  promo.setSelectedIndex(index);
  await selectAdVariation(generationId, index); // Persistir en BD
};
```

**Resultado:** Cada seleccion de variacion se guarda en BD. Con ~100 selecciones ya puedes entrenar el modelo de preferencia.

### A.2 Fix Help Assistant (2-3 dias)

**Fix 1: HelpLearningSession → backend (CRITICO)**

El frontend ya tiene toda la logica de tracking en `adaptive-learning.ts` pero solo escribe a `localStorage`. Implementar el batch POST:

```typescript
// En help-assistant-context.tsx — implementar el TODO pendiente
// Agregar flush periodico que envia sesiones al backend

const flushLearningSessionsToBackend = async () => {
  const sessions = JSON.parse(localStorage.getItem('help_learning_sessions') || '[]');
  if (sessions.length === 0) return;

  try {
    await authFetch('/api/help/learning/sessions/batch', {
      method: 'POST',
      body: JSON.stringify({ sessions }),
    });
    localStorage.removeItem('help_learning_sessions');
  } catch (e) {
    // Retry en el proximo flush
  }
};

// Llamar cada 30 segundos o al cerrar el asistente
```

**Fix 2: Verificar NEXT_PUBLIC_BACKEND_URL**

Revisar `fronted/.env` y confirmar que `NEXT_PUBLIC_BACKEND_URL` apunta correctamente al backend. Si no esta configurado, el `syncQueue` pierde todos los mensajes.

**Fix 3: Instalar dependencias Python**

```bash
# En el entorno Python del backend
pip install sentence-transformers
# Agregar a backend/.env:
HELP_EMBEDDING_BIN=python
HELP_EMBEDDING_SCRIPT=./src/ml/help_embeddings.py
```

**Fix 4: Feedback en mensajes locales**

Actualmente solo mensajes con ID `db-*` envian feedback al backend. Los mensajes respondidos localmente usan IDs `local-*` y el feedback se pierde. Fix: enviar feedback de mensajes locales tambien.

**Tiempo para datos utiles despues del fix:** ~1-2 meses con uso activo del chatbot de ayuda.

### A.3 Fix Jurisprudencia (4-5 dias) — MAYOR ESFUERZO

**Fix 1: Seed de JurisprudenceConfig**

```typescript
// En seed o migration — crear config para la organizacion
await prisma.jurisprudenceConfig.create({
  data: {
    organizationId: 1,
    ragEnabled: true,
    scrapingEnabled: false, // Activar cuando el scraper este listo
    embeddingModel: 'paraphrase-multilingual-MiniLM-L12-v2',
  },
});
```

**Fix 2: publishDate opcional en upload**

```typescript
// En jurisprudence-documents.controller.ts
const publishDate = dto.publishDate ? new Date(dto.publishDate) : new Date();
```

**Fix 3-4: Implementar extraccion de texto + worker**

Crear un worker que consume `extractQueue` y usa `pdf-parse` para extraer texto de cada pagina, creando `JurisprudenceDocumentPage` records.

**Fix 5: Scraper real (opcional, puede esperar)**

Implementar scraping real de tribunales peruanos o dejar solo upload manual.

**Fix 6: Embeddings con modelo local en vez de OpenAI**

Cambiar `JurisprudenceEmbeddingService` para usar `sentence-transformers` (como Help) en vez de depender de `OPENAI_API_KEY`.

**Tiempo para datos utiles despues del fix:** Depende de cuantos documentos suban. Con 50+ documentos y 100+ queries ya es entrenable.

---

## CAMINO B: Modelos Entrenables HOY (Datos Transaccionales)

> Estos modelos se pueden entrenar AHORA con los 3,415 ventas y 897 productos existentes.

### B.1 Prediccion de Demanda por Producto

**Que hace:** Predice cuantas unidades de cada producto se venderan la proxima semana/mes.
**Reemplaza:** `PredictiveAlgorithmService` que usa regresion lineal simple.

**Datos:**
- `InventoryHistory`: cada movimiento de stock con timestamp, `stockChange`, `action`
- `Sales + SalesDetail`: venta por producto por dia
- Features derivables: dia de semana, semana del mes (quincena es pico en Peru), mes, tienda

**Script de exportacion:**

```python
# backend/ml/training/export_demand_data.py
from db_connection import query_to_df

def export_daily_demand():
    """Exporta demanda diaria por producto."""
    df = query_to_df("""
        SELECT
            sd."productId",
            p.name AS product_name,
            p."categoryId",
            c.name AS category_name,
            s."storeId",
            DATE(s."createdAt") AS sale_date,
            EXTRACT(DOW FROM s."createdAt") AS day_of_week,
            EXTRACT(DAY FROM s."createdAt") AS day_of_month,
            EXTRACT(MONTH FROM s."createdAt") AS month,
            SUM(sd.quantity) AS units_sold,
            SUM(sd.price * sd.quantity) AS revenue
        FROM "SalesDetail" sd
        JOIN "Sales" s ON sd."salesId" = s.id
        JOIN "Product" p ON sd."productId" = p.id
        LEFT JOIN "Category" c ON p."categoryId" = c.id
        WHERE s."organizationId" = 1
        GROUP BY sd."productId", p.name, p."categoryId", c.name,
                 s."storeId", DATE(s."createdAt"),
                 EXTRACT(DOW FROM s."createdAt"),
                 EXTRACT(DAY FROM s."createdAt"),
                 EXTRACT(MONTH FROM s."createdAt")
        ORDER BY sale_date
    """)
    df.to_csv("../exports/demand/daily_demand.csv", index=False)
    print(f"Exportados {len(df)} registros de demanda diaria")
    print(f"  Productos unicos: {df.productId.nunique()}")
    print(f"  Rango de fechas: {df.sale_date.min()} a {df.sale_date.max()}")
    return df
```

**Notebook resumen:**

```python
# training/12-demand-forecast.ipynb

# Opcion 1: Prophet (Facebook) — facil, bueno para estacionalidad
from prophet import Prophet

# Por cada producto con suficientes ventas (>30 dias de data)
model = Prophet(weekly_seasonality=True, yearly_seasonality=True)
model.add_regressor('is_quincena')  # Feature Peru: quincena = pico de ventas
model.fit(product_df[['ds', 'y', 'is_quincena']])
forecast = model.predict(future_dates)

# Opcion 2: LSTM (PyTorch) — para GPU, mejor precision con suficientes datos
# Sequence de 30 dias → predice proximos 7 dias
# Features: units_sold, day_of_week, day_of_month, month, is_quincena
```

**VRAM:** ~1 GB con LSTM, ~0 con Prophet (CPU).
**Integracion:** Reemplazar `PredictiveAlgorithmService.calculateLinearTrend()` con prediccion del modelo.

### B.2 Market Basket Analysis — "Comprados Juntos"

**Que hace:** Descubre que productos se compran juntos frecuentemente.
**Uso en UI:** Sugerencias en POS: "Los clientes que compraron X tambien compraron Y".

**Datos:** Cada `Sales.id` es un basket. Cada `SalesDetail.productId` es un item del basket.

**Script de exportacion:**

```python
def export_baskets():
    """Exporta baskets (transacciones) para association rules."""
    df = query_to_df("""
        SELECT
            s.id AS basket_id,
            sd."productId",
            p.name AS product_name,
            p."categoryId",
            sd.quantity,
            sd.price,
            s."clientId",
            s.source,
            s."storeId",
            DATE(s."createdAt") AS sale_date
        FROM "Sales" s
        JOIN "SalesDetail" sd ON sd."salesId" = s.id
        JOIN "Product" p ON sd."productId" = p.id
        WHERE s."organizationId" = 1
    """)
    df.to_csv("../exports/baskets/transactions.csv", index=False)
    print(f"Exportados {len(df)} items en {df.basket_id.nunique()} baskets")
    return df
```

**Notebook resumen:**

```python
# training/13-basket-analysis.ipynb
from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder

# Construir matriz de transacciones
baskets = df.groupby('basket_id')['productId'].apply(list).tolist()
te = TransactionEncoder()
te_array = te.fit_transform(baskets)
basket_df = pd.DataFrame(te_array, columns=te.columns_)

# Encontrar itemsets frecuentes
frequent = apriori(basket_df, min_support=0.01, use_colnames=True)

# Generar reglas de asociacion
rules = association_rules(frequent, metric="lift", min_threshold=1.5)
# Resultado: "Si compran laptop, 73% tambien compran mouse" (lift=4.2)

rules.to_json("../models/baskets/association_rules.json")
```

**VRAM:** 0 — corre en CPU. Muy rapido con 3,415 baskets.
**Integracion:** Endpoint nuevo `GET /products/:id/frequently-bought-together` que lee las reglas y sugiere productos.

### B.3 Deteccion de Precios Anomalos

**Que hace:** Alerta cuando un precio de venta o compra es anormalmente alto/bajo.
**Uso:** Warning en el POS al registrar venta, o al crear entrada de compra.

**Datos:** `SalesDetail.price` (venta real) vs `EntryDetail.price` (costo) vs `Product.priceSell` (precio configurado).

**Script de exportacion:**

```python
def export_price_data():
    """Exporta datos de precios para deteccion de anomalias."""
    df = query_to_df("""
        SELECT
            sd."productId",
            p.name,
            sd.price AS sale_price,
            p."priceSell" AS configured_price,
            ed.price AS cost_price,
            (sd.price - ed.price) / NULLIF(ed.price, 0) AS margin_pct,
            (p."priceSell" - sd.price) / NULLIF(p."priceSell", 0) AS discount_pct,
            DATE(s."createdAt") AS sale_date
        FROM "SalesDetail" sd
        JOIN "Sales" s ON sd."salesId" = s.id
        JOIN "Product" p ON sd."productId" = p.id
        LEFT JOIN "EntryDetail" ed ON sd."entryDetailId" = ed.id
        WHERE s."organizationId" = 1
    """)
    df.to_csv("../exports/prices/price_history.csv", index=False)
    return df
```

**Modelo:** Isolation Forest (scikit-learn) por producto. Detecta outliers en margen y descuento.

```python
# training/14-price-anomaly.ipynb
from sklearn.ensemble import IsolationForest

# Por cada producto con >10 ventas
for product_id, group in df.groupby('productId'):
    features = group[['margin_pct', 'discount_pct', 'sale_price']].dropna()
    if len(features) < 10:
        continue
    model = IsolationForest(contamination=0.05)  # 5% anomalias esperadas
    group['is_anomaly'] = model.fit_predict(features)
    # -1 = anomalia, 1 = normal
```

**VRAM:** 0 — CPU puro.
**Integracion:** Endpoint `POST /products/:id/check-price` que valida antes de confirmar venta.

### B.4 Clasificacion Automatica de Productos

**Que hace:** Sugiere categoria automaticamente cuando crean un producto nuevo.
**Uso:** Al escribir el nombre del producto, auto-completar la categoria.

**Datos:** 897 pares `Product.name → categoryId` etiquetados.

```python
# training/15-product-classifier.ipynb
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.pipeline import Pipeline

pipeline = Pipeline([
    ('tfidf', TfidfVectorizer(ngram_range=(1, 2), max_features=5000)),
    ('clf', LinearSVC(C=1.0)),
])

pipeline.fit(products.name, products.categoryId)
# Resultado: "LAPTOP LENOVO 15 I5" → Categoria: "Computadoras"

joblib.dump(pipeline, "../models/products/category_classifier.pkl")
```

**VRAM:** 0 — CPU.
**Integracion:** Endpoint `POST /products/suggest-category` que recibe nombre y retorna categoria sugerida.

### B.5 Segmentacion de Clientes (RFM)

**Que hace:** Clasifica clientes en grupos por valor (VIP, frecuente, en riesgo, perdido).
**Uso:** Dashboard de clientes con segmentos, campanas dirigidas.

**Datos:** Agregaciones de `Client → Sales`:

```python
def export_rfm():
    """Exporta metricas RFM por cliente."""
    df = query_to_df("""
        SELECT
            c.id AS client_id,
            c.name,
            c.type,
            COUNT(s.id) AS frequency,
            SUM(s.total) AS monetary,
            MAX(s."createdAt") AS last_purchase,
            MIN(s."createdAt") AS first_purchase,
            AVG(s.total) AS avg_order_value,
            COUNT(DISTINCT sd."productId") AS product_breadth
        FROM "Client" c
        JOIN "Sales" s ON s."clientId" = c.id
        JOIN "SalesDetail" sd ON sd."salesId" = s.id
        WHERE c."organizationId" = 1
        GROUP BY c.id, c.name, c.type
        HAVING COUNT(s.id) >= 1
    """)
    df.to_csv("../exports/clients/rfm.csv", index=False)
    return df
```

**Modelo:** K-Means clustering sobre features RFM normalizadas.

```python
# training/16-client-segmentation.ipynb
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

features = df[['recency_days', 'frequency', 'monetary', 'avg_order_value']]
scaler = StandardScaler()
X = scaler.fit_transform(features)

kmeans = KMeans(n_clusters=4, random_state=42)
df['segment'] = kmeans.fit_predict(X)
# Segmentos: 0=VIP, 1=Frecuente, 2=En riesgo, 3=Perdido
```

**VRAM:** 0 — CPU.
**Integracion:** Endpoint `GET /clients/segments` + visualizacion en dashboard.

---

## Roadmap de Implementacion (Actualizado)

### Orden recomendado:

```
INMEDIATO (esta semana):
├── Dia 1: Entorno Python + db_connection.py + estructura directorios
├── Dia 2: Camino B — Notebooks 12-13 (demanda + baskets)
├── Dia 3: Camino B — Notebooks 14-16 (precios, clasificacion, RFM)
└── Dia 3: Fix A.1 — Ads selectedIndex (0.5 dias, el fix mas facil)

SEMANA 2-3 (reparaciones):
├── Fix A.2 — Help Assistant pipeline (2-3 dias)
├── Fix A.3 — Jurisprudencia pipeline (4-5 dias)
└── Integrar modelos Camino B al backend (endpoints nuevos)

MES 2-3 (acumular datos):
├── Usuarios generan feedback en Help (meta: 200+ mensajes)
├── Suben documentos legales (meta: 50+ documentos)
└── Seleccionan variaciones de ads (meta: 100+ selecciones)

MES 3-4 (entrenar modelos ML originales con RTX 3080):
├── Fase 1: Help embeddings fine-tuning (~25 min GPU)
├── Fase 2: Juris embeddings + reranker (~1h GPU)
└── Fase 3: Ads preference model (~10 min GPU)
```

### Metricas de Exito

**Camino B — Inmediato:**

| Modelo | Metrica | Meta |
|--------|---------|------|
| Demanda | MAPE (error %) por producto | < 25% para productos con >50 ventas |
| Baskets | Lift de reglas encontradas | > 2.0 para top-10 reglas |
| Precios | False positive rate | < 5% (no alarmar innecesariamente) |
| Clasificacion | Accuracy en test set | > 80% en top-1 categoria |
| RFM | Silhouette score | > 0.3 (clusters bien separados) |

**Fases 1-3 — Futuro (despues de acumular datos):**

| Subsistema | Metrica Actual | Meta |
|-----------|---------------|------|
| Help embeddings | Threshold fijo 0.82 | Threshold dinamico, +15% respuestas correctas sin AI |
| Help queries | Todas pasan por pipeline | Filtrar ~20% queries invalidas antes de buscar |
| Juris retrieval | Embeddings genericos | Recall@5 > 0.7 en benchmark legal |
| Juris reranker | No existe | +25% precision en top-5 resultados |
| Ads copy | 3 variaciones aleatorias | Variacion preferida en top-1 el 60%+ del tiempo |
| Ads vision | Llamada Gemini por producto | ~50% menos llamadas via cache visual |

---

## Deploy a Produccion

Los modelos entrenados son archivos estaticos. El backend los carga con CPU.

| Aspecto | Detalle |
|---------|---------|
| GPU en produccion? | NO — inference corre en CPU |
| Tamano total modelos | ~250 MB (cabe en Docker image) |
| Cambios en NestJS? | Minimos — nuevos endpoints, paths a modelos |
| Latencia | ~1-200ms por prediccion (aceptable) |
| Reentrenamiento | Cada 3-4 semanas con datos nuevos |

### Como subir modelos

Incluir en Docker image (lo mas simple):
```dockerfile
COPY backend/ml/models/ /app/ml/models/
```

O usar env var para path:
```env
ML_MODELS_PATH=/app/ml/models
```

---

## Cuando SI usar Colab (fallback)

Solo si en el futuro necesitas:
- Fine-tunear LLMs grandes (>8B params): Llama-3, Phi-3-medium → necesitan >16 GB VRAM
- Fine-tunear Stable Diffusion XL para generacion de imagenes → ~20 GB VRAM
- Training que tome >8 horas continuas (tu laptop necesita descansar)

Para todo lo demas, la RTX 3080 es suficiente y mas conveniente.

---

## Archivos a NO Commitear

```gitignore
# Agregar a .gitignore
backend/ml/.venv-training/
backend/ml/models/**/*.pt
backend/ml/models/**/*.pkl
backend/ml/exports/
```

Los modelos entrenados son binarios grandes. Guardar en almacenamiento externo o Google Drive del equipo, no en git.
