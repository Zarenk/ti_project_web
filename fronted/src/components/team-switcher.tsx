"use client"

import * as React from "react"
import { ChevronsUpDown, Plus } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ModeToggle } from "./mode-toggle"

type Team = {
  name: string
  logo: React.ElementType
  plan: string
}

interface TeamSwitcherProps {
  teams: Team[]
  initialTeamIndex?: number
}

export function TeamSwitcher({ teams, initialTeamIndex = 0 }: TeamSwitcherProps) {
  const { isMobile } = useSidebar()
  const [activeTeamIndex, setActiveTeamIndex] = React.useState(() => {
    if (!teams.length) {
      return 0
    }

    return Math.min(Math.max(initialTeamIndex, 0), teams.length - 1)
  })

  React.useEffect(() => {
    if (!teams.length) {
      setActiveTeamIndex(0)
      return
    }

    setActiveTeamIndex((current) => {
      if (current >= 0 && current < teams.length) {
        return current
      }

      return Math.min(Math.max(initialTeamIndex, 0), teams.length - 1)
    })
  }, [teams, initialTeamIndex])

  const activeTeam = teams[activeTeamIndex]

  if (!activeTeam) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <activeTeam.logo className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeTeam.name}</span>
                <span className="truncate text-xs">{activeTeam.plan}</span>
              </div>
              
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Mis Empresas
            </DropdownMenuLabel>
            {teams.map((team, index) => (
              <DropdownMenuItem
                key={team.name}
                onClick={() => setActiveTeamIndex(index)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <team.logo className="size-3.5 shrink-0" />
                </div>
                {team.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Agregar Empresa</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
          <div className="flex justify-end">
            <ModeToggle></ModeToggle>
          </div>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
