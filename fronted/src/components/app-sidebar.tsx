"use client"

import * as React from "react"
import {
  AudioWaveform,
  Building2,
  Banknote,
  BookOpen,
  Bot,
  Command,
  DollarSign,
  Frame,
  GalleryVerticalEnd,
  Globe,
  Home,
  HouseIcon,
  Link,
  Map,
  Megaphone,
  PieChart,
  QrCode,
  Settings2,
  Settings2Icon,
  ShoppingCart,
  SquareTerminal,
  Store,
  UserIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useMessages } from "@/context/messages-context"
import { useAuth } from "@/context/auth-context"
import { useFeatureFlag } from "@/app/hooks/use-feature-flags"
import { useRBAC } from "@/app/hooks/use-rbac"
import { useSiteSettings } from "@/context/site-settings-context"
import { useModulePermission, type ModulePermissionKey } from "@/hooks/use-module-permission"

type Team = {
  name: string
  logo: LucideIcon
  plan: string
}

type NavSubItem = {
  title: string
  url: string
  permission?: ModulePermissionKey
  badge?: number
}

type NavItem = {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  permission?: ModulePermissionKey
  requiredRoles?: string[]
  items?: NavSubItem[]
}

type ProjectItem = {
  name: string
  url: string
  icon: LucideIcon
  permission?: ModulePermissionKey
}

type SidebarData = {
  teams: Team[]
  navMain: NavItem[]
  projects: ProjectItem[]
}

// Static navigation data
const data: SidebarData = {
  teams: [
    {
      name: "Tecnologia Informatica",
      logo: GalleryVerticalEnd,
      plan: "Administrador",
    },
  ],
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
          url: "#",
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
      title: "Productos",
      url: "/dashboard/products",
      icon: SquareTerminal,
      isActive: true,
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
      isActive: true,
      permission: "purchases",
      items: [
        {
          title: "Nuevo Proveedor",
          url: "/dashboard/providers/new",
          permission: "purchases",
        },
        {
          title: "Ver Proveedores",
          url: "/dashboard/providers",
          permission: "purchases",
        },
      ],
    },
    {
      title: "Usuarios",
      url: "#",
      icon: Bot,
      permission: "settings",
      items: [
        { title: "Historial de Modificaciones", 
          url: "/dashboard/history",
          permission: "settings",
        },
        {
          title: "Nuevo Usuario",
          url: "/dashboard/users/new",
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
      title: "Organizaciones",
      url: "#",
      icon: Building2,
      permission: "settings",
      requiredRoles: ["SUPER_ADMIN_GLOBAL"],
      items: [
        {
          title: "Nueva Organización",
          url: "/dashboard/tenancy/new",
          permission: "settings",
        },
        {
          title: "Ver Organizaciones",
          url: "/dashboard/tenancy",
          permission: "settings",
        },
      ],
    },
    {
      title: "Tiendas",
      url: "#",
      icon: Store,
      permission: "store",
      items: [
        {
          title: "Nueva Tienda",
          url: "/dashboard/stores/new",
          permission: "store",
        },
        {
          title: "Ver Tiendas",
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
          title: "Nuevo Tipo de Cambio",
          url: "/dashboard/exchange/new",
          permission: "accounting",
        },
        {
          title: "Ver Tipo de Cambio",
          url: "/dashboard/exchange",
          permission: "accounting",
        },
      ],
    },
    {
      title: "Catálogo",
      url: "/dashboard/catalog",
      icon: Link,
      permission: "store",
      items: [
        {
          title: "Exportar Catálogo",
          url: "/dashboard/catalog",
          permission: "store",
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
          title: "Pedidos",
          url: "/dashboard/orders",
          permission: "sales",
        },
        {
          title: "Nueva Orden",
          url: "/dashboard/orders/new",
          permission: "sales",
        },
        {
          title: "Realizar Venta",
          url: "/dashboard/sales/new",
          permission: "sales",
        },
        {
          title: "Ver Ventas Realizadas",
          url: "/dashboard/sales",
          permission: "sales",
        },
        {
          title: "Ver Historial de Ventas",
          url: "/dashboard/sales/salesdashboard",
          permission: "sales",
        },
      ],
    },
    
  ],
  projects: [
    {
      name: "Inicio",
      url: "/dashboard",
      icon: Home,
    },
    {
      name: "Escaner QR",
      url: "/barcode",
      icon: QrCode,
    },
    {
      name: "Login",
      url: "/login",
      icon: UserIcon,
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
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

  const { userName, role } = useAuth()
  const { totalUnread } = useMessages()
  const { settings } = useSiteSettings()
  const checkPermission = useModulePermission()
  const normalizedRoleValue = role?.toString().trim().toUpperCase() ?? ""

  const roleLabel = React.useMemo(() => {
    if (!normalizedRoleValue) {
      return "Usuario"
    }

    const roleMap: Record<string, string> = {
      SUPER_ADMIN_GLOBAL: "Super Admin Global",
      SUPER_ADMIN_ORG: "Super Administrador",
      ADMIN: "Administrador",
      EMPLOYEE: "Empleado",
    }

    if (roleMap[normalizedRoleValue]) {
      return roleMap[normalizedRoleValue]
    }

    const formatted = normalizedRoleValue
      .toLowerCase()
      .split(/[_\s]+/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ")

    return (
      formatted ||
      normalizedRoleValue.charAt(0) +
        normalizedRoleValue.slice(1).toLowerCase()
    )
  }, [normalizedRoleValue])

  const accountingEnabled = useFeatureFlag("ACCOUNTING_ENABLED")
  const canAccessAccounting = useRBAC(["admin", "accountant", "auditor"])

  const adsEnabled = useFeatureFlag("ads")
  const canManageAds = useRBAC(["admin", "marketing"])
  const canAccessAds = adsEnabled && canManageAds

  const teams = React.useMemo(() => {
    const primaryTeam = data.teams[0]
    const companyName = settings.company?.name?.trim()

    return [
      {
        ...primaryTeam,
        name: companyName || primaryTeam.name,
        plan: roleLabel,
      },
      ...data.teams.slice(1),
    ]
  }, [roleLabel, settings.company?.name])

  const brandLogo = settings.brand?.logoUrl?.trim()

  const profile = {
    name: userName || "",
    email: "",
    avatar: brandLogo && brandLogo.length > 0 ? brandLogo : "/logo_ti.png",
  }

  const filteredNav = data.navMain
    .filter((item) => {
      if (!checkPermission(item.permission)) {
        return false
      }

      if (item.requiredRoles?.length) {
        if (!normalizedRoleValue) {
          return false
        }

        return item.requiredRoles.some(
          (required) => required.toUpperCase() === normalizedRoleValue,
        )
      }

      return true
    })
    .map((item) => {
      const items = item.items?.filter((subItem) =>
        checkPermission(subItem.permission ?? item.permission)
      )

      return {
        ...item,
        items,
      }
    })
    .filter((item) => !item.items || item.items.length > 0)

  const filteredProjects = data.projects.filter((project) =>
    checkPermission(project.permission)
  )

  const navMain = React.useMemo(() => {
    const items = filteredNav.map((item) => {
      if (item.title === "Ventas") {
        return {
          ...item,
          items: item.items?.map((sub) =>
            sub.title === "Mensajes" ? { ...sub, badge: totalUnread } : sub
          ),
        }
      }
      return item
    })
    if (accountingEnabled && canAccessAccounting && checkPermission("accounting")) {
      const accountingItem = {
        title: "Contabilidad",
        url: "/dashboard/accounting",
        icon: PieChart,
        permission: "accounting" as const,
        items: [
          { title: "Plan de Cuentas", url: "/dashboard/accounting/chart", permission: "accounting" as const },
          { title: "Diarios", url: "/dashboard/accounting/journals", permission: "accounting" as const },
          { title: "Asientos", url: "/dashboard/accounting/entries", permission: "accounting" as const },
          { title: "Libro Mayor", url: "/dashboard/accounting/reports/ledger", permission: "accounting" as const },
          {
            title: "Balance de Comprobación",
            url: "/dashboard/accounting/reports/trial-balance",
            permission: "accounting" as const,
          },
        ],
      }
      const insertIndex = items.findIndex((i) =>
        i.title.localeCompare(accountingItem.title, "es") > 0
      )
      if (insertIndex === -1) {
        items.push(accountingItem)
      } else {
        items.splice(insertIndex, 0, accountingItem)
      }
    }
    if (canAccessAds && checkPermission("ads")) {
      items.push({
        title: "Publicidad",
        url: "#",
        icon: Megaphone,
        permission: "ads" as const,
        items: [
          {
            title: "Publicidad",
            url: "/ads",
            permission: "ads" as const,
          },
        ],
      })
    }

    return items
  }, [
    filteredNav,
    totalUnread,
    canAccessAds,
    accountingEnabled,
    canAccessAccounting,
    checkPermission,
    settings.permissions,
    role,
  ])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} initialTeamIndex={0} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavProjects projects={filteredProjects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={profile} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

