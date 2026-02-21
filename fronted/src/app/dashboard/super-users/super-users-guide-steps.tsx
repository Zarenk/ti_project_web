import {
  ShieldCheck,
  Mail,
  Lock,
  Building2,
  Settings,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const SUPER_USERS_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "¿Qué es un usuario privilegiado?",
    description:
      "Los usuarios privilegiados son administradores con permisos elevados. Pueden gestionar organizaciones, usuarios y configuraciones avanzadas del sistema.",
    tips: [
      "Solo los Super Administradores Globales pueden crear usuarios privilegiados.",
      "Los roles disponibles son: ADMIN y SUPER_ADMIN_ORG.",
      "SUPER_ADMIN_ORG tiene control total sobre una organización específica.",
      "Después de crear el usuario, asígnalo como super admin desde la vista de la organización.",
    ],
  },
  {
    icon: <Mail className="h-5 w-5" />,
    title: "Email y nombre de usuario",
    description:
      "Ingresa el correo electrónico y nombre de usuario del nuevo administrador. Ambos deben ser únicos en todo el sistema.",
    tips: [
      "El email debe ser un formato válido (ejemplo@dominio.com).",
      "El nombre de usuario debe tener mínimo 3 caracteres.",
      "Ambos campos muestran indicadores de estado: 'Requerido' o 'Listo'.",
    ],
  },
  {
    icon: <Lock className="h-5 w-5" />,
    title: "Contraseña",
    description:
      "Define una contraseña segura con mínimo 8 caracteres para el nuevo usuario privilegiado.",
    tips: [
      "Usa una contraseña robusta — estos usuarios tienen permisos elevados.",
      "El campo muestra 'Requerido' hasta que se ingrese una contraseña válida.",
      "Comparte la contraseña de forma segura con el nuevo administrador.",
    ],
  },
  {
    icon: <Building2 className="h-5 w-5" />,
    title: "Rol y organización",
    description:
      "Selecciona el rol y, si aplica, la organización a la que pertenecerá el usuario.",
    tips: [
      "ADMIN: administrador con acceso a la organización asignada.",
      "SUPER_ADMIN_ORG: super administrador de una organización específica.",
      "Para SUPER_ADMIN_ORG, la organización es obligatoria.",
      "Si solo existe una organización, se selecciona automáticamente.",
    ],
  },
  {
    icon: <Settings className="h-5 w-5" />,
    title: "Crear y asignar",
    description:
      "Al crear el usuario, este queda registrado con el rol y organización seleccionados. El paso final es asignarlo como super admin desde la vista de la organización.",
    tips: [
      "Haz clic en 'Crear usuario' para registrar al nuevo administrador.",
      "Después de crear, ve a la vista de la organización para asignarlo como super admin.",
      "El estado se puede configurar como 'Activo' o 'Inactivo' desde el campo opcional.",
    ],
  },
]
