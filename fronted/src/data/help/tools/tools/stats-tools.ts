import type { ChatTool } from "../tool-types"

export const statsTools: ChatTool[] = [
  {
    id: "stats.dashboard",
    name: "Resumen del negocio",
    description: "Muestra métricas generales del negocio",
    type: "query",
    parameters: [
      { name: "period", type: "string", required: false, description: "Período" },
    ],
    async execute(params, ctx) {
      const { period } = params as {
        period?: { start: Date; end: Date; label: string }
      }

      // Fetch all monthly KPIs in parallel
      const [totalRes, countRes, profitRes, clientsRes] = await Promise.all([
        ctx.authFetch("/sales/monthly-total"),
        ctx.authFetch("/sales/monthly-count"),
        ctx.authFetch("/sales/monthly-profit"),
        ctx.authFetch("/sales/monthly-clients"),
      ])

      const totalData = totalRes.ok ? await totalRes.json() : { total: 0, growth: 0 }
      const countData = countRes.ok ? await countRes.json() : { count: 0, growth: 0 }
      const profitData = profitRes.ok ? await profitRes.json() : { profit: 0, growth: 0 }
      const clientsData = clientsRes.ok ? await clientsRes.json() : { clients: 0, growth: 0 }

      return {
        success: true,
        type: "stats",
        title: `Resumen ${period?.label ?? "del mes"}`,
        data: {
          cards: [
            { label: "Ventas totales", value: Number(totalData.total ?? 0), format: "currency" },
            { label: "Cantidad de ventas", value: Number(countData.count ?? 0), format: "number" },
            { label: "Ganancia", value: Number(profitData.profit ?? 0), format: "currency" },
            { label: "Clientes atendidos", value: Number(clientsData.clients ?? 0), format: "number" },
          ],
        },
      }
    },
  },
]
