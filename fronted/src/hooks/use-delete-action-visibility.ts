"use client";

import { useMemo } from "react";

import { useAuth } from "@/context/auth-context";
import { useSiteSettings } from "@/context/site-settings-context";

const SUPER_ROLES = new Set(["SUPER_ADMIN_GLOBAL", "SUPER_ADMIN_ORG", "SUPER_ADMIN"]);
const ADMIN_ROLES = new Set(["ADMIN", ...SUPER_ROLES]);

export function useDeleteActionVisibility(): boolean {
  const { role } = useAuth();
  const { settings } = useSiteSettings();

  return useMemo(() => {
    const perms = settings.permissions;
    const normalizedRole = role?.trim().toUpperCase() ?? "";

    // Super admins always see delete actions
    if (SUPER_ROLES.has(normalizedRole)) return true;

    // Admin: hidden only when hideDeleteForAdmins is true
    if (ADMIN_ROLES.has(normalizedRole)) {
      return !(perms?.hideDeleteForAdmins ?? false);
    }

    // Employee / other roles: hidden when hideDeleteForEmployees is true
    return !(perms?.hideDeleteForEmployees ?? false);
  }, [role, settings.permissions?.hideDeleteForEmployees, settings.permissions?.hideDeleteForAdmins]);
}
