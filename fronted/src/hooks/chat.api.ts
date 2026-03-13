import { BACKEND_URL } from "@/lib/utils";

export type GuestChatSession = {
  userId: number;
  guestToken: string;
  guestTokenExpiresInSeconds: number;
};

export async function createGuestUser(): Promise<GuestChatSession> {
  const res = await fetch(`${BACKEND_URL}/api/public/clients/guest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error("Failed to create guest");
  }

  return res.json();
}
