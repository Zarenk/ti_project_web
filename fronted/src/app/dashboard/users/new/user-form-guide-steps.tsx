import {
  UserPlus,
  Mail,
  Lock,
  Shield,
  Settings,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const USER_FORM_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Mail className="h-5 w-5" />,
    title: "Email y nombre de usuario",
    description:
      "Ingresa el correo electrónico y un nombre de usuario único. El sistema valida automáticamente que no existan duplicados.",
    tips: [
      "El email debe ser un formato válido (ejemplo@dominio.com).",
      "El nombre de usuario debe tener entre 3 y 50 caracteres.",
      "Ambos campos se validan en tiempo real — espera el indicador verde.",
      "Si ya existen, aparecerá un mensaje en rojo indicando la duplicación.",
    ],
  },
  {
    icon: <Lock className="h-5 w-5" />,
    title: "Contraseña",
    description:
      "Crea una contraseña segura para el nuevo usuario. Debe cumplir con los requisitos mínimos de seguridad.",
    tips: [
      "Mínimo 8 caracteres de longitud.",
      "Debe incluir al menos un número (0-9).",
      "Debe incluir al menos un carácter especial (!@#$%^&*).",
      "El campo 'Confirmar contraseña' debe coincidir exactamente.",
    ],
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Rol del usuario",
    description:
      "Selecciona el rol que determinará los permisos y acceso del usuario en el sistema.",
    tips: [
      "ADMIN: acceso completo a la gestión de la organización.",
      "EMPLOYEE: acceso a operaciones diarias (ventas, inventario, entradas).",
      "CLIENT: acceso limitado solo a funciones de cliente.",
    ],
  },
  {
    icon: <Settings className="h-5 w-5" />,
    title: "Estado y acciones finales",
    description:
      "Define el estado inicial del usuario y guarda los cambios con el botón de crear.",
    tips: [
      "'Activo' permite al usuario acceder inmediatamente al sistema.",
      "'Inactivo' crea el usuario pero sin acceso hasta que se active.",
      "'Crear Usuario' guarda el nuevo usuario y redirige a la lista.",
      "'Limpiar' reinicia todos los campos del formulario.",
    ],
  },
]
