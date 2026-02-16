# 🧠 Sistema de Auto-Mejora con Machine Learning para Chatbot de Ayuda

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Componentes Principales](#componentes-principales)
4. [Cómo Funciona el Aprendizaje](#cómo-funciona-el-aprendizaje)
5. [Dashboard de Administración](#dashboard-de-administración)
6. [Casos de Uso](#casos-de-uso)
7. [Configuración y Deployment](#configuración-y-deployment)
8. [Mejores Prácticas](#mejores-prácticas)

---

## 🎯 Descripción General

El **Sistema de Auto-Mejora con Machine Learning** permite que el chatbot de ayuda **aprenda continuamente** de las interacciones con usuarios, mejorando automáticamente su capacidad de respuesta sin intervención manual.

### Características Principales

✅ **Aprendizaje Automático**
- Detecta patrones en preguntas fallidas
- Sugiere automáticamente nuevos aliases y sinónimos
- Agrupa queries similares usando distancia de Levenshtein

✅ **Respuestas Promovidas**
- Mejora respuestas basándose en feedback positivo/negativo
- Sistema de votación para validar calidad de respuestas
- Auto-aprobación de mejoras con alta confianza

✅ **Analytics en Tiempo Real**
- Dashboard completo para administradores
- Métricas de efectividad del chatbot
- Identificación de brechas en la base de conocimiento

✅ **Auto-Expansión de Base de Conocimiento**
- Sugerencias automáticas de nuevas entradas FAQ
- Aprendizaje de sinónimos contextuales
- Detección de intenciones comunes

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    USUARIO                               │
│              (Hace pregunta al chatbot)                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            HELP ASSISTANT CONTEXT                        │
│  • Procesa query                                         │
│  • Busca respuesta                                       │
│  • 📊 REGISTRA SESIÓN DE APRENDIZAJE                    │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│   MATCH FOUND    │    │  NO MATCH / WEAK │
│   (Score >= 0.7) │    │   (Score < 0.7)  │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         │                       ▼
         │              ┌──────────────────┐
         │              │ 🧠 LEARNING LOOP │
         │              │ • Agrupa similares│
         │              │ • Sugiere alias  │
         │              │ • Sugiere entrada│
         │              └──────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              USUARIO DA FEEDBACK                         │
│              👍 Positivo / 👎 Negativo                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           🌟 PROMOTED ANSWERS SYSTEM                     │
│  • Incrementa votos                                      │
│  • Recalcula confianza                                   │
│  • Auto-aprueba si confianza >= 70%                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              📈 ANALYTICS DASHBOARD                      │
│  • Admin revisa sugerencias                              │
│  • Aprueba/rechaza mejoras                               │
│  • Monitorea métricas                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Componentes Principales

### 1. **Adaptive Learning System** (`adaptive-learning.ts`)

Módulo central que implementa el machine learning.

#### Funciones Clave:

```typescript
// Registra cada interacción para análisis
recordLearningSession(session: LearningSession): void

// Analiza patrones y genera sugerencias automáticas
analyzePatternsAndSuggest(): void

// Agrupa queries similares usando Levenshtein distance
clusterSimilarQueries(queries: string[]): Cluster[]

// Promueve respuestas basadas en feedback
promoteAnswer(entryId: string, feedback: "POSITIVE" | "NEGATIVE"): void

// Genera insights para dashboard
generateLearningInsights(): LearningInsights
```

#### Algoritmos Implementados:

**1. Distancia de Levenshtein**
```typescript
function levenshteinDistance(a: string, b: string): number {
  // Calcula el número mínimo de ediciones (inserción, eliminación, sustitución)
  // para transformar string 'a' en string 'b'
}
```

**2. Clustering de Queries Similares**
```typescript
function clusterSimilarQueries(queries: string[]): Cluster[] {
  // Agrupa queries con similaridad > 70%
  // Usa Levenshtein para calcular similitud
}
```

**3. Auto-Expansión de Sinónimos**
```typescript
function learnSynonymsFromPartialMatches(sessions: LearningSession[]): void {
  // Aprende sinónimos de queries con match parcial (50-80%)
  // Construye mapa de sinónimos contextual
}
```

---

### 2. **Integration Layer** (`help-assistant-context.tsx`)

Integra el sistema de learning en el flujo del chatbot.

#### Puntos de Integración:

**A. Registro de Sesiones**
```typescript
// Cada vez que el usuario hace una pregunta
recordLearningSession({
  query: text,
  matchFound: true/false,
  matchScore: 0.0-1.0,
  section: currentSection,
  timestamp: Date.now()
})
```

**B. Uso de Respuestas Promovidas**
```typescript
// Al responder, prioriza respuestas con alto feedback positivo
const promoted = getPromotedAnswer(entryId)
const answerToUse = promoted && promoted.confidence >= 0.7
  ? promoted.promotedAnswer
  : localMatch.answer
```

**C. Feedback Loop**
```typescript
// Cuando usuario da feedback
sendFeedback(messageId, "POSITIVE" | "NEGATIVE")
  ↓
promoteAnswer(entryId, feedback)
  ↓
Auto-aprueba si positiveVotes / totalVotes >= 0.7
```

---

### 3. **Analytics Dashboard** (`help-learning.tsx`)

Interface administrativa para gestionar el aprendizaje.

#### Pantallas Principales:

**A. Métricas Generales**
- Total de interacciones
- Tasa de fallos (%)
- Mejoras sugeridas
- Velocidad de aprendizaje

**B. Queries Fallidas**
- Top 10 preguntas sin respuesta
- Frecuencia de cada query
- Agrupamiento automático

**C. Aliases Sugeridos**
- Nuevas variaciones detectadas
- Confianza del algoritmo
- Queries fuente
- Botones Aprobar/Rechazar

**D. Nuevas Entradas Sugeridas**
- FAQs que deberían agregarse
- Frecuencia de demanda
- Respuesta sugerida (si existe)

**E. Respuestas Promovidas**
- Respuestas mejoradas por feedback
- Votos positivos/negativos
- Nivel de confianza

---

## 🔄 Cómo Funciona el Aprendizaje

### Ciclo de Aprendizaje Continuo

```
1️⃣ USUARIO HACE PREGUNTA
   ↓
2️⃣ SISTEMA BUSCA RESPUESTA
   ↓
3️⃣ REGISTRA SESIÓN (query, score, match)
   ↓
4️⃣ ANÁLISIS CADA 10 SESIONES
   • Agrupa queries similares
   • Identifica patrones
   • Genera sugerencias
   ↓
5️⃣ AUTO-APROBACIÓN INTELIGENTE
   • Si frecuencia >= 5: Aprueba automáticamente
   • Si confianza >= 60%: Aprueba automáticamente
   • Sino: Requiere revisión manual
   ↓
6️⃣ USUARIO DA FEEDBACK
   👍 Positivo → Incrementa votos, mejora confianza
   👎 Negativo → Registra como fallida, sugiere mejora
   ↓
7️⃣ SISTEMA SE ACTUALIZA
   • Respuestas con confianza >= 70% se usan
   • Aliases aprobados se agregan
   • Nuevas entradas se crean
```

---

### Ejemplo Real de Aprendizaje

**Día 1:**
```
Usuario 1: "como hago una factura"     → No match (score: 0.5)
Usuario 2: "como crear factura"        → No match (score: 0.5)
Usuario 3: "como emitir factura"       → No match (score: 0.5)
```

**Día 2 (Después de 10 sesiones):**
```
🧠 SISTEMA ANALIZA:
• Detecta 3 queries similares (Levenshtein distance < 30%)
• Agrupa en cluster: ["como hago una factura", "como crear factura", "como emitir factura"]
• Busca entrada relacionada existente: "¿Cómo registro una venta?"
• Sugiere: Agregar alias "como hago una factura" a entrada de Ventas
• Estado: APROBADO AUTOMÁTICAMENTE (frecuencia = 3, confianza = 0.75)
```

**Día 3:**
```
Usuario 4: "como hago una factura"     → ✅ Match! (score: 0.95)
Usuario 5 da 👍 feedback positivo       → Promueve respuesta (confianza: 100%)
```

---

## 📊 Dashboard de Administración

### Acceso

```
URL: /dashboard/users/help-learning
Permisos: Solo administradores
```

### Funcionalidades

#### 1. **Análisis Manual**
```typescript
handleAnalyze()
  ↓
analyzePatternsAndSuggest()
  ↓
Genera sugerencias inmediatas
```

#### 2. **Exportar Datos**
```typescript
handleExport()
  ↓
exportLearningData()
  ↓
Descarga JSON con:
  - Sesiones (últimas 500)
  - Aliases sugeridos
  - Entradas sugeridas
  - Respuestas promovidas
  - Mapa de sinónimos
```

#### 3. **Limpiar Datos**
```typescript
handleClear()
  ↓
clearLearningData()
  ↓
Elimina todo el historial de aprendizaje
(⚠️ Irreversible, requiere confirmación)
```

#### 4. **Aprobar/Rechazar Sugerencias**
```typescript
// TODO: Implementar en backend
POST /api/help/learning/alias/:id/approve
POST /api/help/learning/alias/:id/reject
POST /api/help/learning/entry/:id/approve
POST /api/help/learning/entry/:id/reject
```

---

## 💡 Casos de Uso

### Caso 1: Usuario Pregunta de Forma Diferente

**Problema:**
Usuario pregunta "¿cómo borro un producto?" pero la FAQ dice "¿Cómo elimino un producto?"

**Solución Automática:**
1. Sistema registra match débil (score: 0.6)
2. Agrupa con otras variaciones similares
3. Sugiere alias: "¿cómo borro un producto?"
4. Auto-aprueba si 3+ usuarios usan esa variación
5. Próximo usuario que pregunte obtiene match perfecto

---

### Caso 2: Falta de Información

**Problema:**
10 usuarios preguntan "¿cómo exporto a Excel?" pero no hay FAQ

**Solución Automática:**
1. Sistema detecta 10 queries similares sin match
2. Agrupa en cluster
3. Sugiere nueva entrada: "¿Cómo exporto a Excel?"
4. Admin recibe notificación en dashboard
5. Admin redacta respuesta y aprueba
6. FAQ se agrega automáticamente

---

### Caso 3: Respuesta Mejorada por Comunidad

**Problema:**
Respuesta original es correcta pero confusa

**Solución Automática:**
1. Usuarios dan feedback negativo (3 👎)
2. Sistema detecta patrón de insatisfacción
3. Admin revisa en dashboard
4. Admin edita respuesta para hacerla más clara
5. Marca como "promovida"
6. Nuevos usuarios reciben versión mejorada
7. Sistema muestra badge: "✨ Respuesta mejorada basada en 15 votos positivos"

---

## ⚙️ Configuración y Deployment

### Variables de Configuración

```typescript
// fronted/src/data/help/adaptive-learning.ts

const MAX_SESSIONS = 500          // Historial de sesiones
const MIN_FREQUENCY = 3           // Mínimo para sugerencia
const MIN_CONFIDENCE = 0.6        // Auto-aprobar si >= 60%
```

### Storage

Usa **localStorage** para almacenamiento local:

```typescript
// Keys de localStorage
adslab_learning_sessions      // Sesiones de interacción
adslab_suggested_aliases      // Aliases sugeridos
adslab_suggested_entries      // Nuevas entradas sugeridas
adslab_promoted_answers       // Respuestas promovidas
adslab_synonym_map           // Mapa de sinónimos
```

### Integración con Backend (Opcional)

Para persistencia en base de datos, agregar endpoints:

```typescript
// Endpoints sugeridos

// Sesiones
POST   /api/help/learning/sessions
GET    /api/help/learning/sessions

// Sugerencias
GET    /api/help/learning/suggestions
POST   /api/help/learning/alias/:id/approve
POST   /api/help/learning/entry/:id/approve

// Analytics
GET    /api/help/learning/insights
GET    /api/help/learning/export

// Respuestas promovidas
GET    /api/help/promoted-answers
POST   /api/help/promoted-answers/:id
```

---

## 🎓 Mejores Prácticas

### Para Administradores

✅ **Revisar Dashboard Semanalmente**
- Analizar queries fallidas
- Aprobar sugerencias relevantes
- Rechazar falsos positivos

✅ **Mantener Alta Calidad**
- No auto-aprobar TODO
- Revisar aliases antes de aprobar
- Asegurar coherencia en respuestas

✅ **Monitorear Métricas**
- Tasa de fallos debe bajar con el tiempo
- Velocidad de aprendizaje debe ser constante
- Promedio de confianza debe mejorar

✅ **Exportar Datos Regularmente**
- Backup semanal de datos de aprendizaje
- Analizar tendencias a largo plazo
- Identificar áreas de mejora

### Para Desarrollo

✅ **Ajustar Umbrales Según Necesidad**
```typescript
// Para chatbot nuevo (aprendizaje agresivo)
const MIN_FREQUENCY = 2    // Aprobar con 2 ocurrencias
const MIN_CONFIDENCE = 0.5 // Confianza mínima 50%

// Para chatbot maduro (aprendizaje conservador)
const MIN_FREQUENCY = 5    // Aprobar con 5 ocurrencias
const MIN_CONFIDENCE = 0.7 // Confianza mínima 70%
```

✅ **Testing**
```bash
# Test unitario del algoritmo de clustering
npm test adaptive-learning.test.ts

# Test de integración completa
npm run test:e2e help-learning-flow
```

✅ **Monitoring**
```typescript
// Agregar métricas a tu sistema de analytics
trackEvent("help_learning_suggestion_generated", {
  type: "alias" | "entry",
  confidence: number,
  frequency: number
})

trackEvent("help_learning_auto_approved", {
  type: "alias" | "entry",
  entryId: string
})
```

---

## 🚀 Roadmap Futuro

### Fase 2: ML Avanzado
- [ ] Embeddings semánticos con transformers
- [ ] Clustering con K-means/DBSCAN
- [ ] Detección de intenciones con NLP
- [ ] Auto-generación de respuestas con LLM

### Fase 3: Integración Profunda
- [ ] Persistencia en PostgreSQL
- [ ] API REST completa
- [ ] Webhooks para notificaciones
- [ ] Integración con Slack/Teams

### Fase 4: Analytics Avanzado
- [ ] Dashboards con gráficos interactivos
- [ ] Predicción de queries futuras
- [ ] A/B testing de respuestas
- [ ] Heatmaps de temas más consultados

---

## 📚 Referencias

- [Levenshtein Distance Algorithm](https://en.wikipedia.org/wiki/Levenshtein_distance)
- [K-means Clustering](https://en.wikipedia.org/wiki/K-means_clustering)
- [Natural Language Processing](https://en.wikipedia.org/wiki/Natural_language_processing)
- [Machine Learning Best Practices](https://developers.google.com/machine-learning/guides/rules-of-ml)

---

## 🤝 Contribuir

Para agregar mejoras al sistema:

1. Fork el repositorio
2. Crea branch: `git checkout -b feature/mejor-algoritmo`
3. Commit cambios: `git commit -m 'Mejora algoritmo de clustering'`
4. Push: `git push origin feature/mejor-algoritmo`
5. Crea Pull Request

---

**Versión:** 1.0.0
**Última Actualización:** 2026-02-14
**Autor:** Sistema de Auto-Mejora IA - TI Projecto Web
