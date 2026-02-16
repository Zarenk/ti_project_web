import { BACKEND_URL } from '@/lib/utils';
import { authFetch, UnauthenticatedError } from '@/utils/auth-fetch';

export async function getProfile() {
  try {
    const res = await authFetch(`${BACKEND_URL}/api/users/profile`, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error('Error al obtener el perfil');
    }
    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return null;
    }
    throw error;
  }
}

export async function updateProfile(data: { username?: string; email?: string; phone?: string; image?: string }) {
  const res = await authFetch(`${BACKEND_URL}/api/users/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw { response: { status: res.status, data: err } };
  }
  return res.json();
}

export async function uploadProfileImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BACKEND_URL}/api/clients/upload-image`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Error al subir la imagen');
  }

  return res.json() as Promise<{ url: string }>;
}

export async function getClientActivity() {
  try {
    const res = await authFetch(`${BACKEND_URL}/api/clients/activity`, {
      cache: 'no-store',
    });

    if (res.status === 401) return [];
    if (!res.ok) throw new Error('Error al cargar la actividad');

    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return [];
    }
    throw error;
  }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const res = await authFetch(`${BACKEND_URL}/api/users/password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw { response: { status: res.status, data: err } };
  }
  return res.json();
}