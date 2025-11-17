"use client";

import { useMemo } from "react";

import { useAuth } from "@/context/auth-context";
import { useSiteSettings } from "@/context/site-settings-context";

const SUPER_ROLES = new Set(["SUPER_ADMIN_GLOBAL", "SUPER_ADMIN_ORG", "SUPER_ADMIN"]);

export function useDeleteActionVisibility(): boolean {
  const { role } = useAuth();
  const { settings } = useSiteSettings();

  return useMemo(() => {
    const hideDeleteActions = settings.permissions?.hideDeleteActions ?? false;
    if (!hideDeleteActions) {
      return true;
    }

    const normalizedRole = role?.trim().toUpperCase() ?? "";
    return SUPER_ROLES.has(normalizedRole);
  }, [role, settings.permissions?.hideDeleteActions]);
}
