/**
 * 🔤 DICCIONARIO DE SINÓNIMOS - DOMINIO CONTABILIDAD/ERP PERÚ
 *
 * Sistema de expansión de queries para mejorar matches
 * Específico para terminología contable, SUNAT, ventas y gestión empresarial
 */

export type SynonymMap = Record<string, string[]>

/**
 * Sinónimos principales del dominio
 * Cada palabra clave mapea a sus variantes comunes
 */
export const DOMAIN_SYNONYMS: SynonymMap = {
  // ========== DOCUMENTOS FISCALES (SUNAT) ==========
  factura: ["comprobante", "boleta", "recibo", "documento", "voucher", "ticket"],
  comprobante: ["factura", "boleta", "recibo", "documento", "ticket"],
  boleta: ["factura", "comprobante", "recibo", "ticket"],
  guia: ["guía", "remision", "remisión", "despacho"],

  // ========== OPERACIONES COMERCIALES ==========
  venta: ["vender", "comercializar", "transaccion", "transacción", "operacion", "operación"],
  vender: ["venta", "comercializar", "despachar"],
  compra: ["adquisicion", "adquisición", "comprar", "ingreso"],
  comprar: ["adquirir", "compra", "ingreso"],

  // ========== ACTORES ==========
  cliente: ["comprador", "consumidor", "usuario", "adquiriente"],
  proveedor: ["suministrador", "abastecedor", "vendedor"],
  usuario: ["user", "persona", "cuenta"],

  // ========== PRODUCTOS/INVENTARIO ==========
  producto: ["articulo", "artículo", "item", "mercaderia", "mercadería", "bien"],
  articulo: ["producto", "item", "mercaderia", "mercadería"],
  inventario: ["stock", "existencias", "almacen", "almacén", "bodega"],
  stock: ["inventario", "existencias", "disponibilidad"],

  // ========== CONTABILIDAD ==========
  contabilidad: ["contable", "financiero", "libros"],
  asiento: ["registro", "anotacion", "anotación", "apunte"],
  cuenta: ["rubro", "partida", "codigo", "código"],
  debe: ["debito", "débito", "cargo"],
  haber: ["credito", "crédito", "abono"],
  balance: ["estado", "reporte", "informe"],

  // ========== ACCIONES COMUNES ==========
  crear: ["generar", "hacer", "elaborar", "agregar", "añadir", "nuevo"],
  generar: ["crear", "hacer", "elaborar", "producir"],
  hacer: ["crear", "generar", "elaborar", "realizar"],
  agregar: ["añadir", "crear", "insertar", "incluir"],
  añadir: ["agregar", "crear", "insertar"],

  editar: ["modificar", "cambiar", "actualizar", "corregir"],
  modificar: ["editar", "cambiar", "actualizar"],
  cambiar: ["modificar", "editar", "actualizar"],
  actualizar: ["modificar", "editar", "cambiar", "renovar"],

  eliminar: ["borrar", "quitar", "suprimir", "remover", "delete"],
  borrar: ["eliminar", "quitar", "remover", "suprimir"],
  quitar: ["eliminar", "borrar", "remover"],

  ver: ["visualizar", "consultar", "revisar", "mostrar", "listar"],
  visualizar: ["ver", "mostrar", "consultar"],
  consultar: ["ver", "revisar", "buscar"],
  buscar: ["encontrar", "localizar", "consultar"],

  // ========== PRECIOS/DINERO ==========
  precio: ["costo", "valor", "importe", "monto"],
  costo: ["precio", "valor", "gasto"],
  descuento: ["rebaja", "oferta", "promocion", "promoción", "deduccion", "deducción"],
  total: ["suma", "monto", "importe", "subtotal"],

  // ========== TIEMPOS ==========
  diario: ["dia", "día", "cotidiano", "daily"],
  mensual: ["mes", "monthly"],
  anual: ["año", "yearly", "ejercicio"],

  // ========== REPORTES ==========
  reporte: ["informe", "estadistica", "estadística", "dashboard", "reporte"],
  informe: ["reporte", "estadistica", "dashboard"],
  exportar: ["descargar", "guardar", "extraer"],

  // ========== MONEDAS ==========
  soles: ["pen", "nuevos soles", "s/", "moneda nacional"],
  dolares: ["dólares", "usd", "us$", "moneda extranjera"],

  // ========== IMPUESTOS (PERÚ) ==========
  igv: ["impuesto", "iva", "tributo", "tasa"],
  impuesto: ["igv", "tributo", "gravamen"],

  // ========== ORGANIZACIÓN ==========
  tienda: ["sucursal", "local", "punto de venta", "pdv"],
  sucursal: ["tienda", "local", "sede"],
  almacen: ["almacén", "bodega", "deposito", "depósito"],

  // ========== PAGOS ==========
  pago: ["cobro", "abono", "cancelacion", "cancelación"],
  cobro: ["pago", "recaudacion", "recaudación"],
  efectivo: ["cash", "contado"],
  tarjeta: ["card", "credito", "crédito", "debito", "débito"],

  // ========== CATEGORIZACIÓN ==========
  categoria: ["categoría", "clase", "tipo", "grupo"],
  marca: ["brand", "fabricante"],

  // ========== ESTADOS ==========
  activo: ["habilitado", "disponible", "vigente"],
  inactivo: ["deshabilitado", "bloqueado", "suspendido"],
  pendiente: ["espera", "proceso"],
  completado: ["finalizado", "terminado", "listo"],

  // ========== COTIZACIONES ==========
  cotizacion: ["cotización", "presupuesto", "proforma", "estimado"],
  presupuesto: ["cotizacion", "cotización", "proforma"],

  // ========== FASE 1 - MEJORA #6: SINÓNIMOS UI/INTERFAZ ==========
  boton: ["botón", "button", "btn"],
  icono: ["ícono", "icon", "simbolo", "símbolo"],
  menu: ["menú", "opciones"],
  pestana: ["pestaña", "tab", "solapa"],
  ventana: ["modal", "popup", "dialogo", "diálogo", "ventana emergente"],
  panel: ["sidebar", "barra lateral", "menu lateral", "menú lateral"],
  tabla: ["grilla", "grid", "listado"],
  formulario: ["form", "pantalla"],
  campo: ["input", "entrada", "casilla"],

  // ========== HARDWARE/DISPOSITIVOS ==========
  computadora: ["laptop", "pc", "ordenador", "equipo"],
  usb: ["pendrive", "memoria", "flash drive", "memoria usb"],
  mouse: ["ratón", "raton"],
  teclado: ["keyboard"],
  pantalla: ["monitor", "display", "screen"],

  // ========== ACCIONES INFORMALES ==========
  loguear: ["iniciar sesión", "login", "entrar", "loguearse", "autenticar"],
  loguearme: ["iniciar sesión", "login", "entrar", "loguearse"],
  desloguear: ["cerrar sesión", "logout", "salir", "desloguearse"],
  printear: ["imprimir", "exportar", "descargar", "sacar"],
  loading: ["cargando", "espera", "procesando", "trabajando"],
  cachear: ["guardar temporalmente", "almacenar", "caché"],
  tipear: ["escribir", "teclear"],
  clickear: ["hacer clic", "presionar", "pulsar", "seleccionar", "dar clic"],
  copiar: ["duplicar", "clonar"],
  pegar: ["paste"],

  // ========== EXPRESIONES TEMPORALES ==========
  ahorita: ["ahora", "ya", "inmediatamente"],
  recien: ["recién", "recientemente", "hace poco"],
  despues: ["después", "luego", "más tarde"],
  antes: ["previamente", "anteriormente"],

  // ========== EXPRESIONES COLOQUIALES PERÚ ==========
  cachar: ["entender", "comprender", "agarrar"],
  chamba: ["trabajo", "empleo"],
  jato: ["tienda", "negocio"],
  plata: ["dinero", "efectivo"],

  // ========== TÉRMINOS DE NEGOCIO ADICIONALES ==========
  ganancia: ["utilidad", "beneficio", "rendimiento"],
  rentabilidad: ["ganancia", "margen", "beneficio"],
  margen: ["margen de utilidad", "markup"],
  costo: ["coste", "precio de compra"],

  // ========== VARIACIONES REGIONALES AMPLIADAS ==========
  ruc: ["RUC", "numero de ruc", "número de ruc"],
  dni: ["DNI", "documento", "cedula", "cédula"],
  sunat: ["SUNAT"],
  ple: ["PLE", "libro electronico", "libro electrónico"],
}

/**
 * Sinónimos por sección para contexto específico
 */
export const SECTION_SYNONYMS: Record<string, SynonymMap> = {
  accounting: {
    libro: ["registro", "documento", "reporte"],
    mayor: ["general", "ledger"],
    diario: ["journal", "cronologico", "cronológico"],
    comprobacion: ["comprobación", "verificacion", "verificación", "chequeo"],
    resultado: ["perdida", "pérdida", "ganancia", "utilidad"],
    activo: ["bien", "recurso", "patrimonio"],
    pasivo: ["deuda", "obligacion", "obligación"],
    patrimonio: ["capital", "equity", "neto"],
  },

  sales: {
    venta: ["facturacion", "facturación", "comercializacion", "comercialización"],
    descuento: ["rebaja", "oferta", "promocion", "promoción"],
    devolucion: ["devolución", "retorno", "cambio"],
    anular: ["cancelar", "invalidar", "revocar"],
  },

  inventory: {
    stock: ["inventario", "existencias", "disponibilidad"],
    minimo: ["mínimo", "critico", "crítico", "alerta"],
    movimiento: ["transaccion", "transacción", "operacion", "operación"],
    ingreso: ["entrada", "recepcion", "recepción"],
    salida: ["egreso", "despacho", "entrega"],
  },

  entries: {
    ingreso: ["compra", "recepcion", "recepción", "entrada"],
    proveedor: ["suministrador", "abastecedor"],
    orden: ["pedido", "solicitud"],
  },
}

/**
 * Expande una palabra con sus sinónimos
 */
export function expandWithSynonyms(word: string, section?: string): string[] {
  const normalized = word.toLowerCase()
  const expanded = new Set<string>([normalized])

  // Agregar sinónimos globales
  if (DOMAIN_SYNONYMS[normalized]) {
    DOMAIN_SYNONYMS[normalized].forEach(syn => expanded.add(syn))
  }

  // Agregar sinónimos específicos de la sección
  if (section && SECTION_SYNONYMS[section]?.[normalized]) {
    SECTION_SYNONYMS[section][normalized].forEach(syn => expanded.add(syn))
  }

  // Buscar si la palabra es sinónimo de alguna clave
  for (const [key, synonyms] of Object.entries(DOMAIN_SYNONYMS)) {
    if (synonyms.includes(normalized)) {
      expanded.add(key)
      synonyms.forEach(syn => expanded.add(syn))
      break
    }
  }

  return Array.from(expanded)
}

/**
 * Expande una query completa con sinónimos
 */
export function expandQuery(query: string, section?: string): string[] {
  const words = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2) // Solo palabras de 3+ caracteres

  // Expandir cada palabra
  const expandedWords = words.flatMap(word => expandWithSynonyms(word, section))

  // Retornar variantes únicas
  return Array.from(new Set([query, ...expandedWords]))
}

/**
 * Calcula similaridad mejorada con sinónimos
 */
export function calculateSimilarityWithSynonyms(
  query: string,
  target: string,
  section?: string
): number {
  const queryExpanded = expandQuery(query, section)
  const targetExpanded = expandQuery(target, section)

  // Contar palabras en común
  const commonWords = queryExpanded.filter(word =>
    targetExpanded.some(tw => tw === word || tw.includes(word) || word.includes(tw))
  )

  // Similaridad = palabras comunes / promedio de longitudes
  const avgLength = (queryExpanded.length + targetExpanded.length) / 2
  const similarity = commonWords.length / avgLength

  return Math.min(similarity, 1.0)
}

// ========== COMPATIBILIDAD CON CÓDIGO EXISTENTE ==========

/** @deprecated Use DOMAIN_SYNONYMS instead */
export const helpSynonyms = DOMAIN_SYNONYMS

/** @deprecated Use expandQuery instead */
export function expandQueryWithSynonyms(query: string): string[] {
  return expandQuery(query)
}

/** @deprecated Use expandQuery instead */
export function normalizeTerms(text: string): string {
  let normalized = text.toLowerCase()

  Object.entries(DOMAIN_SYNONYMS).forEach(([canonical, synonyms]) => {
    synonyms.forEach(synonym => {
      const regex = new RegExp(`\\b${synonym}\\b`, 'gi')
      normalized = normalized.replace(regex, canonical)
    })
  })

  return normalized
}
