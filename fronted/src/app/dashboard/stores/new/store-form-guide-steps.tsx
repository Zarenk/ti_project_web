import {
  Store,
  FileText,
  Phone,
  ImageIcon,
  Settings,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const STORE_FORM_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Store className="h-5 w-5" />,
    title: "Nombre de la tienda",
    description:
      "El nombre es obligatorio y debe tener entre 3 y 50 caracteres. Identifica tu punto de venta o sucursal de forma clara.",
    tips: [
      "Solo se permiten letras, números y espacios.",
      "El nombre debe ser único dentro de tu organización.",
      "Ejemplos: 'Tienda Central', 'Sucursal Norte', 'Almacén Principal'.",
    ],
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: "RUC de la tienda",
    description:
      "El RUC es obligatorio y debe tener exactamente 11 dígitos numéricos. Es el número de identificación tributaria de la tienda.",
    tips: [
      "Solo se aceptan dígitos numéricos (0-9).",
      "El campo filtra automáticamente cualquier carácter no numérico.",
      "El RUC aparecerá en documentos fiscales como facturas y boletas.",
    ],
  },
  {
    icon: <Phone className="h-5 w-5" />,
    title: "Datos de contacto (opcionales)",
    description:
      "Agrega información adicional: descripción, teléfono, dirección, correo electrónico, sitio web y estado de la tienda.",
    tips: [
      "La descripción es útil para notas internas sobre la tienda.",
      "El teléfono y correo facilitan el contacto entre sucursales.",
      "El estado puede ser 'Activo' o 'Inactivo' — las tiendas inactivas no aparecen en selectores.",
      "Todos estos campos son opcionales.",
    ],
  },
  {
    icon: <ImageIcon className="h-5 w-5" />,
    title: "Imagen de la tienda",
    description:
      "Puedes agregar una imagen o logo para identificar visualmente la tienda. Hay dos formas: subir un archivo o pegar una URL.",
    tips: [
      "La imagen se muestra como avatar en la lista y galería de tiendas.",
      "Formatos aceptados: JPG, PNG, WebP y otros formatos de imagen.",
      "También puedes pegar una URL directa si la imagen ya está en internet.",
      "Usa el botón 'Quitar' para eliminar la imagen seleccionada.",
    ],
  },
  {
    icon: <Settings className="h-5 w-5" />,
    title: "Acciones finales",
    description:
      "Al terminar, usa los botones al final del formulario para guardar, limpiar o volver a la lista de tiendas.",
    tips: [
      "'Crear Tienda' guarda la nueva tienda inmediatamente.",
      "'Actualizar Tienda' aparece cuando estás editando una existente.",
      "'Limpiar' reinicia todos los campos del formulario.",
      "'Volver' regresa a la lista de tiendas sin guardar cambios.",
    ],
  },
]
