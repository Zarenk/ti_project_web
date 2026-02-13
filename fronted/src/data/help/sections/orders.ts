import type { HelpSection } from "../types"

export const ordersSection: HelpSection = {
  id: "orders",
  label: "Pedidos",
  description: "Gestiona los pedidos de clientes, su procesamiento y seguimiento.",
  welcomeMessage:
    "Estas en Pedidos. Gestiona los pedidos de tus clientes y su estado.",
  quickActions: [
    "orders-view",
    "orders-status",
    "orders-process",
    "orders-details",
    "orders-timeline",
  ],
  entries: [
    {
      id: "orders-view",
      question: "Como veo la lista de pedidos?",
      aliases: [
        "ver pedidos",
        "lista de pedidos",
        "todos los pedidos",
        "consultar pedidos",
        "mis pedidos",
      ],
      answer:
        "La lista de pedidos se encuentra en la pantalla principal de la seccion Pedidos. Alli veras una tabla con todos los pedidos recibidos, mostrando el numero de pedido, cliente, fecha, monto total y estado actual. Puedes ordenar la tabla por cualquiera de estas columnas y utilizar los filtros para buscar pedidos especificos.",
      keywords: ["veo", "lista", "pedidos", "encuentra", "pantalla", "principal", "seccion", "alli", "veras", "tabla", "todos", "recibidos", "mostrando", "numero", "pedido"],
      relatedActions: ["orders-status", "orders-details"],
    },
    {
      id: "orders-status",
      question: "Cuales son los estados de un pedido?",
      aliases: [
        "estados de pedido",
        "estado del pedido",
        "estatus pedido",
        "fases del pedido",
      ],
      answer:
        "Los pedidos pasan por varios estados: 'Pendiente' cuando el cliente lo crea, 'En Proceso' cuando comienzas a prepararlo, 'Listo' cuando esta listo para entregar, 'Entregado' una vez completado, y 'Cancelado' si se anula. Cada cambio de estado se registra con fecha y hora en la linea de tiempo del pedido para mantener una trazabilidad completa.",
      keywords: ["cuales", "estados", "pedido", "pedidos", "pasan", "varios", "'pendiente'", "cliente", "crea", "'en", "proceso'", "comienzas", "prepararlo", "'listo'", "listo"],
      relatedActions: ["orders-process", "orders-timeline"],
    },
    {
      id: "orders-process",
      question: "Como proceso un pedido?",
      aliases: [
        "procesar pedido",
        "preparar pedido",
        "avanzar pedido",
        "atender pedido",
        "gestionar pedido",
      ],
      answer:
        "Para procesar un pedido, abrelo desde la lista y haz clic en 'Procesar'. Revisa los productos solicitados y sus cantidades, verifica la disponibilidad en inventario y confirma el procesamiento. El estado del pedido cambiara automaticamente a 'En Proceso' y el cliente sera notificado del avance. Cuando tengas todo listo, marca el pedido como 'Listo para entregar'.",
      keywords: ["proceso", "pedido", "procesar", "abrelo", "desde", "lista", "haz", "clic", "'procesar'", "revisa", "productos", "solicitados", "sus", "cantidades", "verifica"],
      steps: [
        { text: "Ve al menu lateral 'Ventas' y haz clic en 'Pedidos'", image: "/help/orders/step1-menu-pedidos.png" },
        { text: "Selecciona el pedido que deseas procesar de la lista", image: "/help/orders/step2-seleccionar-pedido.png" },
        { text: "Revisa los productos y cantidades del pedido", image: "/help/orders/step3-revisar-detalle.png" },
        { text: "Haz clic en 'Procesar' para cambiar el estado del pedido", image: "/help/orders/step4-procesar.png" },
      ],
      relatedActions: ["orders-status", "orders-details"],
    },
    {
      id: "orders-cancel",
      question: "Como cancelo un pedido?",
      aliases: [
        "cancelar pedido",
        "anular pedido",
        "rechazar pedido",
        "eliminar pedido",
      ],
      answer:
        "Para cancelar un pedido, abrelo desde la lista de pedidos y selecciona la opcion 'Cancelar Pedido'. El sistema te pedira que indiques el motivo de la cancelacion. Una vez confirmada, el pedido pasara al estado 'Cancelado' y el cliente recibira una notificacion. Los pedidos cancelados permanecen en el historial como referencia pero no afectan los reportes de ventas.",
      keywords: ["cancelo", "pedido", "cancelar", "abrelo", "desde", "lista", "pedidos", "selecciona", "opcion", "'cancelar", "pedido'", "sistema", "pedira", "indiques", "motivo"],
      relatedActions: ["orders-status", "orders-view"],
    },
    {
      id: "orders-details",
      question: "Como veo el detalle de un pedido?",
      aliases: [
        "detalle del pedido",
        "informacion del pedido",
        "ver pedido completo",
        "abrir pedido",
      ],
      answer:
        "Haz clic en cualquier pedido de la lista para abrir su vista detallada. Alli encontraras toda la informacion: datos del cliente, lista de productos con cantidades y precios, subtotal, impuestos y total. Tambien podras ver las notas del cliente, la direccion de entrega si aplica, y la linea de tiempo con todos los cambios de estado.",
      keywords: ["veo", "detalle", "pedido", "haz", "clic", "cualquier", "lista", "abrir", "vista", "detallada", "alli", "encontraras", "toda", "informacion", "datos"],
      relatedActions: ["orders-timeline", "orders-process"],
    },
    {
      id: "orders-timeline",
      question: "Que es la linea de tiempo del pedido?",
      aliases: [
        "linea de tiempo pedido",
        "historial del pedido",
        "seguimiento pedido",
        "trazabilidad pedido",
        "timeline pedido",
      ],
      answer:
        "La linea de tiempo registra cada evento importante del pedido desde su creacion hasta su finalizacion. Incluye la fecha y hora de cada cambio de estado, quien realizo la accion y cualquier nota asociada. Es una herramienta util para resolver consultas de los clientes sobre el progreso de su pedido y para auditar el proceso interno.",
      keywords: ["linea", "tiempo", "pedido", "registra", "cada", "evento", "importante", "desde", "creacion", "hasta", "finalizacion", "incluye", "fecha", "hora", "cambio"],
      relatedActions: ["orders-status", "orders-details"],
    },
    {
      id: "orders-filter",
      question: "Como filtro los pedidos por estado o fecha?",
      aliases: [
        "filtrar pedidos",
        "buscar pedidos",
        "pedidos por estado",
        "pedidos por fecha",
      ],
      answer:
        "En la parte superior de la lista de pedidos encontraras opciones de filtro. Puedes filtrar por estado seleccionando uno o varios estados simultaneamente, por rango de fechas para ver pedidos de un periodo especifico, o por cliente utilizando el buscador. Los filtros se pueden combinar para hacer busquedas mas precisas.",
      keywords: ["filtro", "pedidos", "estado", "fecha", "parte", "superior", "lista", "encontraras", "opciones", "puedes", "filtrar", "seleccionando", "uno", "varios", "estados"],
      relatedActions: ["orders-view", "orders-status"],
    },
    {
      id: "orders-notifications",
      question: "Como recibo notificaciones de nuevos pedidos?",
      aliases: [
        "notificacion pedido nuevo",
        "alerta de pedido",
        "aviso pedido nuevo",
        "notificaciones pedidos",
      ],
      answer:
        "Cuando un cliente realiza un nuevo pedido, el sistema te notifica mediante un indicador en el icono de pedidos del menu lateral. Si estas dentro de la seccion de Pedidos, el nuevo pedido aparecera automaticamente en la lista. Las notificaciones se actualizan en tiempo real para que puedas atender los pedidos lo antes posible.",
      keywords: ["recibo", "notificaciones", "nuevos", "pedidos", "cliente", "realiza", "nuevo", "pedido", "sistema", "notifica", "mediante", "indicador", "icono", "menu", "lateral"],
      relatedActions: ["orders-view", "orders-process"],
    },
    {
      id: "orders-notes",
      question: "Como agrego notas a un pedido?",
      aliases: [
        "notas del pedido",
        "agregar nota pedido",
        "comentarios pedido",
        "observaciones pedido",
      ],
      answer:
        "Dentro del detalle del pedido encontraras una seccion de notas internas. Haz clic en 'Agregar Nota' para escribir comentarios que solo seran visibles para el equipo de trabajo. Estas notas son utiles para comunicar instrucciones especiales de preparacion, preferencias del cliente o cualquier informacion relevante sobre el pedido.",
      keywords: ["agrego", "notas", "pedido", "dentro", "detalle", "encontraras", "seccion", "internas", "haz", "clic", "'agregar", "nota'", "escribir", "comentarios", "solo"],
      relatedActions: ["orders-details", "orders-process"],
    },
    {
      id: "orders-print",
      question: "Como imprimo un pedido?",
      aliases: [
        "imprimir pedido",
        "generar comprobante pedido",
        "ticket de pedido",
        "recibo de pedido",
      ],
      answer:
        "Para imprimir un pedido, abrelo desde la lista y haz clic en el boton 'Imprimir' ubicado en la parte superior de la vista de detalle. El sistema generara un comprobante con todos los datos del pedido incluyendo productos, cantidades, precios y datos del cliente. Puedes imprimir en formato completo o en formato de ticket segun tu tipo de impresora.",
      keywords: ["imprimo", "pedido", "imprimir", "abrelo", "desde", "lista", "haz", "clic", "boton", "'imprimir'", "ubicado", "parte", "superior", "vista", "detalle"],
      relatedActions: ["orders-details"],
    },
    {
      id: "orders-sunat-status",
      question: "¿Qué significa el estado SUNAT en los pedidos?",
      aliases: [
        "estado sunat",
        "facturación electrónica pedido",
        "sunat pedido",
        "comprobante electrónico",
        "envío a sunat",
      ],
      answer:
        "El **Estado SUNAT** indica si el comprobante electrónico del pedido fue enviado y aceptado por la SUNAT (Superintendencia Nacional de Aduanas y Administración Tributaria de Perú).\n\n**Estados posibles:**\n\n✅ **ACEPTADO (Verde):**\nEl comprobante fue enviado a SUNAT y aceptado correctamente. Tiene validez fiscal completa.\n\n⏳ **PENDIENTE (Amarillo):**\nEl comprobante aún no se ha enviado a SUNAT o está en proceso de envío.\n\n❌ **RECHAZADO (Rojo):**\nSUNAT rechazó el comprobante por algún error. Haz clic para ver el mensaje de error y corregir.\n\n**Cómo enviar a SUNAT:**\n1. Localiza el pedido en la lista\n2. Haz clic en el botón de acción 'Enviar a SUNAT'\n3. El sistema genera el XML y lo envía automáticamente\n4. Espera la respuesta (aparece un ticket de confirmación)\n5. El estado se actualiza a ACEPTADO o RECHAZADO\n\n**Información del estado:**\n• **Ticket:** Número de confirmación de SUNAT\n• **Ambiente:** Producción (real) o Pruebas (testing)\n• **Fecha actualización:** Cuándo se procesó en SUNAT\n• **Mensaje de error:** Si fue rechazado, detalle del problema\n\n**IMPORTANTE:** Solo los pedidos con comprobantes electrónicos (facturas, boletas) requieren envío a SUNAT. Los pedidos internos no aplican.",
      keywords: ["sunat", "estado", "facturación", "electrónica", "comprobante", "aceptado", "rechazado", "pendiente", "enviar", "xml", "ticket"],
      steps: [
        { text: "Localiza la columna 'SUNAT' en la lista de pedidos", image: "/help/orders/step1-sunat-column.png" },
        { text: "Verifica el badge de estado (Verde/Amarillo/Rojo)", image: "/help/orders/step2-status-badge.png" },
        { text: "Si está Pendiente, haz clic en 'Enviar a SUNAT'", image: "/help/orders/step3-send-sunat.png" },
        { text: "Espera la confirmación del sistema", image: "/help/orders/step4-confirmation.png" },
        { text: "Si fue rechazado, revisa el mensaje de error", image: "/help/orders/step5-error-message.png" },
      ],
      relatedActions: ["orders-details", "orders-print"],
      route: "/dashboard/orders",
      section: "orders",
    },
  ],
}
