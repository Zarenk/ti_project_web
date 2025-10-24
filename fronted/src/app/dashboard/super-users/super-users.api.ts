import { authFetch } from "@/utils/auth-fetch";

export interface CreateManagedUserPayload {
  email: string;
  username?: string;
  password: string;
  role: "ADMIN" | "SUPER_ADMIN_ORG";
  status?: string;
  organizationId?: number | null;
}

export async function createManagedUser(payload: CreateManagedUserPayload) {
  const response = await authFetch("/api/users/admin/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 403) {
    throw new Error("No tienes permisos para crear usuarios de alto privilegio");
  }

  if (!response.ok) {
    let message = "No se pudo crear el usuario";
    try {
      const data = await response.json();
      if (data?.message) {
        message = data.message as string;
      }
    } catch {
      try {
        message = await response.text();
      } catch {
        /* ignore */
      }
    }
    throw new Error(message);
  }

  return response.json();
}