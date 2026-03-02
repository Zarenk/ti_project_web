import {
  UserCircle,
  Lock,
  Bell,
  Palette,
  Shield,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const ACCOUNT_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <UserCircle className="h-5 w-5" />,
    title: "Mi cuenta",
    description:
      "Visualiza y edita tu información personal: nombre, email, foto de perfil y datos de contacto.",
    tips: [
      "Tu nombre y email se muestran en la barra de navegación.",
      "Puedes cambiar tu foto de perfil subiendo una imagen.",
      "Los datos se actualizan inmediatamente al guardar.",
    ],
  },
  {
    icon: <Lock className="h-5 w-5" />,
    title: "Cambiar contraseña",
    description:
      "Actualiza tu contraseña de acceso. Debes ingresar la contraseña actual y definir una nueva.",
    tips: [
      "La nueva contraseña debe tener mínimo 8 caracteres.",
      "Debe incluir al menos un número y un carácter especial.",
      "Usa una contraseña diferente a las anteriores.",
    ],
  },
  {
    icon: <Bell className="h-5 w-5" />,
    title: "Notificaciones",
    description:
      "Configura qué notificaciones deseas recibir: alertas de stock, mensajes, ventas y más.",
    tips: [
      "Activa o desactiva notificaciones por tipo.",
      "Las notificaciones del sistema no se pueden desactivar.",
      "Las preferencias se guardan automáticamente.",
    ],
  },
  {
    icon: <Palette className="h-5 w-5" />,
    title: "Preferencias",
    description:
      "Personaliza tu experiencia: tema (claro/oscuro), idioma y configuraciones visuales.",
    tips: [
      "El tema oscuro reduce la fatiga visual en ambientes con poca luz.",
      "Las preferencias son individuales por usuario.",
      "Los cambios se aplican inmediatamente.",
    ],
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Seguridad",
    description:
      "Revisa tu información de seguridad: sesiones activas, dispositivos y último acceso.",
    tips: [
      "Verifica que no haya sesiones desconocidas.",
      "Cierra sesiones en dispositivos que no reconozcas.",
      "Cambia tu contraseña si sospechas acceso no autorizado.",
    ],
  },
]
