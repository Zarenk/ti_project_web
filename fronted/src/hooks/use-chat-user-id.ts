import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { createGuestUser } from './chat.api';

export const CHAT_GUEST_ID_KEY = 'guestId';
export const CHAT_GUEST_ID_EXPIRES_KEY = 'guestIdExpires';
export const CHAT_GUEST_TOKEN_KEY = 'chatGuestToken';
export const CHAT_GUEST_TOKEN_EXPIRES_KEY = 'chatGuestTokenExpires';

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
        let storedId = localStorage.getItem(CHAT_GUEST_ID_KEY);
        const expiresAt = Number(
          localStorage.getItem(CHAT_GUEST_ID_EXPIRES_KEY),
        );
        const guestToken = localStorage.getItem(CHAT_GUEST_TOKEN_KEY);
        const guestTokenExpiresAt = Number(
          localStorage.getItem(CHAT_GUEST_TOKEN_EXPIRES_KEY),
        );
        const shouldRefreshGuestSession =
          !storedId ||
          !expiresAt ||
          expiresAt < Date.now() ||
          !guestToken ||
          !guestTokenExpiresAt ||
          guestTokenExpiresAt < Date.now();

        if (shouldRefreshGuestSession) {
          const data = await createGuestUser();
          storedId = String(data.userId);
          const nextExpiry =
            Date.now() + Math.max(60, data.guestTokenExpiresInSeconds) * 1000;
          localStorage.setItem(CHAT_GUEST_ID_KEY, storedId);
          localStorage.setItem(CHAT_GUEST_ID_EXPIRES_KEY, String(nextExpiry));
          localStorage.setItem(CHAT_GUEST_TOKEN_KEY, data.guestToken);
          localStorage.setItem(CHAT_GUEST_TOKEN_EXPIRES_KEY, String(nextExpiry));
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
