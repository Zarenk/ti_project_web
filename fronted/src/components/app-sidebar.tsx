"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import NextLink from "next/link"
import {
  Boxes,
  Building2,
  BookOpen,
  Bot,
  Command,
  DollarSign,
  Globe,
  Home,
  HouseIcon,
  Link as LinkIcon,
  Map,
  Megaphone,
  PieChart,
  QrCode,
  Settings2Icon,
  ShoppingCart,
  SquareTerminal,
  Store,
  Table2,
  Truck,
  Utensils,
  UserIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useMessages } from "@/context/messages-context"
import { useAuth } from "@/context/auth-context"
import { useFeatureFlag } from "@/app/hooks/use-feature-flags"
import { useRBAC } from "@/app/hooks/use-rbac"
import { useSiteSettings } from "@/context/site-settings-context"
import { useModulePermission, type ModulePermissionKey } from "@/hooks/use-module-permission"
import { useVerticalConfig } from "@/hooks/use-vertical-config"
import type { VerticalFeatures } from "@/app/dashboard/tenancy/tenancy.api"

type NavSubItem = {
  title: string
  url: string
  permission?: ModulePermissionKey
  badge?: number
  requiredRoles?: string[]
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
  navMain: NavItem[]
  projects: ProjectItem[]
}

// Static navigation data
const data: SidebarData = {
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
        {
          title: "Super usuarios",
          url: "/dashboard/super-users",
          permission: "settings",
          requiredRoles: ["SUPER_ADMIN_GLOBAL"],
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
        {
          title: "Empresas",
          url: "/dashboard/tenancy/companies",
          permission: "settings",
          requiredRoles: ["SUPER_ADMIN_GLOBAL", "SUPER_ADMIN_ORG"],
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
          permission: "salesHistory",
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
      name: "Onboarding",
      url: "/dashboard/onboarding",
      icon: Map,
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

const NAV_FEATURE_REQUIREMENTS: Record<string, keyof VerticalFeatures> = {
  Almacen: "inventory",
  Categorias: "inventory",
  Productos: "inventory",
  Proveedores: "inventory",
  Ventas: "sales",
  Tiendas: "posIntegration",
  Catalogo: "ecommerceIntegration",
}

const CUSTOM_MENU_ICONS: Record<string, LucideIcon> = {
  table: Table2,
  kitchen: Utensils,
  ingredients: Boxes,
  "cash-register": SquareTerminal,
  book: BookOpen,
  truck: Truck,
  store: Store,
  home: Home,
}

function resolveCustomMenuIcon(name?: string): LucideIcon {
  if (!name) return Command
  const key = name.toLowerCase()
  return CUSTOM_MENU_ICONS[key] ?? Command
}

const TeamSwitcherLazy = dynamic(
  () =>
    import("@/components/team-switcher").then((mod) => ({
      default: mod.TeamSwitcher,
    })),
  {
    ssr: false,
    loading: () => <TeamSwitcherSkeleton />,
  },
)

function TeamSwitcherSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <div className="h-10 flex-1 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

  const { userName, role } = useAuth()
  const { totalUnread } = useMessages()
  const { settings } = useSiteSettings()
  const checkPermission = useModulePermission()
  const { info: verticalInfo, migration } = useVerticalConfig()
  const normalizedRoleValue = role?.toString().trim().toUpperCase() ?? ""
  const verticalFeatures = verticalInfo?.config?.features

  const accountingEnabled = useFeatureFlag("ACCOUNTING_ENABLED")
  const canAccessAccounting = useRBAC([
    "admin",
    "accountant",
    "auditor",
    "SUPER_ADMIN_GLOBAL",
    "SUPER_ADMIN_ORG",
  ])

  const adsEnabled = useFeatureFlag("ads")
  const canManageAds = useRBAC(["admin", "marketing"])
  const canAccessAds = adsEnabled && canManageAds

  const brandLogo = settings.brand?.logoUrl?.trim()

  const profile = {
    name: userName || "",
    email: "",
    avatar: brandLogo && brandLogo.length > 0 ? brandLogo : "/logo_ti.png",
  }

  const filteredNav = data.navMain
    .filter((item) => {
      if (verticalFeatures) {
        const feature = NAV_FEATURE_REQUIREMENTS[item.title]
        if (feature && verticalFeatures[feature] === false) {
          return false
        }
      }
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
      const items = item.items?.filter((subItem) => {
        if (verticalFeatures) {
          const feature = NAV_FEATURE_REQUIREMENTS[item.title] ?? NAV_FEATURE_REQUIREMENTS[subItem.title]
          if (feature && verticalFeatures[feature] === false) {
            return false
          }
        }
        if (!checkPermission(subItem.permission ?? item.permission)) {
          return false
        }

        if (subItem.requiredRoles?.length) {
          if (!normalizedRoleValue) {
            return false
          }

          return subItem.requiredRoles.some(
            (required) => required.toUpperCase() === normalizedRoleValue,
          )
        }

        return true
      })

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
    if (verticalInfo?.config?.ui?.customMenuItems?.length) {
      const normalizeLabel = (value: string) =>
        value
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "");
      const excludedCustomLabels = new Set(["pos", "catalogo"]);
      verticalInfo.config.ui.customMenuItems.forEach((menu) => {
        const normalized = normalizeLabel(menu.label ?? "");
        if (excludedCustomLabels.has(normalized)) {
          return;
        }
        items.push({
          title: menu.label,
          url: menu.path,
          icon: resolveCustomMenuIcon(menu.icon),
        })
      })
    }
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
            title: "Balance de Comprobacion",
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
    verticalInfo,
  ])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcherLazy />
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

