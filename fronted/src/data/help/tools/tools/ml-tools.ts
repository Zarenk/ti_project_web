/**
 * Herramientas ML del chatbot operacional.
 * Permiten a usuarios finales consultar modelos de machine learning
 * (predicción de demanda, productos relacionados, verificación de precios,
 * segmentos de clientes) directamente desde el chat.
 */

import type { ChatTool, ToolStatsData, ToolTableData } from "../tool-types"

export const mlTools: ChatTool[] = [
  // ══ PREDICCIÓN DE DEMANDA ══
  {
    id: "ml.demand",
    name: "Predicción de demanda",
    description: "Predice la demanda de un producto para los próximos 7 días",
    type: "query",
    parameters: [
      { name: "productId", type: "number", required: true, description: "ID del producto" },
      { name: "productName", type: "string", required: false, description: "Nombre del producto" },
    ],
    async execute(params, ctx) {
      const { productId, productName } = params as {
        productId: number
        productName?: string
      }

      const res = await ctx.authFetch(`/ml-models/demand/${productId}`)
      if (!res.ok) throw new Error("No se pudo obtener la predicción de demanda")
      const data = await res.json()

      if (!data.available) {
        return {
          success: true,
          type: "message",
          title: "Sin predicción disponible",
          message: `No hay datos suficientes para predecir la demanda de ${productName ?? `producto #${productId}`}. Se necesitan más datos de ventas para entrenar el modelo.`,
        }
      }

      const forecast = data.forecast as Array<{
        ds: string
        yhat: number
        yhat_lower: number
        yhat_upper: number
      }>

      const totalPredicted = forecast.reduce((sum, f) => sum + Math.max(0, Math.round(f.yhat)), 0)
      const avgDaily = totalPredicted / forecast.length

      return {
        success: true,
        type: "table",
        title: `Predicción de demanda — ${productName ?? `Producto #${productId}`}`,
        data: {
          summary: {
            count: forecast.length,
            total: totalPredicted,
          },
          rows: forecast.map(f => ({
            fecha: new Date(f.ds).toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short" }),
            estimado: Math.max(0, Math.round(f.yhat)),
            minimo: Math.max(0, Math.round(f.yhat_lower)),
            maximo: Math.max(0, Math.round(f.yhat_upper)),
          })),
          columns: ["Fecha", "Estimado", "Mínimo", "Máximo"],
        } satisfies ToolTableData,
        message: `Método: ${data.method ?? "Prophet"}. Promedio diario estimado: ${avgDaily.toFixed(1)} unidades. Total 7 días: ~${totalPredicted} unidades.`,
      }
    },
  },

  // ══ PRODUCTOS RELACIONADOS (BASKET ANALYSIS) ══
  {
    id: "ml.basket",
    name: "Productos relacionados",
    description: "Muestra qué productos se compran frecuentemente junto con otro",
    type: "query",
    parameters: [
      { name: "productId", type: "number", required: true, description: "ID del producto" },
      { name: "productName", type: "string", required: false, description: "Nombre del producto" },
    ],
    async execute(params, ctx) {
      const { productId, productName } = params as {
        productId: number
        productName?: string
      }

      const res = await ctx.authFetch(`/ml-models/basket/${productId}?limit=5`)
      if (!res.ok) throw new Error("No se pudieron obtener productos relacionados")
      const rules = await res.json() as Array<{
        productIds: number[]
        productNames: string[]
        confidence: number
        lift: number
      }>

      if (!Array.isArray(rules) || rules.length === 0) {
        return {
          success: true,
          type: "message",
          title: "Sin asociaciones",
          message: `No se encontraron productos que se compren frecuentemente con ${productName ?? `producto #${productId}`}. Se necesitan más datos de ventas.`,
        }
      }

      return {
        success: true,
        type: "table",
        title: `Productos relacionados con ${productName ?? `Producto #${productId}`}`,
        data: {
          summary: { count: rules.length },
          rows: rules.map(r => ({
            productos: r.productNames.join(", "),
            confianza: `${(r.confidence * 100).toFixed(0)}%`,
            relevancia: r.lift.toFixed(2),
          })),
          columns: ["Se compra junto con", "Confianza", "Relevancia (lift)"],
        } satisfies ToolTableData,
        message: `Quienes compran ${productName ?? `producto #${productId}`} también suelen comprar estos productos.`,
      }
    },
  },

  // ══ VERIFICACIÓN DE PRECIO ══
  {
    id: "ml.price",
    name: "Verificar precio",
    description: "Verifica si un precio es normal o anómalo para un producto",
    type: "query",
    parameters: [
      { name: "productId", type: "number", required: true, description: "ID del producto" },
      { name: "productName", type: "string", required: false, description: "Nombre del producto" },
      { name: "price", type: "number", required: true, description: "Precio a verificar" },
    ],
    async execute(params, ctx) {
      const { productId, productName, price } = params as {
        productId: number
        productName?: string
        price: number
      }

      const res = await ctx.authFetch("/ml-models/price-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, price }),
      })
      if (!res.ok) throw new Error("No se pudo verificar el precio")
      const data = await res.json() as {
        available: boolean
        isAnomaly?: boolean
        reason?: string
        stats?: { mean: number; min: number; max: number; p5: number; p95: number }
      }

      if (!data.available) {
        return {
          success: true,
          type: "message",
          title: "Sin datos de precio",
          message: `No hay historial de precios suficiente para ${productName ?? `producto #${productId}`}.`,
        }
      }

      const label = productName ?? `Producto #${productId}`
      const statusEmoji = data.isAnomaly ? "⚠️" : "✅"
      const statusText = data.isAnomaly ? "ANÓMALO" : "NORMAL"

      if (data.stats) {
        return {
          success: true,
          type: "stats",
          title: `${statusEmoji} Precio S/ ${price.toFixed(2)} para ${label}: ${statusText}`,
          data: {
            cards: [
              { label: "Precio consultado", value: price, format: "currency" },
              { label: "Precio promedio", value: data.stats.mean, format: "currency" },
              { label: "Rango bajo (P5)", value: data.stats.p5, format: "currency" },
              { label: "Rango alto (P95)", value: data.stats.p95, format: "currency" },
            ],
          } satisfies ToolStatsData,
          message: data.reason ?? (data.isAnomaly
            ? `El precio S/ ${price.toFixed(2)} está fuera del rango normal (S/ ${data.stats.p5.toFixed(2)} - S/ ${data.stats.p95.toFixed(2)}).`
            : `El precio S/ ${price.toFixed(2)} está dentro del rango normal.`),
        }
      }

      return {
        success: true,
        type: "message",
        title: `Verificación de precio — ${label}`,
        message: `${statusEmoji} El precio S/ ${price.toFixed(2)} es **${statusText}** para ${label}. ${data.reason ?? ""}`,
      }
    },
  },

  // ══ SEGMENTOS DE CLIENTES ══
  {
    id: "ml.segments",
    name: "Segmentos de clientes",
    description: "Muestra la segmentación de clientes (VIP, frecuente, en riesgo, etc.)",
    type: "query",
    parameters: [],
    async execute(_params, ctx) {
      const res = await ctx.authFetch("/ml-models/segments")
      if (!res.ok) throw new Error("No se pudieron obtener los segmentos de clientes")
      const segments = await res.json() as Record<string, {
        label: string
        count: number
        avg_monetary: number
        avg_frequency: number
        avg_recency: number
      }>

      const entries = Object.entries(segments)
      if (entries.length === 0) {
        return {
          success: true,
          type: "message",
          title: "Sin segmentos disponibles",
          message: "No hay datos de segmentación de clientes. Se necesitan más datos de ventas para entrenar el modelo.",
        }
      }

      const totalClients = entries.reduce((sum, [, s]) => sum + s.count, 0)

      return {
        success: true,
        type: "table",
        title: "Segmentos de clientes",
        data: {
          summary: { count: totalClients },
          rows: entries.map(([, s]) => ({
            segmento: s.label,
            clientes: s.count,
            "gasto promedio": `S/ ${s.avg_monetary.toFixed(2)}`,
            "frecuencia promedio": s.avg_frequency.toFixed(1),
            "recencia (días)": s.avg_recency.toFixed(0),
          })),
          columns: ["Segmento", "Clientes", "Gasto promedio", "Frecuencia", "Recencia (días)"],
        } satisfies ToolTableData,
        message: `${totalClients} clientes segmentados en ${entries.length} grupos. Los segmentos ayudan a identificar clientes VIP, en riesgo de pérdida y oportunidades de retención.`,
      }
    },
  },
]
