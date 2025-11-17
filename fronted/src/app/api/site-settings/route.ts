import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  defaultSiteSettings,
  siteSettingsSchema,
  siteSettingsUpdatePayloadSchema,
  siteSettingsWithMetaSchema,
  type SiteSettingsWithMeta,
} from "@/context/site-settings-schema";
import {
  TENANT_COOKIE_NAME,
  parseTenantCookie,
} from "@/lib/tenant/tenant-shared";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
const SITE_SETTINGS_URL = `${BACKEND_URL}/api/site-settings`;

function applyMetadataHeaders(
  response: NextResponse,
  metadata?: { updatedAt?: string | null; createdAt?: string | null },
) {
  const updatedAt = metadata?.updatedAt;
  if (updatedAt != null) {
    response.headers.set("x-site-settings-updated-at", updatedAt);
  }
  const createdAt = metadata?.createdAt;
  if (createdAt != null) {
    response.headers.set("x-site-settings-created-at", createdAt);
  }
}

async function resolveAuthToken(request: Request): Promise<string | undefined> {
  const headerToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (headerToken) {
    return headerToken;
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("token")?.value;
  if (cookieToken) {
    return cookieToken;
  }

  const cookieHeader = request.headers.get("cookie");
  const match = cookieHeader?.match(/token=([^;]+)/);
  return match?.[1];
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.clone().json();
    if (typeof data?.error === "string") {
      return data.error;
    }
    if (typeof data?.message === "string") {
      return data.message;
    }
  } catch {
    // ignore
  }

  try {
    const text = await response.clone().text();
    if (text) {
      return text;
    }
  } catch {
    // ignore
  }

  return response.statusText || "Error desconocido";
}

function parseCookieHeader(headerValue: string | null): Record<string, string> {
  if (!headerValue) return {};
  return headerValue.split(";").reduce<Record<string, string>>((acc, part) => {
    const [key, ...rest] = part.split("=");
    if (!key) return acc;
    const trimmedKey = key.trim();
    if (!trimmedKey) return acc;
    acc[trimmedKey] = decodeURIComponent(rest.join("=").trim());
    return acc;
  }, {});
}

function resolveTenantFromRequest(request: Request): {
  organizationId: number | null;
  companyId: number | null;
  slug: string | null;
} {
  const cookieHeader = request.headers.get("cookie");
  const cookies = parseCookieHeader(cookieHeader);

  const fromHeader = (name: string): number | null => {
    const value =
      request.headers.get(name) ??
      request.headers.get(name.toUpperCase());
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const resolveNumeric = (value: string | undefined): number | null => {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  let organizationId =
    fromHeader("x-org-id") ??
    resolveNumeric(cookies["tenant_org_id"]);
  let companyId =
    fromHeader("x-company-id") ??
    resolveNumeric(cookies["tenant_company_id"]);

  let slug = request.headers.get("x-tenant-slug");
  if (!slug) {
    const tenantCookieRaw = cookies[TENANT_COOKIE_NAME];
    const tenantPayload = parseTenantCookie(tenantCookieRaw ?? null);
    if (tenantPayload) {
      slug = tenantPayload.slug;
      if (!organizationId) {
        organizationId = tenantPayload.organizationId;
      }
    }
  }

  return { organizationId, companyId, slug };
}

function extractTenantHeaders(request: Request): Record<string, string> {
  const resolved: Record<string, string> = {};
  const tenant = resolveTenantFromRequest(request);

  const setIfPresent = (key: string, value: number | string | null) => {
    if (value === null || value === undefined) return;
    resolved[key] = typeof value === "number" ? String(value) : value;
  };

  setIfPresent("x-org-id", tenant.organizationId);
  setIfPresent("x-company-id", tenant.companyId);
  setIfPresent("x-tenant-slug", tenant.slug);

  return resolved;
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

export async function GET(request: Request) {
  const token = await resolveAuthToken(request);
  const tenantHeaders = extractTenantHeaders(request);

  try {
    const response = await fetch(SITE_SETTINGS_URL, {
      cache: "no-store",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...tenantHeaders,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(defaultSiteSettings, { status: 200 });
      }

      const message = await readErrorMessage(response);
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const payload = await response.json();
    if (!payload || typeof payload !== "object") {
      return NextResponse.json(defaultSiteSettings, { status: 200 });
    }
    const normalized = normalizeSiteSettingsPayload(payload);
    const parsedWithMeta = siteSettingsWithMetaSchema.safeParse(normalized ?? payload);

    if (parsedWithMeta.success) {
      const { settings, updatedAt, createdAt } = parsedWithMeta.data;
      const result = NextResponse.json(settings, { status: 200 });
      applyMetadataHeaders(result, { updatedAt, createdAt });
      return result;
    }
    const fallback = siteSettingsSchema.safeParse(payload);
    if (fallback.success) {
      return NextResponse.json(fallback.data, { status: 200 });
    }
    return NextResponse.json(defaultSiteSettings, { status: 200 });
  } catch (error) {
    console.error("GET /api/site-settings failed", error);
    return NextResponse.json(defaultSiteSettings, { status: 200 });
  }
}

export async function PUT(request: Request) {
  const token = await resolveAuthToken(request);
  const tenantHeaders = extractTenantHeaders(request);
  const body = await request.json();
  const parsedPayloadResult = siteSettingsUpdatePayloadSchema.safeParse(body);
  const payload = parsedPayloadResult.success
    ? parsedPayloadResult.data
    : { data: siteSettingsSchema.parse(body), expectedUpdatedAt: null };

  try {
    const response = await fetch(SITE_SETTINGS_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...tenantHeaders,
      },
      body: JSON.stringify({
        data: payload.data,
        expectedUpdatedAt: payload.expectedUpdatedAt ?? null,
      }),
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      return NextResponse.json({ error: message }, { status: response.status });
    }

    if (response.status === 204) {
      return NextResponse.json(payload.data, { status: 200 });
    }

    if (response.headers.get("content-type")?.includes("application/json")) {
      const data = await response.json();
      const parsedWithMeta = siteSettingsWithMetaSchema.safeParse(data);

      if (parsedWithMeta.success) {
        const { settings, updatedAt, createdAt } = parsedWithMeta.data;
        const result = NextResponse.json(settings, { status: 200 });
        applyMetadataHeaders(result, { updatedAt, createdAt });
        return result;
      }
      const parsed = siteSettingsSchema.parse(data);
      return NextResponse.json(parsed, { status: 200 });
    }

    return NextResponse.json(payload.data, { status: 200 });
  } catch (error) {
    console.error("PUT /api/site-settings failed", error);
    return NextResponse.json({ error: "No se pudieron guardar los ajustes." }, { status: 500 });
  }
}
