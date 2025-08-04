const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function getUnansweredMessages() {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No se encontró un token de autenticación');
  }
  const res = await fetch(`${BACKEND_URL}/api/chat/unanswered`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Error al obtener los mensajes');
  }
  return res.json();
}

export async function getMessages(clientId: number) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No se encontró un token de autenticación');
  }
  const res = await fetch(`${BACKEND_URL}/api/chat/${clientId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error('Error al obtener la conversación');
  }
  return res.json();
}

export async function sendMessage(data: {
  clientId: number;
  senderId: number;
  text: string;
}) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No se encontró un token de autenticación');
  }
  const res = await fetch(`${BACKEND_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error('Error al enviar el mensaje');
  }
  return res.json();
}
