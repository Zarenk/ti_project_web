"use client"

import { PageGuideButton } from "@/components/page-guide-dialog"
import { TENANCY_GUIDE_STEPS } from "./tenancy-guide-steps"

export function TenancyGuideButton() {
  return <PageGuideButton steps={TENANCY_GUIDE_STEPS} tooltipLabel="Guía de organizaciones" />
}
