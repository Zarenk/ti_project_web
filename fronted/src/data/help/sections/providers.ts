import type { HelpSection } from "../types"

export const providersSection: HelpSection = {
  id: "providers",
  label: "Proveedores",
  description: "Gestiona proveedores, datos de contacto y su relacion con entradas de inventario.",
  welcomeMessage:
    "Estas en Proveedores. Gestiona tus proveedores y sus datos de contacto.",
  quickActions: [
    "providers-add",
    "providers-edit",
    "providers-assign-entry",
    "providers-contacts",
    "providers-delete",
  ],
  entries: [
    {
      id: "providers-add",
      question: "Como agrego un nuevo proveedor?",
      aliases: [
        "crear proveedor",
        "nuevo proveedor",
        "registrar proveedor",
        "agregar proveedor",
        "anadir proveedor",
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
        "Ve a la seccion de Proveedores y haz clic en el boton 'Nuevo Proveedor'. Completa los campos obligatorios como nombre, RUC o documento fiscal y datos de contacto. Al guardar, el proveedor quedara disponible para asignarlo a futuras entradas de mercaderia.",
      keywords: ["agrego", "nuevo", "proveedor", "seccion", "proveedores", "haz", "clic", "boton", "'nuevo", "proveedor'", "completa", "campos", "obligatorios", "nombre", "ruc"],
      steps: [
        { text: "Ve al menu lateral y haz clic en 'Proveedores', luego en 'Nuevo Proveedor'", image: "/help/providers/step1-menu-proveedores.png" },
        { text: "Completa los datos del proveedor: nombre y RUC o documento fiscal", image: "/help/providers/step2-datos-proveedor.png" },
        { text: "Agrega la informacion de contacto: telefono, email y direccion", image: "/help/providers/step3-contacto.png" },
        { text: "Haz clic en 'Guardar' para registrar el proveedor", image: "/help/providers/step4-guardar.png" },
      ],
      relatedActions: ["providers-edit", "providers-contacts"],
    },
    {
      id: "providers-edit",
      question: "Como edito la informacion de un proveedor?",
      aliases: [
        "modificar proveedor",
        "actualizar proveedor",
        "cambiar datos proveedor",
        "editar proveedor",
      ],
      answer:
        "Busca al proveedor en la lista y haz clic sobre su nombre o en el icono de edicion. Podras modificar razon social, documento fiscal, direccion, telefono y correo electronico. Los cambios se reflejan inmediatamente en todas las entradas vinculadas a ese proveedor.",
      keywords: ["edito", "informacion", "proveedor", "busca", "lista", "haz", "clic", "sobre", "nombre", "icono", "edicion", "podras", "modificar", "razon", "social"],
      relatedActions: ["providers-add", "providers-contacts"],
    },
    {
      id: "providers-assign-entry",
      question: "Como asigno un proveedor a una entrada de mercaderia?",
      aliases: [
        "vincular proveedor entrada",
        "asociar proveedor",
        "proveedor en entrada",
        "seleccionar proveedor entrada",
      ],
      answer:
        "Al crear o editar una entrada de mercaderia, encontraras un campo de proveedor donde puedes buscar por nombre o RUC. Selecciona el proveedor correcto de la lista desplegable. Si el proveedor no existe, puedes crearlo directamente desde esa pantalla sin perder los datos ya ingresados en la entrada.",
      keywords: ["asigno", "proveedor", "entrada", "mercaderia", "crear", "editar", "encontraras", "campo", "puedes", "buscar", "nombre", "ruc", "selecciona", "correcto", "lista"],
      relatedActions: ["providers-add"],
    },
    {
      id: "providers-contacts",
      question: "Como administro los contactos de un proveedor?",
      aliases: [
        "contactos proveedor",
        "telefono proveedor",
        "correo proveedor",
        "datos contacto proveedor",
        "email proveedor",
      ],
      answer:
        "Dentro del detalle de cada proveedor encontraras la seccion de contacto. Puedes registrar nombre del representante, telefono, correo electronico y notas adicionales. Esta informacion facilita la comunicacion al momento de coordinar pedidos o resolver incidencias con entregas.",
      keywords: ["administro", "contactos", "proveedor", "dentro", "detalle", "cada", "encontraras", "seccion", "contacto", "puedes", "registrar", "nombre", "representante", "telefono", "correo"],
      relatedActions: ["providers-edit"],
    },
    {
      id: "providers-delete",
      question: "Como elimino un proveedor?",
      aliases: [
        "borrar proveedor",
        "eliminar proveedor",
        "quitar proveedor",
        "remover proveedor",
      ],
      answer:
        "Abre el detalle del proveedor y haz clic en el boton de eliminar. Si el proveedor tiene entradas de mercaderia asociadas, el sistema te pedira confirmacion y mantendra el historial de las entradas previas. Los proveedores eliminados no apareceran en el buscador al crear nuevas entradas.",
      keywords: ["elimino", "proveedor", "abre", "detalle", "haz", "clic", "boton", "eliminar", "tiene", "entradas", "mercaderia", "asociadas", "sistema", "pedira", "confirmacion"],
      relatedActions: ["providers-add"],
    },
    {
      id: "providers-search",
      question: "Como busco un proveedor en la lista?",
      aliases: [
        "buscar proveedor",
        "filtrar proveedores",
        "encontrar proveedor",
        "busqueda proveedor",
      ],
      answer:
        "Usa la barra de busqueda en la parte superior de la lista de proveedores. Puedes buscar por nombre, razon social o numero de documento fiscal. Los resultados se filtran en tiempo real mientras escribes, facilitando encontrar rapidamente al proveedor que necesitas.",
      keywords: ["busco", "proveedor", "lista", "usa", "barra", "busqueda", "parte", "superior", "proveedores", "puedes", "buscar", "nombre", "razon", "social", "numero"],
    },
    {
      id: "providers-history",
      question: "Como veo el historial de compras a un proveedor?",
      aliases: [
        "historial proveedor",
        "compras proveedor",
        "entradas proveedor",
        "movimientos proveedor",
      ],
      answer:
        "Accede al detalle del proveedor para ver todas las entradas de mercaderia asociadas, ordenadas por fecha. Esto te permite analizar frecuencia de compra, montos acumulados y productos adquiridos a cada proveedor. Es util para negociar mejores condiciones o evaluar la relacion comercial.",
      keywords: ["veo", "historial", "compras", "proveedor", "accede", "detalle", "ver", "todas", "entradas", "mercaderia", "asociadas", "ordenadas", "fecha", "esto", "permite"],
      relatedActions: ["providers-assign-entry"],
    },
    {
      id: "providers-ruc",
      question: "Que datos fiscales necesito registrar del proveedor?",
      aliases: [
        "ruc proveedor",
        "documento proveedor",
        "datos fiscales proveedor",
        "informacion tributaria proveedor",
      ],
      answer:
        "Registra el RUC o numero de identificacion tributaria, la razon social oficial y la direccion fiscal. Estos datos son importantes para que las entradas de mercaderia y los reportes contables reflejen correctamente la informacion del proveedor. Puedes actualizarlos en cualquier momento desde la ficha del proveedor.",
      keywords: ["datos", "fiscales", "necesito", "registrar", "proveedor", "registra", "ruc", "numero", "identificacion", "tributaria", "razon", "social", "oficial", "direccion", "fiscal"],
      relatedActions: ["providers-edit"],
    },
    {
      id: "providers-duplicate",
      question: "Que pasa si creo un proveedor duplicado?",
      aliases: [
        "proveedor repetido",
        "proveedor duplicado",
        "mismo proveedor dos veces",
        "evitar duplicados proveedor",
      ],
      answer:
        "El sistema valida el numero de documento fiscal para evitar duplicados. Si intentas registrar un RUC que ya existe, se mostrara una alerta indicando que el proveedor ya esta registrado. Te recomendamos siempre buscar primero antes de crear uno nuevo para mantener tu base de datos limpia.",
      keywords: ["pasa", "creo", "proveedor", "duplicado", "sistema", "valida", "numero", "documento", "fiscal", "evitar", "duplicados", "intentas", "registrar", "ruc", "existe"],
      relatedActions: ["providers-search", "providers-add"],
    },
    {
      id: "providers-notes",
      question: "Puedo agregar notas internas a un proveedor?",
      aliases: [
        "notas proveedor",
        "comentarios proveedor",
        "observaciones proveedor",
        "anotaciones proveedor",
      ],
      answer:
        "Si, al editar un proveedor encontraras un campo de notas u observaciones. Puedes escribir informacion relevante como condiciones de pago acordadas, tiempos de entrega habituales o cualquier detalle importante. Estas notas son internas y solo visibles para los usuarios del sistema.",
      keywords: ["puedo", "agregar", "notas", "internas", "proveedor", "editar", "encontraras", "campo", "observaciones", "puedes", "escribir", "informacion", "relevante", "condiciones", "pago"],
      relatedActions: ["providers-edit"],
    },
  ],
}
