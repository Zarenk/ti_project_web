"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  DollarSign,
  Frame,
  GalleryVerticalEnd,
  Globe,
  HouseIcon,
  Link,
  Map,
  PieChart,
  QrCode,
  Settings2,
  Settings2Icon,
  ShoppingCart,
  SquareTerminal,
  Store,
  UserIcon,
} from "lucide-react"

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

// Static navigation data
const data = {
  teams: [
    {
      name: "Tecnologia Informatica",
      logo: GalleryVerticalEnd,
      plan: "Administrador",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Almacen",
      url: "#",
      icon: HouseIcon,
      items: [
        {
          title: "Inventario",
          url: "/dashboard/inventory",
        },
        {
          title: "Nuevo Ingreso",
          url: "/dashboard/entries/new",
        },
        {
          title: "Traslados",
          url: "#",
        },
        {
          title: "Ver Almacen(es)",
          url: "/dashboard/entries",
        },
      ],
    },
    {
      title: "Categorias",
      url: "/dashboard/categories",
      icon: BookOpen,
      items: [
        {
          title: "Nueva Categoria",
          url: "/dashboard/categories/new",
        },
        {
          title: "Ver Categorias",
          url: "/dashboard/categories",
        },
      ],
    },
    {
      title: "Productos",
      url: "/dashboard/products",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "Administrar Marcas",
          url: "/dashboard/brands",
        },
        {
          title: "Nuevo Producto",
          url: "/dashboard/products/new",
        },
        {
          title: "Ver Productos",
          url: "/dashboard/products",
        },
      ],
    },
    {
      title: "Proveedores",
      url: "/dashboard/providers",
      icon: Globe,
      isActive: true,
      items: [
        {
          title: "Nuevo Proveedor",
          url: "/dashboard/providers/new",
        },
        {
          title: "Ver Proveedores",
          url: "/dashboard/providers",
        },
      ],
    },
    {
      title: "Usuarios",
      url: "#",
      icon: Bot,
      items: [
        { title: "Historial de Modificaciones", 
          url: "/dashboard/history" 
        },
        {
          title: "Nuevo Usuario",
          url: "/dashboard/users/new",
        },
        {
          title: "Ver Usuarios",
          url: "#",
        },
      ],
    },
    {
      title: "Tiendas",
      url: "#",
      icon: Store,
      items: [
        {
          title: "Nueva Tienda",
          url: "/dashboard/stores/new",
        },
        {
          title: "Ver Tiendas",
          url: "/dashboard/stores",
        },
      ],
    },
    {
      title: "Tipo de Cambio",
      url: "#",
      icon: DollarSign,
      items: [
        {
          title: "Nuevo Tipo de Cambio",
          url: "/dashboard/exchange/new",
        },
        {
          title: "Ver Tipo de Cambio",
          url: "/dashboard/exchange",
        },
      ],
    },
    {
      title: "Catálogo",
      url: "/dashboard/catalog",
      icon: Link,
      items: [
        {
          title: "Exportar Catálogo",
          url: "/dashboard/catalog",
        },
      ],
    },
    {
      title: "Ventas",
      url: "#",
      icon: ShoppingCart,
      items: [
        {
          title: "Caja",
          url: "/dashboard/cashregister",
        },
        {
          title: "Mensajes",
          url: "/dashboard/messages",
        },
        {
          title: "Pedidos",
          url: "/dashboard/orders",
        },
        {
          title: "Realizar Venta",
          url: "/dashboard/sales/new",
        },
        {
          title: "Ver Historial de Ventas",
          url: "/dashboard/sales/salesdashboard",
        },
      ],
    },
    
  ],
  projects: [
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
      url: "#",
      icon: Settings2Icon,
    },
    {
      name: "Pagina Web",
      url: "/store",
      icon: Globe,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

  const { userName, userId, role } = useAuth()
  const { totalUnread } = useMessages()

  const accountingEnabled = useFeatureFlag("ACCOUNTING_ENABLED")
  const canAccessAccounting = useRBAC(["admin", "accountant", "auditor"])

  const adsLabEnabled = process.env.NEXT_PUBLIC_ADSLAB_ENABLED === 'true'
  const allowUserIds = process.env.NEXT_PUBLIC_ADSLAB_ALLOWLIST_USER_IDS
    ? process.env.NEXT_PUBLIC_ADSLAB_ALLOWLIST_USER_IDS.split(',').map((id) => id.trim()).filter(Boolean)
    : []
  const allowRoles = process.env.NEXT_PUBLIC_ADSLAB_ALLOWLIST_ROLES
    ? process.env.NEXT_PUBLIC_ADSLAB_ALLOWLIST_ROLES.split(',').map((r) => r.trim()).filter(Boolean)
    : []
  const canAccessAdsLab = adsLabEnabled && (
    (userId !== null && allowUserIds.includes(String(userId))) ||
    (role !== null && allowRoles.includes(role))
  )

  const profile = {
    name: userName || "",
    email: "",
    avatar: "/logo_ti.png",
  }

  const navMain = React.useMemo(() => {
    const items = data.navMain.map((item) => {
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
    if (accountingEnabled && canAccessAccounting) {
      items.push({
        title: "Contabilidad",
        url: "#",
        icon: PieChart,
        items: [
          { title: "Plan de Cuentas", url: "/accounting/chart" },
          { title: "Diarios", url: "/accounting/journals" },
          { title: "Asientos", url: "/accounting/entries" },
          { title: "Libro Mayor", url: "/accounting/reports/ledger" },
          {
            title: "Balance de Comprobación",
            url: "/accounting/reports/trial-balance",
          },
        ],
      })
    }
  if (canAccessAdsLab) {
      items.push({
        title: "AdsLab",
        url: "#",
        icon: Bot,
        items: [
          {
            title: "AdsLab",
            url: "/dashboard/adslab",
          },
        ],
      })
    }

    return items
  }, [totalUnread, canAccessAdsLab, accountingEnabled, canAccessAccounting])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={profile} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
