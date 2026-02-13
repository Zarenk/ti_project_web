import type { HelpSection } from "../types"

export const historySection: HelpSection = {
  id: "history",
  label: "Historial",
  description: "Consulta y analiza la actividad de usuarios y cambios en el sistema.",
  welcomeMessage:
    "Estás en Historial. Aquí puedes consultar toda la actividad de usuarios, filtrar por acciones y analizar tendencias.",
  quickActions: [
    "history-filters",
    "history-charts",
    "history-user-search",
    "history-severity",
  ],
  entries: [
    {
      id: "history-filters",
      question: "¿Cómo filtro el historial de actividad?",
      aliases: [
        "filtrar historial",
        "filtros de actividad",
        "buscar en historial",
        "filtrar por acción",
        "filtrar por módulo",
      ],
      answer:
        "El historial ofrece **filtros avanzados** para encontrar exactamente lo que buscas:\n\n**🔍 Filtros disponibles:**\n\n1. **Usuario** - Busca actividad de un usuario específico (admins pueden ver todos)\n2. **Acción** - Filtra por tipo de operación:\n   • Creación - Nuevos registros\n   • Edición - Modificaciones\n   • Eliminación - Registros borrados\n   • Login/Logout - Sesiones de usuario\n   • Otro - Operaciones especiales\n\n3. **Módulo** - Filtra por área del sistema:\n   • Producto, Proveedor, Tienda, Categoría, Marca\n   • Inventario, Venta, Pedido, Usuario\n   • Chat, Tipo de cambio, Organización, etc.\n\n4. **Severidad** - Filtra por nivel de impacto:\n   • **Alta** (🔴) - Eliminaciones (operaciones críticas)\n   • **Media** (🟡) - Creaciones y ediciones\n   • **Baja** (🟢) - Login, logout y otras operaciones\n\n5. **Contexto** - Checkbox para excluir actualizaciones automáticas de contexto\n\n**💡 Cómo usar los filtros:**\n1. Selecciona los criterios que deseas en los selectores\n2. Los resultados se actualizan automáticamente\n3. Puedes combinar múltiples filtros para búsquedas específicas\n4. Haz clic en **Reset** para limpiar todos los filtros\n\n**📌 Persistencia:**\nLos filtros se guardan en la URL, así puedes compartir enlaces con filtros aplicados o recargar la página sin perderlos.",
      keywords: [
        "filtrar",
        "filtros",
        "buscar",
        "acción",
        "módulo",
        "severidad",
        "contexto",
        "reset",
        "limpiar",
      ],
      steps: [
        {
          text: "Ubica los filtros en la parte superior del panel 'Resumen del usuario'",
          image: "/help/history/step1-locate-filters.png",
        },
        {
          text: "Selecciona la acción que deseas filtrar (Creación, Edición, Eliminación, etc.)",
          image: "/help/history/step2-select-action.png",
        },
        {
          text: "Elige el módulo específico (Producto, Venta, Usuario, etc.)",
          image: "/help/history/step3-select-module.png",
        },
        {
          text: "Ajusta la severidad según el nivel de impacto que buscas",
          image: "/help/history/step4-select-severity.png",
        },
        {
          text: "Activa/desactiva 'Excluir actualizaciones' para filtrar eventos de contexto",
          image: "/help/history/step5-exclude-context.png",
        },
        {
          text: "Los resultados se actualizan en la tabla de actividad automáticamente",
          image: "/help/history/step6-results.png",
        },
        {
          text: "Haz clic en 'Reset' para limpiar todos los filtros",
          image: "/help/history/step7-reset.png",
        },
      ],
      relatedActions: ["history-severity", "history-user-search"],
      route: "/dashboard/history",
      section: "history",
    },
    {
      id: "history-charts",
      question: "¿Cómo interpreto los gráficos de actividad?",
      aliases: [
        "gráficos de historial",
        "tendencias de actividad",
        "heatmap de actividad",
        "análisis de actividad",
        "visualización historial",
      ],
      answer:
        "El historial muestra **visualizaciones interactivas** que te ayudan a entender patrones de uso:\n\n**📊 Gráficos disponibles:**\n\n**1. Gráfico de Actividad Diaria (Línea temporal)**\n• Muestra el total de movimientos por día en los últimos 30 días\n• Eje X: Fechas\n• Eje Y: Cantidad de movimientos\n• Identifica días de alta/baja actividad\n• Útil para detectar anomalías o picos de uso\n\n**2. Gráfico de Acciones (Pie/Donut)**\n• Distribución porcentual de acciones realizadas:\n   - Creación (verde)\n   - Edición (azul)\n   - Eliminación (rojo)\n   - Login/Logout (gris)\n• Haz hover sobre cada segmento para ver el número exacto\n\n**3. Gráfico de Entidades (Barras)**\n• Módulos más afectados ordenados por cantidad de movimientos\n• Identifica qué áreas del sistema se usan más\n• Ejemplo: Si 'Producto' tiene 500 movimientos, es el módulo más activo\n\n**4. Heatmap de Actividad (Matriz de calor)**\n• **Eje horizontal**: Horas del día (0-23)\n• **Eje vertical**: Días de la semana (Lun-Dom)\n• **Color**: Intensidad de actividad (más oscuro = más actividad)\n• **Uso**: Identifica patrones de uso por horario y día\n• Ejemplo: Si los martes entre 9-11am está muy oscuro, es el período más activo\n\n**💡 Tips de análisis:**\n• Si el heatmap muestra actividad a las 3am, puede ser un script automatizado o actividad sospechosa\n• Picos inusuales en el gráfico diario pueden indicar importaciones masivas o problemas\n• Si el gráfico de acciones muestra muchas eliminaciones, puede requerir revisión",
      keywords: [
        "gráficos",
        "charts",
        "visualización",
        "tendencias",
        "heatmap",
        "matriz",
        "diario",
        "temporal",
        "análisis",
        "patrones",
      ],
      steps: [
        {
          text: "Desplázate hasta la sección 'Tendencias del usuario'",
          image: "/help/history/step1-trends-section.png",
        },
        {
          text: "Observa el gráfico de línea: muestra actividad día a día",
          image: "/help/history/step2-daily-chart.png",
        },
        {
          text: "Revisa el gráfico circular de acciones: distribución de operaciones",
          image: "/help/history/step3-actions-pie.png",
        },
        {
          text: "Analiza el gráfico de barras de entidades: módulos más usados",
          image: "/help/history/step4-entities-bars.png",
        },
        {
          text: "Explora el heatmap: identifica patrones por día/hora",
          image: "/help/history/step5-heatmap.png",
        },
        {
          text: "Pasa el mouse sobre cualquier punto para ver detalles exactos",
          image: "/help/history/step6-hover-details.png",
        },
      ],
      relatedActions: ["history-filters", "history-severity"],
      route: "/dashboard/history",
      section: "history",
    },
    {
      id: "history-user-search",
      question: "¿Cómo veo la actividad de otro usuario? (Admins)",
      aliases: [
        "buscar usuario historial",
        "actividad de otro usuario",
        "cambiar usuario historial",
        "ver actividad de empleado",
        "historial por usuario",
      ],
      answer:
        "Los **administradores** pueden consultar la actividad de cualquier usuario del sistema:\n\n**👤 Búsqueda de usuarios:**\n\n1. Localiza el campo **'Usuario'** en los filtros (superior izquierda)\n2. Haz clic y comienza a escribir:\n   • Busca por email del usuario (ej: `juan@empresa.com`)\n   • Busca por ID del usuario\n   • La búsqueda es en tiempo real (aparecen sugerencias mientras escribes)\n\n3. Selecciona de las opciones:\n   • **Todos los usuarios** - Vista organizacional (todos los movimientos)\n   • **Usuario específico** - Ver actividad de un solo usuario\n\n4. El sistema muestra:\n   • Nombre/email del usuario seleccionado\n   • Rol del usuario (Admin, Empleado, Cliente, etc.)\n   • Sus estadísticas y actividad personalizada\n\n**🔐 Restricciones por rol:**\n\n• **Empleados normales**: Solo ven su propia actividad\n• **Admins de organización**: Pueden ver todos los usuarios de su organización\n• **Super Admin Global**: Acceso completo a todos los usuarios y organizaciones\n\n**📊 Vista 'Todos los usuarios':**\nCuando seleccionas 'Todos los usuarios':\n• Ves resumen agregado de toda la organización\n• Los gráficos muestran tendencias globales\n• Aparece la sección 'Top usuarios' mostrando los más activos\n• Útil para análisis de equipo y auditorías\n\n**💡 Caso de uso:**\nSi sospechas que un empleado eliminó productos por error:\n1. Busca al usuario por email\n2. Filtra por Acción = 'Eliminación'\n3. Filtra por Módulo = 'Producto'\n4. Revisa la tabla de actividad para ver qué eliminó y cuándo",
      keywords: [
        "buscar",
        "usuario",
        "otro",
        "empleado",
        "admin",
        "todos",
        "organización",
        "cambiar",
        "seleccionar",
        "email",
      ],
      steps: [
        {
          text: "Haz clic en el campo de búsqueda 'Usuario'",
          image: "/help/history/step1-user-search.png",
        },
        {
          text: "Escribe el email o nombre del usuario que buscas",
          image: "/help/history/step2-type-search.png",
        },
        {
          text: "Selecciona el usuario de los resultados (muestra email y rol)",
          image: "/help/history/step3-select-user.png",
        },
        {
          text: "O selecciona 'Todos los usuarios' para vista organizacional",
          image: "/help/history/step4-all-users.png",
        },
        {
          text: "El sistema carga la actividad del usuario seleccionado",
          image: "/help/history/step5-user-activity.png",
        },
        {
          text: "Observa las tarjetas de rol y nombre en la parte superior",
          image: "/help/history/step6-user-badge.png",
        },
      ],
      relatedActions: ["history-filters", "history-severity"],
      route: "/dashboard/history",
      section: "history",
    },
    {
      id: "history-severity",
      question: "¿Qué significan los niveles de severidad?",
      aliases: [
        "severidad alta media baja",
        "niveles de impacto",
        "qué es severidad alta",
        "clasificación de acciones",
        "importancia de movimientos",
      ],
      answer:
        "El sistema clasifica cada movimiento según su **nivel de impacto** en tres severidades:\n\n**🔴 Severidad ALTA (Crítica)**\n• **Acción**: Eliminaciones (DELETED)\n• **Impacto**: Operaciones irreversibles que borran datos permanentemente\n• **Ejemplos**:\n   - Eliminar un producto del inventario\n   - Borrar un proveedor del sistema\n   - Eliminar una categoría o marca\n• **Por qué es crítico**: No se puede deshacer, datos se pierden\n• **Recomendación**: Revisar periódicamente las eliminaciones para detectar errores\n\n**🟡 Severidad MEDIA (Moderada)**\n• **Acciones**: Creaciones (CREATED) y Ediciones (UPDATED)\n• **Impacto**: Operaciones reversibles que modifican datos\n• **Ejemplos**:\n   - Crear un nuevo producto\n   - Actualizar precio de un artículo\n   - Modificar datos de un proveedor\n• **Por qué es moderada**: Se puede corregir editando nuevamente\n• **Recomendación**: Monitorear cambios masivos de precios o datos sensibles\n\n**🟢 Severidad BAJA (Informativa)**\n• **Acciones**: Login, Logout, y Otras operaciones de lectura\n• **Impacto**: Operaciones que no modifican datos\n• **Ejemplos**:\n   - Usuario inició sesión\n   - Consulta de reportes\n   - Navegación por el sistema\n• **Por qué es baja**: No afecta la integridad de datos\n• **Recomendación**: Útil para auditorías de seguridad (detectar accesos no autorizados)\n\n**🎯 Cómo usar el filtro de severidad:**\n\n1. **Auditoría de seguridad**: Filtra por severidad ALTA para revisar todas las eliminaciones\n2. **Monitoreo de cambios**: Usa severidad MEDIA para ver qué se creó o editó recientemente\n3. **Análisis de acceso**: Filtra por BAJA para ver patrones de login y detectar accesos sospechosos\n\n**📊 En los gráficos:**\nEl gráfico de severidad muestra la distribución porcentual de operaciones por nivel de impacto. Si ves mucha actividad de severidad ALTA, puede indicar limpieza masiva o problemas.",
      keywords: [
        "severidad",
        "alta",
        "media",
        "baja",
        "crítica",
        "impacto",
        "eliminación",
        "creación",
        "edición",
        "clasificación",
      ],
      steps: [
        {
          text: "Ubica el selector de 'Severidad' en los filtros",
          image: "/help/history/step1-severity-selector.png",
        },
        {
          text: "Haz clic y verás las 3 opciones: Alta, Media, Baja",
          image: "/help/history/step2-severity-options.png",
        },
        {
          text: "Selecciona 'Alta' para ver solo eliminaciones críticas",
          image: "/help/history/step3-select-high.png",
        },
        {
          text: "La tabla se filtra mostrando solo operaciones de alto impacto",
          image: "/help/history/step4-high-results.png",
        },
        {
          text: "Observa el gráfico de severidad en la sección de tendencias",
          image: "/help/history/step5-severity-chart.png",
        },
      ],
      relatedActions: ["history-filters", "history-charts"],
      route: "/dashboard/history",
      section: "history",
    },
  ],
}
