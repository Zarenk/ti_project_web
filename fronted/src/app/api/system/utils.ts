import { cookies } from "next/headers";

export async function resolveAuthToken(request: Request): Promise<string | undefined> {
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

export async function readErrorMessage(response: Response): Promise<string> {
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