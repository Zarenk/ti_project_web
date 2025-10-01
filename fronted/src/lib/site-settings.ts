import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";

import {
  defaultSiteSettings,
  siteSettingsSchema,
  siteSettingsWithMetaSchema,
  type SiteSettings,
} from "@/context/site-settings-schema";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
const SITE_SETTINGS_URL = `${BACKEND_URL}/api/site-settings`;

export interface SiteSettingsFetchResult {
  settings: SiteSettings;
  updatedAt: string | null;
  createdAt: string | null;
}

async function resolveAuthHeaders(): Promise<Record<string, string>> {
  const resolvedHeaders = await headers();
  const authorizationHeader = resolvedHeaders.get("authorization");
  if (authorizationHeader) {
    return { Authorization: authorizationHeader };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }

  return {};
}

async function fetchSiteSettings(): Promise<SiteSettingsFetchResult> {
  try {
    const response = await fetch(SITE_SETTINGS_URL, {
      cache: "no-store",
      headers: await resolveAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          settings: defaultSiteSettings,
          updatedAt: null,
          createdAt: null,
        };
      }

      throw new Error(`Failed to load site settings (${response.status})`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return {
        settings: defaultSiteSettings,
        updatedAt: null,
        createdAt: null,
      };
    }

    const payload = await response.json();
    const parsedWithMeta = siteSettingsWithMetaSchema.safeParse(payload);

    if (parsedWithMeta.success) {
      return {
        settings: parsedWithMeta.data.settings,
        updatedAt: parsedWithMeta.data.updatedAt ?? null,
        createdAt: parsedWithMeta.data.createdAt ?? null,
      };
    }

    const parsed = siteSettingsSchema.parse(payload);
    return {
      settings: parsed,
      updatedAt: response.headers.get("x-site-settings-updated-at"),
      createdAt: response.headers.get("x-site-settings-created-at"),
    };
  } catch (error) {
    console.error("Failed to read site settings", error);
    return {
      settings: defaultSiteSettings,
      updatedAt: null,
      createdAt: null,
    };
  }
}

export const getSiteSettings = cache(fetchSiteSettings);
