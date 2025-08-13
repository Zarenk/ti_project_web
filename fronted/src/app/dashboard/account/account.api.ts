import { getAuthHeaders } from '@/utils/auth-token';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function getProfile() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/api/users/profile`, {
    method: 'POST',
    headers,
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error('Error al obtener el perfil');
  }
  return res.json();
}

export async function updateProfile(data: { username?: string; email?: string; phone?: string; image?: string }) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/api/users/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    credentials: 'include',
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

export async function changePassword(currentPassword: string, newPassword: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/api/users/password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    credentials: 'include',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw { response: { status: res.status, data: err } };
  }
  return res.json();
}