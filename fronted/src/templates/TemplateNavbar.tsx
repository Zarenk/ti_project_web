"use client"

import { useSiteSettings } from "@/context/site-settings-context"
import { useTemplateComponents } from "./use-store-template"
import { resolveTemplate } from "./resolve-template"
import type { NavbarProps } from "./types"

/**
 * Template-aware Navbar that renders the correct Navbar component
 * based on the active store template from SiteSettings.
 */
export default function TemplateNavbar(props: NavbarProps) {
  const { settings } = useSiteSettings()
  const templateId = resolveTemplate(settings.storeTemplate)
  const { Navbar } = useTemplateComponents(templateId)

  return <Navbar {...props} />
}
