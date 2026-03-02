import {
  Users,
  Search,
  Shield,
  Pencil,
  Trash2,
  UserPlus,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const USERS_LIST_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Users className="h-5 w-5" />,
    title: "Lista de usuarios",
    description:
      "Esta es la lista principal de todos los usuarios registrados en tu organización. Desde aquí puedes buscar, filtrar y gestionar permisos de cada usuario.",
    tips: [
      "Los usuarios genéricos e invitados se excluyen automáticamente de la lista.",
      "Cada usuario muestra su email, nombre de usuario, rol y estado.",
      "Los administradores globales ven pestañas adicionales de gestión.",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Búsqueda y filtros",
    description:
      "Usa la barra de búsqueda para encontrar usuarios por nombre, email o rol. También puedes filtrar por columnas específicas.",
    tips: [
      "La búsqueda filtra en tiempo real mientras escribes.",
      "Puedes ocultar/mostrar columnas desde el botón de vistas.",
      "Los filtros de fecha permiten ver usuarios creados en un rango específico.",
    ],
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Roles y permisos",
    description:
      "Cada usuario tiene un rol que determina qué puede hacer en el sistema: ADMIN, EMPLOYEE o CLIENT.",
    tips: [
      "ADMIN: acceso completo a gestión de la organización.",
      "EMPLOYEE: acceso a operaciones diarias (ventas, inventario, etc.).",
      "CLIENT: acceso limitado solo a funciones de cliente.",
      "Puedes cambiar el rol de un usuario desde el menú de acciones.",
    ],
  },
  {
    icon: <Pencil className="h-5 w-5" />,
    title: "Editar usuario",
    description:
      "Desde el menú de acciones puedes modificar el rol y estado de un usuario. Los cambios se aplican inmediatamente.",
    tips: [
      "Cambiar el estado a 'Inactivo' impide que el usuario acceda al sistema.",
      "El cambio de rol actualiza los permisos del usuario de forma inmediata.",
      "Solo administradores pueden editar usuarios.",
    ],
  },
  {
    icon: <UserPlus className="h-5 w-5" />,
    title: "Crear nuevo usuario",
    description:
      "Usa el botón 'Nuevo Usuario' para registrar un nuevo usuario en tu organización con email, contraseña y rol asignado.",
    tips: [
      "El email y nombre de usuario deben ser únicos en el sistema.",
      "La contraseña requiere mínimo 8 caracteres, un número y un carácter especial.",
      "El usuario recibirá acceso según el rol que le asignes.",
    ],
  },
  {
    icon: <Trash2 className="h-5 w-5" />,
    title: "Eliminar usuario",
    description:
      "Desde el menú de acciones puedes eliminar un usuario. Se mostrará un diálogo de confirmación antes de proceder.",
    tips: [
      "Eliminar un usuario es permanente y no se puede deshacer.",
      "Considera cambiar el estado a 'Inactivo' en lugar de eliminar.",
      "Solo administradores con permisos de eliminación pueden realizar esta acción.",
    ],
  },
]
