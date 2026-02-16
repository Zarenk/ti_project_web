# Guía de Expansión de Vocabulario para IA de Ayuda

Esta guía explica cómo expandir el vocabulario del sistema de ayuda para que la IA local entienda más formas de expresión.

## 📚 Componentes del Sistema

### 1. Sinónimos (`synonyms.ts`)
Diccionario de términos equivalentes en el dominio del negocio.

**Cuándo agregar:**
- Términos regionales (Perú: "boleta", España: "factura", México: "ticket")
- Jerga del sector (retail, mayorista, etc.)
- Términos en inglés comunes ("stock", "cash")

**Ejemplo:**
```typescript
export const helpSynonyms = {
  venta: ["factura", "boleta", "ticket", "comprobante"],
  // Agregar más...
}
```

### 2. Patrones de Intención (`intent-patterns.ts`)
Expresiones regulares que capturan diferentes formas de hacer la misma pregunta.

**Cuándo agregar:**
- Nuevas formas de preguntar (formal vs informal)
- Preguntas con errores ortográficos comunes
- Variaciones gramaticales

**Ejemplo:**
```typescript
{
  intent: "create_something",
  patterns: [
    /^como\s+(creo|hago|agrego)/i,
    /^necesito\s+(crear|hacer)/i,
  ]
}
```

### 3. Motor de Búsqueda Mejorado (`enhanced-matcher.ts`)
Combina todas las estrategias para encontrar la mejor respuesta.

**Scoring:**
- Coincidencia exacta: 1.0
- Alias: 0.9
- Keyword: 0.7-0.8
- Intención: 0.6-0.7
- Fuzzy: 0.3-0.6

## 🎯 Cómo Mejorar la Comprensión

### Paso 1: Analizar Consultas Reales
Revisa logs de consultas del usuario para identificar:
- Preguntas que no obtienen buenas respuestas
- Formas de expresión no contempladas
- Errores ortográficos comunes

### Paso 2: Agregar Aliases a Entradas Existentes

**Antes:**
```typescript
{
  id: "sales-create",
  question: "¿Cómo hago una venta?",
  aliases: ["crear venta", "nueva venta"]
}
```

**Después:**
```typescript
{
  id: "sales-create",
  question: "¿Cómo hago una venta?",
  aliases: [
    // Formal
    "crear venta",
    "nueva venta",
    "registrar venta",

    // Coloquial
    "vender",
    "facturar",
    "cobrar",
    "hacer una factura",

    // Regional
    "sacar boleta",
    "emitir comprobante",

    // Conversacional
    "quiero vender",
    "necesito facturar",
    "dónde hago ventas",

    // Con errores
    "como bendo",
    "hacer benta"
  ]
}
```

### Paso 3: Agregar Keywords (Nuevo Campo)

```typescript
// Modificar types.ts para agregar keywords
export interface HelpEntry {
  // ... campos existentes
  keywords?: string[];  // Nuevo
}

// En cada entrada:
{
  id: "products-create",
  question: "¿Cómo creo un nuevo producto?",
  keywords: [
    "producto", "artículo", "item",
    "inventario", "stock",
    "precio", "código", "sku",
    "categoría", "marca"
  ]
}
```

### Paso 4: Expandir Sinónimos del Dominio

Agregar más términos a `synonyms.ts`:

```typescript
export const helpSynonyms = {
  // Documentos comerciales
  venta: ["factura", "boleta", "ticket", "comprobante", "recibo", "voucher"],
  cotización: ["presupuesto", "quote", "proforma", "estimado"],

  // Procesos
  devolver: ["retornar", "reembolsar", "reversar", "anular"],
  cancelar: ["anular", "invalidar", "dar de baja"],

  // Atributos de producto
  disponible: ["en stock", "hay", "tenemos"],
  agotado: ["sin stock", "no hay", "fuera de stock"],

  // Estados
  pendiente: ["por procesar", "sin procesar", "en espera"],
  completado: ["procesado", "finalizado", "listo"],

  // Agregar más según tu negocio...
}
```

### Paso 5: Agregar Patrones de Intención Específicos

```typescript
export const intentPatterns = [
  // ... patrones existentes

  {
    intent: "check_stock",
    patterns: [
      /^(cuanto|cuánto|hay)\s+(stock|inventario|disponible)/i,
      /^(tengo|tenemos|queda|quedan)/i,
      /^(se puede|puedo)\s+(vender|despachar)/i,
    ],
    relatedEntries: ["inventory", "stock", "available"],
  },

  {
    intent: "process_return",
    patterns: [
      /^(como|cómo)\s+(devuelvo|retorno|proceso.+devolución)/i,
      /^(cliente|comprador)\s+(quiere|desea|necesita)\s+(devolver|retornar)/i,
    ],
    relatedEntries: ["return", "refund", "reverse"],
  },
];
```

## 🔧 Integración con el Sistema Actual

### Opción 1: Actualizar el Componente de Ayuda

```typescript
// En HelpAssistantContext.tsx o donde manejes las búsquedas

import { findMatchingEntries } from "@/data/help/enhanced-matcher"
import { allHelpEntries } from "@/data/help"

export function searchHelp(query: string) {
  // Usar el nuevo matcher mejorado
  const results = findMatchingEntries(query, allHelpEntries, 0.4);

  // Retornar los top 5 resultados
  return results.slice(0, 5).map(r => ({
    ...r.entry,
    matchScore: r.score,
    matchType: r.matchType
  }));
}
```

### Opción 2: Mejorar los Embeddings

Si usas embeddings con Python, procesa el texto antes:

```python
# En backend/ml/help_embeddings.py

from help_vocabulary import expand_with_synonyms, normalize_text

def preprocess_for_embedding(text: str) -> str:
    # 1. Normalizar
    normalized = normalize_text(text)

    # 2. Expandir con sinónimos
    expanded = expand_with_synonyms(normalized)

    # 3. Retornar texto enriquecido
    return expanded
```

## 📊 Métricas de Éxito

### Medir la Mejora
1. **Tasa de coincidencia**: % de consultas que obtienen score > 0.6
2. **Click-through rate**: % de resultados que el usuario realmente usa
3. **Reformulaciones**: Cuántas veces el usuario reformula la pregunta

### Dashboard de Análisis
```typescript
export interface HelpAnalytics {
  query: string;
  topResult: string;
  score: number;
  matchType: string;
  userClicked: boolean;
  timestamp: Date;
}

// Guardar cada consulta para análisis
function logHelpQuery(analytics: HelpAnalytics) {
  // POST a /api/help/analytics
}
```

## 🚀 Próximos Pasos

### Corto Plazo (1-2 semanas)
1. ✅ Agregar keywords a las 20 entradas más consultadas
2. ✅ Expandir aliases con 5+ variaciones cada una
3. ✅ Implementar el enhanced-matcher en producción

### Mediano Plazo (1 mes)
1. Recopilar datos de consultas reales
2. Agregar sinónimos basados en uso real
3. Entrenar modelo de embeddings con datos expandidos

### Largo Plazo (3 meses)
1. Implementar NLU (Natural Language Understanding) con spaCy
2. Agregar comprensión de contexto multi-turno
3. Sistema de aprendizaje continuo basado en feedback

## 💡 Ejemplos de Mejoras

### Antes:
**Usuario:** "cómo saco una boleta?"
**Sistema:** Sin resultados (no reconoce "saco" ni "boleta")

### Después:
**Usuario:** "cómo saco una boleta?"
**Sistema:**
1. "¿Cómo hago una venta?" (score: 0.85, matchType: "synonym")
   - Detecta: "saco" → "hago", "boleta" → "venta"
2. "¿Cómo emito un comprobante?" (score: 0.78)

---

## 🔗 Referencias

- [Sinónimos](./synonyms.ts)
- [Patrones de Intención](./intent-patterns.ts)
- [Motor de Búsqueda](./enhanced-matcher.ts)
