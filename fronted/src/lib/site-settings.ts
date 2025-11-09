import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";

import {
  defaultSiteSettings,
  siteSettingsSchema,
  siteSettingsWithMetaSchema,
  type SiteSettings,
  type SiteSettingsWithMeta,
} from "@/context/site-settings-schema";
import { getRequestTenant } from "@/lib/server/tenant-context";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
const SITE_SETTINGS_URL = `${BACKEND_URL}/api/site-settings`;

export interface SiteSettingsFetchResult {
  settings: SiteSettings;
  updatedAt: string | null;
  createdAt: string | null;
}

async function resolveAuthHeaders(): Promise<Record<string, string>> {
  const resolvedHeaders = await headers();
  const tenant = await getRequestTenant();

  const authorizationHeader = resolvedHeaders.get("authorization");
  const headersToSend: Record<string, string> = {};

  if (authorizationHeader) {
    headersToSend.Authorization = authorizationHeader;
  }

  if (!headersToSend.Authorization) {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (token) {
      headersToSend.Authorization = `Bearer ${token}`;
    }
  }

  if (tenant.organizationId) {
    headersToSend["x-org-id"] = String(tenant.organizationId);
  }

  if (tenant.companyId) {
    headersToSend["x-company-id"] = String(tenant.companyId);
  }

  if (tenant.slug) {
    headersToSend["x-tenant-slug"] = tenant.slug;
  }

  return headersToSend;
}

function normalizeSiteSettingsPayload(payload: unknown): SiteSettingsWithMeta | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  const rawSettings = record.settings;
  if (rawSettings !== null && typeof rawSettings === "object") {
    return {
      settings: rawSettings,
      updatedAt:
        typeof record.updatedAt === "string" || record.updatedAt === null
          ? (record.updatedAt as string | null)
          : null,
      createdAt:
        typeof record.createdAt === "string" || record.createdAt === null
          ? (record.createdAt as string | null)
          : null,
    } as SiteSettingsWithMeta;
  }

  const rawData = record.data;
  if (rawData !== null && typeof rawData === "object") {
    return {
      settings: rawData,
      updatedAt:
        typeof record.updatedAt === "string" || record.updatedAt === null
          ? (record.updatedAt as string | null)
          : null,
      createdAt:
        typeof record.createdAt === "string" || record.createdAt === null
          ? (record.createdAt as string | null)
          : null,
    } as SiteSettingsWithMeta;
  }

  return null;
}

async function fetchSiteSettingsInternal(): Promise<SiteSettingsFetchResult> {
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
    if (!payload || typeof payload !== "object") {
      return {
        settings: defaultSiteSettings,
        updatedAt: null,
        createdAt: null,
      };
    }
    const normalized = normalizeSiteSettingsPayload(payload);
    const parsedWithMeta = siteSettingsWithMetaSchema.safeParse(normalized ?? payload);

    if (parsedWithMeta.success) {
      return {
        settings: parsedWithMeta.data.settings,
        updatedAt: parsedWithMeta.data.updatedAt ?? null,
        createdAt: parsedWithMeta.data.createdAt ?? null,
      };
    }

    const fallback = siteSettingsSchema.safeParse(payload);
    if (fallback.success) {
      return {
        settings: fallback.data,
        updatedAt: response.headers.get("x-site-settings-updated-at"),
        createdAt: response.headers.get("x-site-settings-created-at"),
      };
    }

    return {
      settings: defaultSiteSettings,
      updatedAt: null,
      createdAt: null,
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

const cachedGetSiteSettings = cache(async (_cacheKey: string) => {
  return fetchSiteSettingsInternal();
});

export async function getSiteSettings(): Promise<SiteSettingsFetchResult> {
  const tenant = await getRequestTenant();
  const cacheKey = `${tenant.organizationId ?? "anon"}::${tenant.companyId ?? "company"}::${tenant.slug ?? "default"}`;
  return cachedGetSiteSettings(cacheKey);
}
