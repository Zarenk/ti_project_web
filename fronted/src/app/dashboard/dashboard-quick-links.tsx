"use client"

import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { useModulePermission } from "@/hooks/use-module-permission"
import { getQuickLinks, type QuickLink } from "./dashboard-config"
import type { ModulePermissionKey } from "@/hooks/use-module-permission"

interface DashboardQuickLinksProps {
  vertical: string
  userName?: string
}

export function DashboardQuickLinks({ vertical, userName }: DashboardQuickLinksProps) {
  const checkPermission = useModulePermission()
  const allLinks = getQuickLinks(vertical)

  // Filter by permission
  const links = allLinks.filter((link) => {
    if (!link.permission) return true
    return checkPermission(link.permission as ModulePermissionKey)
  })

  return (
    <div className="flex flex-col gap-6 w-full min-w-0">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-semibold">
          {userName ? `Hola, ${userName}` : "Bienvenido"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Accesos rapidos a tus herramientas
        </p>
      </div>

      {/* Quick links grid */}
      {links.length > 0 ? (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {links.map((link) => (
            <QuickLinkCard key={link.href} link={link} />
          ))}
        </div>
      ) : (
        <Card className="w-full min-w-0 overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No tienes modulos asignados aun. Contacta a tu administrador.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function QuickLinkCard({ link }: { link: QuickLink }) {
  const Icon = link.icon
  return (
    <Link href={link.href} className="block">
      <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:border-primary/30 w-full min-w-0 overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center gap-2 py-6 px-3 text-center">
          <div className="rounded-full bg-primary/10 p-3">
            <Icon className="h-6 w-6 text-primary flex-shrink-0" />
          </div>
          <p className="text-sm font-medium">{link.title}</p>
          <p className="text-xs text-muted-foreground break-words">{link.description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}
