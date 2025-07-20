export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

// Función para realizar el login
export async function loginUser(email: string, password: string) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al iniciar sesión');
    }
    const data = await response.json();
    localStorage.setItem('token', data.access_token); // Guarda el token en localStorage
    return data;
  } catch (error: any) {
    console.error('Error en loginUser:', error.message);
    throw error;
  }
}

// Función para obtener el perfil del usuario autenticado
export async function getUserProfile() {
  const token = localStorage.getItem('token'); // Obtén el token del localStorage

  if (!token) {
    throw new Error('No se encontró un token de autenticación');
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/users/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`, // Envía el token en el encabezado Authorization
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al obtener el perfil del usuario');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error en getUserProfile:', error.message);
    throw error;
  }
}

export async function getUserProfileId() {
  const token = localStorage.getItem('token'); // Obtén el token del localStorage

  if (!token) {
    throw new Error('No se encontró un token de autenticación');
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/users/profileid`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`, // Envía el token en el encabezado Authorization
      },
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