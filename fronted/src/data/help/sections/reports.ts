import type { HelpSection } from "../types"

export const reportsSection: HelpSection = {
  id: "reports",
  title: "Reportes y Análisis",
  description: "Reportes personalizados, exportación de datos, dashboards y análisis avanzado",
  icon: "📊",
  entries: [
    {
      id: "reports-overview",
      question: "Qué tipos de reportes puedo generar?",
      aliases: [
        "tipos de reportes",
        "reportes disponibles",
        "informes",
        "reports",
        "qué reportes hay",
      ],
      keywords: ["reportes", "tipos", "disponibles", "informes", "reports", "generar"],
      answer: "El sistema ofrece múltiples tipos de reportes para analizar tu negocio:",
      steps: [
        {
          text: "REPORTES DE VENTAS:\n- Ventas por periodo (día, semana, mes, año)\n- Productos más vendidos\n- Ventas por vendedor\n- Ventas por cliente\n- Análisis de descuentos",
        },
        {
          text: "REPORTES DE INVENTARIO:\n- Stock actual por producto\n- Movimientos de inventario\n- Productos con stock bajo\n- Valor del inventario\n- Rotación de productos",
        },
        {
          text: "REPORTES FINANCIEROS:\n- Estado de Resultados (P&L)\n- Balance General\n- Flujo de Caja\n- Cuentas por cobrar\n- Cuentas por pagar",
        },
        {
          text: "REPORTES DE CLIENTES:\n- Clientes más frecuentes\n- Análisis de compras por cliente\n- Clientes con deuda",
        },
        {
          text: "Todos los reportes se pueden FILTRAR por fechas, tiendas, categorías, etc.",
        },
      ],
      relatedActions: ["reports-custom", "reports-export"],
    },
    {
      id: "reports-custom",
      question: "Como creo reportes personalizados?",
      aliases: [
        "reportes personalizados",
        "custom reports",
        "crear reporte",
        "diseñar reporte",
        "reporte a medida",
      ],
      keywords: ["reportes", "personalizados", "custom", "crear", "diseñar", "medida"],
      answer: "Puedes crear reportes personalizados adaptados a tus necesidades específicas:",
      steps: [
        {
          text: "Ve a Reportes → Reportes Personalizados → Nuevo Reporte",
        },
        {
          text: "PASO 1 - SELECCIONA LA FUENTE DE DATOS:\n- Ventas\n- Productos\n- Clientes\n- Inventario\n- Movimientos contables",
        },
        {
          text: "PASO 2 - ELIGE LAS COLUMNAS que quieres mostrar:\nEj. para ventas: Fecha, Cliente, Producto, Cantidad, Precio, Total, Vendedor",
        },
        {
          text: "PASO 3 - AGREGA FILTROS:\n- Por fechas (rango personalizado)\n- Por categorías de productos\n- Por tiendas\n- Por vendedores\n- Condiciones personalizadas (ej. 'Total > 1000')",
        },
        {
          text: "PASO 4 - DEFINE AGRUPACIÓN (opcional):\nAgrupar por: Cliente, Producto, Categoría, Mes, etc.\nMostrar totales y subtotales",
        },
        {
          text: "PASO 5 - ORDENA LOS RESULTADOS:\nEj. Ordenar por Total descendente para ver las ventas más grandes primero",
        },
        {
          text: "PASO 6 - GUARDA EL REPORTE con un nombre descriptivo para reutilizarlo",
        },
        {
          text: "Puedes crear GRÁFICOS: barras, líneas, pie charts desde los datos del reporte",
        },
      ],
      relatedActions: ["reports-schedule", "reports-export"],
    },
    {
      id: "reports-export",
      question: "Como exporto reportes a Excel, PDF o CSV?",
      aliases: [
        "exportar reportes",
        "descargar reporte",
        "Excel",
        "PDF",
        "CSV",
        "export",
      ],
      keywords: ["exportar", "reportes", "Excel", "PDF", "CSV", "descargar", "export"],
      answer: "Todos los reportes se pueden exportar en múltiples formatos:",
      steps: [
        {
          text: "Genera el reporte que quieres exportar (aplica filtros si es necesario)",
        },
        {
          text: "Haz clic en el botón 'Exportar' (esquina superior derecha)",
        },
        {
          text: "EXCEL (.xlsx):\n- Incluye formato, colores y fórmulas\n- Ideal para análisis adicional\n- Puedes hacer tablas dinámicas\n- Limit: hasta 1,000,000 filas",
        },
        {
          text: "PDF:\n- Incluye header con logo de la empresa\n- Formato profesional para imprimir\n- Ideal para presentaciones\n- Incluye fecha de generación",
        },
        {
          text: "CSV (.csv):\n- Archivo de texto plano separado por comas\n- Compatible con cualquier software\n- Ideal para importar a otros sistemas\n- Sin límite de filas",
        },
        {
          text: "El archivo se descargará automáticamente a tu carpeta de Descargas",
        },
        {
          text: "Para reportes muy grandes (>100,000 filas), el sistema te enviará un email cuando esté listo",
        },
      ],
      relatedActions: ["reports-custom", "reports-schedule"],
    },
    {
      id: "reports-schedule",
      question: "Como programo reportes automáticos por email?",
      aliases: [
        "reportes programados",
        "reportes automáticos",
        "scheduled reports",
        "enviar reporte por email",
        "reporte diario",
      ],
      keywords: ["reportes", "programados", "automáticos", "scheduled", "email", "enviar"],
      answer: "Puedes programar reportes para que se generen y envíen automáticamente:",
      steps: [
        {
          text: "Ve al reporte que quieres programar (ej. Ventas del día)",
        },
        {
          text: "Haz clic en 'Programar Envío'",
        },
        {
          text: "FRECUENCIA:\n- Diario (todos los días a las 8am)\n- Semanal (ej. todos los lunes)\n- Mensual (ej. día 1 de cada mes)\n- Personalizado (ej. cada 15 días)",
        },
        {
          text: "FORMATO: Selecciona PDF, Excel o CSV",
        },
        {
          text: "DESTINATARIOS: Agrega emails separados por coma\nEj. gerente@empresa.com, contador@empresa.com",
        },
        {
          text: "ASUNTO PERSONALIZADO (opcional): Ej. 'Reporte de Ventas - {fecha}'",
        },
        {
          text: "El sistema enviará el reporte automáticamente en el horario configurado",
        },
        {
          text: "Puedes ver el historial de envíos y pausar/reanudar la programación cuando quieras",
        },
      ],
      relatedActions: ["reports-custom", "reports-export"],
    },
    {
      id: "reports-dashboard",
      question: "Como personalizo el dashboard principal?",
      aliases: [
        "dashboard personalizado",
        "personalizar dashboard",
        "widgets",
        "KPIs",
        "indicadores",
      ],
      keywords: ["dashboard", "personalizado", "widgets", "KPIs", "indicadores", "personalizar"],
      answer: "Puedes personalizar el dashboard para mostrar los KPIs más importantes para ti:",
      steps: [
        {
          text: "Ve al Dashboard principal y haz clic en 'Personalizar' (ícono de engranaje)",
        },
        {
          text: "WIDGETS DISPONIBLES:\n- Ventas del día/mes\n- Productos más vendidos\n- Stock bajo\n- Gráfico de ventas (líneas)\n- Top clientes\n- Cuentas por cobrar\n- Utilidad del periodo",
        },
        {
          text: "AGREGAR WIDGET: Arrastra el widget desde el menú lateral al dashboard",
        },
        {
          text: "REORDENAR: Arrastra los widgets para cambiar su posición",
        },
        {
          text: "REDIMENSIONAR: Arrastra las esquinas del widget para hacerlo más grande o pequeño",
        },
        {
          text: "CONFIGURAR: Haz clic en el ícono de configuración del widget para personalizar:\n- Periodo de tiempo\n- Filtros\n- Tipo de gráfico",
        },
        {
          text: "ELIMINAR: Haz clic en la X del widget",
        },
        {
          text: "GUARDAR LAYOUT: Tu configuración se guarda automáticamente",
        },
        {
          text: "MÚLTIPLES DASHBOARDS: Puedes crear diferentes dashboards (ej. uno para ventas, otro para inventario)",
        },
      ],
      relatedActions: ["reports-overview", "reports-kpis"],
    },
    {
      id: "reports-kpis",
      question: "Qué KPIs o métricas clave puedo monitorear?",
      aliases: [
        "KPIs",
        "métricas",
        "indicadores clave",
        "key performance indicators",
        "métricas de negocio",
      ],
      keywords: ["KPIs", "métricas", "indicadores", "clave", "performance", "negocio"],
      answer: "El sistema calcula automáticamente KPIs importantes para tu negocio:",
      steps: [
        {
          text: "KPIs DE VENTAS:\n- Ventas totales (día/mes/año)\n- Ticket promedio (venta promedio)\n- Tasa de conversión (ventas / visitas)\n- Crecimiento de ventas (% vs periodo anterior)",
        },
        {
          text: "KPIs DE INVENTARIO:\n- Rotación de inventario (ventas / stock promedio)\n- Días de inventario (stock / ventas diarias)\n- Valor del inventario\n- % de productos con stock bajo",
        },
        {
          text: "KPIs FINANCIEROS:\n- Margen bruto (utilidad bruta / ventas)\n- Margen neto (utilidad neta / ventas)\n- ROI (retorno de inversión)\n- Punto de equilibrio",
        },
        {
          text: "KPIs DE CLIENTES:\n- Clientes nuevos vs recurrentes\n- Valor de vida del cliente (CLV)\n- Frecuencia de compra\n- Tasa de retención",
        },
        {
          text: "Puedes ver estos KPIs en:\n- Dashboard principal\n- Reportes especializados\n- Alertas automáticas cuando un KPI está fuera del rango esperado",
        },
      ],
      relatedActions: ["reports-dashboard", "reports-analytics"],
    },
    {
      id: "reports-comparison",
      question: "Como comparo ventas o datos entre periodos?",
      aliases: [
        "comparar periodos",
        "comparación",
        "este mes vs mes anterior",
        "año contra año",
        "YoY comparison",
      ],
      keywords: ["comparar", "periodos", "comparación", "mes", "anterior", "año", "YoY"],
      answer: "Puedes comparar fácilmente el desempeño entre diferentes periodos:",
      steps: [
        {
          text: "Ve al reporte que quieres comparar (ej. Reporte de Ventas)",
        },
        {
          text: "Haz clic en 'Modo Comparación'",
        },
        {
          text: "COMPARACIONES PREDEFINIDAS:\n- Este mes vs Mes anterior\n- Este año vs Año anterior (YoY)\n- Esta semana vs Semana anterior\n- Trimestre actual vs Trimestre anterior",
        },
        {
          text: "COMPARACIÓN PERSONALIZADA:\nSelecciona manualmente los dos periodos que quieres comparar",
        },
        {
          text: "El sistema muestra:\n- Valores de ambos periodos lado a lado\n- Diferencia absoluta (ej. +$5,000)\n- Diferencia porcentual (ej. +25%)\n- Indicador visual: ↑ verde si aumentó, ↓ rojo si disminuyó",
        },
        {
          text: "GRÁFICOS DE COMPARACIÓN: Visualiza las diferencias en gráficos de barras o líneas",
        },
        {
          text: "Exporta la comparación a Excel para análisis más profundo",
        },
      ],
      relatedActions: ["reports-overview", "reports-analytics"],
    },
    {
      id: "reports-analytics",
      question: "Como uso el módulo de análisis avanzado?",
      aliases: [
        "análisis avanzado",
        "analytics",
        "business intelligence",
        "BI",
        "análisis de datos",
      ],
      keywords: ["análisis", "avanzado", "analytics", "business", "intelligence", "BI", "datos"],
      answer: "El módulo de análisis avanzado te permite hacer análisis profundos de tus datos:",
      steps: [
        {
          text: "Ve a Reportes → Análisis Avanzado",
        },
        {
          text: "ANÁLISIS DE TENDENCIAS:\nVe cómo evolucionan tus métricas en el tiempo con gráficos de líneas y proyecciones",
        },
        {
          text: "ANÁLISIS DE CORRELACIÓN:\n¿Qué productos se venden juntos? (market basket analysis)\n¿Qué factores afectan tus ventas? (temperatura, días de la semana, promociones)",
        },
        {
          text: "SEGMENTACIÓN DE CLIENTES:\nAgrupa clientes por:\n- Frecuencia de compra (alta, media, baja)\n- Valor total gastado (VIP, regular, ocasional)\n- Categorías preferidas",
        },
        {
          text: "ANÁLISIS ABC:\nClasifica productos/clientes en:\n- A: 20% que genera 80% de ingresos\n- B: 30% medio\n- C: 50% de menor impacto",
        },
        {
          text: "PRONÓSTICOS:\nPredice ventas futuras basado en datos históricos usando:\n- Tendencia lineal\n- Estacionalidad\n- Machine Learning (para usuarios avanzados)",
        },
        {
          text: "HEATMAPS:\nVisualiza patrones:\n- Días/horas con más ventas\n- Productos más vendidos por mes",
        },
      ],
      relatedActions: ["reports-kpis", "reports-custom"],
    },
    {
      id: "reports-filters",
      question: "Como uso filtros avanzados en reportes?",
      aliases: [
        "filtros avanzados",
        "filtrar reportes",
        "búsqueda avanzada",
        "criterios de filtrado",
        "advanced filters",
      ],
      keywords: ["filtros", "avanzados", "filtrar", "reportes", "búsqueda", "criterios"],
      answer: "Los filtros avanzados te permiten encontrar exactamente la información que necesitas:",
      steps: [
        {
          text: "En cualquier reporte, haz clic en 'Filtros Avanzados'",
        },
        {
          text: "TIPOS DE FILTROS:\n- Por fecha (rango, últimos X días, mes actual, etc.)\n- Por categoría de producto\n- Por tienda/sucursal\n- Por vendedor\n- Por cliente\n- Por método de pago",
        },
        {
          text: "OPERADORES DISPONIBLES:\n- Igual a\n- No igual a\n- Mayor que (>)\n- Menor que (<)\n- Entre (rango)\n- Contiene texto\n- Empieza con\n- Termina con",
        },
        {
          text: "COMBINAR FILTROS (Y/O):\nEjemplo: Ventas donde (Total > 1000) Y (Método de pago = 'Tarjeta') O (Cliente VIP = Sí)",
        },
        {
          text: "GUARDAR FILTROS: Guarda combinaciones de filtros que uses frecuentemente con un nombre",
        },
        {
          text: "Ejemplo práctico: 'Ventas mayores a $500 del último mes en la tienda Centro pagadas con tarjeta'",
        },
      ],
      relatedActions: ["reports-custom", "reports-export"],
    },
    {
      id: "reports-realtime",
      question: "Como veo datos en tiempo real?",
      aliases: [
        "tiempo real",
        "real-time",
        "datos en vivo",
        "live data",
        "actualización automática",
      ],
      keywords: ["tiempo", "real", "real-time", "vivo", "live", "actualización", "automática"],
      answer: "Varios reportes se actualizan automáticamente para mostrar datos en tiempo real:",
      steps: [
        {
          text: "DASHBOARD PRINCIPAL: Se actualiza automáticamente cada 30 segundos",
        },
        {
          text: "MONITOR DE VENTAS: Ve a Ventas → Monitor en Vivo\nMuestra:\n- Ventas que se están registrando en este momento\n- Total de ventas del día (actualizado en tiempo real)\n- Vendedores activos",
        },
        {
          text: "STOCK EN TIEMPO REAL: El inventario se actualiza instantáneamente cuando:\n- Se registra una venta\n- Se hace un ingreso de mercadería\n- Se hace un ajuste de inventario",
        },
        {
          text: "ALERTAS EN TIEMPO REAL:\nRecibe notificaciones cuando:\n- Stock llega a mínimo\n- Se supera una meta de ventas\n- Hay un error en una transacción",
        },
        {
          text: "Para datos históricos (reportes de meses anteriores), no es necesaria actualización en tiempo real",
        },
      ],
      relatedActions: ["reports-dashboard", "reports-overview"],
    },
    {
      id: "reports-sharing",
      question: "Como comparto reportes con mi equipo?",
      aliases: [
        "compartir reportes",
        "sharing",
        "enviar reporte",
        "colaboración",
        "share reports",
      ],
      keywords: ["compartir", "reportes", "sharing", "enviar", "colaboración", "equipo"],
      answer: "Puedes compartir reportes de múltiples formas:",
      steps: [
        {
          text: "OPCIÓN 1 - LINK COMPARTIBLE:\n- Genera un link único del reporte\n- Define si requiere login o es público\n- Define fecha de expiración (opcional)\n- Comparte el link por email, Slack, WhatsApp, etc.",
        },
        {
          text: "OPCIÓN 2 - EMAIL DIRECTO:\n- Haz clic en 'Compartir por Email'\n- Ingresa emails de destinatarios\n- Elige formato (PDF, Excel)\n- Agrega mensaje personalizado\n- Envía",
        },
        {
          text: "OPCIÓN 3 - PERMISOS DE USUARIO:\n- Ve a Configuración → Usuarios\n- Asigna permisos de acceso a reportes específicos\n- El usuario verá el reporte en su panel",
        },
        {
          text: "OPCIÓN 4 - INTEGRACIÓN SLACK/TEAMS:\n- Configura integración con Slack o Microsoft Teams\n- Programa reportes automáticos que se publican en un canal\n- Ejemplo: 'Ventas del día' se publica todos los días a las 6pm",
        },
        {
          text: "CONTROL DE ACCESO: Puedes definir quién puede ver datos sensibles (ej. márgenes de ganancia)",
        },
      ],
      relatedActions: ["reports-schedule", "reports-export"],
    },
    {
      id: "reports-templates",
      question: "Existen plantillas de reportes predefinidas?",
      aliases: [
        "plantillas de reportes",
        "templates",
        "reportes predefinidos",
        "ejemplos de reportes",
      ],
      keywords: ["plantillas", "reportes", "templates", "predefinidos", "ejemplos"],
      answer: "Sí, ofrecemos plantillas predefinidas para los reportes más comunes:",
      steps: [
        {
          text: "Ve a Reportes → Galería de Plantillas",
        },
        {
          text: "PLANTILLAS DISPONIBLES:\n- Reporte de Cierre Diario (ventas del día por vendedor)\n- Top 10 Productos (más vendidos del mes)\n- Análisis de Rentabilidad (margen por producto)\n- Reporte de Stock (productos con stock bajo)\n- Cuentas por Cobrar (clientes con deuda)\n- Estado de Resultados Mensual\n- Análisis de Clientes VIP",
        },
        {
          text: "USAR UNA PLANTILLA:\n1. Haz clic en la plantilla que quieres usar\n2. El sistema pre-configura filtros, columnas y formato\n3. Ajusta fechas u otros parámetros si es necesario\n4. Genera el reporte",
        },
        {
          text: "PERSONALIZAR PLANTILLA:\nPuedes modificar una plantilla y guardarla con otro nombre como tu propia versión",
        },
        {
          text: "CREAR TU PROPIA PLANTILLA:\nCrea un reporte personalizado y márcalo como 'plantilla' para reutilizarlo",
        },
      ],
      relatedActions: ["reports-custom", "reports-overview"],
    },
    {
      id: "reports-trial-balance",
      question: "¿Qué es el Balance de Comprobación y cómo lo genero?",
      aliases: [
        "balance de comprobación",
        "trial balance",
        "balanza de comprobación",
        "cuadrar contabilidad",
        "verificar saldos",
      ],
      keywords: ["balance", "comprobación", "trial", "balanza", "cuadrar", "contabilidad", "débito", "crédito", "saldos"],
      answer: "El **Balance de Comprobación (Trial Balance)** es un reporte contable que muestra todos tus saldos de cuentas para verificar que los débitos y créditos están cuadrados.\n\n**¿Para qué sirve?**\n✓ Verificar que tu contabilidad está balanceada (débitos = créditos)\n✓ Detectar errores de captura antes de cerrar el periodo\n✓ Base para generar estados financieros\n✓ Auditoría y cumplimiento contable\n\n**Cómo leerlo:**\n• **Columna Cuenta:** Nombre de cada cuenta contable\n• **Columna Débito:** Total de movimientos al debe\n• **Columna Crédito:** Total de movimientos al haber\n• **Totales:** DEBEN ser iguales (si no, hay error)\n\n**Acceso:** Dashboard > Contabilidad > Reportes > Balance de Comprobación\n\n**Filtros disponibles:**\n• Rango de fechas personalizado\n• Por periodo (mes, trimestre, año)\n• Incluir/excluir cuentas de resultado\n\n**Exportación:** Disponible en CSV, Excel y PDF",
      steps: [
        { text: "Ve a Dashboard > Contabilidad > Reportes", image: "/help/reports/step1-menu.png" },
        { text: "Haz clic en 'Balance de Comprobación'", image: "/help/reports/step2-trial-balance.png" },
        { text: "Selecciona el rango de fechas (ej: mes actual)", image: "/help/reports/step3-date-range.png" },
        { text: "Revisa que Totales Débito = Totales Crédito", image: "/help/reports/step4-verify-totals.png" },
        { text: "Exporta a CSV/Excel si necesitas analizar en detalle", image: "/help/reports/step5-export.png" },
      ],
      route: "/dashboard/accounting/reports/trial-balance",
      section: "reports",
    },
    {
      id: "reports-ledger",
      question: "¿Cómo veo el Libro Mayor (Ledger)?",
      aliases: [
        "libro mayor",
        "ledger",
        "movimientos contables",
        "detalle de cuenta",
        "mayor general",
      ],
      keywords: ["libro", "mayor", "ledger", "movimientos", "contables", "cuenta", "detalle", "general", "registro"],
      answer: "El **Libro Mayor (General Ledger)** muestra el detalle cronológico de TODOS los movimientos contables registrados en el sistema.\n\n**¿Qué información muestra?**\n• **Fecha:** Cuándo se registró el asiento\n• **Cuenta:** Nombre de la cuenta contable afectada\n• **Débito:** Monto al debe (si aplica)\n• **Crédito:** Monto al haber (si aplica)\n• **Referencia:** Documento origen (factura, recibo, etc.)\n\n**Casos de uso:**\n✓ Revisar todos los movimientos de un periodo\n✓ Auditoría contable\n✓ Rastrear un asiento específico\n✓ Verificar el detalle detrás del Balance de Comprobación\n✓ Reconciliación bancaria\n\n**Orden:** Los movimientos se muestran cronológicamente (más recientes primero o viceversa)\n\n**Acceso:** Dashboard > Contabilidad > Reportes > Libro Mayor\n\n**Filtros:**\n• Rango de fechas\n• Cuenta contable específica\n• Tipo de movimiento (ingreso, egreso, ajuste)\n\n**Tip:** Si buscas movimientos de una cuenta específica, usa el filtro de cuenta para no ver TODO el libro mayor.",
      steps: [
        { text: "Ve a Dashboard > Contabilidad > Reportes > Libro Mayor", image: "/help/reports/ledger/step1-menu.png" },
        { text: "Selecciona el rango de fechas que necesitas revisar", image: "/help/reports/ledger/step2-dates.png" },
        { text: "Opcionalmente, filtra por cuenta contable específica", image: "/help/reports/ledger/step3-filter-account.png" },
        { text: "Revisa el detalle de movimientos cronológicamente", image: "/help/reports/ledger/step4-review.png" },
        { text: "Exporta si necesitas análisis externo", image: "/help/reports/ledger/step5-export.png" },
      ],
      route: "/dashboard/accounting/reports/ledger",
      section: "reports",
    },
    {
      id: "reports-product-sales",
      question: "¿Cómo genero un reporte de ventas por producto?",
      aliases: [
        "reporte de productos",
        "productos más vendidos",
        "ventas por producto",
        "product report",
        "análisis de productos",
      ],
      keywords: ["reporte", "productos", "vendidos", "ventas", "producto", "product", "report", "análisis", "top"],
      answer: "El **Reporte de Ventas por Producto** muestra qué productos se venden más, cuánto generan en ingresos y cuál es su margen de ganancia.\n\n**Información que incluye:**\n• **Producto:** Nombre y código\n• **Cantidad vendida:** Unidades totales\n• **Ingresos totales:** Monto generado\n• **Costo total:** Cuánto costó la mercadería vendida\n• **Margen:** Diferencia entre ingreso y costo\n• **% Margen:** Rentabilidad porcentual\n• **Participación:** % del total de ventas\n\n**Usos prácticos:**\n✓ Identificar tus productos estrella (top sellers)\n✓ Detectar productos de baja rotación para descontinuar\n✓ Analizar rentabilidad por producto\n✓ Planificar compras e inventario\n✓ Optimizar mix de productos\n\n**Acceso:** Dashboard > Ventas > Reporte de Productos\n\n**Filtros disponibles:**\n• Rango de fechas (hoy, semana, mes, año, personalizado)\n• Por categoría de producto\n• Por marca\n• Por tienda\n• Top N (ej: top 10, top 50)\n\n**Visualización:** Puedes ver el reporte como tabla o gráfico (barras, pie chart)\n\n**Exportación:** Excel, CSV, PDF",
      steps: [
        { text: "Ve a Dashboard > Ventas > Reporte de Productos", image: "/help/reports/products/step1-menu.png" },
        { text: "Selecciona el periodo (ej: último mes)", image: "/help/reports/products/step2-period.png" },
        { text: "Aplica filtros si necesitas (categoría, marca)", image: "/help/reports/products/step3-filters.png" },
        { text: "Ordena por columna que te interese (ej: Ingresos desc)", image: "/help/reports/products/step4-sort.png" },
        { text: "Analiza tus top productos y márgenes", image: "/help/reports/products/step5-analyze.png" },
        { text: "Exporta para compartir o análisis adicional", image: "/help/reports/products/step6-export.png" },
      ],
      route: "/dashboard/sales/product-report",
      section: "reports",
    },
  ],
}
