import {
  UserPlus,
  FileText,
  Phone,
  ImageIcon,
  Settings,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const PROVIDER_FORM_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <UserPlus className="h-5 w-5" />,
    title: "Nombre del proveedor",
    description:
      "El nombre es obligatorio y debe tener entre 3 y 50 caracteres. El sistema verifica automáticamente que no exista otro proveedor con el mismo nombre.",
    tips: [
      "El nombre se valida en tiempo real — espera el indicador verde antes de continuar.",
      "Solo se permiten letras, números y espacios.",
      "Si el nombre ya existe, aparecerá un mensaje en rojo indicando la duplicación.",
    ],
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: "Documento de identidad",
    description:
      "Selecciona el tipo de documento (DNI, RUC u Otro) e ingresa el número correspondiente. El sistema valida el formato y la unicidad.",
    tips: [
      "DNI: exactamente 8 dígitos numéricos.",
      "RUC: exactamente 11 dígitos numéricos.",
      "Otro documento: hasta 25 caracteres alfanuméricos.",
      "El número se valida automáticamente para evitar duplicados.",
    ],
  },
  {
    icon: <Phone className="h-5 w-5" />,
    title: "Datos de contacto (opcionales)",
    description:
      "Agrega información de contacto: descripción, teléfono, dirección, email y página web. Todos estos campos son opcionales.",
    tips: [
      "La descripción es útil para notas internas sobre el proveedor.",
      "El teléfono, email y web facilitan el contacto rápido desde la lista.",
      "La dirección se muestra en la tarjeta del proveedor en la vista de galería.",
      "Cada campo acepta hasta 100 caracteres.",
    ],
  },
  {
    icon: <ImageIcon className="h-5 w-5" />,
    title: "Imagen del proveedor",
    description:
      "Puedes agregar una imagen o logo del proveedor. Hay dos formas: subir un archivo desde tu dispositivo o pegar una URL directamente.",
    tips: [
      "La imagen se muestra como avatar en la lista y galería de proveedores.",
      "Formatos aceptados: JPG, PNG, WebP y otros formatos de imagen.",
      "Puedes usar una URL externa si el logo ya está alojado en internet.",
      "Usa el botón 'Quitar' para eliminar la imagen seleccionada.",
    ],
  },
  {
    icon: <Settings className="h-5 w-5" />,
    title: "Acciones finales",
    description:
      "Al terminar, usa los botones al final del formulario para guardar, limpiar o volver a la lista de proveedores.",
    tips: [
      "'Crear Proveedor' guarda el nuevo proveedor inmediatamente.",
      "'Actualizar Proveedor' aparece cuando estás editando uno existente.",
      "'Limpiar' reinicia todos los campos del formulario.",
      "'Subir proveedores desde Excel' te lleva al importador masivo.",
    ],
  },
]
