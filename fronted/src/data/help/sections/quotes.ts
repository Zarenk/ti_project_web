import type { HelpSection } from "../types"

export const quotesSection: HelpSection = {
  id: "quotes",
  label: "Cotizaciones",
  description: "Crea y gestiona cotizaciones para tus clientes con margenes personalizados.",
  welcomeMessage:
    "Estas en Cotizaciones. Crea propuestas de venta con margenes personalizados.",
  quickActions: [
    "quotes-create",
    "quotes-add-products",
    "quotes-set-margins",
    "quotes-generate-pdf",
    "quotes-send",
  ],
  entries: [
    {
      id: "quotes-create",
      question: "Como creo una cotizacion nueva?",
      aliases: [
        "crear cotizacion",
        "nueva cotizacion",
        "hacer cotizacion",
        "agregar cotizacion",
        // 🆕 Aliases genéricos contextuales
        "paso a paso",
        "el paso a paso",
        "pasos",
        "cuales son los pasos",
        "dame los pasos",
        "como funciona esto",
        "que hace esto",
        "para que sirve esto",
        "de que se encarga esto",
        "explicame esto",
        "explicame eso",
        "no se como funciona esto",
        "no entiendo esto",
        "ayudame",
        "necesito ayuda",
        "ayuda con esto",
        "quiero ayuda",
        "detalle",
        "dame el detalle",
        "necesito mas detalle",
        "especificacion",
        "especificacion completa",
        "que hacen los botones",
        "explicame los botones",
        "como funciona",
        "que hago",
        "como se usa",
        "guia",
        "tutorial",
      ],
      answer:
        "Para crear una cotizacion, ve a la seccion de Cotizaciones y haz clic en el boton 'Nueva Cotizacion'. Selecciona el cliente al que va dirigida la propuesta y luego agrega los productos que deseas cotizar. Puedes personalizar los margenes y descuentos antes de guardar.",
      keywords: ["creo", "cotizacion", "nueva", "crear", "seccion", "cotizaciones", "haz", "clic", "boton", "'nueva", "cotizacion'", "selecciona", "cliente", "dirigida", "propuesta"],
      steps: [
        { text: "Ve al menu lateral 'Ventas' y haz clic en 'Cotizaciones'", image: "/help/quotes/step1-menu-cotizaciones.png" },
        { text: "Haz clic en 'Nueva Cotizacion' para iniciar", image: "/help/quotes/step2-nueva-cotizacion.png" },
        { text: "Selecciona el cliente al que va dirigida la cotizacion", image: "/help/quotes/step3-seleccionar-cliente.png" },
        { text: "Busca y agrega productos con sus cantidades y margenes", image: "/help/quotes/step4-agregar-productos.png" },
        { text: "Revisa el total y haz clic en 'Guardar' para crear la cotizacion", image: "/help/quotes/step5-guardar.png" },
      ],
      relatedActions: ["quotes-add-products", "quotes-set-margins"],
    },
    {
      id: "quotes-add-products",
      question: "Como agrego productos a una cotizacion?",
      aliases: [
        "agregar productos cotizacion",
        "anadir productos cotizacion",
        "meter productos a la cotizacion",
        "incluir productos en cotizacion",
      ],
      answer:
        "Dentro de la cotizacion, utiliza el buscador de productos para encontrar los articulos que deseas incluir. Puedes buscar por nombre, codigo o categoria. Al seleccionar un producto se agregara a la lista donde podras ajustar la cantidad y el precio unitario.",
      keywords: ["agrego", "productos", "cotizacion", "dentro", "utiliza", "buscador", "encontrar", "articulos", "deseas", "incluir", "puedes", "buscar", "nombre", "codigo", "categoria"],
      relatedActions: ["quotes-set-margins"],
    },
    {
      id: "quotes-set-margins",
      question: "Como configuro los margenes de ganancia en una cotizacion?",
      aliases: [
        "margen cotizacion",
        "ganancia cotizacion",
        "porcentaje ganancia",
        "configurar margen",
        "ajustar margen",
      ],
      answer:
        "Cada producto en la cotizacion tiene un campo de margen que puedes ajustar individualmente. El margen se aplica sobre el costo del producto para calcular el precio de venta sugerido. Tambien puedes configurar un margen por defecto desde las opciones de la cotizacion para aplicarlo a todos los productos de forma automatica.",
      keywords: ["configuro", "margenes", "ganancia", "cotizacion", "cada", "producto", "tiene", "campo", "margen", "puedes", "ajustar", "individualmente", "aplica", "sobre", "costo"],
      relatedActions: ["quotes-create", "quotes-add-products"],
    },
    {
      id: "quotes-generate-pdf",
      question: "Como genero el PDF de una cotizacion?",
      aliases: [
        "descargar pdf cotizacion",
        "exportar cotizacion pdf",
        "imprimir cotizacion",
        "pdf cotizacion",
      ],
      answer:
        "Una vez que la cotizacion esta completa, haz clic en el boton 'Generar PDF' que aparece en la parte superior de la cotizacion. El sistema generara un documento profesional con el detalle de productos, precios y totales. Puedes descargarlo directamente o enviarlo al cliente desde la misma pantalla.",
      keywords: ["genero", "pdf", "cotizacion", "vez", "completa", "haz", "clic", "boton", "'generar", "pdf'", "aparece", "parte", "superior", "sistema", "generara"],
      relatedActions: ["quotes-send"],
    },
    {
      id: "quotes-send",
      question: "Como envio una cotizacion a un cliente?",
      aliases: [
        "enviar cotizacion",
        "mandar cotizacion cliente",
        "compartir cotizacion",
        "enviar propuesta",
      ],
      answer:
        "Despues de generar el PDF de la cotizacion, puedes enviarlo directamente al cliente utilizando el boton 'Enviar'. El sistema te permitira seleccionar el metodo de envio y adjuntara automaticamente el PDF generado. El cliente recibira la propuesta y podra revisarla.",
      keywords: ["envio", "cotizacion", "cliente", "despues", "generar", "pdf", "puedes", "enviarlo", "directamente", "utilizando", "boton", "'enviar'", "sistema", "permitira", "seleccionar"],
      relatedActions: ["quotes-generate-pdf", "quotes-approve"],
    },
    {
      id: "quotes-history",
      question: "Donde veo el historial de cotizaciones?",
      aliases: [
        "historial cotizaciones",
        "cotizaciones anteriores",
        "ver cotizaciones pasadas",
        "lista de cotizaciones",
      ],
      answer:
        "El historial de cotizaciones se encuentra en la pantalla principal de la seccion Cotizaciones. Alli veras una tabla con todas las cotizaciones creadas, su estado, cliente y fecha. Puedes filtrar por estado, rango de fechas o buscar por nombre de cliente para encontrar una cotizacion especifica.",
      keywords: ["veo", "historial", "cotizaciones", "encuentra", "pantalla", "principal", "seccion", "alli", "veras", "tabla", "todas", "creadas", "estado", "cliente", "fecha"],
      relatedActions: ["quotes-approve"],
    },
    {
      id: "quotes-approve",
      question: "Como apruebo o rechazo una cotizacion?",
      aliases: [
        "aprobar cotizacion",
        "rechazar cotizacion",
        "aceptar cotizacion",
        "cambiar estado cotizacion",
        "estado cotizacion",
      ],
      answer:
        "Para cambiar el estado de una cotizacion, abrela desde el historial y utiliza los botones de accion en la parte superior. Puedes marcarla como 'Aprobada' si el cliente acepto la propuesta, o como 'Rechazada' en caso contrario. Al aprobar una cotizacion, puedes convertirla directamente en una venta.",
      keywords: ["apruebo", "rechazo", "cotizacion", "cambiar", "estado", "abrela", "desde", "historial", "utiliza", "botones", "accion", "parte", "superior", "puedes", "marcarla"],
      relatedActions: ["quotes-history", "quotes-create"],
    },
    {
      id: "quotes-duplicate",
      question: "Como duplico una cotizacion existente?",
      aliases: [
        "duplicar cotizacion",
        "copiar cotizacion",
        "clonar cotizacion",
        "reutilizar cotizacion",
      ],
      answer:
        "Para duplicar una cotizacion, abre la cotizacion que deseas copiar desde el historial y selecciona la opcion 'Duplicar' en el menu de acciones. Se creara una nueva cotizacion con los mismos productos y configuraciones, permitiendote modificar el cliente, los precios o cualquier otro detalle antes de guardarla.",
      keywords: ["duplico", "cotizacion", "existente", "duplicar", "abre", "deseas", "copiar", "desde", "historial", "selecciona", "opcion", "'duplicar'", "menu", "acciones", "creara"],
    },
    {
      id: "quotes-discount",
      question: "Como aplico un descuento a una cotizacion?",
      aliases: [
        "descuento cotizacion",
        "aplicar descuento",
        "rebajar precio cotizacion",
        "descuento productos cotizacion",
      ],
      answer:
        "Puedes aplicar descuentos de forma individual a cada producto editando su precio directamente en la cotizacion. Tambien existe la opcion de aplicar un descuento general que afecta al total de la cotizacion. Los descuentos se reflejan automaticamente en el PDF generado y en el monto total.",
      keywords: ["aplico", "descuento", "cotizacion", "puedes", "aplicar", "descuentos", "forma", "individual", "cada", "producto", "editando", "precio", "directamente", "tambien", "existe"],
      relatedActions: ["quotes-set-margins", "quotes-generate-pdf"],
    },
    {
      id: "quotes-validity",
      question: "Como establezco la vigencia de una cotizacion?",
      aliases: [
        "vigencia cotizacion",
        "validez cotizacion",
        "fecha limite cotizacion",
        "expiracion cotizacion",
      ],
      answer:
        "Al crear o editar una cotizacion puedes establecer una fecha de vigencia que indica hasta cuando es valida la propuesta. Esta fecha aparecera en el PDF generado. Una vez vencida, la cotizacion se marcara automaticamente como expirada en el historial, aunque puedes renovarla si es necesario.",
      keywords: ["establezco", "vigencia", "cotizacion", "crear", "editar", "puedes", "establecer", "fecha", "indica", "hasta", "valida", "propuesta", "aparecera", "pdf", "generado"],
      relatedActions: ["quotes-create", "quotes-history"],
    },
  ],
}
