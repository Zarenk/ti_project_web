import type { ChatTool } from "../tool-types"

export const cashregisterTools: ChatTool[] = [
  {
    id: "cashregister.view",
    name: "Ver caja registradora",
    description: "Muestra el estado y transacciones de caja",
    type: "query",
    parameters: [],
    async execute(_params, ctx) {
      if (!ctx.currentStoreId) {
        throw new Error("No hay tienda seleccionada para consultar la caja")
      }

      // Fetch active cash register and today's transactions in parallel
      const [activeRes, txnRes] = await Promise.all([
        ctx.authFetch(`/cashregister/active/${ctx.currentStoreId}`),
        ctx.authFetch(`/cashregister/transactions/${ctx.currentStoreId}/today`),
      ])

      const active = activeRes.ok ? await activeRes.json() : null
      const transactions = txnRes.ok ? await txnRes.json() : []

      const txnList = (Array.isArray(transactions) ? transactions : []).slice(0, 10)

      if (!active) {
        return {
          success: true,
          type: "message",
          title: "Caja registradora",
          message: "No hay una caja abierta actualmente. Ve a la sección de caja para abrir una.",
        }
      }

      const income = txnList
        .filter((t: Record<string, unknown>) => t.type === "INCOME" || t.type === "SALE")
        .reduce((sum: number, t: Record<string, unknown>) => sum + Number(t.amount ?? 0), 0)
      const expense = txnList
        .filter((t: Record<string, unknown>) => t.type === "EXPENSE" || t.type === "WITHDRAWAL")
        .reduce((sum: number, t: Record<string, unknown>) => sum + Number(t.amount ?? 0), 0)

      return {
        success: true,
        type: "stats",
        title: "Estado de caja - Hoy",
        data: {
          cards: [
            { label: "Balance actual", value: Number(active.currentBalance ?? active.balance ?? 0), format: "currency" },
            { label: "Ingresos hoy", value: income, format: "currency" },
            { label: "Egresos hoy", value: expense, format: "currency" },
            { label: "Transacciones", value: txnList.length, format: "number" },
          ],
        },
      }
    },
  },
]
