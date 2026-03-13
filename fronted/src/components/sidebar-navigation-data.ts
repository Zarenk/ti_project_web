import {
  Boxes,
  Brain,
  Building2,
  BookOpen,
  Bot,
  ClipboardList,
  Command,
  DollarSign,
  Globe,
  Home,
  HouseIcon,
  Link as LinkIcon,
  Map,
  MessageCircle,
  QrCode,
  Scale,
  Settings2Icon,
  Shield,
  ShoppingCart,
  SquareTerminal,
  Store,
  Table2,
  Truck,
  Utensils,
  UserIcon,
  Users,
  CreditCard,
  ScanLine,
  CalendarDays,
  Dumbbell,
  BarChart3,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import type { ModulePermissionKey } from "@/hooks/use-module-permission"
import type { VerticalFeatures } from "@/app/dashboard/tenancy/tenancy.api"

// ── Types ────────────────────────────────────────────────────────────────────

export type NavSubItem = {
  title: string
  url: string
  permission?: ModulePermissionKey
  badge?: number
  requiredRoles?: string[]
}

export type NavItem = {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  permission?: ModulePermissionKey
  requiredRoles?: string[]
  items?: NavSubItem[]
}

export type ProjectItem = {
  name: string
  url: string
  icon: LucideIcon
  permission?: ModulePermissionKey
  requiredRoles?: string[]
}

export type SidebarData = {
  navMain: NavItem[]
  projects: ProjectItem[]
}

// ── Static navigation data ───────────────────────────────────────────────────

export const data: SidebarData = {
  navMain: [
    {
      title: "Almacen",
      url: "#",
      icon: HouseIcon,
      permission: "inventory",
      items: [
        {
          title: "Inventario",
          url: "/dashboard/inventory",
          permission: "inventory",
        },
        {
          title: "Nuevo Ingreso",
          url: "/dashboard/entries/new",
          permission: "inventory",
        },
        {
          title: "Traslados",
          url: "/dashboard/transfers",
          permission: "inventory",
        },
        {
          title: "Ver Almacen(es)",
          url: "/dashboard/entries",
          permission: "inventory",
        },
      ],
    },
    {
      title: "Catalogo",
      url: "/dashboard/catalog",
      icon: LinkIcon,
      permission: "store",
      items: [
        {
          title: "Exportar Catalogo",
          url: "/dashboard/catalog",
          permission: "store",
        },
      ],
    },
    {
      title: "Categorias",
      url: "/dashboard/categories",
      icon: BookOpen,
      permission: "catalog",
      items: [
        {
          title: "Nueva Categoria",
          url: "/dashboard/categories/new",
          permission: "catalog",
        },
        {
          title: "Ver Categorias",
          url: "/dashboard/categories",
          permission: "catalog",
        },
      ],
    },
    {
      title: "IA Training",
      url: "#",
      icon: Brain,
      requiredRoles: ["SUPER_ADMIN_GLOBAL"],
      items: [
        {
          title: "Entrenamiento Ayuda",
          url: "/dashboard/help-training",
          requiredRoles: ["SUPER_ADMIN_GLOBAL"],
        },
        {
          title: "Panel ML Analytics",
          url: "/dashboard/ml-analytics",
          requiredRoles: ["SUPER_ADMIN_GLOBAL"],
        },
      ],
    },
    {
      title: "Legal",
      url: "#",
      icon: Scale,
      permission: "legal" as ModulePermissionKey,
      items: [
        {
          title: "Asistente Legal IA",
          url: "/dashboard/jurisprudence/assistant",
          permission: "legal" as ModulePermissionKey,
        },
        {
          title: "Calendario",
          url: "/dashboard/legal/calendar",
          permission: "legal" as ModulePermissionKey,
        },
        {
          title: "Documentos",
          url: "/dashboard/legal/documents",
          permission: "legal" as ModulePermissionKey,
        },
        {
          title: "Expedientes",
          url: "/dashboard/legal",
          permission: "legal" as ModulePermissionKey,
        },
        {
          title: "Jurisprudencia",
          url: "/dashboard/jurisprudence",
          permission: "legal" as ModulePermissionKey,
        },
        {
          title: "Nuevo Expediente",
          url: "/dashboard/legal/new",
          permission: "legal" as ModulePermissionKey,
        },
      ],
    },
    {
      title: "Organizaciones",
      url: "#",
      icon: Building2,
      permission: "settings",
      requiredRoles: ["SUPER_ADMIN_GLOBAL", "SUPER_ADMIN_ORG"],
      items: [
        {
          title: "Empresas",
          url: "/dashboard/tenancy/companies",
          permission: "settings",
          requiredRoles: ["SUPER_ADMIN_GLOBAL", "SUPER_ADMIN_ORG"],
        },
        {
          title: "Nueva Organizacion",
          url: "/dashboard/tenancy/new",
          permission: "settings",
          requiredRoles: ["SUPER_ADMIN_GLOBAL"],
        },
        {
          title: "Ver Organizaciones",
          url: "/dashboard/tenancy",
          permission: "settings",
          requiredRoles: ["SUPER_ADMIN_GLOBAL"],
        },
      ],
    },
    {
      title: "Productos",
      url: "/dashboard/products",
      icon: SquareTerminal,
      permission: "catalog",
      items: [
        {
          title: "Administrar Marcas",
          url: "/dashboard/brands",
          permission: "catalog",
        },
        {
          title: "Nuevo Producto",
          url: "/dashboard/products/new",
          permission: "catalog",
        },
        {
          title: "Ver Productos",
          url: "/dashboard/products",
          permission: "catalog",
        },
      ],
    },
    {
      title: "Proveedores",
      url: "/dashboard/providers",
      icon: Globe,
      permission: "providers",
      items: [
        {
          title: "Nuevo Proveedor",
          url: "/dashboard/providers/new",
          permission: "providers",
        },
        {
          title: "Ver Proveedores",
          url: "/dashboard/providers",
          permission: "providers",
        },
      ],
    },
    {
      title: "Tiendas/Sucursales",
      url: "#",
      icon: Store,
      permission: "store",
      items: [
        {
          title: "Nueva Tienda/Sucursal",
          url: "/dashboard/stores/new",
          permission: "store",
        },
        {
          title: "Ver Tiendas/Sucursales",
          url: "/dashboard/stores",
          permission: "store",
        },
      ],
    },
    {
      title: "Tipo de Cambio",
      url: "#",
      icon: DollarSign,
      permission: "accounting",
      items: [
        {
          title: "Tipo de Cambio",
          url: "/dashboard/exchange",
          permission: "accounting",
        },
      ],
    },
    {
      title: "Usuarios",
      url: "#",
      icon: Bot,
      permission: "settings",
      items: [
        {
          title: "Historial de Modificaciones",
          url: "/dashboard/history",
          permission: "settings",
        },
        {
          title: "Nuevo Usuario",
          url: "/dashboard/users/new",
          permission: "settings",
        },
        {
          title: "Sesiones Activas",
          url: "/dashboard/users/sessions",
          permission: "settings",
          requiredRoles: ["SUPER_ADMIN_GLOBAL", "SUPER_ADMIN_ORG"],
        },
        {
          title: "Super usuarios",
          url: "/dashboard/super-users",
          permission: "settings",
          requiredRoles: ["SUPER_ADMIN_GLOBAL"],
        },
        {
          title: "Ver Clientes",
          url: "/dashboard/clients",
          permission: "settings",
        },
        {
          title: "Ver Usuarios",
          url: "/dashboard/users",
          permission: "settings",
        },
      ],
    },
    {
      title: "Ventas",
      url: "#",
      icon: ShoppingCart,
      permission: "sales",
      items: [
        {
          title: "Caja",
          url: "/dashboard/cashregister",
          permission: "sales",
        },
        {
          title: "Mensajes",
          url: "/dashboard/messages",
          permission: "sales",
        },
        {
          title: "Nueva Orden",
          url: "/dashboard/orders/new",
          permission: "sales",
        },
        {
          title: "Pedidos",
          url: "/dashboard/orders",
          permission: "sales",
        },
        {
          title: "Realizar Venta",
          url: "/dashboard/sales/new",
          permission: "sales",
        },
        {
          title: "Ver Historial de Ventas",
          url: "/dashboard/sales/salesdashboard",
          permission: "salesHistory",
        },
        {
          title: "Ver Ventas Realizadas",
          url: "/dashboard/sales",
          permission: "sales",
        },
        {
          title: "Pagos Digitales",
          url: "/dashboard/payments",
          permission: "sales",
        },
      ],
    },
    {
      title: "WhatsApp",
      url: "/dashboard/whatsapp",
      icon: MessageCircle,
      permission: "whatsapp",
    },
  ],
  projects: [
    {
      name: "Ayuda Chatbot",
      url: "#chatbot",
      icon: Bot,
    },
    {
      name: "Escaner QR",
      url: "/barcode",
      icon: QrCode,
    },
    {
      name: "Inicio",
      url: "/dashboard",
      icon: Home,
    },
    {
      name: "Libro de Reclamaciones",
      url: "/dashboard/libro-reclamaciones",
      icon: ClipboardList,
    },
    {
      name: "Login",
      url: "/login",
      icon: UserIcon,
    },
    {
      name: "Onboarding",
      url: "/dashboard/onboarding",
      icon: Map,
    },
    {
      name: "Opciones",
      url: "/dashboard/options",
      icon: Settings2Icon,
      permission: "settings",
    },
    {
      name: "Pagina Web",
      url: "/store",
      icon: Globe,
      permission: "store",
    },
    {
      name: "Panel Administrador",
      url: "/dashboard/admin-signups",
      icon: Shield,
      requiredRoles: ["SUPER_ADMIN_GLOBAL"],
    },
  ],
}

// ── Constants ────────────────────────────────────────────────────────────────

export const NAV_FEATURE_REQUIREMENTS: Record<string, keyof VerticalFeatures> = {
  Almacen: "inventory",
  Categorias: "inventory",
  Productos: "inventory",
  Proveedores: "inventory",
  Ventas: "sales",
  Tiendas: "posIntegration",
  Catalogo: "ecommerceIntegration",
}

// Nav items hidden for restaurant verticals (replaced by custom menu items)
export const RESTAURANT_HIDDEN_NAV = new Set([
  "Almacen",           // replaced by "Insumos" custom item
  "Categorias",        // menu sections managed from "Platos"
  "Productos",         // replaced by "Platos" custom item
  "Tipo de Cambio",    // single currency operation
  "Tiendas/Sucursales", // not applicable to restaurants
])

export const RESTAURANT_HIDDEN_PROJECTS = new Set([
  "Escaner QR",  // not needed in restaurant workflow
  "Pagina Web",  // ecommerce disabled for restaurants
])

// Nav items hidden for gym verticals (replaced by custom menu items)
export const GYM_HIDDEN_NAV = new Set([
  "Tipo de Cambio",    // single currency operation
  "Catalogo",          // ecommerce disabled for gyms
])

export const GYM_HIDDEN_PROJECTS = new Set([
  "Pagina Web",  // ecommerce disabled for gyms
])

export const CUSTOM_MENU_ICONS: Record<string, LucideIcon> = {
  table: Table2,
  kitchen: Utensils,
  ingredients: Boxes,
  "cash-register": SquareTerminal,
  book: BookOpen,
  orders: ClipboardList,
  truck: Truck,
  store: Store,
  home: Home,
  members: Users,
  membership: CreditCard,
  checkin: ScanLine,
  classes: CalendarDays,
  trainers: Dumbbell,
  dashboard: BarChart3,
  "qr-menu": QrCode,
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function resolveCustomMenuIcon(name?: string): LucideIcon {
  if (!name) return Command
  const key = name.toLowerCase()
  return CUSTOM_MENU_ICONS[key] ?? Command
}
