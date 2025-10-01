"use client";

import type { ReactElement } from "react";
import { useSiteSettings } from "@/context/site-settings-context";

export function DashboardCompanyName(): ReactElement {
  const { settings } = useSiteSettings();

  const companyName = settings.company?.name?.trim();
  const displayName =
    companyName && companyName.length > 0 ? companyName : "Nombre de la empresa";

  return <span>{displayName}</span>;
}
