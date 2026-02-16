import { authFetch, UnauthenticatedError } from '@/utils/auth-fetch';

export async function getUnansweredMessages(): Promise<
  { clientId: number; count: number }[]
> {
  let res: Response;
  try {
    res = await authFetch('/chat/unanswered');
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return [];
    }
    throw error;
  }
  if (!res.ok) {
    throw new Error('Error al obtener los mensajes');
  }
  return res.json();
}

export async function getMessages(clientId: number) {
  let res: Response;
  try {
    res = await authFetch(`/chat/${clientId}`, { cache: 'no-store' });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return [];
    }
    throw error;
  }
  if (!res.ok) {
    throw new Error('Error al obtener la conversacion');
  }
  return res.json();
}


export async function getClients() {
  let res: Response;
  try {
    res = await authFetch('/clients/chat', { cache: 'no-store' });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return [];
    }
    throw error;
  }
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
  const res = await authFetch('/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let message = 'Error al enviar el mensaje';
    try {
      const payload = (await res.json()) as { message?: string | string[] };
      if (typeof payload?.message === 'string' && payload.message.trim()) {
        message = payload.message;
      } else if (Array.isArray(payload?.message) && payload.message.length > 0) {
        message = String(payload.message[0]);
      }
    } catch {
      // Ignore malformed backend payload and preserve default message.
    }
    throw new Error(message);
  }
  return res.json();
}
