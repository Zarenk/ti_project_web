"use client"

import { PageGuideButton } from "@/components/page-guide-dialog"
import { ENTRIES_LIST_GUIDE_STEPS } from "./entries-list-guide-steps"

export function EntriesListGuideButton() {
  return (
    <PageGuideButton
      steps={ENTRIES_LIST_GUIDE_STEPS}
      tooltipLabel="Guía de ingresos"
    />
  )
}
