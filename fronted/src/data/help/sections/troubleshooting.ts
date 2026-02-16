import type { HelpSection } from "../types"

/**
 * FASE 1 - MEJORA #2: Sección de Resolución de Problemas
 * Cobertura de casos de error comunes y troubleshooting
 */
export const troubleshootingSection: HelpSection = {
  id: "troubleshooting",
  label: "Resolución de Problemas",
  icon: "AlertTriangle",
  description: "Soluciones a problemas y errores comunes del sistema",
  color: "text-orange-600",
  keywords: [
    "error",
    "problema",
    "no funciona",
    "falla",
    "ayuda",
    "solucion",
    "bug",
    "mal",
  ],
  quickActions: [
    "error-no-stock",
    "product-not-found",
    "product-not-in-pdf",
    "save-error",
  ],
  welcomeMessage:
    "¿Tienes un problema o error? Te ayudo a solucionarlo. Descríbeme qué está pasando.",
  entries: [
    {
      id: "error-no-stock",
      question: "Dice 'No hay stock' pero sí tengo productos",
      aliases: [
        "dice que no hay stock",
        "error no hay stock",
        "no hay stock disponible",
        "mensaje sin stock",
        "stock cero pero tengo",
        "error de stock",
        "no detecta stock",
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
      keywords: ["stock", "error", "no hay", "inventario"],
      answer:
        "Si ves el error **'No hay stock disponible'** pero sabes que tienes productos, puede deberse a varias razones:\n\n**Causas comunes:**\n\n1. **El stock está en OTRA tienda** - Las ventas solo usan el stock de la tienda desde donde vendes\n2. **Stock = 0 en el sistema** - Aunque físicamente tengas, el sistema puede tener stock en 0\n3. **Producto desactivado** - Los productos inactivos no aparecen en ventas\n\n**Solución paso a paso:**",
      steps: [
        {
          text: "Ve a **Inventario** en el menú lateral",
          image: "/help/inventory/view-stock.png",
        },
        {
          text: "Busca el producto por nombre o código",
        },
        {
          text: "Verifica el stock de la **TIENDA CORRECTA** (columna 'Tienda')",
        },
        {
          text: "Si el stock es 0, haz clic en el producto → **'Ajustar stock'** → Ingresa la cantidad correcta",
          image: "/help/inventory/adjust-stock.png",
        },
        {
          text: "Indica el motivo del ajuste (ej: 'Corrección de inventario')",
        },
        {
          text: "Ahora intenta la venta nuevamente",
        },
      ],
      relatedActions: [
        "inventory-view-stock",
        "inventory-adjust",
        "sales-new",
      ],
    },
    {
      id: "product-not-found",
      question: "No aparece un producto en la venta",
      aliases: [
        "no aparece producto",
        "producto no sale",
        "no encuentro producto en venta",
        "no veo el producto",
        "producto no esta",
        "falta producto",
      ],
      keywords: ["producto", "no aparece", "venta", "buscar"],
      answer:
        "Si un producto no aparece al buscarlo en una venta, hay 3 posibles razones:\n\n**1. El producto NO EXISTE**\n→ Debes crearlo primero en el módulo de Productos\n\n**2. El producto está INACTIVO**\n→ Ve a Productos → Busca el producto → Actívalo\n\n**3. El producto NO tiene STOCK en esta tienda**\n→ Ve a Inventario → Verifica el stock de la tienda actual\n\n**¿Cómo verificar?**",
      steps: [
        {
          text: "Ve a **Productos** en el menú lateral",
          image: "/help/products/search.png",
        },
        {
          text: "Busca el producto que no aparece",
        },
        {
          text: "Si NO existe → Créalo con el botón **'Nuevo Producto'**",
          image: "/help/products/create.png",
        },
        {
          text: "Si existe pero está INACTIVO → Edítalo y márcalo como 'Activo'",
        },
        {
          text: "Si existe pero sin stock → Ve a Inventario y ajusta el stock",
        },
      ],
      relatedActions: [
        "products-create",
        "products-search",
        "inventory-adjust",
      ],
    },
    {
      id: "product-not-in-pdf",
      question: "El sistema no detectó un producto del PDF",
      aliases: [
        "no detectó producto del pdf",
        "producto no sale del pdf",
        "falta producto en factura",
        "pdf incompleto",
        "no lee todos los productos",
        "extraccion incompleta",
      ],
      keywords: ["pdf", "producto", "no detectó", "factura", "importar"],
      answer:
        "La lectura automática de PDFs no siempre es 100% precisa. Esto puede pasar por:\n\n• PDFs escaneados (imágenes) en vez de texto\n• Formato poco común del proveedor\n• Productos con nombres muy largos o especiales\n\n**No te preocupes, puedes agregar lo que falta manualmente:**",
      steps: [
        {
          text: "Desde el formulario de Ingreso (después de importar el PDF)",
          image: "/help/entries/from-pdf.png",
        },
        {
          text: "Haz clic en **'Agregar Producto'** en la tabla de productos",
          image: "/help/entries/add-product.png",
        },
        {
          text: "Busca el producto en el sistema (si existe) o créalo nuevo",
        },
        {
          text: "Ingresa cantidad, precio y otros datos manualmente",
        },
        {
          text: "Verifica que los totales coincidan con el PDF original",
        },
        {
          text: "Guarda el ingreso normalmente",
        },
      ],
      relatedActions: [
        "entries-from-pdf",
        "entries-add-products",
        "entries-new",
      ],
    },
    {
      id: "save-error",
      question: "Error al guardar, no se guardó correctamente",
      aliases: [
        "error al guardar",
        "no se guardo",
        "fallo al guardar",
        "no se puede guardar",
        "error guardando",
        "problema al guardar",
      ],
      keywords: ["error", "guardar", "no se guardo", "fallo"],
      answer:
        "Si ves un error al intentar guardar, puede deberse a:\n\n**Causas comunes:**\n\n1. **Campos obligatorios vacíos** - Revisa que todos los campos requeridos estén completos\n2. **Conexión a internet perdida** - Verifica tu conexión\n3. **Permisos insuficientes** - Puede que tu rol no permita esta acción\n4. **Datos duplicados** - Ej: código de producto ya existe\n\n**Solución:**\n\n• Revisa el mensaje de error (usualmente indica el problema)\n• Completa todos los campos marcados con asterisco (*)\n• Verifica tu conexión a internet\n• Si persiste, contacta a soporte desde 'Mensajes'",
      relatedActions: ["courtesy-human-contact"],
    },
    {
      id: "permission-denied",
      question: "Dice que no tengo permisos para hacer esto",
      aliases: [
        "no tengo permisos",
        "sin permisos",
        "permiso denegado",
        "no autorizado",
        "no puedo hacer esto",
        "acceso denegado",
      ],
      keywords: ["permisos", "acceso", "denegado", "no autorizado"],
      answer:
        "Si ves el mensaje **'No tienes permisos'** o **'Acceso denegado'**, significa que tu rol de usuario no tiene permitida esa acción.\n\n**Acciones que requieren permisos especiales:**\n\n• **Admin:** Eliminar registros, ajustar stock, anular ventas, gestionar usuarios\n• **Manager:** Ver reportes financieros, configurar precios\n• **Seller:** Solo puede crear ventas y cotizaciones\n\n**Solución:**\n\n1. Verifica qué rol tienes: Ve a tu perfil (esquina superior derecha)\n2. Si necesitas más permisos, solicítalo al administrador del sistema\n3. El administrador puede cambiar tu rol en: **Usuarios** → Editar usuario → Cambiar rol",
      relatedActions: ["users-roles", "users-permissions"],
    },
    {
      id: "slow-system",
      question: "El sistema va muy lento",
      aliases: [
        "muy lento",
        "lento",
        "carga lento",
        "tarda mucho",
        "se traba",
        "lag",
        "demora",
      ],
      keywords: ["lento", "rendimiento", "tarda", "lag"],
      answer:
        "Si el sistema está lento, prueba estas soluciones:\n\n**1. Verifica tu conexión a internet**\n• Haz un test de velocidad\n• Reinicia tu router si es necesario\n\n**2. Cierra pestañas innecesarias del navegador**\n• Cada pestaña consume memoria\n• Deja solo la del sistema\n\n**3. Limpia caché del navegador**\n• Chrome: Ctrl+Shift+Delete\n• Selecciona 'Archivos e imágenes en caché'\n\n**4. Usa navegadores modernos**\n• Recomendado: Chrome, Edge, Firefox (actualizados)\n• Evita: Internet Explorer\n\n**5. Si persiste:**\n• Contacta a soporte técnico - puede ser un problema del servidor",
      relatedActions: ["courtesy-human-contact"],
    },
    {
      id: "cant-delete",
      question: "No puedo eliminar, dice que tiene movimientos",
      aliases: [
        "no puedo eliminar",
        "no se puede eliminar",
        "tiene movimientos",
        "no permite eliminar",
        "error al eliminar",
      ],
      keywords: ["eliminar", "movimientos", "no se puede", "error"],
      answer:
        "El sistema previene eliminar registros que **ya tienen operaciones asociadas** para mantener la integridad de los datos.\n\n**Ejemplos:**\n\n• **No puedes eliminar un producto** que ya tiene ventas o movimientos de stock\n• **No puedes eliminar un proveedor** que tiene ingresos registrados\n• **No puedes eliminar una categoría** que tiene productos asignados\n\n**Solución:**\n\nEn vez de eliminar, **DESACTIVA** el registro:\n\n1. Ve al módulo correspondiente (Productos, Proveedores, etc.)\n2. Busca y edita el registro\n3. Márcalo como **'Inactivo'** o **'Deshabilitado'**\n4. Guarda\n\nAsí el registro:\n✅ Se mantiene en el historial\n✅ No aparece en nuevas operaciones\n✅ No pierde información importante",
      relatedActions: ["products-delete", "providers-delete"],
    },
    {
      id: "logout-unexpected",
      question: "Me sacó del sistema de repente (sesión cerrada)",
      aliases: [
        "me saco del sistema",
        "sesion cerrada",
        "se cerro la sesion",
        "deslogueado",
        "tengo que volver a entrar",
      ],
      keywords: ["sesion", "logout", "cerrado", "deslogueado"],
      answer:
        "Si el sistema te saca automáticamente, puede ser por:\n\n**1. Sesión expirada (30 minutos de inactividad)**\n→ Por seguridad, las sesiones expiran\n→ Vuelve a iniciar sesión\n\n**2. Alguien más inició sesión con tu usuario**\n→ Solo se permite 1 sesión activa por usuario\n→ Verifica quién más puede tener tu contraseña\n\n**3. Cambio de permisos por administrador**\n→ Si te quitaron permisos, se cierra tu sesión\n\n**Solución:**\n\n• Inicia sesión nuevamente\n• Si pasa frecuentemente, verifica en 'Sesiones Activas' si hay usuarios duplicados\n• Cambia tu contraseña si sospechas que alguien más la tiene",
      relatedActions: ["users-sessions", "users-change-password"],
    },
    {
      id: "print-not-working",
      question: "No puedo imprimir / no sale la impresión",
      aliases: [
        "no imprime",
        "no sale la impresion",
        "problema impresora",
        "no funciona impresora",
        "error al imprimir",
      ],
      keywords: ["imprimir", "impresora", "no sale", "pdf"],
      answer:
        "Si tienes problemas para imprimir desde el sistema:\n\n**1. Verifica que tu impresora esté:**\n• Encendida\n• Conectada al equipo (USB o red)\n• Con papel y tinta\n\n**2. Prueba imprimir el PDF primero:**\n• En vez de imprimir directamente, descarga el PDF\n• Ábrelo con Adobe Reader o Chrome\n• Imprime desde ahí\n\n**3. Verifica los permisos del navegador:**\n• El navegador puede bloquear ventanas emergentes\n• Permite pop-ups para este sitio\n\n**4. Prueba otro navegador:**\n• Si no funciona en Chrome, prueba Edge o Firefox\n\n**5. Impresora de red:**\n• Verifica que estés en la misma red\n• Consulta a tu administrador de IT",
      relatedActions: ["sales-receipt", "quotes-pdf"],
    },
    {
      id: "forgot-password",
      question: "Olvidé mi contraseña",
      aliases: [
        "olvide mi contraseña",
        "no recuerdo la contraseña",
        "contraseña olvidada",
        "recuperar contraseña",
        "resetear contraseña",
      ],
      keywords: ["contraseña", "olvide", "recuperar", "password"],
      answer:
        "Para recuperar tu contraseña:\n\n**Opción 1: Pantalla de Login**\n\n1. Ve a la pantalla de inicio de sesión\n2. Haz clic en **'¿Olvidaste tu contraseña?'**\n3. Ingresa tu email\n4. Recibirás un enlace para crear una nueva contraseña\n\n**Opción 2: Contacta al Administrador**\n\nSi no recibes el email:\n\n1. Contacta al administrador de tu organización\n2. El administrador puede resetear tu contraseña desde:\n   **Usuarios** → Buscar tu usuario → **'Cambiar contraseña'**\n3. Te darán una contraseña temporal\n4. Cámbiala al ingresar por primera vez",
      relatedActions: ["users-change-password"],
    },
  ],
}
