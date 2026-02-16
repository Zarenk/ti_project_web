/**
 * Escenarios del Mundo Real - Vocabulario Expandido para Usuarios Inexpertos
 *
 * Este archivo contiene patrones de preguntas basados en usuarios REALES:
 * - Dueños de negocio (no técnicos)
 * - Vendedores (prácticos, rápidos)
 * - Contadores (terminología específica)
 * - Personal de almacén (tareas físicas)
 * - Usuarios nuevos (confundidos, con errores)
 */

export interface ScenarioPattern {
  userType: "owner" | "seller" | "accountant" | "warehouse" | "beginner"
  intent: string
  patterns: string[]
  expectedEntry: string
  context?: string
}

/**
 * Patrones de preguntas por tipo de usuario
 */
export const realWorldScenarios: ScenarioPattern[] = [
  // ═══════════════════════════════════════════════════════════════
  // DUEÑO DE NEGOCIO (Orientado a resultados, no técnico)
  // ═══════════════════════════════════════════════════════════════
  {
    userType: "owner",
    intent: "check_daily_sales",
    patterns: [
      "cuanto vendi hoy",
      "cuanto vendí hoy",
      "cuánto vendí hoy",
      "cuanto llevo vendido",
      "cuantas ventas hice hoy",
      "cuánto dinero entró hoy",
      "cuánto he facturado hoy",
      "ventas del dia",
      "ventas de hoy",
      "reporte de ventas diario",
      "quiero ver las ventas",
      "donde veo cuanto vendi",
    ],
    expectedEntry: "sales-daily-summary",
    context: "Usuario quiere ver resultados rápidamente"
  },
  {
    userType: "owner",
    intent: "check_inventory_value",
    patterns: [
      "cuanto vale mi inventario",
      "cuánto dinero tengo en stock",
      "valor total del almacen",
      "cuanto dinero tengo invertido",
      "cuanto tengo en mercaderia",
      "cuánto tengo en productos",
      "valor de mi stock",
    ],
    expectedEntry: "inventory-value",
    context: "Usuario quiere saber su capital en inventario"
  },
  {
    userType: "owner",
    intent: "best_selling_products",
    patterns: [
      "que es lo que mas se vende",
      "qué productos vendo más",
      "cuales son mis mejores productos",
      "top ventas",
      "productos mas vendidos",
      "que se vende mas",
      "ranking de ventas",
    ],
    expectedEntry: "sales-top-products",
    context: "Usuario quiere identificar productos estrella"
  },

  // ═══════════════════════════════════════════════════════════════
  // VENDEDOR (Práctico, rápido, orientado a la acción)
  // ═══════════════════════════════════════════════════════════════
  {
    userType: "seller",
    intent: "quick_sale",
    patterns: [
      "vender rapido",
      "vender rápido",
      "venta rapida",
      "como vendo mas rapido",
      "hay un modo rapido",
      "atajo para vender",
      "forma mas rapida de vender",
      "vender en un click",
      "vender con código de barras",
    ],
    expectedEntry: "sales-quick",
    context: "Vendedor tiene cliente esperando"
  },
  {
    userType: "seller",
    intent: "product_not_found",
    patterns: [
      "no encuentro el producto",
      "no aparece el producto",
      "el producto no esta",
      "no sale el producto",
      "no veo el producto",
      "donde esta el producto",
      "por que no aparece",
      "no lo encuentro",
      "busco un producto y no sale",
    ],
    expectedEntry: "products-search",
    context: "Cliente esperando, vendedor frustrado"
  },
  {
    userType: "seller",
    intent: "apply_discount",
    patterns: [
      "como hago descuento",
      "como rebajo el precio",
      "quiero dar descuento",
      "hacer rebaja",
      "aplicar promocion",
      "oferta especial",
      "descuento al cliente",
      "como bajo el precio",
      "precio especial",
    ],
    expectedEntry: "sales-discount",
    context: "Cliente negociando precio"
  },
  {
    userType: "seller",
    intent: "check_stock_available",
    patterns: [
      "hay stock",
      "hay en almacen",
      "tengo disponible",
      "queda producto",
      "cuantos quedan",
      "cuántos tengo",
      "se acabó",
      "no hay mas",
      "verificar stock rapido",
      "consultar disponibilidad",
    ],
    expectedEntry: "inventory-view-stock",
    context: "Cliente preguntando disponibilidad"
  },

  // ═══════════════════════════════════════════════════════════════
  // CONTADOR (Terminología técnica, reportes, cumplimiento)
  // ═══════════════════════════════════════════════════════════════
  {
    userType: "accountant",
    intent: "monthly_report",
    patterns: [
      "reporte mensual",
      "balance del mes",
      "cierre de mes",
      "estado de resultados",
      "cuadre mensual",
      "ventas del mes",
      "informe contable",
      "libro diario del mes",
    ],
    expectedEntry: "accounting-reports",
    context: "Contador preparando cierre mensual"
  },
  {
    userType: "accountant",
    intent: "reconcile_accounts",
    patterns: [
      "cuadrar cuentas",
      "conciliar",
      "reconciliar",
      "cuadre de caja",
      "arqueo",
      "verificar saldos",
      "balance de comprobacion",
      "libro mayor",
    ],
    expectedEntry: "accounting-reconcile",
    context: "Contador haciendo cierre"
  },
  {
    userType: "accountant",
    intent: "tax_report",
    patterns: [
      "reporte para sunat",
      "declaracion de impuestos",
      "igv del mes",
      "libro de ventas",
      "libro de compras",
      "registro de ventas",
      "reporte tributario",
    ],
    expectedEntry: "accounting-reports",
    context: "Declaración de impuestos"
  },

  // ═══════════════════════════════════════════════════════════════
  // PERSONAL DE ALMACÉN (Tareas físicas, concretas)
  // ═══════════════════════════════════════════════════════════════
  {
    userType: "warehouse",
    intent: "receive_merchandise",
    patterns: [
      "llego mercaderia",
      "llegó mercadería",
      "recibir productos",
      "ingreso de mercaderia",
      "acaba de llegar un pedido",
      "como registro lo que llega",
      "entrada de almacen",
      "recepcion de productos",
    ],
    expectedEntry: "entries-new",
    context: "Proveedor acaba de entregar mercadería"
  },
  {
    userType: "warehouse",
    intent: "count_inventory",
    patterns: [
      "contar inventario",
      "hacer inventario fisico",
      "conteo de stock",
      "verificar cantidades",
      "cuadrar stock",
      "inventario manual",
      "reconteo",
    ],
    expectedEntry: "inventory-adjust",
    context: "Haciendo inventario físico"
  },
  {
    userType: "warehouse",
    intent: "transfer_between_stores",
    patterns: [
      "pasar productos de una tienda a otra",
      "transferir stock",
      "mover mercaderia entre almacenes",
      "trasladar productos",
      "enviar a otra tienda",
      "transferencia entre locales",
    ],
    expectedEntry: "inventory-transfer",
    context: "Moviendo stock entre tiendas"
  },
  {
    userType: "warehouse",
    intent: "damaged_product",
    patterns: [
      "producto dañado",
      "mercaderia mala",
      "producto roto",
      "producto vencido",
      "dar de baja",
      "eliminar del stock",
      "merma",
      "producto perdido",
    ],
    expectedEntry: "inventory-adjust",
    context: "Producto no vendible"
  },

  // ═══════════════════════════════════════════════════════════════
  // USUARIO PRINCIPIANTE (Confundido, con errores, necesita ayuda básica)
  // ═══════════════════════════════════════════════════════════════
  {
    userType: "beginner",
    intent: "cant_find_button",
    patterns: [
      "no encuentro el boton",
      "no encuentro donde",
      "no veo el boton",
      "donde esta el boton",
      "no se donde hacer clic",
      "no aparece el menu",
      "no encuentro la opcion",
      "donde hago clic",
    ],
    expectedEntry: "general-navigation",
    context: "Usuario perdido en la interfaz"
  },
  {
    userType: "beginner",
    intent: "made_mistake",
    patterns: [
      "me equivoque",
      "me equivoqué",
      "lo hice mal",
      "quiero deshacer",
      "como vuelvo atras",
      "como lo borro",
      "cancelo esto",
      "revertir cambios",
      "eliminar esto",
    ],
    expectedEntry: "general-help",
    context: "Usuario cometió un error"
  },
  {
    userType: "beginner",
    intent: "system_not_working",
    patterns: [
      "no funciona",
      "no me deja",
      "el sistema no responde",
      "se trabo",
      "se trabó",
      "se congelo",
      "esta lento",
      "no hace nada",
      "no carga",
    ],
    expectedEntry: "general-help",
    context: "Problema técnico percibido"
  },
  {
    userType: "beginner",
    intent: "deleted_by_mistake",
    patterns: [
      "se borro",
      "se borró",
      "elimine sin querer",
      "desaparecio",
      "desapareció",
      "ya no esta",
      "como recupero",
      "restaurar",
      "volver a tener",
    ],
    expectedEntry: "general-help",
    context: "Usuario borró algo importante"
  },
  {
    userType: "beginner",
    intent: "first_time_setup",
    patterns: [
      "es la primera vez",
      "recien empiezo",
      "recién empiezo",
      "soy nuevo",
      "como empiezo",
      "por donde inicio",
      "primer paso",
      "tutorial basico",
      "guia para principiantes",
    ],
    expectedEntry: "general-onboarding",
    context: "Usuario completamente nuevo"
  },

  // ═══════════════════════════════════════════════════════════════
  // PROBLEMAS COMUNES (Todos los usuarios)
  // ═══════════════════════════════════════════════════════════════
  {
    userType: "beginner",
    intent: "error_message",
    patterns: [
      "me sale error",
      "aparece un error",
      "mensaje de error",
      "dice error",
      "sale un mensaje rojo",
      "error al guardar",
      "no se guardo",
      "fallo",
      "falló",
    ],
    expectedEntry: "general-help",
    context: "Error en el sistema"
  },
  {
    userType: "beginner",
    intent: "forgot_password",
    patterns: [
      "olvide mi contraseña",
      "olvidé mi contraseña",
      "no me acuerdo la clave",
      "perdi mi password",
      "perdí mi password",
      "recuperar contraseña",
      "resetear password",
      "cambiar clave",
    ],
    expectedEntry: "users-password",
    context: "Usuario bloqueado"
  },
  {
    userType: "beginner",
    intent: "print_document",
    patterns: [
      "como imprimo",
      "imprimir esto",
      "sacar copia",
      "quiero imprimir",
      "donde esta imprimir",
      "no puedo imprimir",
      "no sale la impresion",
    ],
    expectedEntry: "general-help",
    context: "Necesita documento físico"
  },

  // ═══════════════════════════════════════════════════════════════
  // CASOS DE URGENCIA (Necesita respuesta YA)
  // ═══════════════════════════════════════════════════════════════
  {
    userType: "seller",
    intent: "urgent_sale",
    patterns: [
      "tengo un cliente esperando",
      "rapido necesito",
      "rápido necesito",
      "urgente",
      "ya",
      "ahora mismo",
      "cliente en la tienda",
      "hay cola",
    ],
    expectedEntry: "sales-quick",
    context: "URGENTE - Cliente esperando"
  },
  {
    userType: "owner",
    intent: "urgent_report",
    patterns: [
      "necesito el reporte ya",
      "me estan pidiendo",
      "me están pidiendo",
      "para ahora",
      "lo necesito urgente",
      "tengo una reunion",
      "reunión",
      "auditoria",
      "auditoría",
    ],
    expectedEntry: "sales-reports",
    context: "URGENTE - Reunión/auditoría"
  },
]

/**
 * Patrones de problemas ("No puedo...", "No me deja...")
 */
export const problemPatterns = [
  {
    pattern: /^no\s+(puedo|pude|logro|consigo)\s+(.+)/i,
    intent: "cant_do_something",
    examples: [
      "no puedo vender",
      "no puedo guardar",
      "no puedo ver el inventario",
      "no consigo agregar productos",
    ]
  },
  {
    pattern: /^no\s+(me\s+deja|funciona|sale|aparece)\s+(.+)/i,
    intent: "system_blocking",
    examples: [
      "no me deja guardar",
      "no funciona el boton",
      "no sale el producto",
      "no aparece la opción",
    ]
  },
  {
    pattern: /^(donde|dónde)\s+(esta|está|veo|encuentro)\s+(.+)/i,
    intent: "cant_find",
    examples: [
      "donde esta el menu",
      "dónde veo las ventas",
      "donde encuentro el reporte",
    ]
  },
  {
    pattern: /^por\s*que\s+(no|nunca)\s+(.+)/i,
    intent: "why_not_working",
    examples: [
      "por que no guarda",
      "por qué no aparece",
      "porque no funciona",
    ]
  },
  {
    pattern: /^(que|qué)\s+hago\s+(si|cuando|para)\s+(.+)/i,
    intent: "conditional_help",
    examples: [
      "que hago si se borra",
      "qué hago cuando hay error",
      "que hago para vender",
    ]
  },
  {
    pattern: /^(me\s+sale|aparece|tengo)\s+(error|problema)\s+(.+)/i,
    intent: "error_reported",
    examples: [
      "me sale error al guardar",
      "aparece problema con el stock",
      "tengo error en la venta",
    ]
  },
]

/**
 * Expansión de vocabulario con variaciones regionales
 */
export const regionalVariations = {
  // Perú
  "peru": {
    "boleta": ["ticket", "comprobante", "voucher"],
    "cliente": ["comprador", "consumidor"],
    "tienda": ["local", "establecimiento", "negocio"],
    "plata": ["dinero", "soles", "efectivo"],
    "chamba": ["trabajo", "tarea"],
  },

  // Vocabulario informal/callejero
  "informal": {
    "jato": "inventario",
    "fierros": "productos",
    "merca": "mercadería",
    "guita": "dinero",
    "cachina": "descuento",
  },

  // Generacional (jóvenes)
  "young": {
    "x": "por",
    "xq": "por qué",
    "tb": "también",
    "bn": "bien",
    "msj": "mensaje",
  }
}

/**
 * Contextos situacionales
 */
export const situationalContexts = {
  // Hora del día
  "morning": {
    patterns: ["abrir caja", "apertura", "inicio del dia"],
    boost: ["cashregister-open"],
  },
  "evening": {
    patterns: ["cerrar caja", "cierre", "fin del dia", "arqueo"],
    boost: ["cashregister-close"],
  },

  // Día del mes
  "month_end": {
    patterns: ["cierre de mes", "fin de mes", "reporte mensual"],
    boost: ["accounting-reports", "sales-reports"],
  },

  // Eventos especiales
  "busy_day": {
    patterns: ["rapido", "urgente", "ya", "tengo cola"],
    boost: ["sales-quick"],
  },
}

/**
 * Sinónimos específicos del negocio
 */
export const businessSynonyms = {
  // Documentos
  "comprobante": ["boleta", "factura", "ticket", "recibo", "voucher"],
  "guia": ["guía de remisión", "nota de envío", "packing list"],

  // Acciones
  "vender": ["facturar", "cobrar", "emitir", "hacer venta"],
  "comprar": ["adquirir", "hacer pedido", "ordenar"],
  "devolver": ["retornar", "reembolsar", "cambiar"],

  // Estados
  "agotado": ["sin stock", "no hay", "se acabó", "fuera de stock"],
  "disponible": ["hay", "tenemos", "en stock", "tengo"],

  // Personas
  "proveedor": ["supplier", "distribuidor", "mayorista", "abastecedor"],
  "cliente": ["comprador", "consumidor", "usuario final", "customer"],

  // Lugares
  "almacen": ["tienda", "local", "depósito", "warehouse", "bodega"],
  "caja": ["punto de venta", "POS", "terminal", "mostrador"],
}
