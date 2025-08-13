import { jwtDecode } from "jwt-decode";
import { getAuthToken } from "@/utils/auth-token";

interface TokenPayload {
  userId: number;
  name: string;
  role?: string;
  exp?: number;
}

export async function getCurrentUser(): Promise<TokenPayload | null> {
  const token = await getAuthToken();
  if (!token) return null;
  try {
    const decoded: any = jwtDecode(token);
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return null;
    }
    const userId = typeof decoded.userId === 'number' ? decoded.userId : decoded.sub;
    const name = decoded.name ?? decoded.username;
    if (typeof userId !== 'number' || typeof name !== 'string') {
      return null;
    }
    return { userId, name, role: decoded.role };
  } catch {
    return null;
  }
}