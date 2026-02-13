# 🧪 GUÍA DE TESTING Y AFINAMIENTO DEL CHATBOT

**Fecha:** 13 de Febrero, 2026
**Propósito:** Guía práctica para probar y afinar el chatbot usando el sistema de testing

---

## 📖 Tabla de Contenidos

1. [Cómo Usar el Panel de Testing](#cómo-usar-el-panel-de-testing)
2. [Tipos de Pruebas](#tipos-de-pruebas)
3. [Interpretar Resultados](#interpretar-resultados)
4. [Ajustar el Sistema](#ajustar-el-sistema)
5. [Agregar Nuevas Pruebas](#agregar-nuevas-pruebas)
6. [Troubleshooting](#troubleshooting)

---

## 🎮 Cómo Usar el Panel de Testing

### Paso 1: Acceder al Panel

1. Ir a **Dashboard → Usuarios** (requiere rol SUPER_ADMIN)
2. Buscar la pestaña **"Testing del Chatbot"**
3. Verás el panel completo de pruebas

### Paso 2: Ejecutar Pruebas

**Opción A: Ejecutar Todas las Pruebas**
```
1. Dejar filtro en "Todas"
2. Click en "▶️ Ejecutar Pruebas"
3. Esperar 1-2 segundos
4. Ver resultados completos
```

**Opción B: Filtrar por Categoría**
```
1. Seleccionar categoría: Válidas, Genéricas, Quejas, etc.
2. Click en "▶️ Ejecutar Pruebas"
3. Ver solo resultados de esa categoría
```

### Paso 3: Analizar Resultados

#### Panel de Resumen

Verás 4 métricas clave:

```
┌──────────────┬──────────┬───────────┬──────────────┐
│ Total        │ Pasadas  │ Falladas  │ Tasa Éxito  │
│   50         │   45     │    5      │   90.0%     │
└──────────────┴──────────┴───────────┴──────────────┘
```

**Interpretación:**
- **Tasa >= 95%**: ✅ Excelente - Sistema muy preciso
- **Tasa 85-94%**: ⚠️ Bueno - Algunos ajustes menores
- **Tasa 70-84%**: ⚠️ Regular - Necesita afinamiento
- **Tasa <70%**: ❌ Malo - Requiere ajustes críticos

#### Resultados por Categoría

```
✅ valida: 20/20 (100.0%)
✅ generica: 4/4 (100.0%)
⚠️ queja: 3/4 (75.0%)    ← Necesita atención
✅ meta: 3/3 (100.0%)
❌ ambigua: 0/3 (0.0%)    ← Requiere trabajo
✅ incorrecta: 2/2 (100.0%)
```

**Interpretación por categoría:**

**1. Válidas (Preguntas normales)**
- **100%**: ✅ Perfecto - El chatbot entiende bien
- **<90%**: ❌ Problema - Revisar keywords/aliases

**2. Genéricas ("que mas info", "ayuda")**
- **100%**: ✅ Perfecto - Detecta y pide clarificación
- **<100%**: ❌ Problema - Ajustar GENERIC_PATTERNS

**3. Quejas ("no te pregunté eso")**
- **100%**: ✅ Perfecto - Detecta quejas del usuario
- **<90%**: ❌ Problema - Ajustar COMPLAINT_PATTERNS

**4. Meta ("que haces", "quien eres")**
- **100%**: ✅ Perfecto - Se presenta correctamente
- **<100%**: ❌ Problema - Ajustar isMetaQuestion()

**5. Ambiguas ("como lo hago", "donde está")**
- **0-50%**: ✅ Normal - Esperado que fallen (necesitan contexto)
- **>70%**: ⚠️ Revisar - Puede estar adivinando

**6. Incorrectas (fuera de scope)**
- **100%**: ✅ Perfecto - No responde a queries irrelevantes
- **<100%**: ❌ Problema - Threshold muy bajo

### Paso 4: Ver Detalles de Prueba

1. **Click en cualquier prueba** en la lista
2. Se abrirá panel con:
   - ✅ Validación de query
   - 🎯 Mejor match encontrado
   - 📊 Score y tipo de matching
   - ⚠️ Issues detectados
   - 💡 Sugerencias de mejora

#### Ejemplo de Prueba Fallida

```
Test: "como veo mi catalogo"
Categoría: valida
Sección: catalog

❌ FALLIDA

Validación de Query:
✅ Válida: Sí

Mejor Match:
Entry ID: api-rate-limiting
Pregunta: "La API tiene límites de peticiones..."
Score: 45.0%
Tipo de Match: fuzzy

❌ Issues:
- Match incorrecto: esperado 'catalog-view', obtenido 'api-rate-limiting'
- Score bajo: 0.45 < 0.75 (esperado)
- Respuesta no relevante (reason: keyword-mismatch)

💡 Sugerencias:
- Considerar agregar alias o keywords para mejorar matching
- Mejorar keywords en catalog-view entry
```

### Paso 5: Descargar Reporte

```
1. Click en "📥 Descargar Reporte"
2. Se descarga archivo markdown con resultados completos
3. Revisar offline o compartir con el equipo
```

---

## 📂 Tipos de Pruebas

### 1. Válidas (20 pruebas)

**Qué prueban:** Preguntas normales del usuario que deben obtener respuesta correcta

**Ejemplos:**
```
✅ "como hago una venta" → debe matchear con "sales-create"
✅ "como creo un producto" → debe matchear con "products-create"
✅ "donde veo mi stock" → debe matchear con "inventory-view"
```

**Criterios de éxito:**
- Query válida ✅
- Match correcto ✅
- Score >= 0.75 ✅
- Respuesta relevante ✅

### 2. Genéricas (4 pruebas)

**Qué prueban:** Preguntas muy genéricas que requieren clarificación

**Ejemplos:**
```
❌ "que mas informacion me puedes dar"
❌ "dame algo mas"
❌ "ayuda"
```

**Criterios de éxito:**
- Query inválida (reason: "generic") ✅
- No responde con entry específica ✅
- Pide clarificación con ejemplos ✅

### 3. Quejas (4 pruebas)

**Qué prueban:** Usuario quejándose de respuesta anterior

**Ejemplos:**
```
❌ "no te pregunté sobre eso"
❌ "eso no es lo que pedí"
❌ "no me estás entendiendo"
```

**Criterios de éxito:**
- Query inválida (reason: "complaint") ✅
- Detecta queja ✅
- Se disculpa y pide reformular ✅

### 4. Meta (3 pruebas)

**Qué prueban:** Preguntas sobre el chatbot mismo

**Ejemplos:**
```
✅ "que haces"
✅ "quien eres"
✅ "eres un robot"
```

**Criterios de éxito:**
- Query válida ✅
- Detectada como meta-question ✅
- Se presenta como asistente ✅

### 5. Ambiguas (3 pruebas)

**Qué prueban:** Preguntas sin suficiente contexto

**Ejemplos:**
```
❓ "como lo hago"
❓ "donde está"
❓ "no funciona"
```

**Criterios de éxito:**
- Query inválida o score muy bajo ✅
- Pide más contexto ✅

### 6. Incorrectas (2 pruebas)

**Qué prueban:** Queries completamente fuera de scope

**Ejemplos:**
```
❌ "cual es la capital de francia"
❌ "como cocino arroz"
```

**Criterios de éxito:**
- No encuentra match relevante ✅
- Score muy bajo (<0.3) ✅
- Indica que está fuera de scope ✅

---

## 📊 Interpretar Resultados

### Escenario 1: Todas las pruebas pasan (100%)

```
✅ EXCELENTE

Acción: Ninguna - El sistema está muy bien afinado
```

### Escenario 2: Fallan pruebas VÁLIDAS

```
❌ CRÍTICO - Prioridad ALTA

Ejemplo:
Test: "como creo un producto"
Match obtenido: api-webhooks (score: 0.52)
Esperado: products-create

Diagnóstico:
- Keywords insuficientes en products-create entry
- Threshold puede estar muy alto

Solución:
1. Ir a fronted/src/data/help/sections/products.ts
2. Encontrar entry "products-create"
3. Agregar más keywords:
   keywords: ["crear", "producto", "nuevo", "agregar", "registrar"]
4. Agregar más aliases:
   aliases: ["crear producto", "nuevo producto", "registrar producto"]
5. Ejecutar pruebas nuevamente
```

### Escenario 3: Fallan pruebas GENÉRICAS

```
⚠️ MEDIO - El bot responde a preguntas genéricas

Ejemplo:
Test: "que mas informacion"
Match obtenido: payments-gateway (score: 0.68)
Esperado: Pedir clarificación

Diagnóstico:
- Patrón no detectado en GENERIC_PATTERNS

Solución:
1. Ir a fronted/src/data/help/query-validation.ts
2. Agregar patrón a GENERIC_PATTERNS:
   /^(que|qué)\s+(mas|más)\s+(info|información)/i,
3. Ejecutar pruebas nuevamente
```

### Escenario 4: Fallan pruebas QUEJAS

```
⚠️ MEDIO - El bot no detecta quejas del usuario

Ejemplo:
Test: "estás respondiendo mal"
Match obtenido: accounting-ledger (score: 0.55)
Esperado: Detectar queja y disculparse

Diagnóstico:
- Patrón no detectado en COMPLAINT_PATTERNS

Solución:
1. Ir a fronted/src/data/help/query-validation.ts
2. Agregar patrón a COMPLAINT_PATTERNS:
   /est[aá]s\s+respondiendo\s+(mal|cualquier\s+cosa|raro)/i,
3. Ejecutar pruebas nuevamente
```

### Escenario 5: Scores muy bajos en queries válidas

```
⚠️ MEDIO - Matching débil

Ejemplo:
Test: "como veo las ventas del mes"
Match: sales-history (score: 0.58) ← Muy bajo
Esperado: score >= 0.75

Diagnóstico:
- Keywords no cubren variaciones de la pregunta

Solución:
1. Revisar entry sales-history
2. Agregar keywords: ["ventas", "historial", "mes", "periodo"]
3. Agregar alias: "ver ventas del mes"
4. Ejecutar pruebas nuevamente
```

---

## ⚙️ Ajustar el Sistema

### Ajuste 1: Threshold de Confianza

**Ubicación:** `fronted/src/data/help/enhanced-matcher.ts`

```typescript
export function findMatchingEntries(
  query: string,
  entries: HelpEntry[],
  minScore: number = 0.65 // ← AJUSTAR AQUÍ
)
```

**Cuándo ajustar:**

| Síntoma | Ajuste | Nuevo valor |
|---------|--------|-------------|
| Muchas respuestas incorrectas | ⬆️ Subir | 0.70 - 0.75 |
| No encuentra nada (falsos negativos) | ⬇️ Bajar | 0.60 - 0.65 |
| Balance actual funciona bien | ✅ Mantener | 0.65 |

### Ajuste 2: Threshold de Relevancia

**Ubicación:** `fronted/src/data/help/query-validation.ts`

```typescript
const MIN_CONFIDENCE_THRESHOLD = 0.65 // ← AJUSTAR AQUÍ
```

**Cuándo ajustar:**

| Síntoma | Ajuste | Nuevo valor |
|---------|--------|-------------|
| Respuestas irrelevantes | ⬆️ Subir | 0.70 - 0.75 |
| Rechaza respuestas buenas | ⬇️ Bajar | 0.60 - 0.65 |

### Ajuste 3: Threshold para Fuzzy Matching

**Ubicación:** `fronted/src/data/help/query-validation.ts`

```typescript
if ((matchType === "fuzzy" || matchType === "keyword") && score < 0.75) {
  // ← AJUSTAR 0.75 AQUÍ
  return { isRelevant: false, ... }
}
```

**Cuándo ajustar:**

| Síntoma | Ajuste |
|---------|--------|
| Fuzzy matches incorrectos | ⬆️ Subir a 0.80 |
| Fuzzy matches muy estrictos | ⬇️ Bajar a 0.70 |

### Ajuste 4: Ratio de Keywords

**Ubicación:** `fronted/src/data/help/query-validation.ts`

```typescript
// Al menos 30% de las keywords deben aparecer
if (keywordMatchRatio < 0.3 && score < 0.85) {
  // ← AJUSTAR 0.3 AQUÍ (30%)
  return { isRelevant: false, ... }
}
```

**Cuándo ajustar:**

| Síntoma | Ajuste |
|---------|--------|
| Respuestas con keywords muy diferentes | ⬆️ Subir a 0.4 (40%) |
| Muy estricto con keywords | ⬇️ Bajar a 0.2 (20%) |

---

## ➕ Agregar Nuevas Pruebas

### Cuándo Agregar una Prueba

✅ **Debes agregar una prueba cuando:**
- Encuentras un caso donde el bot falla
- Agregas una nueva funcionalidad al sistema
- Usuarios reportan confusión en un área específica
- Quieres validar un edge case

### Cómo Agregar una Prueba

**Ubicación:** `fronted/src/data/help/test-suite.ts`

**Ejemplo 1: Agregar prueba VÁLIDA**

```typescript
{
  id: "valida-quotes-1",
  category: "valida",
  query: "como creo una cotización",
  section: "quotes",
  expectedBehavior: "Explicar pasos para crear cotización",
  expectedMatch: "quotes-create", // ID de la entry esperada
  shouldValidate: true,
  minimumScore: 0.75,
},
```

**Ejemplo 2: Agregar prueba QUEJA**

```typescript
{
  id: "queja-5",
  category: "queja",
  query: "esto no tiene sentido",
  section: "sales",
  expectedBehavior: "Detectar como queja, disculparse",
  shouldValidate: false,
},
```

**Ejemplo 3: Agregar prueba GENÉRICA**

```typescript
{
  id: "generica-5",
  category: "generica",
  query: "explícame todo",
  section: "general",
  expectedBehavior: "Pedir clarificación",
  shouldValidate: false,
},
```

### Después de Agregar Pruebas

1. Ir al panel de testing
2. Ejecutar pruebas
3. Verificar que la nueva prueba aparece
4. Si falla, ajustar keywords/patterns según necesidad
5. Re-ejecutar hasta que pase

---

## 🔧 Troubleshooting

### Problema: "Todas las pruebas fallan"

**Posibles causas:**
1. Threshold demasiado alto (>0.80)
2. Keywords insuficientes en entries
3. Bug en código de matching

**Solución:**
1. Bajar threshold a 0.60
2. Ejecutar pruebas nuevamente
3. Si aún fallan, revisar console.log para errores

---

### Problema: "Pruebas pasan pero usuarios se quejan"

**Posibles causas:**
1. Casos de prueba no cubren todos los escenarios reales
2. Usuarios preguntan de formas no anticipadas

**Solución:**
1. Recopilar queries reales de usuarios (de analytics)
2. Agregar esas queries como casos de prueba
3. Ajustar hasta que pasen

---

### Problema: "Score siempre bajo (<0.5) para queries válidas"

**Posibles causas:**
1. Keywords muy específicas, query muy genérica
2. Falta de aliases que cubran variaciones

**Solución:**
```typescript
// ANTES
{
  id: "sales-create",
  question: "¿Cómo creo una venta?",
  aliases: ["crear venta"],
  keywords: ["crear", "venta"],
}

// DESPUÉS
{
  id: "sales-create",
  question: "¿Cómo creo una venta?",
  aliases: [
    "crear venta",
    "registrar venta",
    "hacer una venta",
    "nueva venta",
    "como vendo",
  ],
  keywords: ["crear", "venta", "registrar", "hacer", "nueva", "vender", "vendo"],
}
```

---

## 📋 Checklist de Afinamiento

Usar este checklist cada vez que se afine el chatbot:

### Paso 1: Ejecutar Pruebas Base
- [ ] Ejecutar "Todas las pruebas"
- [ ] Verificar tasa de éxito >= 90%
- [ ] Revisar categorías con <80% de éxito

### Paso 2: Analizar Fallos
- [ ] Para cada prueba fallida, anotar razón
- [ ] Identificar patrones (¿todas de una sección? ¿un tipo de query?)
- [ ] Priorizar por impacto (válidas > genéricas > quejas)

### Paso 3: Aplicar Correcciones
- [ ] Agregar keywords/aliases donde sea necesario
- [ ] Ajustar patrones de detección si aplica
- [ ] Ajustar thresholds solo si es necesario

### Paso 4: Re-validar
- [ ] Ejecutar pruebas nuevamente
- [ ] Verificar que fallos se corrigieron
- [ ] Verificar que no se rompió nada más

### Paso 5: Documentar
- [ ] Descargar reporte final
- [ ] Anotar cambios realizados
- [ ] Actualizar este documento si se descubren nuevos patterns

---

## 🎯 Meta de Calidad

**Objetivo mínimo:**
- ✅ **Tasa de éxito >= 95%** en pruebas válidas
- ✅ **Tasa de éxito = 100%** en quejas y genéricas
- ✅ **Tasa de éxito >= 90%** general

**Objetivo ideal:**
- ✅ **Tasa de éxito = 100%** en todas las categorías

---

**Última actualización:** 13 de Febrero, 2026
**Mantenedor:** Equipo de desarrollo ADSLab
