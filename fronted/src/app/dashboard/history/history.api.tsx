export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function getUserHistory(userId: number) {
  const res = await fetch(`${BACKEND_URL}/api/entries/history/users/${userId}`);
  if (!res.ok) {
    throw new Error('Error al obtener el historial del usuario');
  }
  return res.json();
}