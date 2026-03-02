import type { ChatTool } from "../tool-types"

export const inventoryTools: ChatTool[] = [
  {
    id: "inventory.add",
    name: "Agregar al inventario",
    description: "Crea una entrada de inventario para un producto",
    type: "mutation",
    requiredPermissions: ["inventory"],
    parameters: [
      { name: "productId", type: "number", required: true, description: "ID del producto" },
      { name: "productName", type: "string", required: false, description: "Nombre del producto" },
      { name: "quantity", type: "number", required: true, description: "Cantidad" },
      { name: "price", type: "number", required: false, description: "Precio de compra" },
      { name: "storeId", type: "number", required: false, description: "ID de la tienda" },
      { name: "providerId", type: "number", required: false, description: "ID del proveedor" },
    ],
    async execute(params, ctx) {
      const { productId, productName, quantity, price, storeId, providerId } = params as {
        productId: number
        productName?: string
        quantity: number
        price?: number
        storeId?: number
        providerId?: number
      }

      if (!ctx.userId) throw new Error("No se pudo identificar al usuario")

      const targetStoreId = storeId ?? ctx.currentStoreId
      if (!targetStoreId) throw new Error("No hay tienda seleccionada")

      const res = await ctx.authFetch("/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: targetStoreId,
          userId: ctx.userId,
          providerId: providerId ?? null,
          date: new Date().toISOString(),
          description: `Entrada vía asistente - ${productName ?? `producto #${productId}`}`,
          tipoMoneda: "PEN",
          details: [{
            productId,
            quantity,
            price: price ?? 0,
            priceInSoles: price ?? 0,
          }],
          referenceId: `assistant-entry-${productId}-${Date.now()}`,
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
        message: `Entrada #${entry.id} creada: ${quantity} unidades de ${productName ?? `producto #${productId}`} agregadas al inventario.`,
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
      const res = await ctx.authFetch(`/products?search=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error("Error buscando productos")
      const products = await res.json()

      const list = (Array.isArray(products) ? products : products.data ?? []).slice(0, 10)

      return {
        success: true,
        type: "table",
        title: `Resultados para "${query}"`,
        data: {
          summary: { count: list.length },
          rows: list.map((p: Record<string, unknown>) => ({
            id: p.id,
            name: p.name,
            price: Number(p.priceSell ?? p.price ?? 0),
            stock: p.totalStock ?? 0,
            category: p.category_name ?? "-",
          })),
          columns: ["ID", "Producto", "Precio venta", "Stock", "Categoría"],
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
    async execute(_params, ctx) {
      const res = await ctx.authFetch("/products")
      if (!res.ok) throw new Error("Error cargando productos")
      const products = await res.json()

      const list = (Array.isArray(products) ? products : products.data ?? [])
        .filter((p: Record<string, unknown>) => (Number(p.totalStock ?? 0)) <= (Number(p.minStock ?? 5)))
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
          (Number(a.totalStock ?? 0)) - (Number(b.totalStock ?? 0))
        )
        .slice(0, 15)

      return {
        success: true,
        type: "table",
        title: "Productos con stock bajo",
        data: {
          summary: { count: list.length },
          rows: list.map((p: Record<string, unknown>) => ({
            id: p.id,
            name: p.name,
            stock: Number(p.totalStock ?? 0),
            minStock: Number(p.minStock ?? 5),
          })),
          columns: ["ID", "Producto", "Stock actual", "Stock mínimo"],
        },
      }
    },
  },
]
