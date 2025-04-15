"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Globe,
  HouseIcon,
  Link,
  Map,
  PieChart,
  Settings2,
  Settings2Icon,
  ShoppingCart,
  SquareTerminal,
  Store,
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

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
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
          url: "#",
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
      title: "Ventas",
      url: "#",
      icon: ShoppingCart,
      items: [
        {
          title: "Caja",
          url: "",
        },
        {
          title: "Realizar Venta",
          url: "/dashboard/sales/new",
        },
        {
          title: "Ver Historial de Ventas",
          url: "/dashboard/sales",
        },
      ],
    },
    
  ],
  projects: [
    {
      name: "Pagina Web",
      url: "#",
      icon: Globe,
    },
    {
      name: "Estadisticas",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Opciones",
      url: "#",
      icon: Settings2Icon,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
