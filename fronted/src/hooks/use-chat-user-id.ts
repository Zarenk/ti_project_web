import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { BACKEND_URL } from '@/lib/utils';

export function useChatUserId() {
  const { userId: contextUserId } = useAuth();
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    const fetchGuest = async () => {
      if (contextUserId) {
        setUserId(contextUserId);
        return;
      }
      try {
        let storedId = localStorage.getItem('guestId');
        const expiresAt = Number(localStorage.getItem('guestIdExpires'));
        if (!storedId || !expiresAt || expiresAt < Date.now()) {
          const res = await fetch(`${BACKEND_URL}/api/clients/guest`, {
            method: 'POST',
          });
          if (!res.ok) throw new Error('Failed to create guest');
          const data = await res.json();
          storedId = String(data.userId);
          const nextDay = Date.now() + 24 * 60 * 60 * 1000;
          localStorage.setItem('guestId', storedId);
          localStorage.setItem('guestIdExpires', String(nextDay));
        }
        setUserId(Number(storedId));
      } catch (err) {
        console.error('Error obtaining guest id', err);
      }
    };
    fetchGuest();
  }, [contextUserId]);

  return userId;
}