"use client"

import { usePathname } from "next/navigation"
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
  const pathname = usePathname()

  const handleChatbotClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isMobile) setOpenMobile(false)
    setIsOpen(true)
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Otras Opciones</SidebarGroupLabel>
      <SidebarMenu>
        {projects.map((item) => {
          const isActive =
            item.url !== "#" &&
            item.url !== "#chatbot" &&
            pathname.startsWith(item.url)

          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild isActive={isActive}>
                {item.url === "#chatbot" ? (
                  <button
                    onClick={handleChatbotClick}
                    className="group/proj flex w-full cursor-pointer items-center gap-2 transition-all duration-200 ease-out active:scale-[0.98]"
                  >
                    <item.icon className="h-4 w-4 transition-transform duration-200 ease-out group-hover/proj:translate-x-0.5 group-hover/proj:scale-110" />
                    <span className="transition-transform duration-150 ease-out group-hover/proj:translate-x-0.5">
                      {item.name}
                    </span>
                  </button>
                ) : (
                  <a
                    href={item.url}
                    className="group/proj transition-all duration-200 ease-out active:scale-[0.98]"
                  >
                    <item.icon className="transition-transform duration-200 ease-out group-hover/proj:translate-x-0.5 group-hover/proj:scale-110" />
                    <span className="transition-transform duration-150 ease-out group-hover/proj:translate-x-0.5">
                      {item.name}
                    </span>
                  </a>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}