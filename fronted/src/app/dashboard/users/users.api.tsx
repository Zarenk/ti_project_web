import { BACKEND_URL } from '@/lib/utils';
import { authFetch, UnauthenticatedError } from '@/utils/auth-fetch';

// Función para realizar el login
export async function loginUser(email: string, password: string) {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    const contentType = response.headers.get('content-type') || ''
    let data: any = null
    try {
      data = contentType.includes('application/json')
        ? await response.json()
        : await response.text()
    } catch (e) {
      data = null
    }

    if (!response.ok) {
      const message = typeof data === 'string' && data ? data : data?.message || 'Error al iniciar sesión'
      const error: any = new Error(message)
      if (data && typeof data === 'object') {
        if ((data as any).code) {
          error.code = (data as any).code
        }
        if ((data as any).email) {
          error.email = (data as any).email
        }
      }
      throw error
    }

    const payload = typeof data === 'string' ? {} : data
    if (typeof window !== 'undefined' && (payload as any)?.access_token) {
      localStorage.setItem('token', (payload as any).access_token)
    }
    return payload;
  } catch (error: any) {
    console.error('Error en loginUser:', error.message);
    throw error;
  }
}

// Función para obtener el perfil del usuario autenticado
export async function getUserProfile() {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/users/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (response.ok) {
      return await response.json()
    }

    if (response.status === 401) {
      return null
    }

    const errorData = await response.json()
    throw new Error(errorData.message || 'Error al obtener el perfil del usuario')

  } catch (error: any) {
    if (error instanceof UnauthenticatedError) {
      return null;
    }
    console.error('Error en getUserProfile:', error.message)
    throw error
  }
}

export async function getUserProfileId() {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/users/profileid`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status == 401) {
        return null;
      }
      throw new Error('Error al obtener el perfil del usuario');
    }

    return await response.json();
  } catch (error: any) {
    if (error instanceof UnauthenticatedError) {
      return null;
    }
    console.error('Error en getUserProfileId:', error.message);
    throw error;
  }
}


export interface DashboardUser {
  id: number;
  email: string;
  username: string;
  role: string;
  status: string;
  createdAt: string;
}

export type UserRole = "ADMIN" | "EMPLOYEE";

export async function getUsers(): Promise<DashboardUser[]> {
  try {
    const res = await authFetch(`${BACKEND_URL}/api/users`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error('Error al obtener usuarios');
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return [];
    }
    throw error;
  }
}

export async function createUser(
  email: string,
  username: string,
  password: string,
  role: string,
  status: string,
  organizationId?: number | null,
) {
  const res = await authFetch(`${BACKEND_URL}/api/users/manage/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password, role, status, organizationId }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Error al crear usuario');
  }

  return res.json();
}

export async function checkUserAvailability(payload: {
  email?: string;
  username?: string;
}): Promise<{ emailExists: boolean; usernameExists: boolean }> {
  const res = await authFetch(`${BACKEND_URL}/api/users/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || "Error al verificar el usuario");
  }

  return res.json();
}

export async function updateUser(data: { email?: string; username?: string; password?: string }) {
  const res = await authFetch(`${BACKEND_URL}/api/users/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Error al actualizar usuario');
  }

  return res.json();
}

export async function updateUserAdmin(
  userId: number,
  payload: { role?: UserRole; status?: "ACTIVO" | "INACTIVO" },
  organizationId?: number | null,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (organizationId != null) {
    headers["x-org-id"] = String(organizationId);
  }

  const res = await authFetch(`${BACKEND_URL}/api/users/${userId}/manage`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || "Error al actualizar usuario");
  }

  return (await res.json()) as DashboardUser;
}

export interface ActiveSession {
  id: number
  username: string
  email: string
  role: string
  lastActiveAt: string
  organizations: {
    id: number
    name: string
    membershipRole: string
  }[]
}

export async function getActiveSessions(): Promise<ActiveSession[]> {
  try {
    const res = await authFetch(`${BACKEND_URL}/api/users/active-sessions`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      throw new Error('Error al obtener sesiones activas')
    }

    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return []
    }
    throw error
  }
}

export async function requestPasswordRecovery(
  email: string,
): Promise<{ message: string }> {
  const response = await fetch('/api/password-recovery', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error: any = new Error(
      data?.message || 'No pudimos enviar el correo de recuperacion.',
    );
    error.response = { status: response.status, data };
    throw error;
  }

  return {
    message:
      data?.message ||
      'Te enviamos un correo electronico con los pasos para recuperar tu contraseña.',
  };
}
