import type { HelpSection } from "../types"

export const brandsSection: HelpSection = {
  id: "brands",
  label: "Marcas",
  description: "Gestiona el catálogo de marcas de productos con sus logotipos.",
  welcomeMessage:
    "Estás en Marcas. Administra las marcas de tus productos y sus logotipos.",
  quickActions: [
    "brands-create",
    "brands-logo",
    "brands-list",
  ],
  entries: [
    {
      id: "brands-create",
      question: "¿Cómo creo o edito una marca?",
      aliases: [
        "crear marca",
        "nueva marca",
        "agregar marca",
        "editar marca",
        "modificar marca",
      ],
      answer:
        "Para gestionar marcas de productos:\n\n**Crear una marca nueva:**\n1. Ve a Dashboard > Marcas\n2. Completa el campo 'Nombre de la marca'\n3. Opcionalmente, sube un logotipo (PNG, JPG o SVG)\n4. Haz clic en 'Crear Marca'\n\n**Editar una marca existente:**\n1. Localiza la marca en la tabla\n2. Haz clic en el nombre o botón de editar\n3. Modifica el nombre o actualiza el logotipo\n4. Guarda los cambios\n\n**Eliminar una marca:**\n• Haz clic en el botón de eliminar junto a la marca\n• Confirma la acción\n• **Nota:** No podrás eliminar marcas que tengan productos asociados\n\nLas marcas se usan para organizar y filtrar productos en el inventario y catálogo público.",
      keywords: ["crear", "marca", "nueva", "agregar", "editar", "modificar", "nombre", "brand"],
      steps: [
        { text: "Ve a Dashboard > Marcas", image: "/help/brands/step1-menu.png" },
        { text: "Ingresa el nombre de la marca", image: "/help/brands/step2-name.png" },
        { text: "Opcionalmente, sube un logotipo", image: "/help/brands/step3-logo.png" },
        { text: "Haz clic en 'Crear Marca'", image: "/help/brands/step4-create.png" },
        { text: "La marca aparece en la tabla", image: "/help/brands/step5-list.png" },
      ],
      relatedActions: ["brands-logo", "brands-list"],
      route: "/dashboard/brands",
      section: "brands",
    },
    {
      id: "brands-logo",
      question: "¿Cómo subo o cambio el logotipo de una marca?",
      aliases: [
        "logo de marca",
        "imagen marca",
        "logotipo marca",
        "subir logo",
        "cambiar logo marca",
      ],
      answer:
        "Puedes agregar logotipos a tus marcas para mostrarlos en el catálogo y productos:\n\n**Formatos soportados:**\n• **PNG** - Imágenes con transparencia (recomendado)\n• **JPG/JPEG** - Se convierte automáticamente a PNG\n• **SVG** - Gráficos vectoriales (calidad perfecta en cualquier tamaño)\n\n**Cómo subir un logo:**\n1. Al crear o editar una marca, haz clic en 'Seleccionar archivo'\n2. Elige la imagen desde tu dispositivo\n3. El sistema muestra una vista previa\n4. Guarda la marca\n\n**Conversión automática:**\n• Si subes un **JPG**, el sistema lo convierte a PNG automáticamente\n• Si subes un **PNG**, puedes opcionalmente convertirlo a **SVG** para mejor calidad\n• La conversión SVG funciona mejor con logos simples y de alto contraste\n\n**Tamaño recomendado:**\n• Ancho/alto: 200-500 px\n• Fondo transparente preferiblemente\n• Peso: menor a 1 MB\n\nLos logos se muestran en:\n• Fichas de producto\n• Catálogo público\n• Filtros de búsqueda por marca",
      keywords: ["logo", "logotipo", "imagen", "marca", "subir", "png", "jpg", "svg", "convertir"],
      steps: [
        { text: "Abre la marca que deseas editar", image: "/help/brands/step1-open-brand.png" },
        { text: "Haz clic en 'Seleccionar archivo' para el logo", image: "/help/brands/step2-select-file.png" },
        { text: "Elige PNG, JPG o SVG desde tu dispositivo", image: "/help/brands/step3-choose-image.png" },
        { text: "Verás una vista previa del logo", image: "/help/brands/step4-preview.png" },
        { text: "Si subiste PNG, puedes convertir a SVG (opcional)", image: "/help/brands/step5-convert-svg.png" },
        { text: "Guarda los cambios", image: "/help/brands/step6-save.png" },
      ],
      relatedActions: ["brands-create"],
      route: "/dashboard/brands",
      section: "brands",
    },
    {
      id: "brands-list",
      question: "¿Cómo veo y filtro la lista de marcas?",
      aliases: [
        "ver marcas",
        "lista de marcas",
        "todas las marcas",
        "buscar marca",
        "filtrar marcas",
      ],
      answer:
        "La lista de marcas muestra todas las marcas registradas en el sistema:\n\n**Información visible:**\n• **Nombre** - Nombre de la marca\n• **Logo** - Vista previa del logotipo (PNG o SVG)\n• **Fecha** - Cuándo se creó la marca\n• **Acciones** - Editar o eliminar\n\n**Búsqueda:**\nUsa el campo de búsqueda en la parte superior para encontrar marcas por nombre. La búsqueda es en tiempo real.\n\n**Ordenamiento:**\nHaz clic en los encabezados de columna para ordenar alfabéticamente o por fecha.\n\n**Uso en productos:**\nCuando creas o editas un producto, puedes asignarle una marca de esta lista. Los productos se pueden filtrar por marca en el inventario y en la tienda pública.\n\n**Marcas con productos:**\nLas marcas que tienen productos asociados no se pueden eliminar. Primero debes reasignar o eliminar los productos de esa marca.",
      keywords: ["ver", "lista", "marcas", "todas", "buscar", "filtrar", "ordenar", "tabla"],
      relatedActions: ["brands-create", "brands-logo"],
      route: "/dashboard/brands",
      section: "brands",
    },
  ],
}
