export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function getUserHistory(userId: number) {
  const res = await fetch(`${BACKEND_URL}/api/inventory/history/users/${userId}`);
  if (!res.ok) {
    throw new Error('Error al obtener el historial del usuario');
  }
  return res.json();
}

export async function getUserActivity(userId: number) {
  const res = await fetch(`${BACKEND_URL}/api/activity/users/${userId}`);
  if (!res.ok) {
    throw new Error('Error al obtener la actividad del usuario');
  }
  return res.json();
}