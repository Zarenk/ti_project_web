# Plan de Testing - Fase 1: Mejoras del Chatbot IA

**Fecha:** 2026-02-15
**Objetivo:** Validar las 6 mejoras implementadas en el sistema de ayuda contextual
**Estimación:** 2-3 horas de testing manual + automatizado

---

## Resumen de Mejoras a Testear

| # | Mejora | Archivo Principal | Líneas de Código |
|---|--------|-------------------|------------------|
| 1 | Normalización de caracteres repetidos | `fuzzy-matcher.ts` | 323-327, 333 |
| 2 | Courtesy conversacional (frustración) | `courtesy.ts` | 180-239 |
| 3 | Sinónimos UI extendidos | `synonyms.ts` | 115-200 |
| 4 | Detección de patterns ambiguos | `advanced-patterns.ts` | 85-134 |
| 5 | Sección Troubleshooting | `troubleshooting.ts` | 1-357 |
| 6 | Sistema de Pre-requisitos | `prerequisites.ts` + `help-assistant-context.tsx` | 1-280 + 702-731 |

---

## 1️⃣ Testing: Normalización de Caracteres Repetidos

### Objetivo
Validar que las queries con caracteres repetidos se normalizan correctamente antes del autocorrect.

### Casos de Prueba

| ID | Input Query | Normalizado Esperado | Resultado Esperado |
|----|-------------|----------------------|-------------------|
| T1.1 | "ayudaaaa" | "ayuda" | Match con entry de ayuda |
| T1.2 | "urgenteeee" | "urgente" | Match según contexto |
| T1.3 | "holaaaaa" | "hola" | Match con courtesy-greeting |
| T1.4 | "graciassss" | "gracias" | Match con courtesy-thanks |
| T1.5 | "inventariooooo" | "inventario" | Match con inventory section |
| T1.6 | "ventaaaa" | "venta" | Match con sales entries |
| T1.7 | "productooo stockkk" | "producto stock" | Match con inventory-view-stock |
| T1.8 | "nooo entiendooo" | "no entiendo" | Match con courtesy-confusion |

### Pasos de Testing

```bash
# 1. Iniciar el frontend en modo desarrollo
cd fronted
npm run dev

# 2. Abrir el chatbot de ayuda
# 3. Probar cada caso de la tabla anterior
# 4. Verificar que:
#    - La query se normaliza (visible en console.log si está habilitado)
#    - Se encuentra match correcto
#    - La respuesta es relevante
```

### Verificación en Código

**Archivo:** `fronted/src/data/help/fuzzy-matcher.ts`

```typescript
// Verificar que normalizeRepeatedChars está exportada
export function normalizeRepeatedChars(text: string): string {
  return text.replace(/(.)\1{2,}/g, '$1')
}

// Verificar que autoCorrect la usa
export function autoCorrect(query: string): { corrected: string; changed: boolean } {
  const normalized = normalizeRepeatedChars(query) // ✅ Debe estar aquí
  // ...
}
```

### Criterios de Éxito
- ✅ Todos los casos T1.x devuelven respuestas relevantes
- ✅ No hay regresiones en queries normales (sin repetición)
- ✅ La normalización funciona con acentos y caracteres especiales

---

## 2️⃣ Testing: Courtesy Conversacional (Frustración/Confusión)

### Objetivo
Validar que el chatbot maneja apropiadamente la frustración, confusión y solicitudes de contacto humano.

### Casos de Prueba

| ID | Input Query | Entry Esperada | Elementos en Respuesta |
|----|-------------|----------------|------------------------|
| T2.1 | "no entiendo" | courtesy-confusion | • Reformular<br>• Ejemplos paso a paso<br>• Términos simples |
| T2.2 | "esto está confuso" | courtesy-confusion | Opciones de ayuda |
| T2.3 | "no me queda claro" | courtesy-confusion | Clarificación |
| T2.4 | "no me sirve" | courtesy-negative-feedback | • Reformular pregunta<br>• Contactar soporte<br>• Indicar qué no está claro |
| T2.5 | "esto está mal" | courtesy-negative-feedback | Guía hacia soporte |
| T2.6 | "no funciona" | courtesy-negative-feedback | Opciones de ayuda |
| T2.7 | "quiero hablar con alguien" | courtesy-human-contact | • Mensajes internos<br>• Soporte directo |
| T2.8 | "necesito soporte real" | courtesy-human-contact | Información de contacto |
| T2.9 | "hablar con persona" | courtesy-human-contact | Canales de soporte |

### Pasos de Testing

```javascript
// En la consola del navegador (DevTools)
// Test automatizado de courtesy entries

const testCases = [
  { query: "no entiendo", expectedId: "courtesy-confusion" },
  { query: "esto está confuso", expectedId: "courtesy-confusion" },
  { query: "no me sirve", expectedId: "courtesy-negative-feedback" },
  { query: "quiero hablar con alguien", expectedId: "courtesy-human-contact" },
];

testCases.forEach(test => {
  console.log(`Testing: "${test.query}"`);
  // Enviar query al chatbot
  // Verificar que la respuesta corresponde al expectedId
});
```

### Verificación en Código

**Archivo:** `fronted/src/data/help/sections/courtesy.ts`

```typescript
// Verificar que las 3 nuevas entries existen
const newEntries = [
  "courtesy-confusion",        // Línea ~181
  "courtesy-negative-feedback", // Línea ~201
  "courtesy-human-contact",     // Línea ~221
];
```

### Criterios de Éxito
- ✅ Todas las queries de frustración/confusión devuelven respuestas empáticas
- ✅ Las respuestas ofrecen opciones concretas de ayuda
- ✅ Los enlaces a sección "Mensajes" funcionan correctamente
- ✅ No se detectan como queries inválidas

---

## 3️⃣ Testing: Sinónimos UI Extendidos

### Objetivo
Validar que el chatbot reconoce terminología informal y variaciones regionales de elementos de interfaz.

### Casos de Prueba

| ID | Input Query | Sinónimos Involucrados | Match Esperado |
|----|-------------|------------------------|----------------|
| T3.1 | "donde esta el boton" | botón, button, btn | Entry sobre navegación/botón específico |
| T3.2 | "haz clic en el icono" | ícono, icon, símbolo | Entry relevante |
| T3.3 | "abre el menu" | menú, opciones | general-navigation |
| T3.4 | "en que pestana" | pestaña, tab, solapa | Entry según contexto |
| T3.5 | "cierra la ventana emergente" | modal, popup, diálogo | Entry relevante |
| T3.6 | "usa el mause" | mouse, ratón | Entry relevante |
| T3.7 | "printea la factura" | imprimir, exportar, descargar | sales-print-invoice |
| T3.8 | "loguea en el sistema" | iniciar sesión, login, entrar | general-login |
| T3.9 | "esta loading" | cargando, espera, procesando | Entry de troubleshooting |
| T3.10 | "hay un error en la interfaz" | interface, pantalla, vista | Entry de troubleshooting |

### Categorías de Sinónimos a Validar

**Hardware:**
- mouse → ratón, mause
- keyboard → teclado
- screen → pantalla, monitor

**Acciones Informales:**
- printear → imprimir
- loguear → iniciar sesión
- clickear → hacer clic

**Coloquiales Perú:**
- cachear → guardar temporalmente
- chequear → verificar, revisar
- linkear → vincular, enlazar

**Temporales:**
- loading → cargando
- actualizado → updated
- guardado → saved

### Pasos de Testing

```bash
# Test de sinónimos en consola del navegador
const synonymTests = [
  { input: "donde esta el boton", synonym: "botón" },
  { input: "haz clic en el icono", synonym: "ícono" },
  { input: "abre el menu", synonym: "menú" },
  // ... etc
];

// Verificar que cada query encuentra match relevante
```

### Verificación en Código

**Archivo:** `fronted/src/data/help/synonyms.ts`

```typescript
// Verificar que las nuevas categorías existen (líneas ~115-200)
const newCategories = [
  "boton", "icono", "menu", "pestana", "ventana",     // UI
  "mouse", "teclado", "pantalla",                      // Hardware
  "printear", "loguear", "clickear",                   // Acciones informales
  "loading", "actualizado", "guardado",                // Temporales
  "cachear", "chequear", "linkear",                    // Coloquiales Perú
  "factura", "orden", "cliente",                       // Términos de negocio
  "plata", "guita", "chamba",                          // Variaciones regionales
];
```

### Criterios de Éxito
- ✅ Al menos 8 de 10 queries con sinónimos encuentran match relevante
- ✅ No hay regresiones en queries con términos formales
- ✅ La expansión de sinónimos es bidireccional
- ✅ Los sinónimos regionales (Perú) funcionan correctamente

---

## 4️⃣ Testing: Detección de Patterns Ambiguos

### Objetivo
Validar que el chatbot detecta queries vagas/ambiguas y solicita clarificación.

### Casos de Prueba

| ID | Input Query | Pattern Detectado | Clarificación Esperada |
|----|-------------|-------------------|------------------------|
| T4.1 | "como lo hago" | Pronombre ambiguo | "¿A qué te refieres específicamente?" |
| T4.2 | "como la uso" | Pronombre ambiguo | "¿Podrías dar más detalles?" |
| T4.3 | "esto que es" | Demostrativo vago | "¿Te refieres a un botón, sección...?" |
| T4.4 | "eso que hace" | Demostrativo vago | Solicitar especificidad |
| T4.5 | "esta mal" | Error genérico | "¿Qué es lo que está mal?" |
| T4.6 | "no funciona" | Error genérico | "¿Qué no funciona?" |
| T4.7 | "no me sale" | Error genérico | "¿Qué no te sale?" |
| T4.8 | "me da error" | Error genérico | "¿Qué error te muestra?" |

### Pasos de Testing

```javascript
// Test automatizado de patterns ambiguos
import { ambiguousQuestionPatterns } from '@/data/help/advanced-patterns';

const ambiguousTests = [
  "como lo hago",
  "esto que es",
  "esta mal",
  "no funciona",
  "no me sale",
  "me da error",
];

ambiguousTests.forEach(query => {
  const isAmbiguous = ambiguousQuestionPatterns.some(p => p.pattern.test(query));
  console.log(`"${query}" → Ambiguo: ${isAmbiguous}`);
});
```

### Verificación en Código

**Archivo:** `fronted/src/data/help/advanced-patterns.ts`

```typescript
// Verificar que los 8 nuevos patterns existen (líneas ~85-134)
const newPatterns = [
  /(?:como|cómo)\s+(?:lo|la|los|las)\s+(?:hago|uso|veo|encuentro)/i,
  /^(?:esto|eso|aquello)\s+(?:qu[eé]|que)\s+(?:es|hace|sirve)/i,
  /(?:est[aá]|está)\s+mal/i,
  /no\s+(?:me\s+)?(?:funciona|sale|sirve|anda)/i,
  /(?:me\s+)?(?:da|sale|aparece)\s+(?:un\s+)?error/i,
  /(?:tengo|hay)\s+(?:un\s+)?(?:problema|issue|fallo)/i,
  /^(?:ayuda|help)$/i,
  /(?:como|cómo)\s+(?:se\s+)?(?:hace|usa|configura)\s+(?:esto|eso)/i,
];
```

### Criterios de Éxito
- ✅ Todas las queries ambiguas (T4.1-T4.8) disparan clarificación
- ✅ Las clarificaciones son específicas y útiles
- ✅ No hay falsos positivos (queries claras marcadas como ambiguas)
- ✅ El sistema permite reformular después de la clarificación

---

## 5️⃣ Testing: Sección Troubleshooting

### Objetivo
Validar que la nueva sección de resolución de problemas funciona correctamente.

### Casos de Prueba

| ID | Input Query | Entry Esperada | Elementos en Respuesta |
|----|-------------|----------------|------------------------|
| T5.1 | "dice que no hay stock" | error-no-stock | • Causas comunes<br>• 6 pasos con imágenes<br>• Links a inventory |
| T5.2 | "no puedo vender sin stock" | error-no-stock | Soluciones específicas |
| T5.3 | "error al guardar producto" | error-save-product | • Validaciones<br>• Campos requeridos<br>• Soluciones |
| T5.4 | "no aparece en la lista" | error-not-in-list | • Filtros activos<br>• Caché<br>• Permisos |
| T5.5 | "no puedo subir imagen" | error-upload-image | • Formato<br>• Tamaño<br>• Conexión |
| T5.6 | "no se calcula el precio" | error-price-calc | • IGV<br>• Descuentos<br>• Redondeo |
| T5.7 | "el reporte está vacío" | error-empty-report | • Filtros de fecha<br>• Permisos<br>• Data |
| T5.8 | "no puedo exportar PDF" | error-pdf-export | • Navegador<br>• Popup blocker<br>• Datos |
| T5.9 | "sesión expiró" | error-session-expired | • Re-login<br>• Trabajo guardado |
| T5.10 | "cambio de moneda no funciona" | error-currency-conversion | • Tipo de cambio<br>• Configuración |

### Verificación de Lazy Loading

```javascript
// Verificar que troubleshooting se carga correctamente
import { lazyLoadSections } from '@/data/help/index';

console.log('Lazy sections:', lazyLoadSections);
// Debe incluir 'troubleshooting' en la lista
```

### Pasos de Testing

1. **Test de carga lazy:**
   - Abrir chatbot
   - NO navegar a troubleshooting
   - Verificar en Network tab que `troubleshooting.ts` NO se carga
   - Preguntar "dice que no hay stock"
   - Verificar que `troubleshooting.ts` SE carga ahora

2. **Test de contenido:**
   - Verificar que cada entry tiene:
     - Pregunta clara
     - Aliases relevantes
     - Respuesta detallada
     - Steps con imágenes (o placeholders)
     - relatedActions

3. **Test de navegación:**
   - Verificar que los links a otras secciones funcionan
   - Verificar que las imágenes cargan (o muestran placeholder)

### Criterios de Éxito
- ✅ La sección se carga lazy correctamente
- ✅ Todas las 10 entries responden a queries de error
- ✅ Las respuestas incluyen causas y soluciones
- ✅ Los steps son claros y accionables
- ✅ Los links a otras secciones funcionan

---

## 6️⃣ Testing: Sistema de Pre-requisitos

### Objetivo
Validar que el chatbot detecta cuando un usuario intenta realizar acciones sin cumplir pre-requisitos y lo guía proactivamente.

### Casos de Prueba

| ID | Input Query | Prerequisite Detectado | Mensaje Esperado |
|----|-------------|------------------------|------------------|
| T6.1 | "como hago una venta" (sin productos) | sales-new → requires products-create | "Para hacer una venta, primero necesitas tener **productos creados**" |
| T6.2 | "quiero registrar una venta" (sin productos) | sales-new | Guía a crear productos |
| T6.3 | "como creo una entrada" (sin proveedores) | entries-new → requires providers-create | "Para registrar una entrada, necesitas tener **proveedores**" |
| T6.4 | "como hago una cotización" (sin productos) | quotes-new → requires products-create | Guía a crear productos |
| T6.5 | "quiero transferir productos" (sin tiendas) | inventory-transfer → requires stores-create | "Para transferir productos, necesitas tener **múltiples tiendas**" |
| T6.6 | "como genero el catálogo" (sin productos) | catalog-create → requires products-create | Guía a crear productos |
| T6.7 | "como veo reportes de ventas" (sin ventas) | reports-sales → requires sales-new | "Para ver reportes de ventas, necesitas tener **ventas registradas**" |

### Verificación de Integración

**Archivo:** `fronted/src/context/help-assistant-context.tsx` (líneas 702-731)

```typescript
// Verificar que la detección está integrada
const prerequisite = detectPrerequisitesInQuery(queryToProcess)
if (prerequisite) {
  // Crear mensaje con respuesta de prerequisite
  const prereqMsg: ChatMessage = {
    id: generateUniqueMessageId(),
    role: "assistant",
    content: generatePrerequisiteResponse(prerequisite),
    source: "static",
    timestamp: Date.now(),
  }
  // ...
  return // Early return ✅
}
```

### Pasos de Testing

```javascript
// Test de detección de prerequisites
import { detectPrerequisitesInQuery } from '@/data/help/prerequisites';

const prereqTests = [
  { query: "como hago una venta", expectedAction: "sales-new" },
  { query: "quiero registrar una entrada", expectedAction: "entries-new" },
  { query: "como hago una cotización", expectedAction: "quotes-new" },
  { query: "quiero transferir productos", expectedAction: "inventory-transfer" },
];

prereqTests.forEach(test => {
  const prereq = detectPrerequisitesInQuery(test.query);
  console.log(`"${test.query}" → Prerequisite:`, prereq?.actionId);
  console.assert(prereq?.actionId === test.expectedAction, `Expected ${test.expectedAction}`);
});
```

### Escenarios de Usuario Real

**Escenario 1: Usuario nuevo sin productos**
```
Usuario: "quiero hacer mi primera venta"
Chatbot: "Para hacer una venta, primero necesitas tener **productos creados** en el sistema.

         Sin productos, no podrás agregar nada al carrito de venta.

         ¿Quieres que te guíe para crear tu primer producto?"
```

**Escenario 2: Usuario intenta cotización sin productos**
```
Usuario: "como genero una cotización"
Chatbot: "Para crear cotizaciones, primero necesitas tener **productos en tu inventario**.

         Las cotizaciones se crean seleccionando productos de tu catálogo.

         ¿Quieres que te explique cómo crear productos primero?"
```

### Criterios de Éxito
- ✅ Se detectan correctamente los 7 tipos de prerequisites
- ✅ Los mensajes son claros y no técnicos
- ✅ Se ofrece guía para completar el prerequisite
- ✅ No hay falsos positivos (detectar prerequisite cuando no aplica)
- ✅ El tracking registra `source: "prerequisite"`

---

## Testing Integrado: Flujo End-to-End

### Escenario Completo: Usuario Nuevo

**Contexto:** Usuario nuevo que acaba de registrarse y quiere empezar a usar el sistema.

**Flujo:**

1. **Usuario abre el chatbot**
   ```
   Usuario: "holaaaa"
   → MEJORA #1 (normalización): "hola"
   → Match: courtesy-greeting
   ✅ Respuesta de bienvenida
   ```

2. **Usuario intenta hacer venta sin productos**
   ```
   Usuario: "quiero hacer una ventaaa"
   → MEJORA #1 (normalización): "quiero hacer una venta"
   → MEJORA #6 (prerequisites): Detecta sales-new
   ✅ Mensaje: "Primero necesitas crear productos"
   ```

3. **Usuario se confunde**
   ```
   Usuario: "no entiendooo"
   → MEJORA #1 (normalización): "no entiendo"
   → MEJORA #2 (courtesy): courtesy-confusion
   ✅ Ofrece reformular con opciones
   ```

4. **Usuario usa términos informales**
   ```
   Usuario: "donde esta el boton para agregar productos"
   → MEJORA #3 (sinónimos): "botón" reconocido
   ✅ Guía a productos-create
   ```

5. **Usuario pregunta de forma vaga**
   ```
   Usuario: "esto como lo hago"
   → MEJORA #4 (patterns ambiguos): Detectado
   ✅ Solicita clarificación
   ```

6. **Usuario reporta error**
   ```
   Usuario: "me da error al guardar"
   → MEJORA #5 (troubleshooting): error-save-product
   ✅ Causas y soluciones
   ```

### Criterios de Éxito del Flujo
- ✅ Todas las 6 mejoras se activan en el flujo
- ✅ El usuario recibe respuestas útiles en cada paso
- ✅ No hay respuestas genéricas tipo "no entendí"
- ✅ El tracking registra correctamente cada tipo de interacción

---

## Testing Automatizado

### Script de Testing Rápido

Crear archivo: `fronted/scripts/test-chatbot-improvements.ts`

```typescript
/**
 * Script de testing automatizado para Fase 1 mejoras
 * Ejecutar: npx ts-node scripts/test-chatbot-improvements.ts
 */

import { normalizeRepeatedChars, autoCorrect } from '../src/data/help/fuzzy-matcher';
import { detectPrerequisitesInQuery } from '../src/data/help/prerequisites';
import { DOMAIN_SYNONYMS } from '../src/data/help/synonyms';
import { ambiguousQuestionPatterns } from '../src/data/help/advanced-patterns';

interface TestCase {
  name: string;
  input: string;
  expected: any;
  actual?: any;
  passed?: boolean;
}

const tests: TestCase[] = [];

// ========== TEST 1: Normalización de caracteres ==========
console.log('\n🧪 TEST 1: Normalización de caracteres repetidos\n');

const normalizationTests = [
  { input: 'ayudaaaa', expected: 'ayuda' },
  { input: 'urgenteeee', expected: 'urgente' },
  { input: 'holaaaaa', expected: 'hola' },
  { input: 'graciassss', expected: 'gracias' },
];

normalizationTests.forEach(t => {
  const actual = normalizeRepeatedChars(t.input);
  const passed = actual === t.expected;
  tests.push({ name: `Normalize "${t.input}"`, input: t.input, expected: t.expected, actual, passed });
  console.log(`  ${passed ? '✅' : '❌'} "${t.input}" → "${actual}" (expected: "${t.expected}")`);
});

// ========== TEST 2: Autocorrect con normalización ==========
console.log('\n🧪 TEST 2: Autocorrect integrado con normalización\n');

const autocorrectTests = [
  { input: 'ventaaa', shouldCorrect: false }, // Ya normalizado, no hay typo
  { input: 'imventario', shouldCorrect: true }, // Typo: inventario
];

autocorrectTests.forEach(t => {
  const result = autoCorrect(t.input);
  const passed = result.changed === t.shouldCorrect;
  tests.push({ name: `Autocorrect "${t.input}"`, input: t.input, expected: t.shouldCorrect, actual: result.changed, passed });
  console.log(`  ${passed ? '✅' : '❌'} "${t.input}" → changed: ${result.changed} (expected: ${t.shouldCorrect})`);
});

// ========== TEST 3: Sinónimos UI ==========
console.log('\n🧪 TEST 3: Sinónimos UI extendidos\n');

const synonymTests = [
  { term: 'boton', shouldExist: true },
  { term: 'icono', shouldExist: true },
  { term: 'menu', shouldExist: true },
  { term: 'printear', shouldExist: true },
  { term: 'loguear', shouldExist: true },
];

synonymTests.forEach(t => {
  const exists = t.term in DOMAIN_SYNONYMS;
  const passed = exists === t.shouldExist;
  tests.push({ name: `Synonym "${t.term}"`, input: t.term, expected: t.shouldExist, actual: exists, passed });
  console.log(`  ${passed ? '✅' : '❌'} "${t.term}" exists: ${exists} (expected: ${t.shouldExist})`);
});

// ========== TEST 4: Patterns Ambiguos ==========
console.log('\n🧪 TEST 4: Detección de patterns ambiguos\n');

const ambiguousTests = [
  { query: 'como lo hago', shouldBeAmbiguous: true },
  { query: 'esto que es', shouldBeAmbiguous: true },
  { query: 'esta mal', shouldBeAmbiguous: true },
  { query: 'como crear un producto', shouldBeAmbiguous: false }, // Claro
];

ambiguousTests.forEach(t => {
  const isAmbiguous = ambiguousQuestionPatterns.some(p => p.pattern.test(t.query));
  const passed = isAmbiguous === t.shouldBeAmbiguous;
  tests.push({ name: `Ambiguous "${t.query}"`, input: t.query, expected: t.shouldBeAmbiguous, actual: isAmbiguous, passed });
  console.log(`  ${passed ? '✅' : '❌'} "${t.query}" → ambiguous: ${isAmbiguous} (expected: ${t.shouldBeAmbiguous})`);
});

// ========== TEST 5: Prerequisites ==========
console.log('\n🧪 TEST 5: Detección de pre-requisitos\n');

const prereqTests = [
  { query: 'como hago una venta', expectedAction: 'sales-new' },
  { query: 'quiero registrar una entrada', expectedAction: 'entries-new' },
  { query: 'como hago una cotización', expectedAction: 'quotes-new' },
  { query: 'como crear un producto', expectedAction: null }, // No requiere prerequisite
];

prereqTests.forEach(t => {
  const prereq = detectPrerequisitesInQuery(t.query);
  const actual = prereq?.actionId || null;
  const passed = actual === t.expectedAction;
  tests.push({ name: `Prerequisite "${t.query}"`, input: t.query, expected: t.expectedAction, actual, passed });
  console.log(`  ${passed ? '✅' : '❌'} "${t.query}" → action: ${actual} (expected: ${t.expectedAction})`);
});

// ========== RESUMEN ==========
console.log('\n📊 RESUMEN DE TESTS\n');

const totalTests = tests.length;
const passedTests = tests.filter(t => t.passed).length;
const failedTests = totalTests - passedTests;
const successRate = ((passedTests / totalTests) * 100).toFixed(1);

console.log(`Total tests: ${totalTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`Success rate: ${successRate}%`);

if (failedTests > 0) {
  console.log('\n❌ TESTS FALLIDOS:\n');
  tests.filter(t => !t.passed).forEach(t => {
    console.log(`  • ${t.name}`);
    console.log(`    Input: ${t.input}`);
    console.log(`    Expected: ${JSON.stringify(t.expected)}`);
    console.log(`    Actual: ${JSON.stringify(t.actual)}`);
  });
}

// Exit code
process.exit(failedTests > 0 ? 1 : 0);
```

### Ejecutar Tests

```bash
cd fronted
npx ts-node scripts/test-chatbot-improvements.ts
```

---

## Métricas de Éxito

### Objetivo de Fase 1
- **Score actual:** 82/100
- **Score objetivo:** 92/100
- **Mejora esperada:** +10 puntos

### Desglose de Puntos

| Mejora | Puntos Esperados |
|--------|------------------|
| Normalización caracteres | +1.5 |
| Courtesy conversacional | +2.0 |
| Sinónimos UI | +2.0 |
| Patterns ambiguos | +1.5 |
| Troubleshooting | +2.0 |
| Prerequisites | +1.0 |
| **TOTAL** | **+10.0** |

### KPIs a Medir

1. **Match Rate:** % de queries que encuentran respuesta relevante
   - Actual: ~75%
   - Objetivo: >85%

2. **Frustration Rate:** % de queries que expresan frustración
   - Actual: ~12%
   - Objetivo: <8%

3. **Clarification Rate:** % de veces que el chatbot pide clarificación
   - Actual: ~5%
   - Objetivo: ~10% (mejora en detección de ambigüedad)

4. **Prerequisite Detection Rate:** % de veces que se detecta prerequisite faltante
   - Actual: 0%
   - Objetivo: >70% de casos aplicables

---

## Checklist de Testing

### Pre-Testing
- [ ] Frontend compilando sin errores TypeScript
- [ ] Backend corriendo correctamente
- [ ] Base de datos con data de prueba
- [ ] Usuario de testing creado

### Durante Testing
- [ ] Ejecutar script automatizado
- [ ] Probar manualmente los 6 escenarios
- [ ] Documentar bugs encontrados
- [ ] Capturar screenshots de casos edge

### Post-Testing
- [ ] Compilar reporte de resultados
- [ ] Identificar ajustes necesarios
- [ ] Actualizar documentación
- [ ] Preparar para Fase 2

---

## Próximos Pasos

Después del testing:
1. **Si success rate >90%:** Avanzar a Fase 2
2. **Si success rate 70-90%:** Ajustes menores y re-test
3. **Si success rate <70%:** Revisión de código y refactor

---

**Fecha de creación:** 2026-02-15
**Autor:** Claude Code - Testing de Mejoras Fase 1
**Versión:** 1.0
