import type { HelpSection } from "../types"

export const productsSection: HelpSection = {
  id: "products",
  label: "Productos",
  description: "Creacion, edicion y gestion de productos del catalogo",
  welcomeMessage:
    "Estas en Productos. Administra tu catalogo, precios e imagenes.",
  quickActions: [
    "products-create",
    "products-edit",
    "products-images",
    "products-prices",
  ],
  entries: [
    {
      id: "products-create",
      question: "Como creo un nuevo producto?",
      aliases: [
        "agregar producto",
        "nuevo producto",
        "registrar producto",
        "dar de alta producto",
        "crear articulo",
        // 🆕 Aliases genéricos para cuando el usuario pide "paso a paso"
        "paso a paso",
        "el paso a paso",
        "como funciona el paso a paso",
        "pasos para crear",
        "pasos",
        "cuales son los pasos",
        "dame los pasos",
        "muéstrame los pasos",
        "explicame los pasos",
        // 🆕 Variaciones con "esto" y "eso"
        "como funciona esto",
        "que hace esto",
        "para que sirve esto",
        "de que se encarga esto",
        "explicame esto",
        "explicame eso",
        "no se como funciona esto",
        "no entiendo esto",
        // 🆕 Peticiones de ayuda
        "como funciona",
        "que hago",
        "como se usa",
        "como empiezo",
        "ayudame",
        "necesito ayuda",
        "ayuda con esto",
        "quiero ayuda",
        // 🆕 Solicitudes de detalle
        "guia",
        "tutorial",
        "instrucciones",
        "detalle",
        "dame el detalle",
        "necesito mas detalle",
        "especificacion",
        "especificacion completa",
        // 🆕 Preguntas sobre botones
        "que hacen los botones",
        "explicame los botones",
        "para que sirve cada boton",
        "especificacion de los botones",
      ],
      answer:
        "Para crear un producto, ve a la seccion de Productos y haz clic en el boton 'Nuevo Producto'. Completa el formulario con los datos requeridos: nombre, descripcion, precio de venta, categoria y opcionalmente SKU, codigo de barras y marca. Puedes agregar imagenes y especificaciones tecnicas antes de guardar. El producto quedara disponible inmediatamente en el inventario.",
      keywords: ["creo", "nuevo", "producto", "crear", "seccion", "productos", "haz", "clic", "boton", "'nuevo", "producto'", "completa", "formulario", "datos", "requeridos"],
      steps: [
        { text: "Ve al menu lateral y haz clic en 'Productos', luego en 'Nuevo Producto'", image: "/help/products/step1-menu-productos.png" },
        { text: "Completa los datos basicos: nombre, descripcion y codigo de barras", image: "/help/products/step2-datos-basicos.png" },
        { text: "Selecciona la categoria y marca del producto", image: "/help/products/step3-categoria-marca.png" },
        { text: "Establece los precios de compra y venta", image: "/help/products/step4-precios.png" },
        { text: "Sube las imagenes del producto arrastrando o seleccionando archivos", image: "/help/products/step5-imagenes.png" },
        { text: "Haz clic en 'Guardar' para crear el producto", image: "/help/products/step6-guardar.png" },
      ],
      route: "/dashboard/products",
    },
    {
      id: "products-edit",
      question: "Como edito un producto existente?",
      aliases: [
        "modificar producto",
        "actualizar producto",
        "cambiar datos de producto",
        "editar articulo",
      ],
      answer:
        "Busca el producto en la lista de Productos y haz clic sobre el para abrir su vista de detalle. Desde alli, haz clic en el boton 'Editar' para modificar cualquier campo: nombre, descripcion, precios, categoria, marca o especificaciones. Los cambios se guardan al hacer clic en 'Guardar' y se reflejan inmediatamente en todo el sistema.",
      keywords: ["edito", "producto", "existente", "busca", "lista", "productos", "haz", "clic", "sobre", "abrir", "vista", "detalle", "desde", "alli", "boton"],
      route: "/dashboard/products",
    },
    {
      id: "products-images",
      question: "Como subo imagenes a un producto?",
      aliases: [
        "agregar foto",
        "subir imagen de producto",
        "fotos de producto",
        "cambiar imagen",
        "galeria de producto",
      ],
      answer:
        "Al crear o editar un producto, encontraras una seccion de imagenes donde puedes arrastrar y soltar archivos o hacer clic para seleccionarlos desde tu computadora. Se admiten formatos JPG, PNG y WebP. Puedes subir varias imagenes; la primera sera la imagen principal que se mostrara en el catalogo y listados. Arrastra las imagenes para cambiar su orden.",
      keywords: ["subo", "imagenes", "producto", "crear", "editar", "encontraras", "seccion", "puedes", "arrastrar", "soltar", "archivos", "hacer", "clic", "seleccionarlos", "desde"],
      relatedActions: ["products-create", "products-edit"],
    },
    {
      id: "products-brands",
      question: "Como gestiono las marcas de productos?",
      aliases: [
        "agregar marca",
        "crear marca",
        "administrar marcas",
        "marcas de productos",
      ],
      answer:
        "Las marcas se asignan directamente desde el formulario de producto. Al crear o editar un producto, encontraras un campo de marca donde puedes seleccionar una existente o escribir una nueva. Las marcas se crean automaticamente al ingresarlas por primera vez. Puedes usar las marcas como filtro en la lista de productos para encontrar rapidamente articulos de una marca especifica.",
      keywords: ["gestiono", "marcas", "productos", "asignan", "directamente", "desde", "formulario", "producto", "crear", "editar", "encontraras", "campo", "marca", "puedes", "seleccionar"],
      relatedActions: ["products-create"],
    },
    {
      id: "products-prices",
      question: "Como establezco o modifico los precios de un producto?",
      aliases: [
        "cambiar precio",
        "precio de venta",
        "precio de compra",
        "actualizar precios",
        "margen de ganancia",
      ],
      answer:
        "Los precios se configuran al crear o editar un producto. Define el precio de venta principal en el formulario del producto. El precio de compra se establece automaticamente al registrar ingresos de mercaderia. Puedes actualizar precios de venta de forma rapida desde la vista de detalle del producto en Inventario usando el boton de actualizar precio sin necesidad de editar todo el producto.",
      keywords: ["establezco", "modifico", "precios", "producto", "configuran", "crear", "editar", "define", "precio", "venta", "principal", "formulario", "compra", "establece", "automaticamente"],
      relatedActions: ["products-edit"],
      route: "/dashboard/products",
    },
    {
      id: "products-categories",
      question: "Como asigno una categoria a un producto?",
      aliases: [
        "categorizar producto",
        "poner categoria",
        "clasificar producto",
        "asignar categoria",
      ],
      answer:
        "Al crear o editar un producto, encontraras un campo desplegable de 'Categoria'. Selecciona la categoria correspondiente de la lista. Cada producto puede pertenecer a una categoria. Si la categoria que necesitas no existe, puedes crearla primero desde la seccion de Categorias y luego asignarla al producto.",
      keywords: ["asigno", "categoria", "producto", "crear", "editar", "encontraras", "campo", "desplegable", "'categoria'", "selecciona", "correspondiente", "lista", "cada", "puede", "pertenecer"],
      relatedActions: ["categories-create", "products-edit"],
    },
    {
      id: "products-specs",
      question: "Como agrego especificaciones tecnicas a un producto?",
      aliases: [
        "especificaciones de producto",
        "detalles tecnicos",
        "atributos de producto",
        "caracteristicas del producto",
      ],
      answer:
        "En el formulario de creacion o edicion del producto, encontraras la seccion de descripcion donde puedes detallar las especificaciones tecnicas. Utiliza la descripcion para incluir medidas, materiales, peso, garantia y cualquier informacion relevante. Esta informacion aparecera en el catalogo publico y ayudara a tus clientes a conocer mejor el producto.",
      keywords: ["agrego", "especificaciones", "tecnicas", "producto", "formulario", "creacion", "edicion", "encontraras", "seccion", "descripcion", "puedes", "detallar", "utiliza", "incluir", "medidas"],
      relatedActions: ["products-create", "products-edit"],
    },
    {
      id: "products-delete",
      question: "Como elimino un producto?",
      aliases: [
        "borrar producto",
        "eliminar articulo",
        "quitar producto",
        "dar de baja producto",
      ],
      answer:
        "Para eliminar un producto, accede a su vista de detalle y haz clic en el boton de eliminar (icono de papelera). El sistema te pedira confirmacion antes de proceder. Ten en cuenta que no se pueden eliminar productos que tengan stock en inventario o que esten asociados a ventas o ingresos existentes. En ese caso, puedes desactivarlo en lugar de eliminarlo.",
      keywords: ["elimino", "producto", "eliminar", "accede", "vista", "detalle", "haz", "clic", "boton", "icono", "papelera", "sistema", "pedira", "confirmacion", "antes"],
      relatedActions: ["products-edit"],
      roles: ["admin"],
    },
    {
      id: "products-gallery",
      question: "Como funciona la galeria de productos?",
      aliases: [
        "ver productos en galeria",
        "vista de galeria",
        "productos como tarjetas",
        "vista de cuadricula",
      ],
      answer:
        "La seccion de Productos ofrece una vista de galeria que muestra los productos como tarjetas con su imagen principal, nombre y precio. Esta vista es ideal para navegar visualmente por tu catalogo. Puedes alternar entre la vista de galeria y la vista de tabla usando los iconos en la parte superior derecha de la lista. Ambas vistas soportan busqueda y filtros.",
      keywords: ["funciona", "galeria", "productos", "seccion", "ofrece", "vista", "muestra", "tarjetas", "imagen", "principal", "nombre", "precio", "ideal", "navegar", "visualmente"],
      route: "/dashboard/products",
    },
    {
      id: "products-search",
      question: "Como busco un producto especifico?",
      aliases: [
        "buscar producto",
        "encontrar producto",
        "buscar por nombre",
        "buscar por SKU",
      ],
      answer:
        "Utiliza la barra de busqueda en la parte superior de la seccion de Productos. Puedes buscar por nombre, SKU o codigo de barras. Los resultados se filtran en tiempo real mientras escribes. Tambien puedes combinar la busqueda con filtros de categoria o marca para reducir los resultados. La busqueda no distingue entre mayusculas y minusculas.",
      keywords: ["busco", "producto", "especifico", "utiliza", "barra", "busqueda", "parte", "superior", "seccion", "productos", "puedes", "buscar", "nombre", "sku", "codigo"],
      route: "/dashboard/products",
    },
    {
      id: "products-duplicate",
      question: "Puedo duplicar un producto existente?",
      aliases: [
        "copiar producto",
        "clonar producto",
        "duplicar articulo",
        "crear producto similar",
      ],
      answer:
        "Para crear un producto similar a uno existente, la forma mas rapida es crear un nuevo producto y copiar manualmente los datos relevantes. Accede al producto original para consultar sus datos y luego crea uno nuevo con las modificaciones necesarias. Recuerda cambiar el nombre, SKU y codigo de barras para evitar duplicados en el sistema.",
      keywords: ["puedo", "duplicar", "producto", "existente", "crear", "similar", "uno", "forma", "mas", "rapida", "nuevo", "copiar", "manualmente", "datos", "relevantes"],
      relatedActions: ["products-create"],
    },
    {
      id: "products-bulk-price",
      question: "Puedo cambiar precios de varios productos a la vez?",
      aliases: [
        "cambio masivo de precios",
        "actualizar precios en lote",
        "precios por categoria",
        "ajuste de precios",
      ],
      answer:
        "Actualmente, los precios se actualizan producto por producto desde su vista de detalle o formulario de edicion. Para actualizar multiples precios de forma eficiente, puedes usar la vista de inventario donde el boton de actualizar precio te permite modificar rapidamente cada producto sin abrir el formulario completo de edicion.",
      keywords: ["puedo", "cambiar", "precios", "varios", "productos", "vez", "actualmente", "actualizan", "producto", "desde", "vista", "detalle", "formulario", "edicion", "actualizar"],
      relatedActions: ["products-prices", "products-edit"],
    },
  ],
}
