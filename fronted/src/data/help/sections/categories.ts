import type { HelpSection } from "../types"

export const categoriesSection: HelpSection = {
  id: "categories",
  label: "Categorias",
  description: "Creacion, edicion y gestion de categorias para organizar productos",
  welcomeMessage:
    "Estas en Categorias. Organiza tus productos en categorias para una mejor gestion.",
  quickActions: [
    "categories-create",
    "categories-edit",
    "categories-assign",
    "categories-filter",
  ],
  entries: [
    {
      id: "categories-create",
      question: "Como creo una nueva categoria?",
      aliases: [
        "agregar categoria",
        "nueva categoria",
        "registrar categoria",
        "crear clasificacion",
        "anadir categoria",
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
        "Para crear una nueva categoria, ve a la seccion de Categorias y haz clic en el boton 'Nueva Categoria'. Ingresa el nombre de la categoria y opcionalmente una descripcion. Las categorias te permiten organizar tus productos en grupos logicos como 'Electronica', 'Ropa', 'Alimentos', etc. Una vez creada, estara disponible inmediatamente para asignar productos.",
      keywords: ["creo", "nueva", "categoria", "crear", "seccion", "categorias", "haz", "clic", "boton", "'nueva", "categoria'", "ingresa", "nombre", "opcionalmente", "descripcion"],
      steps: [
        { text: "Ve al menu lateral y haz clic en 'Categorias', luego en 'Nueva Categoria'", image: "/help/categories/step1-menu-categorias.png" },
        { text: "Escribe el nombre de la nueva categoria en el formulario", image: "/help/categories/step2-nombre-categoria.png" },
        { text: "Haz clic en 'Crear' para guardar la categoria", image: "/help/categories/step3-confirmar.png" },
      ],
      route: "/dashboard/categories",
    },
    {
      id: "categories-edit",
      question: "Como edito una categoria existente?",
      aliases: [
        "modificar categoria",
        "cambiar nombre de categoria",
        "actualizar categoria",
        "renombrar categoria",
      ],
      answer:
        "Busca la categoria que deseas modificar en la lista de Categorias. Haz clic en el boton de edicion (icono de lapiz) junto a la categoria. Podras cambiar el nombre y la descripcion. Los cambios se aplicaran automaticamente a todos los productos que pertenecen a esa categoria. El nombre actualizado se reflejara en filtros, reportes y el catalogo publico.",
      keywords: ["edito", "categoria", "existente", "busca", "deseas", "modificar", "lista", "categorias", "haz", "clic", "boton", "edicion", "icono", "lapiz", "junto"],
      route: "/dashboard/categories",
    },
    {
      id: "categories-delete",
      question: "Como elimino una categoria?",
      aliases: [
        "borrar categoria",
        "quitar categoria",
        "eliminar clasificacion",
        "dar de baja categoria",
      ],
      answer:
        "Para eliminar una categoria, buscala en la lista y haz clic en el boton de eliminar (icono de papelera). El sistema te pedira confirmacion antes de proceder. Si la categoria tiene productos asignados, debes reasignar esos productos a otra categoria antes de poder eliminarla, o bien el sistema los dejara sin categoria. Esta accion no se puede deshacer.",
      keywords: ["elimino", "categoria", "eliminar", "buscala", "lista", "haz", "clic", "boton", "icono", "papelera", "sistema", "pedira", "confirmacion", "antes", "proceder"],
      route: "/dashboard/categories",
      roles: ["admin"],
    },
    {
      id: "categories-assign",
      question: "Como asigno productos a una categoria?",
      aliases: [
        "poner productos en categoria",
        "mover producto a categoria",
        "asignar producto a categoria",
        "categorizar productos",
      ],
      answer:
        "La asignacion de categoria se realiza desde el formulario del producto. Al crear o editar un producto en la seccion de Productos, selecciona la categoria correspondiente del menu desplegable. Cada producto puede pertenecer a una sola categoria. Si necesitas reorganizar varios productos, edita cada uno individualmente y cambia su categoria.",
      keywords: ["asigno", "productos", "categoria", "asignacion", "realiza", "desde", "formulario", "producto", "crear", "editar", "seccion", "selecciona", "correspondiente", "menu", "desplegable"],
      relatedActions: ["products-create", "products-edit"],
    },
    {
      id: "categories-filter",
      question: "Como filtro productos por categoria?",
      aliases: [
        "buscar por categoria",
        "ver productos de una categoria",
        "filtrar por clasificacion",
        "productos por categoria",
      ],
      answer:
        "En las secciones de Productos e Inventario encontraras un filtro de categorias en la barra de herramientas. Selecciona una o varias categorias para ver solo los productos que pertenecen a ellas. Este filtro tambien esta disponible en el formulario de nueva venta para encontrar productos rapidamente. Los filtros por categoria se combinan con la busqueda por texto.",
      keywords: ["filtro", "productos", "categoria", "secciones", "inventario", "encontraras", "categorias", "barra", "herramientas", "selecciona", "varias", "ver", "solo", "pertenecen", "ellas"],
      route: "/dashboard/categories",
      relatedActions: ["inventory-filter", "products-search"],
    },
    {
      id: "categories-list",
      question: "Como veo todas las categorias disponibles?",
      aliases: [
        "lista de categorias",
        "ver categorias",
        "todas las categorias",
        "catalogo de categorias",
      ],
      answer:
        "La lista completa de categorias esta disponible en la seccion de Categorias del panel de administracion. Alli veras el nombre de cada categoria, su descripcion y la cantidad de productos asignados. Las categorias se muestran en orden alfabetico y puedes usar la barra de busqueda para encontrar una categoria especifica rapidamente.",
      keywords: ["veo", "todas", "categorias", "disponibles", "lista", "completa", "disponible", "seccion", "panel", "administracion", "alli", "veras", "nombre", "cada", "categoria"],
      route: "/dashboard/categories",
    },
    {
      id: "categories-products-count",
      question: "Como se cuantos productos tiene una categoria?",
      aliases: [
        "cantidad de productos por categoria",
        "productos en categoria",
        "cuantos productos hay en una categoria",
      ],
      answer:
        "En la lista de categorias, cada categoria muestra la cantidad de productos asociados junto a su nombre. Este contador se actualiza automaticamente cuando agregas, mueves o eliminas productos. Tambien puedes hacer clic en la categoria para ver la lista detallada de todos los productos que pertenecen a ella.",
      keywords: ["cuantos", "productos", "tiene", "categoria", "lista", "categorias", "cada", "muestra", "cantidad", "asociados", "junto", "nombre", "contador", "actualiza", "automaticamente"],
      route: "/dashboard/categories",
    },
    {
      id: "categories-importance",
      question: "Por que es importante usar categorias?",
      aliases: [
        "para que sirven las categorias",
        "beneficios de categorizar",
        "ventajas de las categorias",
        "necesito categorias",
      ],
      answer:
        "Las categorias son fundamentales para organizar tu catalogo de forma eficiente. Permiten filtrar productos rapidamente en el inventario, ventas e ingresos. Tambien facilitan la generacion de reportes por tipo de producto, ayudan a los clientes a navegar el catalogo publico y simplifican la busqueda de articulos. Una buena estructura de categorias mejora significativamente la experiencia de uso del sistema.",
      keywords: ["importante", "usar", "categorias", "fundamentales", "organizar", "catalogo", "forma", "eficiente", "permiten", "filtrar", "productos", "rapidamente", "inventario", "ventas", "ingresos"],
    },
    {
      id: "categories-naming",
      question: "Que nombres debo usar para mis categorias?",
      aliases: [
        "como nombrar categorias",
        "nombres de categorias",
        "buenas practicas categorias",
        "estructura de categorias",
      ],
      answer:
        "Usa nombres claros, descriptivos y consistentes para tus categorias. Evita nombres demasiado genericos como 'Otros' o demasiado especificos que solo contengan un producto. Piensa en como tus clientes buscarian los productos y usa esos terminos. Ejemplos: 'Celulares y Tablets', 'Accesorios de Computo', 'Perifericos'. Mantener entre 5 y 20 categorias suele ser lo mas manejable.",
      keywords: ["nombres", "debo", "usar", "mis", "categorias", "usa", "claros", "descriptivos", "consistentes", "tus", "evita", "demasiado", "genericos", "'otros'", "especificos"],
    },
    {
      id: "categories-uncategorized",
      question: "Que pasa con los productos sin categoria?",
      aliases: [
        "productos sin clasificar",
        "sin categoria",
        "producto sin categoria asignada",
        "productos no categorizados",
      ],
      answer:
        "Los productos sin categoria asignada siguen siendo funcionales en el sistema: puedes venderlos, incluirlos en ingresos y verlos en el inventario. Sin embargo, no aparecen cuando filtras por categoria, lo que dificulta encontrarlos. Se recomienda asignar siempre una categoria a cada producto para mantener tu catalogo organizado y facilitar las operaciones diarias.",
      keywords: ["pasa", "productos", "categoria", "asignada", "siguen", "siendo", "funcionales", "sistema", "puedes", "venderlos", "incluirlos", "ingresos", "verlos", "inventario", "embargo"],
      relatedActions: ["categories-assign", "products-edit"],
    },
  ],
}
