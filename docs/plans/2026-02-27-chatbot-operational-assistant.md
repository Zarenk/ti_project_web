# Plan: Chatbot Operacional — De Q&A a Asistente con Ejecución

**Fecha:** 2026-02-27
**Estado:** Aprobado
**Objetivo:** Transformar el chatbot de ayuda en un asistente operacional que detecta intención, ejecuta acciones del sistema, y muestra datos en tiempo real dentro del chat.

---

## Diagnóstico del sistema actual

### Lo que funciona (no tocar)
- Pipeline Q&A completo: TF-IDF + embeddings + RAG + 2 proveedores AI
- 46+ secciones de KB con ~500 entradas
- Aprendizaje adaptativo con feedback
- Offline support, streaming SSE, Web Worker
- Corrección de typos, sinónimos, sentiment analysis
- Circuit breaker en proveedores AI

### Lo que falta (los 4 pilares)
1. **Intent Parser** — No clasifica intención del usuario (pregunta vs acción)
2. **Tool Registry** — No sabe qué acciones existen en el sistema
3. **Entity Resolver** — No traduce "jabón" a `Product{id:45}`
4. **Rich Rendering** — Solo renderiza texto plano y listas

---

## Decisiones de diseño

| Decisión | Elección | Razón |
|----------|----------|-------|
| Consultas (ver datos/stats) | Ejecución directa | Sin riesgo, respuesta instantánea |
| Mutaciones (crear venta, entrada) | Confirmación en chat | Seguro, usuario mantiene control |
| Intent parser ubicación | Frontend-first | Respuesta instantánea, funciona offline |
| Mutaciones ejecución | API directa desde chat | No rompe el flujo del chat, experiencia tipo Siri |
| Integración con pipeline actual | Paso ANTES del Q&A | Si no hay intent claro, Q&A funciona igual |

---

## Arquitectura

### Flujo de decisión

```
Usuario envía mensaje
    ↓
[IntentParser.parse(text, section, context)]
    ↓
¿Intent detectado con confidence > 0.85?
    ├── SÍ → Ruta de ACCIÓN
    │   ├── [EntityResolver.resolve(entities)]
    │   ├── tool.type === "query"?
    │   │   └── Ejecutar directo → Renderizar resultado
    │   └── tool.type === "mutation"?
    │       ├── Renderizar ToolConfirmationCard
    │       ├── Usuario confirma → Ejecutar → Renderizar éxito
    │       └── Usuario cancela → Mensaje de cancelación
    │
    └── NO → Ruta Q&A actual (sin cambios)
        ├── AutoCorrect → ExpandQuery → Sentiment → ...
        └── LocalMatch → SemanticSearch → Backend SSE → ...
```

### Integración en sendMessage()

```typescript
// help-assistant-context.tsx → sendMessage()
async function sendMessage(text: string) {
  // ═══ NUEVO: Intent detection ═══
  const intent = IntentParser.parse(text, currentSection, messages)

  if (intent && intent.confidence > 0.85) {
    await executeToolIntent(intent)
    return  // No entra al flujo Q&A
  }

  // ═══ Flujo Q&A existente (SIN CAMBIOS) ═══
  const corrected = autoCorrect(text)
  const expanded = expandQueryWithEntity(corrected, ...)
  // ... todo el pipeline actual intacto
}
```

---

## Fase 1: Intent System + Tool Registry

### Archivos nuevos

```
fronted/src/data/help/
  intents/
    intent-types.ts           ← Tipos: ParsedIntent, IntentPattern, Entity
    intent-parser.ts          ← Motor principal: parse(text) → ParsedIntent
    entity-extractor.ts       ← Extrae números, fechas, nombres del texto

  tools/
    tool-types.ts             ← Tipos: ChatTool, ToolResult, ToolParam
    tool-registry.ts          ← Registro central + execute()
    entity-resolver.ts        ← Fuzzy search contra datos del sistema
    tools/
      sale-tools.ts           ← sale.list, sale.stats, sale.create
      inventory-tools.ts      ← inventory.add, product.search, product.lowstock
      cashregister-tools.ts   ← cashregister.view, cashregister.summary
      stats-tools.ts          ← stats.dashboard, stats.monthly
      navigation-tools.ts     ← navigate.to (router.push)

fronted/src/components/help/
  tool-confirmation-card.tsx  ← UI de confirmación para mutaciones
  tool-result-table.tsx       ← Mini-tabla para resultados de consultas
  tool-result-stats.tsx       ← Cards KPI para estadísticas
  tool-error-card.tsx         ← Error de ejecución con sugerencia
```

### Archivos a modificar

```
fronted/src/context/help-assistant-context.tsx
  → Agregar executeToolIntent() ANTES del flujo Q&A
  → Agregar estado: pendingConfirmation, toolResults
  → Agregar confirmToolAction(), cancelToolAction()

fronted/src/components/help/HelpChatPanel.tsx
  → Renderizar ToolConfirmationCard cuando message.toolConfirmation
  → Renderizar ToolResultTable/Stats cuando message.toolResult
  → Renderizar ToolErrorCard cuando message.toolError

fronted/src/data/help/types.ts
  → Extender ChatMessage con campos de tool:
    toolIntent?: ParsedIntent
    toolConfirmation?: ToolConfirmationData
    toolResult?: ToolResultData
    toolError?: string
```

---

## Detalle de implementación

### 1. intent-types.ts

```typescript
export interface ParsedEntity {
  type: "product" | "client" | "store" | "quantity" | "amount" | "period" | "date" | "section"
  raw: string          // Texto original: "20", "jabón", "hoy"
  value?: unknown      // Valor parseado: 20, Date, etc.
  resolved?: unknown   // Entidad resuelta: Product{id:45}
}

export interface ParsedIntent {
  intent: string              // "inventory.add", "sale.list"
  entities: ParsedEntity[]    // Entidades extraídas
  confidence: number          // 0-1
  originalText: string        // Texto del usuario
  type: "query" | "mutation" | "navigation"
}

export interface IntentPattern {
  intent: string
  patterns: RegExp[]
  entitySlots: string[]       // ["quantity", "product"]
  type: "query" | "mutation" | "navigation"
  requiredEntities?: string[] // Entidades obligatorias
  section?: string            // Solo aplica en esta sección
}
```

### 2. intent-parser.ts

```typescript
import { INTENT_PATTERNS } from "./intent-patterns-catalog"
import { extractEntities } from "./entity-extractor"

const CONFIDENCE_THRESHOLD = 0.85

export function parseIntent(
  text: string,
  currentSection: string,
  conversationHistory?: ChatMessage[],
): ParsedIntent | null {
  const normalized = text.toLowerCase().trim()

  // Skip si es muy corto o es pregunta tipo Q&A
  if (normalized.length < 5) return null
  if (normalized.startsWith("¿") || normalized.startsWith("qué es") || normalized.startsWith("cómo funciona")) return null

  let bestMatch: ParsedIntent | null = null
  let bestScore = 0

  for (const pattern of INTENT_PATTERNS) {
    // Priorizar patterns de la sección actual
    const sectionBoost = pattern.section === currentSection ? 0.05 : 0

    for (const regex of pattern.patterns) {
      const match = normalized.match(regex)
      if (match) {
        const entities = extractEntities(match, pattern.entitySlots)
        const score = calculateConfidence(match, entities, pattern) + sectionBoost

        if (score > bestScore) {
          bestScore = score
          bestMatch = {
            intent: pattern.intent,
            entities,
            confidence: Math.min(score, 1),
            originalText: text,
            type: pattern.type,
          }
        }
      }
    }
  }

  return bestMatch && bestMatch.confidence >= CONFIDENCE_THRESHOLD ? bestMatch : null
}
```

### 3. Intent patterns catalog (extensible)

```typescript
export const INTENT_PATTERNS: IntentPattern[] = [
  // ══ INVENTARIO ══
  {
    intent: "inventory.add",
    patterns: [
      /(?:agrega|añade|ingresa|registra|mete)\s+(\d+)\s+(?:unidades?\s+(?:de\s+)?)?(.+?)(?:\s+al\s+inventario|\s+al\s+stock)?$/i,
      /(?:entrada|compra)\s+(?:de\s+)?(\d+)\s+(.+)/i,
      /(?:stock|inventario)\s+(?:de\s+)?(.+?)\s+(?:agregar|sumar)\s+(\d+)/i,
    ],
    entitySlots: ["quantity", "product"],
    type: "mutation",
    requiredEntities: ["quantity", "product"],
  },

  // ══ VENTAS ══
  {
    intent: "sale.list",
    patterns: [
      /(?:muestra|dame|ver|listar?|enseña)\s+(?:las?\s+)?ventas?\s+(?:de\s+)?(hoy|ayer|esta semana|este mes|últim[oa]s?\s+\d+\s+días?)/i,
      /(?:últimas?|recientes?)\s+(\d+)?\s*ventas?/i,
      /ventas?\s+(?:del?\s+)?(hoy|ayer|lunes|martes|enero|febrero|marzo)/i,
    ],
    entitySlots: ["period"],
    type: "query",
  },
  {
    intent: "sale.stats",
    patterns: [
      /(?:estadísticas?|stats?|resumen|totales?)\s+(?:de\s+)?ventas?\s*(?:de\s+)?(hoy|este mes|esta semana|enero|febrero)?/i,
      /(?:cuánto|cuanto)\s+(?:se\s+)?(?:vendió|vendimos?|facturamos?)\s+(?:hoy|este mes|esta semana)?/i,
      /(?:total|monto)\s+(?:de\s+)?ventas?\s+(?:de\s+)?(hoy|este mes|esta semana)/i,
    ],
    entitySlots: ["period"],
    type: "query",
  },
  {
    intent: "sale.create",
    patterns: [
      /(?:haz|crea|registra|nueva)\s+(?:una?\s+)?venta\s+(?:de\s+)?(\d+)\s+(.+?)(?:\s+a\s+(.+))?$/i,
      /(?:vende|vender)\s+(\d+)\s+(.+?)(?:\s+a\s+(.+))?$/i,
    ],
    entitySlots: ["quantity", "product", "client"],
    type: "mutation",
    requiredEntities: ["quantity", "product"],
  },

  // ══ CAJA REGISTRADORA ══
  {
    intent: "cashregister.view",
    patterns: [
      /(?:muestra|dame|ver|abrir?)\s+(?:la?\s+)?(?:caja|registros?\s+de\s+caja|movimientos?\s+de\s+caja)/i,
      /(?:estado|balance|saldo)\s+(?:de\s+)?(?:la?\s+)?caja/i,
      /(?:cuánto|cuanto)\s+(?:hay|tiene)\s+(?:en\s+)?(?:la?\s+)?caja/i,
    ],
    entitySlots: [],
    type: "query",
  },

  // ══ PRODUCTOS ══
  {
    intent: "product.search",
    patterns: [
      /(?:busca|encuentra|buscar)\s+(?:el?\s+)?(?:producto?\s+)?(.+)/i,
      /(?:stock|existencia|cuánto[s]?\s+(?:hay|queda))\s+(?:de\s+)?(.+)/i,
      /(?:cuántos?|cuantos?)\s+(.+?)\s+(?:hay|quedan?|tenemos?)/i,
    ],
    entitySlots: ["product"],
    type: "query",
  },
  {
    intent: "product.lowstock",
    patterns: [
      /(?:productos?\s+(?:con\s+)?(?:stock\s+)?bajo|stock\s+bajo|bajo\s+stock|sin\s+stock|agotados?)/i,
      /(?:qué|que)\s+(?:productos?\s+)?(?:se\s+)?(?:están?\s+)?agotando/i,
    ],
    entitySlots: [],
    type: "query",
  },

  // ══ ESTADÍSTICAS ══
  {
    intent: "stats.dashboard",
    patterns: [
      /(?:estadísticas?|stats?|resumen|dashboard|métricas?)\s+(?:del?\s+)?(mes|semana|día|hoy)/i,
      /(?:cómo|como)\s+(?:va|vamos?|está)\s+(?:el\s+)?(?:negocio|mes|semana)/i,
      /(?:dame|muestra)\s+(?:un?\s+)?(?:resumen|panorama|reporte)/i,
    ],
    entitySlots: ["period"],
    type: "query",
  },

  // ══ NAVEGACIÓN ══
  {
    intent: "navigate.to",
    patterns: [
      /(?:llévame|ir|ve|navega|abre|abrir)\s+(?:a\s+)?(?:la?\s+)?(?:sección\s+(?:de\s+)?)?(productos?|ventas?|inventario|contabilidad|caja|clientes?|proveedores?|entradas?|marcas?|categorías?|tiendas?|configuración|reportes?|cotizaciones?)/i,
    ],
    entitySlots: ["section"],
    type: "navigation",
  },
]
```

### 4. entity-extractor.ts

```typescript
export function extractEntities(
  match: RegExpMatchArray,
  entitySlots: string[],
): ParsedEntity[] {
  const entities: ParsedEntity[] = []

  for (let i = 0; i < entitySlots.length; i++) {
    const raw = match[i + 1]?.trim()
    if (!raw) continue

    const type = entitySlots[i]
    const entity: ParsedEntity = { type: type as any, raw }

    // Parse value based on type
    switch (type) {
      case "quantity":
      case "amount":
        entity.value = parseInt(raw, 10)
        break
      case "period":
        entity.value = parsePeriod(raw)  // "hoy" → {start: today, end: today}
        break
      case "product":
      case "client":
      case "store":
        entity.value = raw  // Se resuelve después con EntityResolver
        break
    }

    entities.push(entity)
  }

  return entities
}

function parsePeriod(text: string): { start: Date; end: Date; label: string } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (text.toLowerCase()) {
    case "hoy":
      return { start: today, end: now, label: "hoy" }
    case "ayer": {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return { start: yesterday, end: today, label: "ayer" }
    }
    case "esta semana": {
      const weekStart = new Date(today)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      return { start: weekStart, end: now, label: "esta semana" }
    }
    case "este mes":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now, label: "este mes" }
    default:
      return { start: today, end: now, label: text }
  }
}
```

### 5. tool-types.ts

```typescript
export interface ChatTool {
  id: string                          // "inventory.add"
  name: string                        // "Agregar al inventario"
  description: string                 // Para logging/debugging
  type: "query" | "mutation" | "navigation"
  parameters: ToolParameter[]
  requiredPermissions?: string[]      // ["inventory"]
  execute: (
    params: Record<string, unknown>,
    context: ToolContext,
  ) => Promise<ToolResult>
}

export interface ToolParameter {
  name: string                        // "productId"
  type: "number" | "string" | "date" | "boolean"
  required: boolean
  description: string
}

export interface ToolContext {
  authFetch: typeof fetch             // Authenticated fetch
  organizationId: number | null
  companyId: number | null
  userId: number | null
  router: AppRouterInstance           // Para navegación
  currentStoreId?: number
}

export interface ToolResult {
  success: boolean
  type: "table" | "stats" | "confirmation" | "navigation" | "message" | "error"
  title: string
  data?: unknown                      // Datos para renderizar
  message?: string                    // Mensaje de éxito/error
  navigateTo?: string                 // Ruta para navegación
}

export interface ToolConfirmationData {
  toolId: string
  title: string
  fields: { label: string; value: string }[]
  params: Record<string, unknown>     // Params para ejecutar si confirma
}
```

### 6. tool-registry.ts

```typescript
import { saleTools } from "./tools/sale-tools"
import { inventoryTools } from "./tools/inventory-tools"
import { cashregisterTools } from "./tools/cashregister-tools"
import { statsTools } from "./tools/stats-tools"
import { navigationTools } from "./tools/navigation-tools"
import type { ChatTool, ToolContext, ToolResult } from "./tool-types"

const ALL_TOOLS: ChatTool[] = [
  ...saleTools,
  ...inventoryTools,
  ...cashregisterTools,
  ...statsTools,
  ...navigationTools,
]

const toolMap = new Map(ALL_TOOLS.map(t => [t.id, t]))

export function getTool(id: string): ChatTool | undefined {
  return toolMap.get(id)
}

export function getAllTools(): ChatTool[] {
  return ALL_TOOLS
}

export async function executeTool(
  toolId: string,
  params: Record<string, unknown>,
  context: ToolContext,
): Promise<ToolResult> {
  const tool = toolMap.get(toolId)
  if (!tool) {
    return { success: false, type: "error", title: "Error", message: "Herramienta no encontrada" }
  }

  // Check permissions
  if (tool.requiredPermissions?.length) {
    // Validate user has required module permissions
    // (use context.organizationId + membership check)
  }

  try {
    return await tool.execute(params, context)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al ejecutar la acción"
    return { success: false, type: "error", title: "Error", message }
  }
}
```

### 7. entity-resolver.ts

```typescript
import { authFetch } from "@/lib/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"

/** Fuzzy search products by name */
export async function resolveProduct(
  query: string,
  organizationId: number,
): Promise<{ id: number; name: string; price: number; priceSell: number; stock: number } | null> {
  const res = await authFetch(
    `${BACKEND_URL}/api/products?search=${encodeURIComponent(query)}&limit=5`,
  )
  if (!res.ok) return null
  const products = await res.json()

  if (!products?.length) return null

  // Return best match (API already sorts by relevance)
  return {
    id: products[0].id,
    name: products[0].name,
    price: products[0].price,
    priceSell: products[0].priceSell,
    stock: products[0].totalStock ?? 0,
  }
}

/** Fuzzy search clients by name */
export async function resolveClient(
  query: string,
): Promise<{ id: number; name: string } | null> {
  const res = await authFetch(
    `${BACKEND_URL}/api/clients?search=${encodeURIComponent(query)}&limit=5`,
  )
  if (!res.ok) return null
  const clients = await res.json()
  return clients?.[0] ? { id: clients[0].id, name: clients[0].name } : null
}

/** Resolve section name to route */
export function resolveSection(name: string): string | null {
  const SECTION_ROUTES: Record<string, string> = {
    productos: "/dashboard/products",
    ventas: "/dashboard/sales",
    inventario: "/dashboard/inventory",
    contabilidad: "/dashboard/accounting",
    caja: "/dashboard/cashregister",
    clientes: "/dashboard/clients",
    proveedores: "/dashboard/providers",
    entradas: "/dashboard/entries",
    marcas: "/dashboard/brands",
    categorías: "/dashboard/categories",
    tiendas: "/dashboard/stores",
    configuración: "/dashboard/options",
    cotizaciones: "/dashboard/quotes",
  }
  return SECTION_ROUTES[name.toLowerCase()] ?? null
}
```

### 8. Ejemplo de tool: sale-tools.ts

```typescript
import type { ChatTool } from "../tool-types"

export const saleTools: ChatTool[] = [
  {
    id: "sale.list",
    name: "Listar ventas",
    description: "Muestra las ventas recientes o por período",
    type: "query",
    parameters: [
      { name: "period", type: "string", required: false, description: "Período: hoy, ayer, esta semana, este mes" },
      { name: "limit", type: "number", required: false, description: "Cantidad a mostrar" },
    ],
    async execute(params, ctx) {
      const { period, limit = 10 } = params as { period?: { start: Date; end: Date; label: string }; limit?: number }

      let url = `/api/sales?limit=${limit}&sort=desc`
      if (period?.start) url += `&dateFrom=${period.start.toISOString()}`
      if (period?.end) url += `&dateTo=${period.end.toISOString()}`

      const res = await ctx.authFetch(url)
      if (!res.ok) throw new Error("No se pudieron cargar las ventas")
      const data = await res.json()

      const sales = (data.sales ?? data).slice(0, limit)
      const total = sales.reduce((sum: number, s: any) => sum + Number(s.total ?? 0), 0)

      return {
        success: true,
        type: "table",
        title: `Ventas ${period?.label ?? "recientes"}`,
        data: {
          summary: { count: sales.length, total },
          rows: sales.map((s: any) => ({
            id: s.id,
            date: s.createdAt,
            total: Number(s.total ?? 0),
            client: s.client?.name ?? "Público general",
            items: s.details?.length ?? 0,
          })),
          columns: ["#", "Fecha", "Total", "Cliente", "Items"],
        },
      }
    },
  },
  {
    id: "sale.stats",
    name: "Estadísticas de ventas",
    description: "Muestra totales y promedios de ventas",
    type: "query",
    parameters: [
      { name: "period", type: "string", required: false, description: "Período" },
    ],
    async execute(params, ctx) {
      const res = await ctx.authFetch("/api/sales")
      if (!res.ok) throw new Error("No se pudieron cargar estadísticas")
      const data = await res.json()

      const sales = data.sales ?? data
      const total = sales.reduce((sum: number, s: any) => sum + Number(s.total ?? 0), 0)
      const avg = sales.length > 0 ? total / sales.length : 0

      return {
        success: true,
        type: "stats",
        title: "Estadísticas de ventas",
        data: {
          cards: [
            { label: "Total ventas", value: sales.length, format: "number" },
            { label: "Monto total", value: total, format: "currency" },
            { label: "Ticket promedio", value: avg, format: "currency" },
          ],
        },
      }
    },
  },
]
```

### 9. Ejemplo de tool: inventory-tools.ts

```typescript
import type { ChatTool } from "../tool-types"
import { resolveProduct } from "../entity-resolver"

export const inventoryTools: ChatTool[] = [
  {
    id: "inventory.add",
    name: "Agregar al inventario",
    description: "Crea una entrada de inventario para un producto",
    type: "mutation",
    requiredPermissions: ["inventory"],
    parameters: [
      { name: "productId", type: "number", required: true, description: "ID del producto" },
      { name: "quantity", type: "number", required: true, description: "Cantidad" },
      { name: "storeId", type: "number", required: false, description: "ID de la tienda" },
      { name: "providerId", type: "number", required: false, description: "ID del proveedor" },
    ],
    async execute(params, ctx) {
      const { productId, quantity, storeId, providerId, price } = params as any

      const res = await ctx.authFetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: storeId ?? ctx.currentStoreId,
          userId: ctx.userId,
          providerId: providerId ?? null,
          date: new Date().toISOString(),
          description: `Entrada vía asistente`,
          tipoMoneda: "PEN",
          details: [{
            productId,
            quantity,
            price: price ?? 0,
            priceInSoles: price ?? 0,
          }],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.message ?? "No se pudo crear la entrada")
      }

      const entry = await res.json()
      return {
        success: true,
        type: "message",
        title: "Entrada creada",
        message: `Entrada #${entry.id} creada: ${quantity} unidades agregadas al inventario.`,
      }
    },
  },
  {
    id: "product.search",
    name: "Buscar producto",
    description: "Busca productos por nombre y muestra stock",
    type: "query",
    parameters: [
      { name: "query", type: "string", required: true, description: "Texto de búsqueda" },
    ],
    async execute(params, ctx) {
      const { query } = params as { query: string }
      const res = await ctx.authFetch(`/api/products?search=${encodeURIComponent(query)}&limit=10`)
      if (!res.ok) throw new Error("Error buscando productos")
      const products = await res.json()

      return {
        success: true,
        type: "table",
        title: `Resultados para "${query}"`,
        data: {
          summary: { count: products.length },
          rows: products.map((p: any) => ({
            id: p.id,
            name: p.name,
            price: Number(p.priceSell ?? p.price ?? 0),
            stock: p.totalStock ?? 0,
            category: p.category_name ?? "-",
          })),
          columns: ["ID", "Producto", "Precio", "Stock", "Categoría"],
        },
      }
    },
  },
  {
    id: "product.lowstock",
    name: "Productos con stock bajo",
    description: "Lista productos con stock bajo o agotados",
    type: "query",
    parameters: [],
    async execute(params, ctx) {
      const res = await ctx.authFetch("/api/products")
      if (!res.ok) throw new Error("Error cargando productos")
      const products = await res.json()

      const lowStock = products
        .filter((p: any) => (p.totalStock ?? 0) <= (p.minStock ?? 5))
        .sort((a: any, b: any) => (a.totalStock ?? 0) - (b.totalStock ?? 0))
        .slice(0, 15)

      return {
        success: true,
        type: "table",
        title: "Productos con stock bajo",
        data: {
          summary: { count: lowStock.length },
          rows: lowStock.map((p: any) => ({
            id: p.id,
            name: p.name,
            stock: p.totalStock ?? 0,
            minStock: p.minStock ?? 5,
          })),
          columns: ["ID", "Producto", "Stock actual", "Stock mínimo"],
        },
      }
    },
  },
]
```

---

## Fase 2: UI Components para resultados

### tool-confirmation-card.tsx

Card interactivo dentro del chat para confirmar mutaciones:
- Muestra campos resueltos (nombre del producto, cantidad, tienda)
- Botones "Confirmar" y "Cancelar"
- Estado loading mientras se ejecuta
- Estado success/error después de ejecutar

### tool-result-table.tsx

Mini-tabla responsiva dentro del chat:
- Header con título y count
- Filas con datos formateados (moneda, fecha, número)
- Máximo 5-10 filas visible, "Ver más" link para navegar a la sección

### tool-result-stats.tsx

Cards de KPI inline:
- 2-4 cards en fila horizontal (responsive)
- Cada card: label + valor grande formateado
- Formato: currency (S/ 2,340.00), number (15), percentage (23.5%)

---

## Fase 3: Entity Resolution avanzada

Resolver entidades usando búsqueda fuzzy contra datos reales:
- Productos: usar el endpoint existente `/api/products?search=X`
- Clientes: usar `/api/clients?search=X`
- Tiendas: lista corta, resolver localmente
- Proveedores: usar `/api/providers?search=X`

Cuando hay ambigüedad (múltiples matches), el chatbot pregunta:
```
"Encontré 3 productos que coinciden con 'jabón':
1. JABÓN LÍQUIDO 500ML (Stock: 45)
2. JABÓN EN BARRA DOVE (Stock: 12)
3. JABÓN ANTIBACTERIAL (Stock: 0)
¿Cuál necesitas?"
```

---

## Fases de implementación (orden recomendado)

### Fase 1A: Intent Parser + tipos base (1 sesión)
- Crear `intent-types.ts`, `intent-parser.ts`, `entity-extractor.ts`
- Crear catálogo de patterns
- Unit tests del parser

### Fase 1B: Tool Registry + tools de consulta (1 sesión)
- Crear `tool-types.ts`, `tool-registry.ts`
- Implementar `sale.list`, `sale.stats`, `product.search`, `product.lowstock`, `cashregister.view`, `stats.dashboard`
- Integrar en `sendMessage()` del context

### Fase 1C: UI de resultados en el chat (1 sesión)
- Crear `tool-result-table.tsx`, `tool-result-stats.tsx`
- Modificar `HelpChatPanel.tsx` para renderizar tool results
- Probar consultas end-to-end

### Fase 2A: Tools de mutación + confirmación (1 sesión)
- Implementar `inventory.add`, `sale.create`
- Crear `tool-confirmation-card.tsx`
- Flujo confirm/cancel en context

### Fase 2B: Entity Resolver (1 sesión)
- Crear `entity-resolver.ts`
- Resolver productos, clientes, tiendas por fuzzy search
- Diálogo de desambiguación cuando hay múltiples matches

### Fase 3: Navegación + polish (1 sesión)
- Implementar `navigate.to` con router.push
- Quick actions en welcome message usando intents
- Refinamiento de patterns basado en uso real

---

## Métricas de éxito

| Métrica | Objetivo |
|---------|----------|
| Intent detection accuracy | > 85% en intents del catálogo |
| Consultas ejecutadas sin error | > 95% |
| Mutaciones confirmadas exitosamente | > 90% |
| Tiempo de respuesta (consultas) | < 2 segundos |
| Fallback a Q&A cuando no hay intent | 100% (sin regresión) |

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Falso positivo (ejecutar acción no deseada) | Confidence threshold alto (0.85) + confirmación para mutaciones |
| Entity resolver retorna producto incorrecto | Siempre mostrar nombre resuelto al usuario antes de ejecutar |
| API de backend falla | ToolErrorCard con sugerencia de acción manual |
| Conflicto con Q&A existente | Intent parser es paso ANTES, si no hay match va a Q&A intacto |
| Permisos insuficientes | Verificar permissions antes de ejecutar, mensaje claro si falta |
