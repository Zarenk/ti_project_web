import type { HelpSection } from "../types"

export const inventorySection: HelpSection = {
  id: "inventory",
  label: "Inventario",
  description: "Gestion de stock, movimientos de inventario y control de existencias",
  welcomeMessage:
    "Estas en Inventario. Aqui puedes ver el stock de todos tus productos, filtrar y exportar.",
  quickActions: [
    "inventory-view-stock",
    "inventory-filter",
    "inventory-low-stock",
    "inventory-export",
  ],
  entries: [
    {
      id: "inventory-view-stock",
      question: "Como veo el stock actual de mis productos?",
      aliases: [
        "ver inventario",
        "consultar existencias",
        "stock actual",
        "cuanto tengo en inventario",
        "lista de stock",
      ],
      answer:
        "En la seccion de Inventario veras una tabla con todos tus productos y su stock actual por tienda. Cada fila muestra el nombre del producto, SKU, cantidad disponible y el valor total del inventario. Puedes ordenar la tabla por cualquier columna haciendo clic en el encabezado. Si tienes varias tiendas, el stock se muestra desglosado por ubicacion.",
      keywords: ["veo", "stock", "actual", "mis", "productos", "seccion", "inventario", "veras", "tabla", "todos", "tus", "tienda", "cada", "fila", "muestra"],
      steps: [
        { text: "Ve al menu lateral y haz clic en 'Almacen', luego en 'Inventario'", image: "/help/inventory/step1-menu-inventario.png" },
        { text: "Visualiza la tabla con todos los productos y su stock disponible", image: "/help/inventory/step2-tabla-stock.png" },
        { text: "Usa los filtros y la barra de busqueda para encontrar productos especificos", image: "/help/inventory/step3-filtros.png" },
      ],
      route: "/dashboard/inventory",
    },
    {
      id: "inventory-filter",
      question: "Como filtro productos en el inventario?",
      aliases: [
        "buscar en inventario",
        "filtrar stock",
        "buscar producto en inventario",
        "filtros de inventario",
      ],
      answer:
        "Utiliza la barra de busqueda en la parte superior de la tabla de inventario para buscar por nombre o SKU. Tambien puedes aplicar filtros avanzados por categoria, marca, rango de stock o tienda especifica. Los filtros se pueden combinar para hacer busquedas mas precisas. Haz clic en 'Limpiar filtros' para restablecer la vista completa.",
      keywords: ["filtro", "productos", "inventario", "utiliza", "barra", "busqueda", "parte", "superior", "tabla", "buscar", "nombre", "sku", "tambien", "puedes", "aplicar"],
      route: "/dashboard/inventory",
    },
    {
      id: "inventory-low-stock",
      question: "Como configuro alertas de stock bajo?",
      aliases: [
        "alerta stock minimo",
        "stock bajo",
        "aviso poco inventario",
        "producto agotado",
        "notificacion stock",
      ],
      answer:
        "Las alertas de stock bajo se configuran a nivel de producto. Al crear o editar un producto, define el campo 'Stock minimo'. Cuando la cantidad disponible caiga por debajo de ese umbral, el sistema te notificara automaticamente. Los productos con stock bajo se resaltan en rojo en la tabla de inventario y aparecen en el panel de notificaciones.",
      keywords: ["configuro", "alertas", "stock", "bajo", "configuran", "nivel", "producto", "crear", "editar", "define", "campo", "'stock", "minimo'", "cantidad", "disponible"],
      relatedActions: ["products-edit"],
    },
    {
      id: "inventory-export",
      question: "Como exporto el inventario a PDF o Excel?",
      aliases: [
        "descargar inventario",
        "exportar stock",
        "generar reporte de inventario",
        "imprimir inventario",
        "inventario en excel",
      ],
      answer:
        "Para exportar el inventario, ve a la seccion de Inventario y busca el boton de exportacion en la parte superior derecha de la tabla. Puedes elegir entre formato PDF (ideal para imprimir o compartir) y Excel (ideal para analisis y edicion). El archivo exportado incluira todos los productos visibles segun los filtros que hayas aplicado en ese momento.",
      keywords: ["exporto", "inventario", "pdf", "excel", "exportar", "seccion", "busca", "boton", "exportacion", "parte", "superior", "derecha", "tabla", "puedes", "elegir"],
      route: "/dashboard/inventory",
    },
    {
      id: "inventory-transfer",
      question: "Como transfiero productos entre tiendas?",
      aliases: [
        "mover stock entre tiendas",
        "transferencia de inventario",
        "enviar productos a otra tienda",
        "traspaso entre sucursales",
      ],
      answer:
        "Para transferir productos entre tiendas, ve a la seccion de Intercambios (Exchange). Selecciona la tienda de origen y la de destino, luego agrega los productos y cantidades que deseas transferir. Al confirmar, el sistema actualizara el stock de ambas tiendas automaticamente y registrara el movimiento en el historial.",
      keywords: ["transfiero", "productos", "entre", "tiendas", "transferir", "seccion", "intercambios", "exchange", "selecciona", "tienda", "origen", "destino", "luego", "agrega", "cantidades"],
      route: "/dashboard/exchange",
      relatedActions: ["inventory-movements"],
    },
    {
      id: "inventory-product-details",
      question: "Como veo los detalles de un producto en inventario?",
      aliases: [
        "detalle de producto en inventario",
        "informacion de stock",
        "ver producto inventario",
        "ficha de inventario",
      ],
      answer:
        "Haz clic en cualquier producto de la tabla de inventario para acceder a su vista detallada. Alli veras informacion completa: stock actual por tienda, historial de movimientos, precio de compra promedio, precio de venta, imagenes y graficos de evolucion de stock. Tambien puedes ajustar precios directamente desde esta vista.",
      keywords: ["veo", "detalles", "producto", "inventario", "haz", "clic", "cualquier", "tabla", "acceder", "vista", "detallada", "alli", "veras", "informacion", "completa"],
      route: "/dashboard/inventory/product-details",
    },
    {
      id: "inventory-movements",
      question: "Como veo el historial de movimientos de stock?",
      aliases: [
        "movimientos de inventario",
        "historial de stock",
        "entradas y salidas",
        "registro de cambios de inventario",
      ],
      answer:
        "El historial de movimientos se encuentra en la vista detallada de cada producto. Muestra todas las entradas (compras), salidas (ventas), transferencias y ajustes manuales con fecha, cantidad, usuario responsable y motivo. Puedes filtrar los movimientos por tipo y rango de fechas para un analisis mas detallado.",
      keywords: ["veo", "historial", "movimientos", "stock", "encuentra", "vista", "detallada", "cada", "producto", "muestra", "todas", "entradas", "compras", "salidas", "ventas"],
      route: "/dashboard/inventory/product-details",
    },
    {
      id: "inventory-barcode",
      question: "Puedo buscar productos por codigo de barras?",
      aliases: [
        "buscar por codigo de barras",
        "escanear codigo",
        "barcode",
        "lector de codigos",
        "buscar por SKU",
      ],
      answer:
        "Si, puedes buscar productos por su codigo de barras o SKU. En la barra de busqueda del inventario, simplemente ingresa el codigo y el sistema encontrara el producto correspondiente. Si cuentas con un lector de codigos de barras conectado, puedes escanear directamente y el sistema realizara la busqueda automaticamente.",
      keywords: ["puedo", "buscar", "productos", "codigo", "barras", "puedes", "sku", "barra", "busqueda", "inventario", "simplemente", "ingresa", "sistema", "encontrara", "producto"],
      route: "/dashboard/inventory",
    },
    {
      id: "inventory-value",
      question: "Como veo el valor total de mi inventario?",
      aliases: [
        "valor del inventario",
        "cuanto vale mi stock",
        "costo total inventario",
        "valoracion de inventario",
      ],
      answer:
        "El valor total del inventario se muestra en la parte superior de la seccion de Inventario como una tarjeta resumen. Este valor se calcula multiplicando la cantidad en stock por el precio de compra de cada producto. Tambien puedes ver el valor desglosado por categoria o por tienda utilizando los filtros disponibles.",
      keywords: ["veo", "valor", "total", "inventario", "muestra", "parte", "superior", "seccion", "tarjeta", "resumen", "calcula", "multiplicando", "cantidad", "stock", "precio"],
      route: "/dashboard/inventory",
    },
    {
      id: "inventory-adjust",
      question: "Como hago un ajuste manual de inventario?",
      aliases: [
        "corregir stock",
        "ajustar cantidad",
        "modificar inventario manualmente",
        "ajuste de inventario",
      ],
      answer:
        "Para realizar un ajuste manual, accede a la vista detallada del producto y busca la opcion 'Ajustar stock'. Ingresa la nueva cantidad y un motivo para el ajuste (merma, conteo fisico, dano, etc.). El sistema registrara el ajuste en el historial de movimientos con la diferencia y el motivo proporcionado. Esta accion requiere permisos de administrador.",
      keywords: ["hago", "ajuste", "manual", "inventario", "realizar", "accede", "vista", "detallada", "producto", "busca", "opcion", "'ajustar", "stock'", "ingresa", "nueva"],
      roles: ["admin"],
    },
    {
      id: "inventory-categories-filter",
      question: "Como filtro el inventario por categoria?",
      aliases: [
        "inventario por categoria",
        "stock por categoria",
        "filtrar por tipo de producto",
      ],
      answer:
        "En la tabla de inventario, utiliza el filtro de categorias ubicado en la parte superior. Puedes seleccionar una o varias categorias para ver solo los productos que pertenecen a ellas. Esto es util para hacer conteos parciales o revisar el stock de una linea de productos especifica.",
      keywords: ["filtro", "inventario", "categoria", "tabla", "utiliza", "categorias", "ubicado", "parte", "superior", "puedes", "seleccionar", "varias", "ver", "solo", "productos"],
      route: "/dashboard/inventory",
      relatedActions: ["categories-create"],
    },
    {
      id: "inventory-labels",
      question: "¿Cómo genero etiquetas para mis productos?",
      aliases: [
        "imprimir etiquetas",
        "generar etiquetas",
        "etiquetas de productos",
        "crear etiquetas",
        "etiquetas de inventario",
      ],
      answer:
        "Para generar etiquetas, ve a Inventario > Generar Etiquetas. Ahí podrás:\n\n1. **Seleccionar categorías:** Filtra por una o varias categorías de productos\n2. **Elegir productos:** Marca los productos que deseas etiquetar\n3. **Seleccionar series:** Si el producto tiene números de serie, elige cuáles imprimir (todas o específicas)\n4. **Tipo de código:** Escoge entre códigos QR o códigos de barras (Code39)\n5. **Vista previa:** Revisa las etiquetas generadas antes de imprimir\n6. **Imprimir:** Haz clic en 'Imprimir etiquetas' para enviar a impresora\n\nLas etiquetas incluyen: nombre del producto, categoría, código base y número de serie (si aplica).",
      keywords: ["genero", "etiquetas", "productos", "inventario", "imprimir", "categorías", "seleccionar", "qr", "código", "barras", "series", "vista", "previa"],
      steps: [
        { text: "Ve a Dashboard > Inventario y haz clic en 'Generar Etiquetas'", image: "/help/inventory/labels/step1-menu.png" },
        { text: "Selecciona las categorías de productos que deseas etiquetar", image: "/help/inventory/labels/step2-categories.png" },
        { text: "Marca los productos específicos en la lista filtrada", image: "/help/inventory/labels/step3-products.png" },
        { text: "Si el producto tiene series, selecciona cuáles incluir", image: "/help/inventory/labels/step4-series.png" },
        { text: "Elige el tipo de código (QR o Barcode) y haz clic en 'Imprimir'", image: "/help/inventory/labels/step5-print.png" },
      ],
      route: "/dashboard/inventory/labels",
      section: "inventory",
    },
    {
      id: "inventory-labels-qr",
      question: "¿Cómo funcionan las etiquetas con código QR?",
      aliases: [
        "códigos QR",
        "etiquetas QR",
        "qr de productos",
        "escanear qr",
      ],
      answer:
        "Las etiquetas con **código QR** contienen información estructurada del producto en formato JSON:\n\n• **productId:** ID único del producto en el sistema\n• **code:** Código base del producto (SKU/código interno)\n• **serial:** Número de serie individual (si aplica)\n\n**Ventajas de QR:**\n✓ Almacenan más información que códigos de barras\n✓ Pueden escanearse desde cualquier ángulo\n✓ Funcionan con la cámara del celular\n✓ Ideales para control de inventario con app móvil\n✓ Permiten trazabilidad individual de series\n\n**Cómo usar:**\n1. Genera las etiquetas eligiendo 'Códigos QR'\n2. Imprime y pega las etiquetas en los productos\n3. Escanea con la app de código de barras del dashboard o cualquier lector QR\n4. El sistema reconoce automáticamente el producto y su serie",
      keywords: ["qr", "código", "etiquetas", "escanear", "json", "productId", "serial", "ventajas", "información", "trazabilidad"],
      route: "/dashboard/inventory/labels",
      section: "inventory",
    },
    {
      id: "inventory-labels-barcode",
      question: "¿Cómo funcionan las etiquetas con código de barras?",
      aliases: [
        "códigos de barras",
        "barcode",
        "code39",
        "etiquetas barras",
      ],
      answer:
        "Las etiquetas con **código de barras** utilizan el estándar **Code39**, un formato ampliamente compatible con lectores industriales.\n\n**Formato del código:**\n• Si el producto NO tiene series: `CODIGO-BASE`\n• Si el producto tiene series: `CODIGO-BASE-SERIE`\n• Ejemplo: `PROD-123-SN001`\n\n**Características de Code39:**\n✓ Compatible con lectores industriales estándar\n✓ Soporta letras, números y caracteres especiales (-.,/$+%)\n✓ Ideal para almacenes con pistolas lectoras\n✓ Ampliamente usado en logística y retail\n\n**Ventajas:**\n• No requiere app especial, funciona con cualquier lector\n• Rápido y confiable para inventario masivo\n• Estándar de la industria\n\n**Limitaciones:**\n• Almacena menos información que QR\n• Debe escanearse en orientación horizontal\n• Solo texto, no datos estructurados",
      keywords: ["código", "barras", "barcode", "code39", "lector", "industrial", "pistola", "formato", "serie", "compatible", "estándar"],
      route: "/dashboard/inventory/labels",
      section: "inventory",
    },
    {
      id: "inventory-labels-series",
      question: "¿Cómo imprimo etiquetas para productos con números de serie?",
      aliases: [
        "etiquetas con series",
        "productos seriados",
        "números de serie",
        "series individuales",
      ],
      answer:
        "Para productos con **números de serie individuales** (celulares, laptops, electrodomésticos, etc.), el sistema permite etiquetar cada unidad por separado:\n\n**Proceso:**\n1. Al seleccionar un producto con series, verás una lista de todos los números registrados\n2. Puedes elegir:\n   • **Todas las series:** Genera una etiqueta por cada serie\n   • **Series específicas:** Selecciona solo las que necesitas\n3. Cada etiqueta incluirá:\n   - Nombre del producto\n   - Categoría\n   - Código base\n   - **Número de serie individual**\n4. El código (QR o barras) incluye la serie: `CODIGO-BASE-SERIE`\n\n**Ejemplo práctico:**\nProducto: \"iPhone 15 Pro\"\nCódigo base: `IPH15P`\nSeries registradas: `SN001`, `SN002`, `SN003`\n→ Genera 3 etiquetas:\n   - `IPH15P-SN001`\n   - `IPH15P-SN002`\n   - `IPH15P-SN003`\n\n**Uso recomendado:**\n✓ Pega la etiqueta en cada unidad física\n✓ Escanea al vender para identificar exactamente qué serie se vendió\n✓ Mantén trazabilidad completa (garantías, devoluciones, reparaciones)",
      keywords: ["series", "números", "serie", "productos", "seriados", "individuales", "etiquetas", "cada", "unidad", "trazabilidad", "seleccionar"],
      route: "/dashboard/inventory/labels",
      section: "inventory",
    },
  ],
}
