import type { HelpSection } from "../types"

export const publicStoreSection: HelpSection = {
  id: "public-store",
  label: "Tienda en Línea",
  description: "Catálogo público de productos, carrito de compras y proceso de compra",
  welcomeMessage:
    "Bienvenido a la tienda en línea. Aquí puedes explorar productos, comparar precios y realizar pedidos.",
  quickActions: [
    "store-browse",
    "store-search",
    "store-filter",
    "store-cart",
  ],
  entries: [
    {
      id: "store-browse",
      question: "¿Cómo navego por los productos de la tienda?",
      aliases: [
        "ver productos",
        "catálogo de productos",
        "explorar tienda",
        "buscar artículos",
      ],
      answer:
        "En la página de la tienda (/store) verás todos los productos disponibles organizados en tarjetas con imagen, nombre, precio y stock. Puedes desplazarte hacia abajo para ver más productos. Utiliza la paginación en la parte inferior para navegar entre páginas si hay muchos productos. Cada tarjeta de producto muestra información básica y puedes hacer clic en ella para ver detalles completos.",
      keywords: ["navegar", "productos", "tienda", "catálogo", "ver", "artículos", "tarjetas", "stock", "precio"],
      route: "/store",
      section: "public-store",
    },
    {
      id: "store-search",
      question: "¿Cómo busco un producto específico?",
      aliases: [
        "buscar producto",
        "buscador",
        "encontrar artículo",
        "search",
      ],
      answer:
        "Usa el buscador en la parte superior de la tienda. Escribe el nombre del producto, marca o palabra clave y verás resultados filtrados en tiempo real. El buscador busca en el nombre, descripción y especificaciones técnicas de los productos. Por ejemplo, puedes buscar 'laptop', 'intel i5', o el nombre de una marca específica.",
      keywords: ["buscar", "buscador", "search", "encontrar", "producto", "nombre", "marca", "keyword"],
      steps: [
        { text: "Localiza el campo de búsqueda en la parte superior", image: "/help/store/step1-search-bar.png" },
        { text: "Escribe el nombre del producto o palabra clave", image: "/help/store/step2-type-query.png" },
        { text: "Los resultados se filtran automáticamente mientras escribes", image: "/help/store/step3-results.png" },
      ],
      route: "/store",
      section: "public-store",
    },
    {
      id: "store-filter",
      question: "¿Cómo filtro productos por categoría o precio?",
      aliases: [
        "filtrar productos",
        "filtros",
        "categorías",
        "rango de precio",
        "ordenar productos",
      ],
      answer:
        "En el panel lateral izquierdo (o en el menú de filtros en móvil) encontrarás opciones para filtrar:\n\n• **Por Categoría**: Marca las categorías que te interesan (laptops, monitores, periféricos, etc.)\n• **Por Marca**: Filtra por fabricante específico\n• **Por Rango de Precio**: Arrastra los controles para definir tu presupuesto (min-max)\n• **Por Disponibilidad**: Muestra solo productos en stock\n• **Ordenar por**: Precio (menor a mayor, mayor a menor), nombre (A-Z, Z-A), o productos más recientes\n\nPuedes combinar múltiples filtros para encontrar exactamente lo que buscas.",
      keywords: ["filtrar", "filtros", "categoría", "precio", "marca", "ordenar", "rango", "stock", "disponibilidad"],
      steps: [
        { text: "Abre el panel de filtros (lateral o botón 'Filtros' en móvil)", image: "/help/store/step1-filters.png" },
        { text: "Selecciona categorías y marcas que te interesan", image: "/help/store/step2-select-filters.png" },
        { text: "Ajusta el rango de precio si deseas", image: "/help/store/step3-price-range.png" },
        { text: "Los productos se filtran automáticamente", image: "/help/store/step4-filtered-results.png" },
      ],
      route: "/store",
      section: "public-store",
    },
    {
      id: "store-product-details",
      question: "¿Cómo veo los detalles completos de un producto?",
      aliases: [
        "información del producto",
        "especificaciones",
        "detalles técnicos",
        "ver más información",
      ],
      answer:
        "Haz clic en cualquier tarjeta de producto para ver su página de detalles. Aquí encontrarás:\n\n• **Galería de imágenes**: Múltiples fotos del producto\n• **Descripción completa**: Información detallada del producto\n• **Especificaciones técnicas**: Procesador, RAM, almacenamiento, etc.\n• **Precio actual**: Con descuentos si aplica\n• **Disponibilidad**: Stock disponible en cada tienda\n• **Opciones de compra**: Botón para agregar al carrito\n• **Productos relacionados**: Sugerencias similares\n\nDesde aquí puedes agregar el producto a tu carrito de compras.",
      keywords: ["detalles", "producto", "información", "especificaciones", "técnicas", "imágenes", "descripción", "stock"],
      route: "/store/[id]",
      section: "public-store",
    },
    {
      id: "store-cart",
      question: "¿Cómo funciona el carrito de compras?",
      aliases: [
        "agregar al carrito",
        "carrito",
        "comprar productos",
        "shopping cart",
      ],
      answer:
        "Para agregar productos al carrito:\n\n1. Haz clic en 'Agregar al Carrito' en la tarjeta del producto o en su página de detalles\n2. El producto se añade y verás un contador en el ícono del carrito (esquina superior derecha)\n3. Haz clic en el ícono del carrito para ver tu lista de productos\n4. En el carrito puedes:\n   • Cambiar la cantidad de cada producto\n   • Eliminar productos que no quieres\n   • Ver el total a pagar\n   • Proceder al checkout/pago\n\nEl carrito se guarda incluso si cierras el navegador, así puedes continuar después.",
      keywords: ["carrito", "compras", "agregar", "cart", "shopping", "cantidad", "eliminar", "total", "checkout"],
      steps: [
        { text: "Encuentra un producto que te guste", image: "/help/store/step1-product.png" },
        { text: "Haz clic en 'Agregar al Carrito'", image: "/help/store/step2-add-cart.png" },
        { text: "Ve al carrito haciendo clic en el ícono superior", image: "/help/store/step3-cart-icon.png" },
        { text: "Revisa tus productos y procede al pago", image: "/help/store/step4-checkout.png" },
      ],
      route: "/cart",
      section: "public-store",
    },
    {
      id: "store-stock",
      question: "¿Cómo sé si un producto está disponible?",
      aliases: [
        "stock disponible",
        "hay stock",
        "producto agotado",
        "disponibilidad",
      ],
      answer:
        "La disponibilidad se muestra en la tarjeta de cada producto:\n\n• **'En Stock'** (verde): Producto disponible para compra inmediata\n• **'Stock Bajo'** (amarillo): Quedan pocas unidades, apresúrate\n• **'Agotado'** (rojo): Sin stock actualmente, no se puede agregar al carrito\n• **Número de unidades**: Algunos productos muestran cantidad exacta disponible\n\nSi un producto está en múltiples tiendas, verás el stock total. En la página de detalles puedes ver el stock específico por tienda física.",
      keywords: ["stock", "disponible", "disponibilidad", "agotado", "unidades", "tienda", "inventario"],
      route: "/store",
      section: "public-store",
    },
    {
      id: "store-prices",
      question: "¿Los precios incluyen impuestos?",
      aliases: [
        "precio con IGV",
        "precio con IVA",
        "impuestos incluidos",
        "precio final",
      ],
      answer:
        "Sí, todos los precios mostrados en la tienda incluyen impuestos (IGV/IVA según tu país). El precio que ves es el precio final que pagarás. En el carrito y durante el checkout verás el desglose:\n\n• Subtotal (antes de impuestos)\n• IGV/IVA (porcentaje aplicado)\n• Total a Pagar (precio final)\n\nNo hay cargos ocultos ni costos adicionales sorpresa.",
      keywords: ["precio", "impuestos", "igv", "iva", "incluido", "total", "final", "subtotal"],
      route: "/store",
      section: "public-store",
    },
    {
      id: "store-compare",
      question: "¿Puedo comparar productos?",
      aliases: [
        "comparar productos",
        "comparación",
        "diferencias entre productos",
      ],
      answer:
        "Actualmente no hay una función de comparación directa, pero puedes abrir múltiples productos en pestañas diferentes de tu navegador para compararlos manualmente. Observa las especificaciones técnicas, precios y características de cada uno. En futuras versiones se incluirá una herramienta de comparación lado a lado.",
      keywords: ["comparar", "comparación", "productos", "diferencias", "especificaciones"],
      route: "/store",
      section: "public-store",
    },
    {
      id: "store-favorites",
      question: "¿Puedo guardar productos favoritos?",
      aliases: [
        "favoritos",
        "wishlist",
        "lista de deseos",
        "guardar productos",
      ],
      answer:
        "Si tienes una cuenta de usuario e iniciaste sesión, puedes marcar productos como favoritos haciendo clic en el ícono de corazón en cada producto. Tus favoritos se guardan en tu cuenta y puedes acceder a ellos desde tu perfil en cualquier momento. Esto es útil para llevar un seguimiento de productos que te interesan pero no quieres comprar aún.",
      keywords: ["favoritos", "wishlist", "lista", "deseos", "corazón", "guardar", "productos"],
      route: "/favorites",
      section: "public-store",
    },
    {
      id: "store-login-benefits",
      question: "¿Qué beneficios tengo si creo una cuenta?",
      aliases: [
        "crear cuenta",
        "registrarse",
        "ventajas de cuenta",
        "signup",
      ],
      answer:
        "Crear una cuenta te da varios beneficios:\n\n• **Historial de compras**: Revisa tus pedidos anteriores\n• **Favoritos**: Guarda productos que te gustan\n• **Checkout rápido**: Tus datos se guardan para compras futuras\n• **Seguimiento de pedidos**: Rastrea el estado de tus envíos\n• **Ofertas personalizadas**: Recibe notificaciones de descuentos en productos que te interesan\n• **Direcciones guardadas**: No necesitas escribir tu dirección cada vez\n\nEl registro es gratuito y toma solo unos minutos.",
      keywords: ["cuenta", "registrarse", "signup", "beneficios", "historial", "favoritos", "ofertas", "pedidos"],
      route: "/signup",
      section: "public-store",
    },
    {
      id: "store-payment-methods",
      question: "¿Qué métodos de pago aceptan?",
      aliases: [
        "formas de pago",
        "pagar",
        "tarjeta",
        "efectivo",
        "transferencia",
      ],
      answer:
        "Aceptamos múltiples métodos de pago:\n\n• **Tarjeta de crédito/débito**: Visa, Mastercard, American Express\n• **Transferencia bancaria**: Recibirás los datos bancarios en el checkout\n• **Efectivo**: Pago contra entrega (disponible en algunas zonas)\n• **Yape/Plin**: Para pagos rápidos desde tu móvil\n• **POS**: Si recoges en tienda física\n\nEl método disponible depende de tu ubicación y la tienda seleccionada. Durante el checkout verás las opciones específicas para tu pedido.",
      keywords: ["pago", "métodos", "tarjeta", "efectivo", "transferencia", "yape", "plin", "visa", "mastercard"],
      route: "/payment",
      section: "public-store",
    },
    {
      id: "store-delivery",
      question: "¿Cómo funciona el envío/delivery?",
      aliases: [
        "envío",
        "delivery",
        "entrega a domicilio",
        "tiempo de entrega",
      ],
      answer:
        "Durante el checkout puedes elegir:\n\n• **Recojo en tienda**: Sin costo, disponible en 1-2 horas\n• **Delivery local**: Envío a domicilio en tu ciudad (costo según distancia)\n• **Envío nacional**: A través de courier (2-5 días hábiles)\n\nEl tiempo y costo de envío se calculan automáticamente según tu dirección. Recibirás un código de seguimiento para rastrear tu pedido. Te notificaremos por email/SMS cuando tu pedido esté listo para recojo o en camino.",
      keywords: ["envío", "delivery", "entrega", "domicilio", "courier", "recojo", "tienda", "seguimiento"],
      route: "/store",
      section: "public-store",
    },
    {
      id: "store-contact",
      question: "¿Cómo contacto con la tienda?",
      aliases: [
        "contactar",
        "soporte",
        "ayuda",
        "whatsapp",
        "teléfono",
      ],
      answer:
        "Puedes contactarnos por varios medios:\n\n• **Chat en vivo**: Botón de chat en la esquina inferior derecha (horario de atención)\n• **WhatsApp**: Haz clic en el botón de WhatsApp para chat directo\n• **Email**: Envía tu consulta al correo mostrado en el pie de página\n• **Teléfono**: Llámanos al número que aparece en 'Contacto'\n• **Formulario de contacto**: En la página /contact\n\nNuestro equipo te responderá lo antes posible, usualmente en el mismo día.",
      keywords: ["contacto", "soporte", "ayuda", "chat", "whatsapp", "email", "teléfono", "formulario"],
      route: "/contact",
      section: "public-store",
    },
  ],
}
