export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function registerUser(email: string, username: string, password: string, name: string) {
  const res = await fetch(`${BACKEND_URL}/api/users/self-register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password, name }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Error al registrar usuario');
  }

  return res.json(); // devuelve el usuario creado
}

export async function createClient(data: { name: string; userId?: number; image?: string; type?: string; typeNumber?: string }) {
  const res = await fetch(`${BACKEND_URL}/api/clients/self-register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Error al crear cliente');
  }

  return res.json();
}