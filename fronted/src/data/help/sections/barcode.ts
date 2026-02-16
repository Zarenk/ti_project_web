import type { HelpSection } from "../types"

export const barcodeSection: HelpSection = {
  id: "barcode",
  label: "Código de Barras",
  description: "Escanea productos usando la cámara o ingresa códigos manualmente.",
  welcomeMessage:
    "Estás en el Escáner de Productos. Usa tu cámara para escanear códigos de barras o QR, o ingrésalos manualmente.",
  quickActions: [
    "barcode-camera-mode",
    "barcode-manual-mode",
    "barcode-connection",
    "barcode-troubleshooting",
  ],
  entries: [
    {
      id: "barcode-camera-mode",
      question: "¿Cómo escaneo un producto con la cámara?",
      aliases: [
        "escanear con cámara",
        "usar cámara barcode",
        "scanner qr",
        "escanear código barras",
        "cámara web scanner",
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
        "El **modo Cámara** te permite escanear códigos de barras y QR usando tu webcam o cámara del dispositivo:\n\n**📷 Paso a paso:**\n\n1. **Accede al escáner**: Ve a la página de Código de Barras desde el menú\n2. **Activa el modo Cámara**: Haz clic en el botón 'Cámara' (debería estar activo por defecto)\n3. **Permite el acceso a la cámara**: Tu navegador pedirá permiso para usar la cámara - haz clic en 'Permitir'\n4. **Posiciona el código**: Coloca el código de barras o QR frente a la cámara\n   • Mantén el código dentro del área visible\n   • Asegúrate de que haya buena iluminación\n   • Mantén el código estable (sin movimiento brusco)\n5. **Escaneo automático**: El sistema detecta y lee el código automáticamente\n6. **Resultado**: Se muestra la información del producto:\n   • Nombre y categoría\n   • Imagen del producto\n   • Precios de venta y compra\n   • Marca, código y descripción\n   • Estado (Activo/Inactivo)\n\n**💡 Tips para mejor escaneo:**\n• **Iluminación**: Asegúrate de tener luz suficiente (evita sombras sobre el código)\n• **Distancia**: Mantén el código a 10-30 cm de la cámara\n• **Enfoque**: Espera 1-2 segundos si el código no se lee inmediatamente\n• **Limpieza**: Limpia la lente de la cámara si está borrosa\n• **Códigos dañados**: Si el código está rayado o maltratado, usa el modo Manual\n\n**🔄 Escanear otro producto:**\nDespués de ver un producto, haz clic en 'Escanear otro producto' para continuar.\n\n**🚨 Si la cámara no funciona:**\n• Verifica que tu navegador tenga permiso para acceder a la cámara\n• Intenta recargar la página\n• Usa el modo Manual como alternativa",
      keywords: [
        "escanear",
        "cámara",
        "webcam",
        "scanner",
        "qr",
        "código",
        "barras",
        "automático",
        "detectar",
      ],
      steps: [
        {
          text: "Ve a la página de Código de Barras desde el menú",
          image: "/help/barcode/step1-menu.png",
        },
        {
          text: "Haz clic en el botón 'Cámara' en la parte superior",
          image: "/help/barcode/step2-camera-button.png",
        },
        {
          text: "Permite el acceso a la cámara cuando el navegador lo solicite",
          image: "/help/barcode/step3-allow-camera.png",
        },
        {
          text: "Coloca el código de barras o QR frente a la cámara",
          image: "/help/barcode/step4-position-code.png",
        },
        {
          text: "El sistema detecta y escanea automáticamente",
          image: "/help/barcode/step5-scanning.png",
        },
        {
          text: "Se muestra la información completa del producto",
          image: "/help/barcode/step6-result.png",
        },
      ],
      relatedActions: ["barcode-manual-mode", "barcode-troubleshooting"],
      route: "/barcode",
      section: "barcode",
    },
    {
      id: "barcode-manual-mode",
      question: "¿Cómo busco un producto ingresando el código manualmente?",
      aliases: [
        "ingresar código manual",
        "escribir código barras",
        "búsqueda manual barcode",
        "sin cámara",
        "teclado barcode",
      ],
      answer:
        "El **modo Manual** te permite buscar productos escribiendo el código directamente, sin necesidad de usar la cámara:\n\n**⌨️ Cuándo usar el modo Manual:**\n• Tu dispositivo no tiene cámara\n• La cámara no funciona correctamente\n• El código de barras está dañado o es difícil de escanear\n• Tienes el código en formato digital (correo, documento, etc.)\n• Prefieres escribir en lugar de escanear\n\n**📝 Paso a paso:**\n\n1. **Activa el modo Manual**: Haz clic en el botón 'Manual' (ícono de teclado)\n2. **Escribe el código**: Ingresa el código de barras o QR en el campo de texto\n   • Puede ser numérico (EAN-13: `7501234567890`)\n   • Puede ser alfanumérico (Code 128: `ABC123XYZ`)\n   • También acepta códigos QR en formato texto\n3. **Buscar**: Haz clic en el botón 'Buscar' o presiona Enter\n4. **Espera**: El sistema busca el producto en la base de datos\n5. **Resultado**: Se muestra la información del producto (igual que en modo Cámara)\n\n**✅ Formatos aceptados:**\n• **EAN-13**: 13 dígitos (más común en productos comerciales)\n• **EAN-8**: 8 dígitos (productos pequeños)\n• **UPC-A**: 12 dígitos (estándar norteamericano)\n• **Code 128**: Alfanumérico (códigos internos personalizados)\n• **QR Code**: Texto con formato de código QR\n\n**💡 Tips:**\n• Verifica que el código esté completo (sin espacios ni guiones)\n• Si el código tiene letras, respeta mayúsculas/minúsculas\n• Puedes copiar y pegar códigos desde otros documentos\n• El sistema elimina automáticamente espacios en blanco al inicio/final\n\n**🔄 Buscar otro código:**\nDespués de ver un producto, haz clic en 'Escanear otro producto' - el modo Manual se mantendrá activo.",
      keywords: [
        "manual",
        "teclado",
        "escribir",
        "ingresar",
        "código",
        "sin",
        "cámara",
        "buscar",
        "texto",
      ],
      steps: [
        {
          text: "Haz clic en el botón 'Manual' (ícono de teclado)",
          image: "/help/barcode/step1-manual-button.png",
        },
        {
          text: "Aparece un campo de texto para ingresar el código",
          image: "/help/barcode/step2-input-field.png",
        },
        {
          text: "Escribe o pega el código de barras/QR completo",
          image: "/help/barcode/step3-type-code.png",
        },
        {
          text: "Haz clic en 'Buscar' o presiona Enter",
          image: "/help/barcode/step4-submit.png",
        },
        {
          text: "El sistema busca el producto (spinner de carga)",
          image: "/help/barcode/step5-loading.png",
        },
        {
          text: "Se muestra el resultado con todos los detalles",
          image: "/help/barcode/step6-result.png",
        },
      ],
      relatedActions: ["barcode-camera-mode", "barcode-troubleshooting"],
      route: "/barcode",
      section: "barcode",
    },
    {
      id: "barcode-connection",
      question: "¿Qué significa el indicador de conexión verde/rojo?",
      aliases: [
        "punto verde rojo",
        "estado de conexión",
        "desconectado barcode",
        "sin conexión scanner",
        "indicador conexión",
      ],
      answer:
        "El **indicador de conexión** en la esquina superior derecha muestra el estado de la conexión en tiempo real con el servidor:\n\n**🟢 Punto Verde - CONECTADO**\n• El escáner está conectado al servidor correctamente\n• Puedes escanear códigos normalmente\n• Las búsquedas funcionarán en tiempo real\n• Todo operativo ✅\n\n**🔴 Punto Rojo - DESCONECTADO**\n• No hay conexión con el servidor\n• Las búsquedas NO funcionarán\n• Puede deberse a:\n   - Problemas de internet\n   - Sesión expirada\n   - Servidor en mantenimiento\n   - Firewall bloqueando WebSockets\n\n**🔧 Qué hacer si estás desconectado:**\n\n1. **Verifica tu internet**: Comprueba que tienes conexión activa\n2. **Recarga la página**: Presiona F5 o Ctrl+R para reconectar\n3. **Revisa tu sesión**: Si has estado inactivo mucho tiempo, cierra sesión y vuelve a iniciar\n4. **Espera un momento**: Si el servidor está reiniciando, la conexión se restablecerá automáticamente\n5. **Contacta al admin**: Si el problema persiste, puede ser un problema del servidor\n\n**⚙️ Tecnología detrás:**\nEl escáner usa **WebSockets** para comunicación en tiempo real. Esto permite:\n• Respuestas instantáneas al escanear\n• Sin necesidad de recargar la página\n• Conexión persistente durante toda la sesión\n• Menor latencia que HTTP tradicional\n\n**💡 Consejo:**\nSi ves el punto rojo frecuentemente:\n• Verifica que tu firewall/antivirus no bloquee WebSockets\n• Asegúrate de tener una conexión estable a internet\n• Evita usar VPNs que puedan interferir con la conexión",
      keywords: [
        "conexión",
        "conectado",
        "desconectado",
        "punto",
        "verde",
        "rojo",
        "indicador",
        "websocket",
        "estado",
      ],
      steps: [
        {
          text: "Localiza el indicador en la esquina superior derecha",
          image: "/help/barcode/step1-indicator-location.png",
        },
        {
          text: "Verde = Conectado, puedes escanear normalmente",
          image: "/help/barcode/step2-green-connected.png",
        },
        {
          text: "Rojo = Desconectado, verifica tu conexión",
          image: "/help/barcode/step3-red-disconnected.png",
        },
        {
          text: "Si está rojo, recarga la página (F5)",
          image: "/help/barcode/step4-reload-page.png",
        },
        {
          text: "Si persiste, cierra sesión y vuelve a iniciar",
          image: "/help/barcode/step5-relogin.png",
        },
      ],
      relatedActions: ["barcode-troubleshooting"],
      route: "/barcode",
      section: "barcode",
    },
    {
      id: "barcode-troubleshooting",
      question: "¿Qué hago si el código no se encuentra o falla el escaneo?",
      aliases: [
        "producto no encontrado",
        "error al escanear",
        "no lee el código",
        "scanner no funciona",
        "solución problemas barcode",
      ],
      answer:
        "Si el escaneo falla o el producto no se encuentra, aquí están las soluciones más comunes:\n\n**❌ Problema: 'Producto no encontrado'**\n\n**Causas posibles:**\n• El código no está registrado en tu base de datos\n• El código fue escaneado incorrectamente\n• El producto fue eliminado del sistema\n• Estás en la organización/sucursal incorrecta\n\n**Soluciones:**\n1. **Verifica el código**: Usa el modo Manual para escribir el código exacto y confirmar\n2. **Revisa en Productos**: Ve a Dashboard > Productos y busca el producto por nombre\n3. **Registra el código**: Si el producto existe pero no tiene código de barras:\n   - Ve a la ficha del producto\n   - Edita y agrega el código de barras/QR\n   - Guarda y vuelve a escanear\n4. **Crea el producto**: Si es un producto nuevo, regístralo primero en el inventario\n\n**📷 Problema: La cámara no detecta el código**\n\n**Causas posibles:**\n• Mala iluminación\n• Código dañado o borroso\n• Cámara desenfocada\n• Código muy pequeño o muy grande\n• Reflejo en el código (plástico brillante)\n\n**Soluciones:**\n1. **Mejora la iluminación**: Usa luz natural o lámpara directa\n2. **Ajusta la distancia**: Acerca o aleja el código (prueba 10-30 cm)\n3. **Elimina reflejos**: Cambia el ángulo para evitar brillos\n4. **Limpia la lente**: Limpia la cámara con un paño suave\n5. **Usa modo Manual**: Si el código es legible pero la cámara no lo lee, escríbelo manualmente\n\n**🔴 Problema: Punto rojo (desconectado)**\n\n**Ver ayuda:** Consulta la entrada sobre el indicador de conexión para soluciones específicas.\n\n**⏱️ Problema: Escaneo lento o se congela**\n\n**Soluciones:**\n1. **Recarga la página**: F5 o Ctrl+R\n2. **Cierra otras pestañas**: Libera recursos del navegador\n3. **Usa un navegador moderno**: Chrome, Firefox o Edge actualizados\n4. **Verifica tu internet**: Conexión lenta afecta la búsqueda\n\n**🔄 Escaneos duplicados o repetidos**\n\nEl sistema tiene un **anti-rebote** de 2 segundos - si escaneas el mismo código dos veces seguidas, la segunda se ignora. Esto previene búsquedas duplicadas accidentales.\n\n**💡 Mejores prácticas:**\n• Mantén los códigos limpios y sin daños\n• Registra códigos de barras al crear productos\n• Usa etiquetas de calidad que no se despeguen o rayen\n• Prueba el escáner periódicamente para asegurar que funciona\n• Capacita al personal en cómo usar ambos modos (Cámara y Manual)",
      keywords: [
        "error",
        "falla",
        "no",
        "encuentra",
        "problema",
        "solución",
        "troubleshooting",
        "no",
        "funciona",
        "detecta",
      ],
      steps: [
        {
          text: "Si aparece error, lee el mensaje específico",
          image: "/help/barcode/step1-error-message.png",
        },
        {
          text: "Haz clic en 'Intentar de nuevo' para resetear",
          image: "/help/barcode/step2-try-again.png",
        },
        {
          text: "Si el código no se lee con cámara, cambia a modo Manual",
          image: "/help/barcode/step3-switch-manual.png",
        },
        {
          text: "Verifica que el producto existe en Dashboard > Productos",
          image: "/help/barcode/step4-check-products.png",
        },
        {
          text: "Si no existe, créalo y agrega el código de barras/QR",
          image: "/help/barcode/step5-add-product.png",
        },
        {
          text: "Mejora iluminación/ángulo si la cámara no detecta",
          image: "/help/barcode/step6-improve-lighting.png",
        },
      ],
      relatedActions: [
        "barcode-camera-mode",
        "barcode-manual-mode",
        "barcode-connection",
      ],
      route: "/barcode",
      section: "barcode",
    },
  ],
}
