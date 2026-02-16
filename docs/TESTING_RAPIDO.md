# ⚡ TESTING RÁPIDO DEL CHATBOT

Ejecuta estas pruebas directamente en la consola del navegador para validación inmediata.

---

## 🚀 Método 1: Prueba Rápida (5 segundos)

Abre la consola del navegador (F12) y ejecuta:

```javascript
// Importar funciones de testing
const { runTestSuite, logTestResults } = await import('/src/data/help/test-suite.ts')

// Ejecutar y mostrar resultados
const results = runTestSuite()
logTestResults(results)
```

**Salida esperada:**
```
🧪 ===== SUITE DE PRUEBAS DEL CHATBOT =====

📊 RESUMEN:
Total: 42
✅ Pasadas: 40
❌ Falladas: 2
📈 Tasa de éxito: 95.2%

📂 POR CATEGORÍA:
✅ valida: 20/20 (100.0%)
✅ generica: 4/4 (100.0%)
⚠️ queja: 3/4 (75.0%)
✅ meta: 3/3 (100.0%)
❌ ambigua: 0/3 (0.0%)
✅ incorrecta: 2/2 (100.0%)
```

---

## 🎯 Método 2: Probar una Query Específica

```javascript
// Importar funciones
const { validateQuery, isMetaQuestion, findMatchingEntries, allHelpEntries } = await import('/src/data/help')

// Tu query
const query = "como creo un producto"

// 1. Validar query
const validation = validateQuery(query)
console.log('✅ Validación:', validation)

// 2. Detectar meta
const isMeta = isMetaQuestion(query)
console.log('🔮 Es meta-question:', isMeta)

// 3. Buscar matches
const matches = findMatchingEntries(query, allHelpEntries)
console.log('🎯 Top 3 matches:', matches.slice(0, 3))

// 4. Ver mejor match
if (matches[0]) {
  console.log('\n📌 MEJOR MATCH:')
  console.log('Entry ID:', matches[0].entry.id)
  console.log('Score:', (matches[0].score * 100).toFixed(1) + '%')
  console.log('Tipo:', matches[0].matchType)
  console.log('Pregunta:', matches[0].entry.question)
}
```

**Salida esperada:**
```
✅ Validación: { isValid: true }
🔮 Es meta-question: false
🎯 Top 3 matches: [...]

📌 MEJOR MATCH:
Entry ID: products-create
Score: 92.5%
Tipo: exact
Pregunta: ¿Cómo creo un producto?
```

---

## 🧪 Método 3: Probar Categoría Específica

```javascript
const { runTestSuite, logTestResults } = await import('/src/data/help/test-suite.ts')

// Solo probar QUEJAS
const results = runTestSuite({ category: 'queja' })
logTestResults(results)

// O solo VÁLIDAS
const results2 = runTestSuite({ category: 'valida' })
logTestResults(results2)
```

---

## 🔍 Método 4: Debugging Detallado

Para debugging profundo de una query problemática:

```javascript
const {
  validateQuery,
  validateResponse,
  isMetaQuestion,
  generateNoMatchResponse
} = await import('/src/data/help/query-validation.ts')

const { findMatchingEntries, allHelpEntries } = await import('/src/data/help')

// Query problemática
const query = "como veo mi catalogo"
const section = "catalog"

console.group('🔍 DEBUGGING:', query)

// Paso 1: Validación
const validation = validateQuery(query)
console.log('1️⃣ Validación de query:', validation)

// Paso 2: Meta
const isMeta = isMetaQuestion(query)
console.log('2️⃣ Es meta-question:', isMeta)

// Paso 3: Matches
const matches = findMatchingEntries(query, allHelpEntries, 0.3) // threshold bajo para ver todo
console.log('3️⃣ Todos los matches (threshold 0.3):')
matches.slice(0, 5).forEach((m, i) => {
  console.log(`  ${i + 1}. ${m.entry.id} - Score: ${(m.score * 100).toFixed(1)}% - Tipo: ${m.matchType}`)
})

// Paso 4: Validar respuesta del top match
if (matches[0]) {
  const topMatch = matches[0]
  const responseValidation = validateResponse(
    query,
    topMatch.entry.answer,
    topMatch.score,
    topMatch.matchType
  )
  console.log('4️⃣ Validación de respuesta:', responseValidation)

  if (!responseValidation.isRelevant) {
    console.warn('⚠️ RESPUESTA NO RELEVANTE!')
    console.log('Razón:', responseValidation.reason)
  }
}

// Paso 5: Respuesta si no hay match
if (!matches[0] || matches[0].score < 0.65) {
  const noMatchResponse = generateNoMatchResponse(query, section)
  console.log('5️⃣ Respuesta "no sé":', noMatchResponse)
}

console.groupEnd()
```

**Salida esperada:**
```
🔍 DEBUGGING: como veo mi catalogo

1️⃣ Validación de query: { isValid: true }

2️⃣ Es meta-question: false

3️⃣ Todos los matches (threshold 0.3):
  1. api-rate-limiting - Score: 45.2% - Tipo: fuzzy
  2. catalog-export - Score: 42.8% - Tipo: keyword
  3. catalog-view - Score: 38.1% - Tipo: fuzzy

4️⃣ Validación de respuesta: {
  isRelevant: false,
  confidence: 0.312,
  reason: "keyword-mismatch"
}

⚠️ RESPUESTA NO RELEVANTE!
Razón: keyword-mismatch

5️⃣ Respuesta "no sé": "No encontré información específica sobre 'como veo mi catalogo' en Catálogo..."
```

---

## 📊 Método 5: Generar Reporte Completo

```javascript
const { runTestSuite, generateTestReport } = await import('/src/data/help/test-suite.ts')

// Ejecutar suite completa
const results = runTestSuite()

// Generar reporte markdown
const report = generateTestReport(results)

// Mostrar en consola
console.log(report)

// O copiar al clipboard para pegar en archivo
copy(report) // Luego Ctrl+V en un editor
```

---

## 🐛 Troubleshooting

### Error: "Cannot find module"

**Solución:** Asegúrate de estar en una página de la aplicación Next.js en desarrollo.

```
✅ Correcto: http://localhost:3000/dashboard
❌ Incorrecto: archivo HTML local
```

### Error: "allHelpEntries is undefined"

**Solución:** Importar correctamente:

```javascript
// ❌ Incorrecto
import { allHelpEntries } from '/src/data/help'

// ✅ Correcto
const { allHelpEntries } = await import('/src/data/help')
```

### No muestra nada en consola

**Solución:** Verifica que la consola esté en modo "Verbose" o "All levels"

---

## 🎨 Método 6: Test Interactivo

Prueba el chatbot directamente desde la consola:

```javascript
// Simular envío de mensaje
const { useHelpAssistant } = await import('/src/context/help-assistant-context')

// En componente React (usa React DevTools para seleccionar)
// O ejecuta desde el panel de testing en /dashboard/users
```

---

## ✅ Checklist Pre-Deploy

Antes de hacer deploy, ejecutar estas pruebas:

```javascript
// 1. Suite completa
const results = runTestSuite()
console.log('Tasa de éxito:', results.summary.passRate, '%')
// ✅ Debe ser >= 90%

// 2. Queries críticas
const criticalQueries = [
  "como hago una venta",
  "como creo un producto",
  "donde veo mi inventario",
  "como registro un ingreso",
]

criticalQueries.forEach(q => {
  const matches = findMatchingEntries(q, allHelpEntries)
  const score = matches[0]?.score || 0
  const pass = score >= 0.75
  console.log(`${pass ? '✅' : '❌'} "${q}" - ${(score * 100).toFixed(1)}%`)
})
// ✅ Todas deben tener score >= 75%

// 3. Detección de quejas
const complaints = [
  "no te pregunté sobre eso",
  "eso no es lo que pedí",
]

complaints.forEach(q => {
  const validation = validateQuery(q)
  const detected = !validation.isValid && validation.reason === 'complaint'
  console.log(`${detected ? '✅' : '❌'} Queja detectada: "${q}"`)
})
// ✅ Todas deben ser detectadas

// 4. Detección de genéricas
const generics = [
  "que mas informacion",
  "ayuda",
]

generics.forEach(q => {
  const validation = validateQuery(q)
  const detected = !validation.isValid && validation.reason === 'generic'
  console.log(`${detected ? '✅' : '❌'} Genérica detectada: "${q}"`)
})
// ✅ Todas deben ser detectadas
```

**Resultado esperado:**
```
✅ Tasa de éxito: 95.2%
✅ "como hago una venta" - 89.5%
✅ "como creo un producto" - 92.3%
✅ "donde veo mi inventario" - 85.7%
✅ "como registro un ingreso" - 78.2%
✅ Queja detectada: "no te pregunté sobre eso"
✅ Queja detectada: "eso no es lo que pedí"
✅ Genérica detectada: "que mas informacion"
✅ Genérica detectada: "ayuda"

🎉 LISTO PARA DEPLOY
```

---

**Tip:** Guarda estos snippets en tu editor como "Code Snippets" para ejecutarlos rápidamente.
