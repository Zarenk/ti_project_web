"use client"

import { PageGuideButton } from "@/components/page-guide-dialog"
import { COMPANIES_GUIDE_STEPS } from "./companies-guide-steps"

export function CompaniesGuideButton() {
  return <PageGuideButton steps={COMPANIES_GUIDE_STEPS} tooltipLabel="Guía de empresas" />
}
