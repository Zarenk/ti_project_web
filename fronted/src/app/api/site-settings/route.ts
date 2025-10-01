import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { defaultSiteSettings, siteSettingsSchema } from "@/context/site-settings-schema";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
const SITE_SETTINGS_URL = `${BACKEND_URL}/api/site-settings`;

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
  const payload = siteSettingsSchema.parse(body);

  try {
    const response = await fetch(SITE_SETTINGS_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      return NextResponse.json({ error: message }, { status: response.status });
    }

    if (response.status === 204) {
      return NextResponse.json(payload, { status: 200 });
    }

    if (response.headers.get("content-type")?.includes("application/json")) {
      const data = await response.json();
      const parsed = siteSettingsSchema.parse(data);
      return NextResponse.json(parsed, { status: 200 });
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("PUT /api/site-settings failed", error);
    return NextResponse.json({ error: "No se pudieron guardar los ajustes." }, { status: 500 });
  }
}