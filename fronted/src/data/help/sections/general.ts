import type { HelpSection } from "../types"

export const generalSection: HelpSection = {
  id: "general",
  label: "General",
  description: "Preguntas generales sobre el uso del sistema, navegacion y configuracion",
  welcomeMessage:
    "Bienvenido al panel de administracion. Puedo ayudarte con cualquier funcionalidad del sistema.",
  quickActions: [
    "general-login",
    "general-navigation",
    "general-dark-mode",
    "general-profile",
    "general-user-manual",
  ],
  entries: [
    {
      id: "general-login",
      question: "Como inicio sesion en el sistema?",
      aliases: [
        "como entrar",
        "no puedo iniciar sesion",
        "login",
        "acceder al sistema",
        "ingresar a la plataforma",
      ],
      answer:
        "Para iniciar sesion, ve a la pagina principal y haz clic en 'Iniciar sesion'. Ingresa tu correo electronico y contrasena registrados. Si olvidaste tu contrasena, utiliza el enlace 'Recuperar contrasena' que aparece debajo del formulario. Si tu cuenta esta bloqueada o no puedes acceder, contacta al administrador de tu empresa.",
      keywords: ["inicio", "sesion", "sistema", "iniciar", "pagina", "principal", "haz", "clic", "'iniciar", "sesion'", "ingresa", "correo", "electronico", "contrasena", "registrados"],
      steps: [
        { text: "Abre la pagina de inicio de sesion del sistema", image: "/help/general/step1-pagina-login.png" },
        { text: "Ingresa tu correo electronico en el campo correspondiente", image: "/help/general/step2-email.png" },
        { text: "Ingresa tu contrasena", image: "/help/general/step3-password.png" },
        { text: "Haz clic en 'Iniciar Sesion' para acceder al sistema", image: "/help/general/step4-iniciar-sesion.png" },
      ],
      route: "/login",
    },
    {
      id: "general-navigation",
      question: "Como navego por el panel de administracion?",
      aliases: [
        "como moverme por el sistema",
        "donde encuentro las opciones",
        "menu principal",
        "navegacion",
      ],
      answer:
        "El panel de administracion tiene una barra lateral izquierda (sidebar) con todas las secciones principales: Inventario, Productos, Ventas, Ingresos, Categorias, Proveedores, Usuarios y mas. Haz clic en cualquier seccion para acceder a ella. En la parte superior encontraras tu perfil y notificaciones. Puedes colapsar la barra lateral para tener mas espacio de trabajo.",
      keywords: ["navego", "panel", "administracion", "tiene", "barra", "lateral", "izquierda", "sidebar", "todas", "secciones", "principales", "inventario", "productos", "ventas", "ingresos"],
      route: "/dashboard",
    },
    {
      id: "general-dark-mode",
      question: "Como activo el modo oscuro?",
      aliases: [
        "tema oscuro",
        "dark mode",
        "cambiar tema",
        "modo nocturno",
      ],
      answer:
        "Para activar el modo oscuro, haz clic en tu avatar de perfil en la esquina superior derecha de la barra lateral. Veras una opcion para cambiar entre el tema claro y oscuro. La preferencia se guarda automaticamente y se mantendra la proxima vez que inicies sesion.",
      keywords: ["activo", "modo", "oscuro", "activar", "haz", "clic", "avatar", "perfil", "esquina", "superior", "derecha", "barra", "lateral", "veras", "opcion"],
    },
    {
      id: "general-profile",
      question: "Como edito mi perfil de usuario?",
      aliases: [
        "cambiar datos personales",
        "actualizar perfil",
        "editar mi cuenta",
        "cambiar nombre",
      ],
      answer:
        "Accede a tu perfil haciendo clic en tu nombre o avatar en la barra lateral inferior. Desde alli puedes actualizar tu nombre, correo electronico, telefono y foto de perfil. Tambien puedes cambiar tu contrasena desde la seccion de seguridad dentro de tu cuenta.",
      keywords: ["edito", "perfil", "usuario", "accede", "haciendo", "clic", "nombre", "avatar", "barra", "lateral", "inferior", "desde", "alli", "puedes", "actualizar"],
      route: "/dashboard/account",
    },
    {
      id: "general-onboarding",
      question: "Como completo la configuracion inicial?",
      aliases: [
        "configuracion inicial",
        "onboarding",
        "primeros pasos",
        "empezar a usar el sistema",
        "tutorial inicial",
      ],
      answer:
        "Al ingresar por primera vez, el sistema te mostrara un asistente de configuracion inicial (onboarding). Este te guiara para crear tu primera tienda, configurar datos basicos de la empresa y agregar tus primeros productos. Si necesitas repetir este proceso, puedes acceder desde la seccion de Opciones en tu perfil.",
      keywords: ["completo", "configuracion", "inicial", "ingresar", "primera", "vez", "sistema", "mostrara", "asistente", "onboarding", "guiara", "crear", "tienda", "configurar", "datos"],
      route: "/dashboard/onboarding",
    },
    {
      id: "general-sidebar",
      question: "Como uso la barra lateral?",
      aliases: [
        "sidebar",
        "menu lateral",
        "panel lateral",
        "barra de navegacion",
      ],
      answer:
        "La barra lateral es tu menu principal de navegacion. Contiene accesos directos a todas las secciones del sistema agrupadas por categoria. Puedes expandir o colapsar los submenus haciendo clic en las flechas. En dispositivos moviles, la barra se oculta automaticamente y puedes abrirla con el icono de menu hamburguesa en la esquina superior izquierda.",
      keywords: ["uso", "barra", "lateral", "menu", "principal", "navegacion", "contiene", "accesos", "directos", "todas", "secciones", "sistema", "agrupadas", "categoria", "puedes"],
    },
    {
      id: "general-shortcuts",
      question: "Existen atajos de teclado en el sistema?",
      aliases: [
        "atajos",
        "teclas rapidas",
        "shortcuts",
        "combinaciones de teclas",
      ],
      answer:
        "Si, el sistema cuenta con atajos de teclado para las acciones mas comunes. Por ejemplo, puedes usar la tecla '/' para enfocar el buscador rapidamente. Dentro de formularios, puedes usar Tab para moverte entre campos y Enter para confirmar. Estos atajos te ayudan a trabajar mas rapido una vez que te familiarices con el sistema.",
      keywords: ["existen", "atajos", "teclado", "sistema", "cuenta", "acciones", "mas", "comunes", "ejemplo", "puedes", "usar", "tecla", "'/'", "enfocar", "buscador"],
    },
    {
      id: "general-notifications",
      question: "Como funcionan las notificaciones?",
      aliases: [
        "alertas",
        "avisos del sistema",
        "notificaciones",
        "campana de notificaciones",
      ],
      answer:
        "Las notificaciones aparecen en la esquina superior derecha mediante el icono de campana. Recibiras avisos sobre stock bajo, nuevos pedidos, mensajes de clientes y cambios importantes en el sistema. Puedes marcar las notificaciones como leidas individualmente o todas a la vez. Las notificaciones criticas se mostraran como alertas emergentes.",
      keywords: ["funcionan", "notificaciones", "aparecen", "esquina", "superior", "derecha", "mediante", "icono", "campana", "recibiras", "avisos", "sobre", "stock", "bajo", "nuevos"],
    },
    {
      id: "general-roles",
      question: "Que roles de usuario existen?",
      aliases: [
        "permisos",
        "tipos de usuario",
        "roles y permisos",
        "nivel de acceso",
        "administrador vs empleado",
      ],
      answer:
        "El sistema maneja varios roles: Administrador tiene acceso completo a todas las funciones, incluyendo configuracion de empresa y gestion de usuarios. Empleado tiene acceso a operaciones diarias como ventas, inventario y productos, pero no puede modificar configuraciones de empresa ni gestionar otros usuarios. El Super Admin gestiona multiples empresas en la plataforma.",
      keywords: ["roles", "usuario", "existen", "sistema", "maneja", "varios", "administrador", "tiene", "acceso", "completo", "todas", "funciones", "incluyendo", "configuracion", "empresa"],
      roles: ["admin"],
    },
    {
      id: "general-help",
      question: "Como obtengo ayuda dentro del sistema?",
      aliases: [
        "soporte",
        "asistencia",
        "necesito ayuda",
        "contactar soporte",
        "donde pido ayuda",
      ],
      answer:
        "Puedes obtener ayuda de varias formas: usa este asistente de ayuda para resolver dudas rapidas escribiendo tu pregunta. Tambien puedes contactar al soporte tecnico a traves de la seccion de Mensajes. Si tienes una pregunta sobre una pantalla especifica, el asistente detectara automaticamente en que seccion estas y te ofrecera ayuda contextual.",
      keywords: ["obtengo", "ayuda", "dentro", "sistema", "puedes", "obtener", "varias", "formas", "usa", "asistente", "resolver", "dudas", "rapidas", "escribiendo", "pregunta"],
    },
    {
      id: "general-language",
      question: "Puedo cambiar el idioma del sistema?",
      aliases: [
        "idioma",
        "cambiar idioma",
        "lenguaje",
        "sistema en ingles",
      ],
      answer:
        "Actualmente el sistema esta disponible en espanol. La interfaz completa, incluyendo menus, formularios y mensajes de ayuda, esta disenada en espanol para facilitar su uso. Si necesitas soporte en otro idioma, puedes solicitarlo a traves del equipo de soporte tecnico.",
      keywords: ["puedo", "cambiar", "idioma", "sistema", "actualmente", "disponible", "espanol", "interfaz", "completa", "incluyendo", "menus", "formularios", "mensajes", "ayuda", "disenada"],
    },
    {
      id: "general-logout",
      question: "Como cierro sesion?",
      aliases: [
        "salir del sistema",
        "cerrar sesion",
        "logout",
        "desconectarme",
      ],
      answer:
        "Para cerrar sesion, haz clic en tu nombre de usuario en la parte inferior de la barra lateral y selecciona 'Cerrar sesion'. Tu sesion se cerrara de forma segura y seras redirigido a la pagina de inicio de sesion. Por seguridad, la sesion tambien se cierra automaticamente tras un periodo prolongado de inactividad.",
      keywords: ["cierro", "sesion", "cerrar", "haz", "clic", "nombre", "usuario", "parte", "inferior", "barra", "lateral", "selecciona", "'cerrar", "sesion'", "cerrara"],
    },
    {
      id: "general-user-manual",
      question: "Donde puedo descargar el manual de usuario completo?",
      aliases: [
        "manual del sistema",
        "manual de usuario",
        "descargar manual",
        "manual en pdf",
        "documentacion completa",
        "guia completa",
        "manual completo",
        "quiero el manual",
        "dame el manual",
        "donde esta el manual",
        "muestrame la documentacion",
        "ayuda completa",
        "necesito el manual",
        "libro del sistema",
        "guia del usuario",
      ],
      answer:
        "Puedes descargar el **Manual de Usuario Completo** en formato PDF. Este manual incluye:\n\n✅ Toda la funcionalidad del sistema explicada paso a paso\n✅ Screenshots de cada proceso\n✅ Más de 220 páginas de documentación\n✅ Índice navegable por secciones\n\n**[📥 Descargar Manual de Usuario](/api/manual)**\n\nEl manual se genera en tiempo real y siempre está actualizado con la última versión del sistema.",
      keywords: [
        "manual",
        "documentacion",
        "pdf",
        "descargar",
        "guia",
        "completa",
        "usuario",
        "ayuda",
        "libro",
        "sistema"
      ],
      route: "/api/manual",
      relatedActions: ["general-navigation", "general-help"],
    },
  ],
}
