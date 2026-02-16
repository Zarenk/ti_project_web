import type { HelpSection } from "../types"

export const storesSection: HelpSection = {
  id: "stores",
  label: "Tiendas",
  description: "Administra sucursales, puntos de venta y asignacion de personal.",
  welcomeMessage:
    "Estas en Tiendas. Administra tus sucursales y puntos de venta.",
  quickActions: [
    "stores-create",
    "stores-edit",
    "stores-assign-users",
    "stores-main",
    "stores-delete",
  ],
  entries: [
    {
      id: "stores-create",
      question: "Como creo una nueva tienda o sucursal?",
      aliases: [
        "crear tienda",
        "nueva tienda",
        "agregar sucursal",
        "registrar punto de venta",
        "nueva sucursal",
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
        "Ve a la seccion de Tiendas y haz clic en 'Nueva Tienda'. Ingresa el nombre de la sucursal, la direccion completa y un telefono de contacto. La tienda quedara activa inmediatamente y podras asignarle usuarios y gestionar su inventario de forma independiente.",
      keywords: ["creo", "nueva", "tienda", "sucursal", "seccion", "tiendas", "haz", "clic", "'nueva", "tienda'", "ingresa", "nombre", "direccion", "completa", "telefono"],
      steps: [
        { text: "Ve al menu lateral y haz clic en 'Tiendas/Sucursales', luego en 'Nueva Tienda'", image: "/help/stores/step1-menu-tiendas.png" },
        { text: "Completa los datos: nombre de la sucursal y direccion", image: "/help/stores/step2-datos-tienda.png" },
        { text: "Haz clic en 'Guardar' para crear la tienda", image: "/help/stores/step3-guardar.png" },
      ],
      relatedActions: ["stores-edit", "stores-assign-users"],
    },
    {
      id: "stores-edit",
      question: "Como edito los datos de una tienda?",
      aliases: [
        "modificar tienda",
        "actualizar tienda",
        "cambiar datos sucursal",
        "editar sucursal",
      ],
      answer:
        "Haz clic sobre la tienda en la lista para abrir su detalle. Podras modificar el nombre, direccion, telefono y horario de atencion. Si la tienda tiene ventas o inventario asociado, los datos historicos se mantienen sin cambios al actualizar la informacion de la sucursal.",
      keywords: ["edito", "datos", "tienda", "haz", "clic", "sobre", "lista", "abrir", "detalle", "podras", "modificar", "nombre", "direccion", "telefono", "horario"],
      relatedActions: ["stores-create", "stores-address"],
    },
    {
      id: "stores-assign-users",
      question: "Como asigno usuarios a una tienda?",
      aliases: [
        "usuarios tienda",
        "personal sucursal",
        "agregar vendedor tienda",
        "asignar empleado",
        "equipo tienda",
      ],
      answer:
        "Dentro del detalle de la tienda, accede a la seccion de personal o usuarios. Ahi puedes agregar usuarios existentes del sistema a esa sucursal. Un usuario puede estar asignado a una o varias tiendas segun su rol. Los vendedores asignados veran automaticamente el inventario y operaciones de su tienda.",
      keywords: ["asigno", "usuarios", "tienda", "dentro", "detalle", "accede", "seccion", "personal", "ahi", "puedes", "agregar", "existentes", "sistema", "esa", "sucursal"],
      relatedActions: ["stores-create"],
    },
    {
      id: "stores-main",
      question: "Como establezco una tienda como sucursal principal?",
      aliases: [
        "tienda principal",
        "sucursal principal",
        "sede principal",
        "tienda por defecto",
        "tienda predeterminada",
      ],
      answer:
        "En el detalle de la tienda, activa la opcion de 'Sucursal Principal'. Solo puede haber una tienda principal por empresa. Esta sucursal sera la que aparece por defecto al crear ventas y entradas. Si ya existe una tienda principal, al marcar otra se reemplazara automaticamente la anterior.",
      keywords: ["establezco", "tienda", "sucursal", "principal", "detalle", "activa", "opcion", "'sucursal", "principal'", "solo", "puede", "haber", "empresa", "sera", "aparece"],
      relatedActions: ["stores-edit"],
    },
    {
      id: "stores-address",
      question: "Como actualizo la direccion de una tienda?",
      aliases: [
        "direccion tienda",
        "ubicacion tienda",
        "cambiar direccion sucursal",
        "domicilio tienda",
      ],
      answer:
        "Edita la tienda y modifica los campos de direccion: calle, numero, ciudad y referencia. La direccion actualizada se mostrara en los comprobantes de venta y en los reportes que incluyan datos de la sucursal. Es importante mantener esta informacion al dia para la correcta emision de documentos.",
      keywords: ["actualizo", "direccion", "tienda", "edita", "modifica", "campos", "calle", "numero", "ciudad", "referencia", "actualizada", "mostrara", "comprobantes", "venta", "reportes"],
      relatedActions: ["stores-edit"],
    },
    {
      id: "stores-delete",
      question: "Como elimino una tienda?",
      aliases: [
        "borrar tienda",
        "eliminar sucursal",
        "cerrar tienda",
        "quitar punto de venta",
        "dar de baja tienda",
      ],
      answer:
        "Accede al detalle de la tienda y haz clic en el boton de eliminar. Si la tienda tiene inventario o ventas registradas, el sistema te pedira confirmacion y conservara el historial. No se puede eliminar la tienda principal; primero deberas asignar otra sucursal como principal antes de proceder con la eliminacion.",
      keywords: ["elimino", "tienda", "accede", "detalle", "haz", "clic", "boton", "eliminar", "tiene", "inventario", "ventas", "registradas", "sistema", "pedira", "confirmacion"],
      relatedActions: ["stores-main", "stores-create"],
    },
    {
      id: "stores-inventory",
      question: "Cada tienda tiene su propio inventario?",
      aliases: [
        "inventario tienda",
        "stock sucursal",
        "inventario por sucursal",
        "productos tienda",
      ],
      answer:
        "Si, cada tienda maneja su propio inventario de forma independiente. Las entradas de mercaderia se registran en la tienda correspondiente y las ventas descuentan del stock de la sucursal donde se realizan. Puedes consultar el inventario consolidado o por tienda desde la seccion de inventario.",
      keywords: ["cada", "tienda", "tiene", "propio", "inventario", "maneja", "forma", "independiente", "entradas", "mercaderia", "registran", "correspondiente", "ventas", "descuentan", "stock"],
      relatedActions: ["stores-create"],
    },
    {
      id: "stores-search",
      question: "Como busco una tienda en la lista?",
      aliases: [
        "buscar tienda",
        "filtrar tiendas",
        "encontrar sucursal",
        "lista tiendas",
      ],
      answer:
        "Usa la barra de busqueda en la parte superior de la seccion de Tiendas. Puedes buscar por nombre de la sucursal o por ciudad. Los resultados se filtran en tiempo real para que encuentres rapidamente la tienda que necesitas administrar.",
      keywords: ["busco", "tienda", "lista", "usa", "barra", "busqueda", "parte", "superior", "seccion", "tiendas", "puedes", "buscar", "nombre", "sucursal", "ciudad"],
      relatedActions: ["stores-edit"],
    },
    {
      id: "stores-hours",
      question: "Puedo configurar horarios de atencion para cada tienda?",
      aliases: [
        "horario tienda",
        "horario atencion",
        "horas sucursal",
        "apertura cierre tienda",
      ],
      answer:
        "Si, en la edicion de cada tienda puedes establecer los horarios de atencion por dia de la semana. Esta informacion es util como referencia interna para el equipo y puede mostrarse en documentos o comunicaciones con clientes. Configura dias de descanso marcando los dias sin horario.",
      keywords: ["puedo", "configurar", "horarios", "atencion", "cada", "tienda", "edicion", "puedes", "establecer", "dia", "semana", "informacion", "util", "referencia", "interna"],
      relatedActions: ["stores-edit"],
    },
    {
      id: "stores-transfer",
      question: "Como transfiero productos entre tiendas?",
      aliases: [
        "transferir stock",
        "mover productos tienda",
        "traspaso entre sucursales",
        "enviar mercaderia",
      ],
      answer:
        "Las transferencias entre tiendas se gestionan a traves de intercambios o movimientos de inventario. Desde la seccion de intercambios puedes seleccionar la tienda de origen, la tienda de destino y los productos a transferir con sus cantidades. Ambas sucursales veran el movimiento reflejado en su inventario.",
      keywords: ["transfiero", "productos", "entre", "tiendas", "transferencias", "gestionan", "traves", "intercambios", "movimientos", "inventario", "desde", "seccion", "puedes", "seleccionar", "tienda"],
      relatedActions: ["stores-inventory"],
    },
  ],
}
