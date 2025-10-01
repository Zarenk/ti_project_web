import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  defaultSiteSettings,
  siteSettingsSchema,
  siteSettingsUpdatePayloadSchema,
  siteSettingsWithMetaSchema,
} from "@/context/site-settings-schema";

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

export async function GET(request: Request) {
  const token = await resolveAuthToken(request);

  try {
    const response = await fetch(SITE_SETTINGS_URL, {
      cache: "no-store",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    const parsedWithMeta = siteSettingsWithMetaSchema.safeParse(payload);

    if (parsedWithMeta.success) {
      const { settings, updatedAt, createdAt } = parsedWithMeta.data;
      const result = NextResponse.json(settings, { status: 200 });
      applyMetadataHeaders(result, { updatedAt, createdAt });
      return result;
    }
    const parsed = siteSettingsSchema.parse(payload);
    return NextResponse.json(parsed, { status: 200 });
  } catch (error) {
    console.error("GET /api/site-settings failed", error);
    return NextResponse.json(defaultSiteSettings, { status: 200 });
  }
}

export async function PUT(request: Request) {
  const token = await resolveAuthToken(request);
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
