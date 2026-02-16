"use client"

import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react"

import type {
  OrganizationVerticalInfo,
  VerticalFeatures,
  VerticalProductSchema,
  VerticalUIConfig,
} from "@/app/dashboard/tenancy/tenancy.api"
import type { SiteSettings } from "@/context/site-settings-schema"
import { useSiteSettings } from "@/context/site-settings-context"
import { useVerticalConfig } from "@/hooks/use-vertical-config"

type TenantFeaturesContextValue = {
  verticalInfo: OrganizationVerticalInfo | null
  migration: OrganizationVerticalInfo["migration"] | null
  features: VerticalFeatures | null
  productSchema: VerticalProductSchema | null
  ui: VerticalUIConfig | null
  permissions: SiteSettings["permissions"]
  isLoading: boolean
  refresh: () => Promise<void>
}

const TenantFeaturesContext = createContext<TenantFeaturesContextValue | null>(null)

const FEATURE_PERMISSION_MAP: Partial<
  Record<keyof VerticalFeatures, keyof SiteSettings["permissions"]>
> = {
  sales: "sales",
  inventory: "inventory",
}

function mergeVerticalPermissions(
  base: SiteSettings["permissions"],
  features: VerticalFeatures | null,
): SiteSettings["permissions"] {
  if (!features) {
    return base
  }
  const merged: SiteSettings["permissions"] = { ...base }
  for (const [featureKey, permissionKey] of Object.entries(FEATURE_PERMISSION_MAP)) {
    if (!permissionKey) continue
    const featureEnabled = features[featureKey as keyof VerticalFeatures]
    if (featureEnabled === false) {
      merged[permissionKey] = false
    }
  }
  return merged
}

export function TenantFeaturesProvider({ children }: PropsWithChildren) {
  const { info, migration, isLoading, refresh } = useVerticalConfig()
  const { settings } = useSiteSettings()
  const features = info?.config?.features ?? null
  const productSchema = info?.config?.productSchema ?? null
  const ui = info?.config?.ui ?? null
  const permissions = useMemo(
    () => mergeVerticalPermissions(settings.permissions, features),
    [settings.permissions, features],
  )

  const value = useMemo<TenantFeaturesContextValue>(
    () => ({
      verticalInfo: info ?? null,
      migration,
      features,
      productSchema,
      ui,
      permissions,
      isLoading,
      refresh: () => refresh(),
    }),
    [info, migration, features, productSchema, ui, permissions, isLoading, refresh],
  )

  return (
    <TenantFeaturesContext.Provider value={value}>
      {children}
    </TenantFeaturesContext.Provider>
  )
}

export function useTenantFeatures(): TenantFeaturesContextValue {
  const context = useContext(TenantFeaturesContext)
  if (!context) {
    throw new Error("useTenantFeatures debe usarse dentro de TenantFeaturesProvider")
  }
  return context
}

export function useOptionalTenantFeatures(): TenantFeaturesContextValue | null {
  return useContext(TenantFeaturesContext)
}
