import type { HelpSection } from "../types"

export const settingsSection: HelpSection = {
  id: "settings",
  label: "Configuración del Sistema",
  description: "Configuración general de la empresa, personalización y opciones avanzadas",
  welcomeMessage:
    "Aquí puedes configurar todos los aspectos de tu sistema, desde información de la empresa hasta personalización visual.",
  quickActions: [
    "settings-company",
    "settings-logo",
    "settings-theme",
    "settings-backup",
  ],
  entries: [
    {
      id: "settings-company",
      question: "¿Cómo configuro la información de mi empresa?",
      aliases: [
        "datos de la empresa",
        "información de negocio",
        "configurar empresa",
        "nombre de empresa",
        "datos fiscales",
      ],
      answer:
        "Ve a Dashboard > Opciones y en la sección 'Información de Empresa' podrás configurar el nombre de tu empresa, RUC/NIT, dirección, teléfono, email y otros datos importantes. Esta información aparecerá en facturas, cotizaciones y documentos del sistema. Asegúrate de ingresar datos correctos ya que son utilizados en documentos tributarios.",
      keywords: ["empresa", "información", "negocio", "datos", "fiscales", "ruc", "nit", "dirección", "teléfono", "email", "facturas", "documentos"],
      steps: [
        { text: "Ve a Dashboard > Opciones en el menú lateral", image: "/help/settings/step1-opciones.png" },
        { text: "Busca la sección 'Información de Empresa'", image: "/help/settings/step2-info-empresa.png" },
        { text: "Completa los campos requeridos (nombre, RUC, dirección)", image: "/help/settings/step3-completar-datos.png" },
        { text: "Haz clic en 'Guardar Cambios' para aplicar la configuración", image: "/help/settings/step4-guardar.png" },
      ],
      route: "/dashboard/options",
      section: "settings",
    },
    {
      id: "settings-logo",
      question: "¿Cómo cambio el logo de mi empresa?",
      aliases: [
        "subir logo",
        "cambiar imagen",
        "personalizar logo",
        "logo empresa",
        "branding",
      ],
      answer:
        "En Dashboard > Opciones, en la sección 'Marca y Branding' encontrarás la opción para subir el logo de tu empresa. Puedes cargar archivos PNG, JPG o SVG. El logo aparecerá en la barra lateral, facturas, cotizaciones y catálogos. Se recomienda usar imágenes con fondo transparente (PNG) de al menos 200x200px para mejor calidad.",
      keywords: ["logo", "imagen", "branding", "marca", "personalizar", "png", "svg", "jpg", "subir", "cargar"],
      steps: [
        { text: "Ve a Dashboard > Opciones", image: "/help/settings/step1-opciones.png" },
        { text: "Encuentra la sección 'Marca y Branding'", image: "/help/settings/step2-branding.png" },
        { text: "Haz clic en 'Subir Logo' y selecciona tu archivo", image: "/help/settings/step3-upload-logo.png" },
        { text: "Ajusta el tamaño si es necesario y guarda", image: "/help/settings/step4-ajustar-logo.png" },
      ],
      route: "/dashboard/options",
      section: "settings",
    },
    {
      id: "settings-theme",
      question: "¿Cómo cambio el tema del sistema (claro/oscuro)?",
      aliases: [
        "modo oscuro",
        "dark mode",
        "tema claro",
        "cambiar colores",
        "apariencia",
      ],
      answer:
        "Puedes cambiar el tema del sistema en Dashboard > Opciones, sección 'Tema y Apariencia'. Aquí puedes elegir entre modo claro, oscuro o automático (sigue la preferencia del sistema operativo). También puedes personalizar los colores principales de la interfaz seleccionando un color primario y secundario. Los cambios se aplican inmediatamente a toda la interfaz.",
      keywords: ["tema", "apariencia", "modo", "oscuro", "claro", "dark", "light", "colores", "personalizar", "automático"],
      route: "/dashboard/options",
      section: "settings",
    },
    {
      id: "settings-layout",
      question: "¿Puedo personalizar el diseño de la interfaz?",
      aliases: [
        "layout",
        "disposición",
        "organizar pantalla",
        "personalizar vista",
        "cambiar diseño",
      ],
      answer:
        "Sí, en Dashboard > Opciones > Layout y Navegación puedes personalizar varios aspectos: mostrar u ocultar la barra lateral por defecto, cambiar el ancho del contenido principal, activar/desactivar breadcrumbs (ruta de navegación), y configurar qué secciones aparecen en el menú principal. Esto te permite adaptar el sistema a tu flujo de trabajo preferido.",
      keywords: ["layout", "diseño", "interfaz", "personalizar", "barra", "lateral", "navegación", "breadcrumbs", "menú", "vista"],
      route: "/dashboard/options",
      section: "settings",
    },
    {
      id: "settings-backup",
      question: "¿Cómo hago un respaldo de mi información?",
      aliases: [
        "backup",
        "copia de seguridad",
        "respaldar datos",
        "exportar información",
        "guardar respaldo",
      ],
      answer:
        "En Dashboard > Opciones > Base de Datos encontrarás la opción de 'Respaldos'. Haz clic en 'Crear Respaldo' para generar una copia de seguridad completa de tus datos (productos, ventas, clientes, etc.). El respaldo se descargará como archivo ZIP. Puedes programar respaldos automáticos diarios, semanales o mensuales. Se recomienda hacer respaldos antes de actualizaciones importantes.",
      keywords: ["backup", "respaldo", "copia", "seguridad", "exportar", "datos", "zip", "automático", "programar"],
      steps: [
        { text: "Ve a Dashboard > Opciones > Base de Datos", image: "/help/settings/step1-database.png" },
        { text: "Busca la sección 'Respaldos'", image: "/help/settings/step2-backup.png" },
        { text: "Haz clic en 'Crear Respaldo'", image: "/help/settings/step3-crear-backup.png" },
        { text: "Espera a que se genere y se descargue automáticamente", image: "/help/settings/step4-download-backup.png" },
      ],
      route: "/dashboard/options",
      section: "settings",
    },
    {
      id: "settings-restore",
      question: "¿Cómo restauro un respaldo?",
      aliases: [
        "restaurar backup",
        "recuperar datos",
        "importar respaldo",
        "restore",
      ],
      answer:
        "IMPORTANTE: Restaurar un respaldo reemplazará TODOS tus datos actuales. Ve a Dashboard > Opciones > Base de Datos > Respaldos. Haz clic en 'Restaurar Respaldo' y selecciona el archivo ZIP que descargaste previamente. El sistema te pedirá confirmación ya que esta acción no se puede deshacer. Se recomienda hacer un respaldo actual antes de restaurar uno antiguo.",
      keywords: ["restaurar", "restore", "recuperar", "importar", "backup", "respaldo", "zip", "datos"],
      route: "/dashboard/options",
      section: "settings",
    },
    {
      id: "settings-database-clean",
      question: "¿Cómo limpio datos antiguos de la base de datos?",
      aliases: [
        "limpiar base de datos",
        "eliminar datos viejos",
        "purgar información",
        "mantenimiento base datos",
      ],
      answer:
        "En Dashboard > Opciones > Base de Datos encontrarás opciones de mantenimiento. Puedes purgar datos antiguos como: logs del sistema mayores a 90 días, sesiones expiradas, notificaciones leídas antiguas, y archivos temporales. CUIDADO: Esta acción no se puede deshacer. Se recomienda hacer un respaldo antes de ejecutar limpieza de datos.",
      keywords: ["limpiar", "purgar", "base", "datos", "mantenimiento", "logs", "sesiones", "antiguos", "temporales"],
      route: "/dashboard/options",
      section: "settings",
    },
    {
      id: "settings-modules",
      question: "¿Puedo activar o desactivar módulos del sistema?",
      aliases: [
        "módulos",
        "funcionalidades",
        "activar módulos",
        "desactivar funciones",
      ],
      answer:
        "Sí, en Dashboard > Opciones > Módulos y Funcionalidades puedes activar o desactivar módulos según tu tipo de negocio. Por ejemplo, puedes desactivar el módulo de restaurantes si no lo necesitas, o activar el módulo de multi-tenancy para gestionar varias empresas. Esto simplifica la interfaz mostrando solo lo que usas.",
      keywords: ["módulos", "funcionalidades", "activar", "desactivar", "funciones", "características"],
      route: "/dashboard/options",
      section: "settings",
    },
    {
      id: "settings-notifications",
      question: "¿Cómo configuro las notificaciones del sistema?",
      aliases: [
        "alertas",
        "avisos",
        "configurar notificaciones",
        "emails automáticos",
      ],
      answer:
        "En Dashboard > Opciones > Notificaciones puedes configurar qué alertas quieres recibir: stock bajo, nuevos pedidos, ventas importantes, errores del sistema, etc. Puedes elegir recibirlas en la interfaz, por email, o ambas. También puedes configurar el umbral de stock bajo que dispara notificaciones (ej: avisar cuando quedan menos de 10 unidades).",
      keywords: ["notificaciones", "alertas", "avisos", "email", "stock", "bajo", "pedidos", "configurar"],
      route: "/dashboard/options",
      section: "settings",
    },
    {
      id: "settings-invoice",
      question: "¿Cómo configuro la facturación electrónica?",
      aliases: [
        "factura electrónica",
        "SUNAT",
        "comprobantes electrónicos",
        "certificado digital",
      ],
      answer:
        "En Dashboard > Opciones > Facturación Electrónica puedes configurar la integración con SUNAT (Perú) u otras entidades tributarias. Necesitarás: RUC de la empresa, certificado digital, usuario SOL, y clave SOL. Sigue el asistente de configuración que te guiará paso a paso. Una vez configurado, podrás emitir facturas, boletas y notas de crédito electrónicas directamente desde el sistema.",
      keywords: ["facturación", "electrónica", "sunat", "certificado", "digital", "ruc", "sol", "comprobantes"],
      route: "/dashboard/options",
      section: "settings",
    },
    {
      id: "settings-printer",
      question: "¿Cómo configuro las impresoras?",
      aliases: [
        "configurar impresora",
        "impresora térmica",
        "tickets",
        "imprimir facturas",
      ],
      answer:
        "En Dashboard > Opciones > Impresoras puedes configurar impresoras para tickets (térmicas de 58mm o 80mm) y para documentos A4. Selecciona el tipo de impresora, el tamaño de papel, y si quieres que se abra automáticamente el diálogo de impresión al generar una venta. Para impresoras térmicas de tickets, puedes personalizar qué información se imprime (logo, datos fiscales, mensaje de agradecimiento).",
      keywords: ["impresora", "térmica", "tickets", "imprimir", "a4", "papel", "configurar", "58mm", "80mm"],
      route: "/dashboard/options",
      section: "settings",
    },
    {
      id: "settings-currency",
      question: "¿Puedo cambiar la moneda del sistema?",
      aliases: [
        "moneda",
        "divisa",
        "soles",
        "dólares",
        "cambiar moneda",
      ],
      answer:
        "Sí, en Dashboard > Opciones > Moneda y Regionalización puedes seleccionar la moneda principal de tu sistema (PEN, USD, EUR, etc.). También puedes habilitar la conversión automática de moneda para ventas en múltiples divisas. El sistema mostrará precios con el símbolo correcto (S/, $, €) y aplicará el formato regional adecuado para números y fechas.",
      keywords: ["moneda", "divisa", "pen", "usd", "eur", "soles", "dólares", "conversión", "cambio"],
      route: "/dashboard/options",
      section: "settings",
    },
    {
      id: "settings-tax",
      question: "¿Cómo configuro los impuestos?",
      aliases: [
        "IGV",
        "IVA",
        "impuestos",
        "porcentaje impuesto",
        "tax",
      ],
      answer:
        "En Dashboard > Opciones > Impuestos puedes configurar el porcentaje de IGV/IVA aplicable (18% en Perú, 16% en México, etc.). Puedes elegir si los precios que ingresas incluyen o no el impuesto. También puedes configurar productos exonerados o inafectos que no llevan impuesto. Esta configuración afecta cómo se calculan y muestran los precios en todo el sistema.",
      keywords: ["impuestos", "igv", "iva", "tax", "porcentaje", "18%", "precio", "exonerado", "inafecto"],
      route: "/dashboard/options",
      section: "settings",
    },
    {
      id: "settings-reset",
      question: "¿Cómo restauro la configuración a valores por defecto?",
      aliases: [
        "resetear configuración",
        "valores predeterminados",
        "configuración de fábrica",
        "reset settings",
      ],
      answer:
        "ADVERTENCIA: Esto revertirá TODA la configuración del sistema a valores por defecto, pero NO eliminará tus datos (productos, ventas, clientes). En Dashboard > Opciones, al final de la página encontrarás el botón 'Restaurar Configuración Predeterminada'. Se te pedirá confirmación. Esto puede ser útil si experimentaste problemas después de cambiar configuraciones avanzadas.",
      keywords: ["reset", "restaurar", "predeterminado", "fábrica", "defecto", "revertir", "configuración"],
      route: "/dashboard/options",
      section: "settings",
    },
  ],
}
