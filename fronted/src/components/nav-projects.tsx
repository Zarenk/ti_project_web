"use client"

import { type LucideIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useHelpAssistant } from "@/context/help-assistant-context"

export function NavProjects({
  projects,
}: {
  projects: {
    name: string
    url: string
    icon: LucideIcon
  }[]
}) {
  const { setIsOpen } = useHelpAssistant()
  const { setOpenMobile, isMobile } = useSidebar()

  const handleChatbotClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isMobile) setOpenMobile(false)
    setIsOpen(true)
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Otras Opciones</SidebarGroupLabel>
      <SidebarMenu>
        {projects.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              {item.url === "#chatbot" ? (
                <button
                  onClick={handleChatbotClick}
                  className="group relative flex w-full items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 text-sm font-medium outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <item.icon className="h-4 w-4 transition-transform group-hover:scale-110" />
                  <span>{item.name}</span>
                </button>
              ) : (
                <a href={item.url}>
                  <item.icon />
                  <span>{item.name}</span>
                </a>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
