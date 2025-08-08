import { getAuthToken } from '@/lib/auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function getProfile() {
  const token = getAuthToken();
  const res = await fetch(`${BACKEND_URL}/api/users/profile`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error('Error al obtener el perfil');
  }
  return res.json();
}

export async function updateProfile(data: { username?: string; email?: string; phone?: string }) {
  const token = getAuthToken();
  const res = await fetch(`${BACKEND_URL}/api/users/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw { response: { status: res.status, data: err } };
  }
  return res.json();
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const token = getAuthToken();
  const res = await fetch(`${BACKEND_URL}/api/users/password`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw { response: { status: res.status, data: err } };
  }
  return res.json();
}