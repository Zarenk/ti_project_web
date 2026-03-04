"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import {
  Megaphone,
  PieChart,
} from "lucide-react"

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
import { useMessages } from "@/context/messages-context"
import { useAuth } from "@/context/auth-context"
import { useFeatureFlag } from "@/app/hooks/use-feature-flags"
import { useRBAC } from "@/app/hooks/use-rbac"
import { useSiteSettings } from "@/context/site-settings-context"
import { useModulePermission } from "@/hooks/use-module-permission"
import { useVerticalConfig } from "@/hooks/use-vertical-config"
import {
  data,
  NAV_FEATURE_REQUIREMENTS,
  RESTAURANT_HIDDEN_NAV,
  RESTAURANT_HIDDEN_PROJECTS,
  GYM_HIDDEN_NAV,
  GYM_HIDDEN_PROJECTS,
  resolveCustomMenuIcon,
} from "@/components/sidebar-navigation-data"
import { ModeToggle } from "@/components/mode-toggle"

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
  const isComputerVertical = verticalInfo?.businessVertical === "COMPUTERS"
  const isRestaurantVertical = verticalInfo?.businessVertical === "RESTAURANTS"
  const isLegalVertical = verticalInfo?.businessVertical === "LAW_FIRM"
  const isGymVertical = verticalInfo?.businessVertical === "GYM"

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
      if (isRestaurantVertical && RESTAURANT_HIDDEN_NAV.has(item.title)) {
        return false
      }
      if (isGymVertical && GYM_HIDDEN_NAV.has(item.title)) {
        return false
      }
      if (item.title === "Legal" && !isLegalVertical) {
        return false
      }
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

  const filteredProjects = data.projects.filter((project) => {
    if (isRestaurantVertical && RESTAURANT_HIDDEN_PROJECTS.has(project.name)) {
      return false
    }
    if (isGymVertical && GYM_HIDDEN_PROJECTS.has(project.name)) {
      return false
    }
    return checkPermission(project.permission)
  }).sort((a, b) => a.name.localeCompare(b.name, "es"))

  const navMain = React.useMemo(() => {
    const items = filteredNav.map((item) => {
      if (item.title === "Ventas") {
        const canAccessQuotes = isComputerVertical && checkPermission("sales")
        return {
          ...item,
          items: [
            ...(item.items ?? []),
            ...(canAccessQuotes
              ? [
                  {
                    title: "Cotizaciones",
                    url: "/dashboard/quotes",
                    permission: "sales" as const,
                  },
                ]
              : []),
          ].map((sub) =>
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
      if (isLegalVertical) {
        ["expedientes", "nuevo expediente", "calendario", "documentos", "jurisprudencia", "asistente legal ia"].forEach(
          (l) => excludedCustomLabels.add(l),
        );
      }
      verticalInfo.config.ui.customMenuItems.forEach((menu) => {
        const normalized = normalizeLabel(menu.label ?? "");
        if (excludedCustomLabels.has(normalized)) {
          return;
        }
        items.push({
          title: menu.label,
          url: "#",
          icon: resolveCustomMenuIcon(menu.icon),
          items: [
            {
              title: menu.label,
              url: menu.path,
            },
          ],
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
          { title: "General", url: "/dashboard/accounting", permission: "accounting" as const },
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
      items.push(accountingItem)
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

    // Sort main items and sub-items alphabetically (A → Z)
    items.sort((a, b) => a.title.localeCompare(b.title, "es"))
    for (const item of items) {
      if (item.items?.length) {
        item.items.sort((a, b) => a.title.localeCompare(b.title, "es"))
      }
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
    isComputerVertical,
  ])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-1">
          <div className="flex-1 min-w-0">
            <TeamSwitcherLazy />
          </div>
          <div className="group-data-[collapsible=icon]:hidden flex-shrink-0">
            <ModeToggle />
          </div>
        </div>
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

