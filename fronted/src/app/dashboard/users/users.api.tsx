export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
import { getAuthHeaders } from '@/utils/auth-token';

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

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al iniciar sesión');
    }
    const data = await response.json();
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', data.access_token);
    }
    return data;
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

export async function createUser(
  email: string,
  username: string,
  password: string,
  role: string
) {
  const res = await fetch(`${BACKEND_URL}/api/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password, role }),
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

  const res = await fetch(`${BACKEND_URL}/api/users/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Error al actualizar usuario');
  }

  return res.json();
}