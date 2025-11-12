import { getAuthHeaders } from '@/utils/auth-token';

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

async function authorizedFetch(url: string, init: RequestInit = {}) {
  const auth = await getAuthHeaders();
  const headers = new Headers(init.headers ?? {});

  for (const [key, value] of Object.entries(auth)) {
    if (value != null && value !== '') {
      headers.set(key, value);
    }
  }

  return fetch(url, { ...init, headers });
}

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
      throw new Error(message)
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
  const headers = await getAuthHeaders();
  if (Object.keys(headers).length === 0) {
    return null;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/users/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
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
    console.error('Error en getUserProfile:', error.message)
    throw error
  }
}

export async function getUserProfileId() {
  const headers = await getAuthHeaders();
  if (!('Authorization' in headers)) {
    throw new Error('No se encontró un token de autenticación');
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/users/profileid`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...headers },
    });

    if (!response.ok) {
      throw new Error('Error al obtener el perfil del usuario');
    }

    return await response.json(); // Devuelve el perfil del usuario
  } catch (error: any) {
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
  const res = await authorizedFetch(`${BACKEND_URL}/api/users`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Error al obtener usuarios');
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function createUser(
  email: string,
  username: string,
  password: string,
  role: string,
  status: string,
  organizationId?: number | null,
) {
  const res = await authorizedFetch(`${BACKEND_URL}/api/users/register`, {
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

export async function updateUser(data: { email?: string; username?: string; password?: string }) {
  const headers = await getAuthHeaders();
  if (!('Authorization' in headers)) {
    throw new Error('No se encontró un token de autenticación');
  }

  const res = await authorizedFetch(`${BACKEND_URL}/api/users/profile`, {
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
  const headers = await getAuthHeaders();
  headers["Content-Type"] = "application/json";
  if (organizationId != null) {
    headers["x-org-id"] = String(organizationId);
  }

  const res = await fetch(`${BACKEND_URL}/api/users/${userId}/manage`, {
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
