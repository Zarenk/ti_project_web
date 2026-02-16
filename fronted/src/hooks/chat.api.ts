import { BACKEND_URL } from "@/lib/utils";
import { authFetch } from "@/utils/auth-fetch";

export type GuestChatSession = {
  userId: number;
  guestToken: string;
  guestTokenExpiresInSeconds: number;
};

export async function createGuestUser(): Promise<GuestChatSession> {
  const res = await authFetch(`${BACKEND_URL}/api/public/clients/guest`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error("Failed to create guest");
  }

  return res.json();
}
