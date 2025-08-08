"use client"

import * as React from "react"
import { useEffect, useState } from "react"
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
import { getUserProfile } from "../app/dashboard/users/users.api"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useMessages } from "@/context/messages-context"

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

  const [user, setUser] = useState({
    name: "",
    email: "",
    avatar: "/logo_ti.png",
  })
  const { totalUnread } = useMessages()

  useEffect(() => {
    async function fetchProfile() {
      try {
        const profile = await getUserProfile()
        setUser({
          name: profile.username,
          email: profile.email,
          avatar: "/logo_ti.png",
        })
      } catch (error) {
        console.error("Error fetching user profile:", error)
      }
    }
    fetchProfile()
  }, [])

  const navMain = React.useMemo(() => {
    return data.navMain.map((item) => {
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
  }, [totalUnread])

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
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
