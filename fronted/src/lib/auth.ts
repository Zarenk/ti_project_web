import { jwtDecode } from "jwt-decode";

/**
 * Extrae el userId del token JWT almacenado en localStorage
 * @returns userId (número) o null si no existe o el token es inválido
 */
interface UserTokenPayload {
    sub: number;
    username: string;
    role?: string;
    iat?: number;
}

export function getUserDataFromToken(): { userId: number; name: string; role?: string } | null {
    if (typeof window === "undefined") return null;
  
    const token = localStorage.getItem("token");
    if (!token) return null;
  
    try {
      const decoded = jwtDecode<UserTokenPayload>(token);
      return {
        userId: decoded.sub,
        name: decoded.username,
        role: decoded.role,
      };
    } catch (error) {
      console.error("Error decoding token:", error);
      return null;
    }
  }
  
  export function isTokenValid(): boolean {
    if (typeof window === "undefined") return false;
  
    const token = localStorage.getItem("token");
    if (!token) return false;
  
    try {
      const payload: any = jwtDecode(token);
  
      // Verificar expiración si tu token tiene "exp"
      if (payload.exp) {
        const currentTime = Date.now() / 1000; // en segundos
        return payload.exp > currentTime;
      }
  
      // Si no tiene "exp", asumimos que es válido
      return true;
    } catch (error) {
      console.error("Error decoding token:", error);
      return false;
    }
  }

  export function getLastAccessFromToken(): Date | null {
    if (typeof window === "undefined") return null;

    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      const decoded = jwtDecode<UserTokenPayload>(token);
      if (decoded.iat) {
        return new Date(decoded.iat * 1000);
      }
      return null;
    } catch (error) {
      console.error("Error decoding token:", error);
      return null;
    }
  }