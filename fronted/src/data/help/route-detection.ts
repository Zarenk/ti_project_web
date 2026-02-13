/**
 * Route Detection - Detección automática de sección según la URL
 *
 * Permite al chatbot saber en qué parte del sistema está el usuario
 * para brindar respuestas contextuales y relevantes
 */

export interface RouteContext {
  section: string
  subsection?: string
  action?: 'view' | 'create' | 'edit' | 'list'
  entityId?: string
  breadcrumb: string[]
}

/**
 * Mapeo de rutas a secciones del sistema de ayuda
 */
const ROUTE_TO_SECTION_MAP: Record<string, string> = {
  // Inventario
  '/dashboard/inventory/labels': 'inventory',
  '/dashboard/inventory/product-details': 'inventory',
  '/dashboard/inventory': 'inventory',

  // Productos
  '/dashboard/products': 'products',
  '/dashboard/products/new': 'products',

  // Ventas
  '/dashboard/sales': 'sales',
  '/dashboard/sales/new': 'sales',
  '/dashboard/sales/salesdashboard': 'sales',

  // Ingresos/Entradas
  '/dashboard/entries': 'entries',
  '/dashboard/entries/new': 'entries',

  // Contabilidad
  '/dashboard/accounting': 'accounting',
  '/dashboard/accounting/entries': 'accounting',
  '/dashboard/accounting/journals': 'accounting',

  // Cotizaciones
  '/dashboard/quotes': 'quotes',
  '/dashboard/quotes/history': 'quotes',

  // Catálogo
  '/dashboard/catalog': 'catalog',

  // Reportes
  '/dashboard/accounting/reports/trial-balance': 'reports',
  '/dashboard/accounting/reports/ledger': 'reports',
  '/dashboard/sales/product-report': 'reports',
  '/dashboard/reports': 'reports',

  // Clientes
  '/dashboard/clients': 'clients',

  // Proveedores
  '/dashboard/providers': 'providers',

  // Tiendas
  '/dashboard/stores': 'stores',

  // Marcas
  '/dashboard/brands': 'brands',

  // Categorías
  '/dashboard/categories': 'categories',

  // Usuarios
  '/dashboard/users': 'users',

  // Configuración del Sistema
  '/dashboard/options': 'settings',
  '/dashboard/settings': 'settings',

  // Tienda Pública
  '/store': 'public-store',
  '/cart': 'public-store',

  // Caja registradora
  '/dashboard/cashregister': 'cashregister',

  // Cambio de divisas
  '/dashboard/exchange': 'exchange',

  // Multi-tenancy
  '/dashboard/tenancy': 'tenancy',

  // Órdenes
  '/dashboard/orders': 'sales',
  '/dashboard/pending-orders': 'sales',

  // Mensajes
  '/dashboard/messages': 'settings',

  // Historial
  '/dashboard/history': 'settings',

  // Código de barras
  '/barcode': 'hardware',

  // API
  '/api': 'api-integrations',
}

/**
 * Nombres amigables de secciones para mostrar al usuario
 */
const SECTION_DISPLAY_NAMES: Record<string, string> = {
  inventory: 'Inventario',
  products: 'Productos',
  sales: 'Ventas',
  entries: 'Ingresos',
  accounting: 'Contabilidad',
  quotes: 'Cotizaciones',
  catalog: 'Catálogo',
  reports: 'Reportes',
  clients: 'Clientes',
  providers: 'Proveedores',
  stores: 'Tiendas',
  brands: 'Marcas',
  categories: 'Categorías',
  users: 'Usuarios',
  settings: 'Configuración',
  cashregister: 'Caja Registradora',
  exchange: 'Cambio de Divisas',
  tenancy: 'Multi-Tenancy',
  hardware: 'Hardware',
  'api-integrations': 'Integraciones API',
  'public-store': 'Tienda en Línea',
}

/**
 * Detecta la sección actual basándose en la ruta del navegador
 */
export function detectCurrentSection(pathname?: string): RouteContext {
  // Usar pathname proporcionado o detectar del navegador
  const currentPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : '/dashboard')

  // Normalizar path (remover trailing slash)
  const normalizedPath = currentPath.replace(/\/$/, '')

  // Detectar acción (new, edit, etc.)
  let action: RouteContext['action'] = 'view'
  if (normalizedPath.includes('/new')) {
    action = 'create'
  } else if (normalizedPath.includes('/edit')) {
    action = 'edit'
  } else if (normalizedPath.match(/\/\d+$/)) {
    action = 'view'
  }

  // Extraer ID si existe
  const idMatch = normalizedPath.match(/\/(\d+)(?:\/|$)/)
  const entityId = idMatch ? idMatch[1] : undefined

  // Buscar coincidencia exacta primero
  let section = ROUTE_TO_SECTION_MAP[normalizedPath]

  // Si no hay coincidencia exacta, buscar por prefijo (más específico primero)
  if (!section) {
    const sortedRoutes = Object.keys(ROUTE_TO_SECTION_MAP).sort((a, b) => b.length - a.length)

    for (const route of sortedRoutes) {
      if (normalizedPath.startsWith(route)) {
        section = ROUTE_TO_SECTION_MAP[route]
        break
      }
    }
  }

  // Fallback a 'general' si no se encuentra sección
  if (!section) {
    section = 'general'
  }

  // Construir breadcrumb
  const pathParts = normalizedPath.split('/').filter(Boolean)
  const breadcrumb = pathParts.map(part => {
    // Capitalizar primera letra
    return part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ')
  })

  // Detectar subsección
  let subsection: string | undefined
  if (pathParts.length > 2) {
    subsection = pathParts[2]
  }

  return {
    section,
    subsection,
    action,
    entityId,
    breadcrumb
  }
}

/**
 * Obtiene el nombre amigable de una sección
 */
export function getSectionDisplayName(section: string): string {
  return SECTION_DISPLAY_NAMES[section] || section
}

/**
 * Genera mensaje contextual basado en la ubicación actual
 */
export function generateContextualGreeting(context: RouteContext): string {
  const sectionName = getSectionDisplayName(context.section)

  if (context.action === 'create') {
    return `Estás en la sección de **${sectionName}** creando un nuevo registro. ¿Necesitas ayuda con algo específico?`
  }

  if (context.action === 'edit') {
    return `Estás editando en **${sectionName}**. ¿En qué puedo ayudarte?`
  }

  return `Estás en la sección de **${sectionName}**. ¿Qué necesitas saber?`
}

/**
 * Genera sugerencias contextuales basadas en la sección actual
 */
export function getContextualSuggestions(section: string): string[] {
  const suggestions: Record<string, string[]> = {
    inventory: [
      '¿Cómo veo el stock de un producto?',
      '¿Cómo genero etiquetas?',
      '¿Dónde veo productos con stock bajo?',
    ],
    products: [
      '¿Cómo creo un producto?',
      '¿Cómo agrego imágenes a un producto?',
      '¿Cómo configuro variantes de producto?',
    ],
    sales: [
      '¿Cómo registro una venta?',
      '¿Cómo imprimo una factura?',
      '¿Cómo anulo una venta?',
    ],
    entries: [
      '¿Cómo registro un ingreso?',
      '¿Cómo subo una guía de remisión?',
      '¿Dónde veo mis ingresos pendientes?',
    ],
    accounting: [
      '¿Cómo creo un asiento contable?',
      '¿Cómo veo el libro diario?',
      '¿Cómo genero un balance?',
    ],
    quotes: [
      '¿Cómo creo una cotización?',
      '¿Cómo convierto una cotización en venta?',
      '¿Cómo envío una cotización por WhatsApp?',
    ],
    catalog: [
      '¿Cómo exporto mi catálogo?',
      '¿Cómo personalizo la portada del catálogo?',
      '¿Dónde veo la vista previa del catálogo?',
    ],
    clients: [
      '¿Cómo registro un cliente?',
      '¿Cómo veo el historial de compras de un cliente?',
      '¿Cómo importo clientes desde Excel?',
    ],
    cashregister: [
      '¿Cómo abro la caja?',
      '¿Cómo hago un cierre de caja?',
      '¿Dónde veo el historial de movimientos?',
    ],
    users: [
      '¿Cómo creo un usuario?',
      '¿Cómo asigno permisos?',
      '¿Cómo desactivo un usuario?',
    ],
    settings: [
      '¿Cómo configuro la empresa?',
      '¿Dónde cambio el logo?',
      '¿Cómo activo la facturación electrónica?',
    ],
    'public-store': [
      '¿Cómo busco un producto?',
      '¿Cómo filtro por categoría o precio?',
      '¿Cómo funciona el carrito de compras?',
    ],
  }

  return suggestions[section] || [
    '¿Cómo hago una venta?',
    '¿Cómo creo un producto?',
    '¿Dónde veo mi inventario?',
  ]
}

/**
 * Hook para React - usar en componentes
 */
export function useCurrentSection(): RouteContext {
  if (typeof window === 'undefined') {
    return {
      section: 'general',
      breadcrumb: [],
      action: 'view'
    }
  }

  // En un componente React, esto debería usar usePathname() de next/navigation
  // Por ahora, detectamos directamente
  return detectCurrentSection()
}

/**
 * Prioriza entries de la sección actual en los resultados
 */
export function prioritizeCurrentSection<T extends { section?: string }>(
  results: T[],
  currentSection: string,
  boost: number = 0.2
): T[] {
  return results.map(result => {
    if (result.section === currentSection) {
      // Agregar boost al score si existe
      if ('score' in result && typeof result.score === 'number') {
        return {
          ...result,
          score: Math.min(result.score + boost, 1.0)
        }
      }
    }
    return result
  })
}
