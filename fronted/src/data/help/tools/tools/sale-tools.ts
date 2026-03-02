import type { ChatTool } from "../tool-types"

export const saleTools: ChatTool[] = [
  {
    id: "sale.list",
    name: "Listar ventas",
    description: "Muestra las ventas recientes o por período",
    type: "query",
    parameters: [
      { name: "period", type: "string", required: false, description: "Período" },
      { name: "limit", type: "number", required: false, description: "Cantidad" },
    ],
    async execute(params, ctx) {
      const { period, limit = 10 } = params as {
        period?: { start: Date; end: Date; label: string }
        limit?: number
      }

      let url = "/sales"
      if (period?.start && period?.end) {
        const from = encodeURIComponent(period.start.toISOString())
        const to = encodeURIComponent(period.end.toISOString())
        url = `/sales/recent/${from}/${to}`
      }

      const res = await ctx.authFetch(url)
      if (!res.ok) throw new Error("No se pudieron cargar las ventas")
      const data = await res.json()

      const sales = (Array.isArray(data) ? data : data.sales ?? []).slice(0, limit)
      const total = sales.reduce((sum: number, s: Record<string, unknown>) => sum + Number(s.total ?? 0), 0)

      return {
        success: true,
        type: "table",
        title: `Ventas ${period?.label ?? "recientes"}`,
        data: {
          summary: { count: sales.length, total },
          rows: sales.map((s: Record<string, unknown>) => ({
            id: s.id,
            date: s.createdAt,
            total: Number(s.total ?? 0),
            client: (s.client as Record<string, unknown>)?.name ?? "Público general",
            items: Array.isArray(s.details) ? s.details.length : 0,
          })),
          columns: ["#", "Fecha", "Total", "Cliente", "Items"],
        },
      }
    },
  },
  {
    id: "sale.stats",
    name: "Estadísticas de ventas",
    description: "Muestra totales y promedios de ventas del período",
    type: "query",
    parameters: [
      { name: "period", type: "string", required: false, description: "Período" },
    ],
    async execute(params, ctx) {
      const { period } = params as {
        period?: { start: Date; end: Date; label: string }
      }

      // Use the monthly endpoints for stats
      const [totalRes, countRes, profitRes] = await Promise.all([
        ctx.authFetch("/sales/monthly-total"),
        ctx.authFetch("/sales/monthly-count"),
        ctx.authFetch("/sales/monthly-profit"),
      ])

      const totalData = totalRes.ok ? await totalRes.json() : { total: 0 }
      const countData = countRes.ok ? await countRes.json() : { count: 0 }
      const profitData = profitRes.ok ? await profitRes.json() : { profit: 0 }

      return {
        success: true,
        type: "stats",
        title: `Estadísticas de ventas ${period?.label ?? "del mes"}`,
        data: {
          cards: [
            { label: "Total ventas", value: Number(countData.count ?? 0), format: "number" },
            { label: "Monto total", value: Number(totalData.total ?? 0), format: "currency" },
            { label: "Ganancia", value: Number(profitData.profit ?? 0), format: "currency" },
          ],
        },
      }
    },
  },
  {
    id: "sale.create",
    name: "Crear venta rápida",
    description: "Registra una nueva venta",
    type: "mutation",
    requiredPermissions: ["sales"],
    parameters: [
      { name: "productId", type: "number", required: true, description: "ID del producto" },
      { name: "productName", type: "string", required: false, description: "Nombre del producto" },
      { name: "quantity", type: "number", required: true, description: "Cantidad" },
      { name: "price", type: "number", required: false, description: "Precio" },
      { name: "clientId", type: "number", required: false, description: "ID del cliente" },
    ],
    async execute(params, ctx) {
      const { productId, quantity, price, clientId, productName } = params as {
        productId: number
        productName?: string
        quantity: number
        price?: number
        clientId?: number
      }

      if (!ctx.userId) throw new Error("No se pudo identificar al usuario")
      if (!ctx.currentStoreId) throw new Error("No hay tienda seleccionada")

      const unitPrice = price ?? 0
      const total = unitPrice * quantity

      const res = await ctx.authFetch("/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: ctx.userId,
          storeId: ctx.currentStoreId,
          clientId: clientId ?? null,
          total,
          tipoMoneda: "PEN",
          details: [{ productId, quantity, price: unitPrice }],
          payments: [{ paymentMethodId: 1, amount: total, currency: "PEN" }],
          source: "POS",
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.message ?? "No se pudo crear la venta")
      }

      const sale = await res.json()
      return {
        success: true,
        type: "message",
        title: "Venta creada",
        message: `Venta #${sale.id} creada: ${quantity}x ${productName ?? `producto #${productId}`} por S/ ${total.toFixed(2)}`,
      }
    },
  },
]
