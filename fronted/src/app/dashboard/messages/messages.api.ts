import { authFetch } from '@/utils/auth-fetch';

export async function getUnansweredMessages(): Promise<
  { clientId: number; count: number }[]
> {
  const res = await authFetch('/api/chat/unanswered');
  if (!res.ok) {
    throw new Error('Error al obtener los mensajes');
  }
  return res.json();
}

export async function getMessages(clientId: number) {
  const res = await authFetch('/api/clients/chat', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Error al obtener la conversación');
  }
  return res.json();
}

export async function getClients() {
  const res = await authFetch('/api/clients/chat', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Error al obtener los clientes');
  }
  return res.json();
}

export async function sendMessage(data: {
  clientId: number;
  senderId: number;
  text: string;
  file?: string;
}) {
  const res = await authFetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error('Error al enviar el mensaje');
  }
  return res.json();
}
