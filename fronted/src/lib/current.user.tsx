import { jwtDecode } from "jwt-decode";
import { getAuthToken } from "@/utils/auth-token";

interface TokenPayload {
  userId?: number;
  name?: string;
  role?: string;
  exp?: number;
}

export async function getCurrentUser(): Promise<TokenPayload | null> {
  const token = await getAuthToken();
  if (!token) return null;
  try {
    const decoded = jwtDecode<TokenPayload>(token);
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}