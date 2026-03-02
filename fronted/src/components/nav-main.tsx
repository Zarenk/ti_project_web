"use client"

import { usePathname } from "next/navigation"
import { ChevronRight, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import Link from "next/link"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    requiredRoles?: string[]
    items?: {
      title: string
      url: string
      badge?: number
      requiredRoles?: string[]
    }[]
  }[]
}) {
  const { setOpenMobile, isMobile } = useSidebar()
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const hasSubItems = item.items && item.items.length > 0
          const isGroupActive = hasSubItems
            ? item.items!.some(
                (sub) => sub.url !== "#" && pathname.startsWith(sub.url),
              )
            : item.url !== "#" && pathname.startsWith(item.url)

          if (!hasSubItems) {
            // Direct link item (no sub-items) — e.g. WhatsApp
            return (
              <SidebarMenuItem key={`${item.title}-${item.url}`}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  data-active={isGroupActive}
                  className="group/btn transition-all duration-200 ease-out active:scale-[0.98]"
                >
                  <Link
                    href={item.url}
                    onClick={() => {
                      if (isMobile) {
                        setOpenMobile(false)
                      }
                    }}
                  >
                    {item.icon && (
                      <item.icon className="transition-transform duration-200 ease-out group-hover/btn:translate-x-0.5" />
                    )}
                    <span className="transition-transform duration-200 ease-out group-hover/btn:translate-x-0.5">
                      {item.title}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          return (
            <Collapsible
              key={`${item.title}-${item.url}`}
              asChild
              defaultOpen={item.isActive || isGroupActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    data-active={isGroupActive}
                    className="group/btn transition-all duration-200 ease-out active:scale-[0.98]"
                  >
                    {item.icon && (
                      <item.icon className="transition-transform duration-200 ease-out group-hover/btn:translate-x-0.5" />
                    )}
                    <span className="transition-transform duration-200 ease-out group-hover/btn:translate-x-0.5">
                      {item.title}
                    </span>
                    <ChevronRight className="ml-auto transition-transform duration-200 ease-out group-hover/btn:translate-x-0.5 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem, idx) => {
                      const isActive =
                        subItem.url !== "#" && pathname === subItem.url

                      return (
                        <SidebarMenuSubItem
                          key={`${subItem.title}-${subItem.url}`}
                          className="animate-sidebar-sub-enter"
                          style={{ animationDelay: `${idx * 30}ms` }}
                        >
                          <SidebarMenuSubButton
                            asChild
                            isActive={isActive}
                          >
                            <Link
                              href={subItem.url}
                              className="group/sub flex w-full items-center justify-between transition-all duration-200 ease-out active:scale-[0.98]"
                              onClick={() => {
                                if (isMobile) {
                                  setOpenMobile(false)
                                }
                              }}
                            >
                              <span className="transition-transform duration-150 ease-out group-hover/sub:translate-x-0.5">
                                {subItem.title}
                              </span>
                              {subItem.badge !== undefined &&
                                subItem.badge > 0 && (
                                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white animate-sidebar-badge">
                                    {subItem.badge}
                                  </span>
                                )}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}