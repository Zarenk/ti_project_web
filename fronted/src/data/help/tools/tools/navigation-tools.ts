import type { ChatTool } from "../tool-types"

const SECTION_ROUTES: Record<string, string> = {
  productos: "/dashboard/products",
  producto: "/dashboard/products",
  ventas: "/dashboard/sales",
  venta: "/dashboard/sales",
  inventario: "/dashboard/inventory",
  contabilidad: "/dashboard/accounting",
  caja: "/dashboard/cashregister",
  clientes: "/dashboard/clients",
  cliente: "/dashboard/clients",
  proveedores: "/dashboard/providers",
  proveedor: "/dashboard/providers",
  entradas: "/dashboard/entries",
  entrada: "/dashboard/entries",
  marcas: "/dashboard/brands",
  marca: "/dashboard/brands",
  categorías: "/dashboard/categories",
  categorias: "/dashboard/categories",
  categoria: "/dashboard/categories",
  tiendas: "/dashboard/stores",
  tienda: "/dashboard/stores",
  configuración: "/dashboard/options",
  configuracion: "/dashboard/options",
  reportes: "/dashboard/accounting/reports",
  reporte: "/dashboard/accounting/reports",
  cotizaciones: "/dashboard/quotes",
  cotizacion: "/dashboard/quotes",
}

export const navigationTools: ChatTool[] = [
  {
    id: "navigate.to",
    name: "Navegar a sección",
    description: "Navega a una sección del dashboard",
    type: "navigation",
    parameters: [
      { name: "section", type: "string", required: true, description: "Sección destino" },
    ],
    async execute(params, ctx) {
      const { section } = params as { section: string }
      const route = SECTION_ROUTES[section.toLowerCase().trim()]

      if (!route) {
        return {
          success: false,
          type: "error",
          title: "Sección no encontrada",
          message: `No reconozco la sección "${section}". Secciones disponibles: ${Object.keys(SECTION_ROUTES).filter((_, i) => i % 2 === 0).join(", ")}`,
        }
      }

      ctx.router.push(route)

      return {
        success: true,
        type: "navigation",
        title: "Navegando",
        message: `Abriendo ${section}...`,
        navigateTo: route,
      }
    },
  },
]
