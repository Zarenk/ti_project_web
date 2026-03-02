"use client"

import { PageGuideButton } from "@/components/page-guide-dialog"
import { STORES_LIST_GUIDE_STEPS } from "./stores-guide-steps"

export function StoresGuideButton() {
  return (
    <PageGuideButton
      steps={STORES_LIST_GUIDE_STEPS}
      tooltipLabel="Guía de tiendas"
    />
  )
}
