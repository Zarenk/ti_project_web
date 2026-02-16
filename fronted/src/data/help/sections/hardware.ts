import type { HelpSection } from "../types"

export const hardwareSection: HelpSection = {
  id: "hardware",
  title: "Hardware y Periféricos",
  description: "Solución de problemas con impresoras, lectores de código de barras, cajones de dinero y otros dispositivos",
  icon: "🖨️",
  entries: [
    {
      id: "printer-not-printing",
      question: "La impresora no imprime, qué hago?",
      aliases: [
        "impresora no funciona",
        "no sale nada de la impresora",
        "impresora no responde",
        "no puedo imprimir",
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
      keywords: ["impresora", "imprimir", "no funciona", "no sale", "printer"],
      answer: "Si la impresora no imprime, verifica estos pasos básicos:",
      steps: [
        {
          text: "Verifica que la impresora esté ENCENDIDA (luz verde prendida)",
        },
        {
          text: "Revisa que tenga PAPEL (abre la tapa y verifica)",
        },
        {
          text: "Verifica que el cable USB esté CONECTADO a la computadora",
        },
        {
          text: "En Windows, ve a Configuración → Impresoras y verifica que esté configurada como 'Predeterminada'",
        },
        {
          text: "Intenta imprimir una página de prueba desde Configuración de Windows",
        },
        {
          text: "Si no funciona, REINICIA la impresora (apágala 10 segundos y vuélvela a encender)",
        },
        {
          text: "Verifica que los DRIVERS estén instalados (busca el modelo en Google + 'driver download')",
        },
      ],
      relatedActions: ["printer-jam", "printer-quality", "printer-driver"],
    },
    {
      id: "printer-jam",
      question: "La impresora tiene papel atascado, cómo lo saco?",
      aliases: [
        "papel trabado",
        "papel atascado en impresora",
        "papel atorado",
        "impresora atascada",
      ],
      keywords: ["atascado", "trabado", "atorado", "jam", "papel", "impresora"],
      answer: "Para sacar papel atascado de la impresora:",
      steps: [
        {
          text: "APAGA la impresora primero (botón de encendido)",
        },
        {
          text: "Abre la TAPA SUPERIOR con cuidado",
        },
        {
          text: "Retira el CARTUCHO o TÓNER si es necesario para tener mejor acceso",
        },
        {
          text: "JALA el papel SUAVEMENTE en la dirección que sale normalmente (no al revés)",
        },
        {
          text: "Si no sale fácil, revisa si hay pedazos rotos dentro",
        },
        {
          text: "Cierra la tapa, vuelve a poner el cartucho",
        },
        {
          text: "Enciende la impresora y prueba imprimir una página de prueba",
        },
      ],
      relatedActions: ["printer-not-printing"],
    },
    {
      id: "printer-quality",
      question: "La impresora imprime borroso o con líneas, cómo lo arreglo?",
      aliases: [
        "impresión borrosa",
        "imprime mal",
        "calidad de impresión mala",
        "sale con rayas",
      ],
      keywords: ["borroso", "líneas", "rayas", "calidad", "mal", "impresora"],
      answer: "Si la calidad de impresión es mala:",
      steps: [
        {
          text: "Limpia los CABEZALES DE IMPRESIÓN desde la configuración de la impresora (usualmente hay una opción en el menú)",
        },
        {
          text: "Verifica el nivel de TINTA o TÓNER (si está bajo, reemplázalo)",
        },
        {
          text: "Usa papel de BUENA CALIDAD (papel muy barato puede causar problemas)",
        },
        {
          text: "Ejecuta la ALINEACIÓN DE CABEZALES desde la configuración",
        },
        {
          text: "Si es impresora de tinta, verifica que los cartuchos no estén VENCIDOS o SECOS",
        },
        {
          text: "Como último recurso, desinstala y reinstala los DRIVERS",
        },
      ],
      relatedActions: ["printer-not-printing", "printer-driver"],
    },
    {
      id: "printer-driver",
      question: "Cómo instalo los drivers de la impresora?",
      aliases: [
        "instalar driver impresora",
        "controlador de impresora",
        "drivers impresora",
      ],
      keywords: ["driver", "controlador", "instalar", "impresora"],
      answer: "Para instalar drivers de impresora:",
      steps: [
        {
          text: "Identifica el MODELO EXACTO de tu impresora (ej: Epson L3110, HP LaserJet 1020)",
        },
        {
          text: "Ve al sitio web OFICIAL del fabricante (Epson.com, HP.com, Canon.com, etc.)",
        },
        {
          text: "Busca la sección 'Soporte' o 'Drivers y Descargas'",
        },
        {
          text: "Ingresa el modelo de tu impresora",
        },
        {
          text: "Descarga el driver para tu sistema operativo (Windows 10/11, macOS, etc.)",
        },
        {
          text: "Ejecuta el instalador y sigue las instrucciones",
        },
        {
          text: "Conecta la impresora cuando te lo pida",
        },
        {
          text: "Imprime una página de prueba para verificar",
        },
      ],
    },
    {
      id: "barcode-not-reading",
      question: "El lector de código de barras no lee, qué hago?",
      aliases: [
        "lector no funciona",
        "escáner no lee",
        "scanner no funciona",
        "no lee códigos",
      ],
      keywords: ["lector", "código de barras", "escáner", "scanner", "no lee"],
      answer: "Si el lector de código de barras no funciona:",
      steps: [
        {
          text: "Verifica que esté CONECTADO correctamente (USB o Bluetooth)",
        },
        {
          text: "Si tiene luz, verifica que la LUZ ROJA esté prendida al presionar el gatillo",
        },
        {
          text: "Limpia el CRISTAL del lector con un paño suave (puede tener suciedad)",
        },
        {
          text: "Prueba leer un código de barras de BUENA CALIDAD (no borroso ni dañado)",
        },
        {
          text: "Verifica que el código esté bien ILUMINADO",
        },
        {
          text: "Prueba leer desde diferentes DISTANCIAS (muy cerca o muy lejos puede fallar)",
        },
        {
          text: "Si es inalámbrico, verifica la BATERÍA",
        },
        {
          text: "Reinicia el lector (desconecta y vuelve a conectar)",
        },
        {
          text: "Puede que necesite CONFIGURACIÓN (algunos lectores necesitan leer un código de configuración especial del manual)",
        },
      ],
      relatedActions: ["barcode-configuration"],
    },
    {
      id: "barcode-configuration",
      question: "Cómo configuro el lector de código de barras?",
      aliases: [
        "configurar scanner",
        "programar lector",
        "setup escáner",
      ],
      keywords: ["configurar", "configuración", "lector", "scanner", "programar"],
      answer: "Para configurar un lector de código de barras:",
      steps: [
        {
          text: "Busca el MANUAL del lector (usualmente viene con códigos de configuración)",
        },
        {
          text: "Verifica si el lector necesita leer códigos de ACTIVACIÓN (mira el manual)",
        },
        {
          text: "Configura el MODO USB (HID o Serial, según lo que necesites)",
        },
        {
          text: "Configura el sufijo ENTER si quieres que envíe Enter automáticamente después de leer",
        },
        {
          text: "Para lectores inalámbricos, EMPAREJA por Bluetooth siguiendo las instrucciones",
        },
        {
          text: "Prueba en un bloc de notas para verificar que funcione",
        },
        {
          text: "Si pierdes el manual, búscalo en Google: '[modelo del lector] configuration barcodes PDF'",
        },
      ],
    },
    {
      id: "cash-drawer-not-opening",
      question: "El cajón de dinero no abre, qué hago?",
      aliases: [
        "gaveta no abre",
        "caja no se abre",
        "cajón bloqueado",
        "no puedo abrir el cajón",
      ],
      keywords: ["cajón", "gaveta", "caja", "no abre", "bloqueado"],
      answer: "Si el cajón de dinero no abre:",
      steps: [
        {
          text: "Verifica que esté CONECTADO a la impresora (el cajón se conecta a la impresora, NO a la PC)",
        },
        {
          text: "La impresora debe estar ENCENDIDA para que el cajón funcione",
        },
        {
          text: "Verifica el CABLE RJ11/RJ12 que va de la impresora al cajón (es como un cable telefónico)",
        },
        {
          text: "Intenta ABRIR MANUALMENTE con la llave (si tienes la llave de emergencia)",
        },
        {
          text: "Verifica en la configuración del sistema que el comando de apertura esté habilitado",
        },
        {
          text: "Algunos cajones tienen un SWITCH de seguridad (revisa atrás o abajo del cajón)",
        },
        {
          text: "Si nada funciona, puede que el SOLENOIDE esté quemado (necesita reparación)",
        },
      ],
    },
    {
      id: "pos-terminal-error",
      question: "La terminal de pago da error, qué hago?",
      aliases: [
        "terminal no funciona",
        "POS error",
        "datafono error",
        "terminal banco error",
      ],
      keywords: ["terminal", "POS", "datafono", "pago", "error", "banco"],
      answer: "Si la terminal de pago (POS) da error:",
      steps: [
        {
          text: "Verifica que tenga CONEXIÓN A INTERNET (WiFi o cable Ethernet)",
        },
        {
          text: "Verifica que tenga PAPEL para el ticket",
        },
        {
          text: "Intenta REINICIAR la terminal (apaga y enciende)",
        },
        {
          text: "Verifica que la FECHA Y HORA estén correctas (muy importante)",
        },
        {
          text: "Si el error persiste, CONTACTA al banco emisor de la terminal",
        },
        {
          text: "Anota el CÓDIGO DE ERROR que muestra para reportarlo al banco",
        },
        {
          text: "Como alternativa temporal, acepta pagos en EFECTIVO mientras se soluciona",
        },
      ],
    },
    {
      id: "usb-device-not-detected",
      question: "No detecta mi dispositivo USB, qué hago?",
      aliases: [
        "USB no funciona",
        "no reconoce USB",
        "dispositivo USB no detectado",
      ],
      keywords: ["USB", "no detecta", "no reconoce", "dispositivo"],
      answer: "Si no detecta un dispositivo USB:",
      steps: [
        {
          text: "Intenta otro PUERTO USB de la computadora (a veces un puerto falla)",
        },
        {
          text: "Verifica el CABLE USB (prueba con otro cable si tienes)",
        },
        {
          text: "REINICIA la computadora con el dispositivo conectado",
        },
        {
          text: "Verifica en Administrador de Dispositivos si aparece con signo de exclamación",
        },
        {
          text: "Desinstala y vuelve a instalar los DRIVERS del dispositivo",
        },
        {
          text: "Prueba el dispositivo en OTRA COMPUTADORA para descartar que esté dañado",
        },
        {
          text: "Si es un HUB USB, intenta conectar directo a la PC sin el HUB",
        },
      ],
    },
    {
      id: "printer-offline",
      question: "La impresora aparece 'sin conexión' u 'offline', cómo lo soluciono?",
      aliases: [
        "impresora offline",
        "impresora sin conexión",
        "impresora desconectada",
      ],
      keywords: ["offline", "sin conexión", "desconectada", "impresora"],
      answer: "Si la impresora aparece offline:",
      steps: [
        {
          text: "Ve a Configuración → Impresoras y escáneres",
        },
        {
          text: "Haz clic derecho en la impresora → 'Usar impresora sin conexión' y DESMARCA esa opción",
        },
        {
          text: "Establécela como IMPRESORA PREDETERMINADA",
        },
        {
          text: "REINICIA el Spooler de impresión (Servicios → Print Spooler → Reiniciar)",
        },
        {
          text: "Verifica el CABLE USB o la conexión de RED",
        },
        {
          text: "Como último recurso, ELIMINA la impresora y vuélvela a agregar",
        },
      ],
    },
  ],
}
