import { authFetch, UnauthenticatedError } from "@/utils/auth-fetch";

export type AccountType = "ACTIVO" | "PASIVO" | "PATRIMONIO" | "INGRESO" | "GASTO";

export interface Account {
  id: string;
  code: string;
  name: string;
  accountType?: AccountType;
  parentId?: string | null;
  children?: Account[];
  balance?: number;
  updatedAt?: string;
}

export async function fetchAccounts(): Promise<Account[]> {
  let res: Response;
  try {
    res = await authFetch("/accounting/accounts", {
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return [];
    }
    throw error;
  }
  if (!res.ok) {
    throw new Error("No se pudieron obtener las cuentas contables");
  }
  return (await res.json()) as Account[];
}

export async function createAccount(data: Omit<Account, "id" | "children">) {
  try {
    const res = await authFetch("/accounting/accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (res.status === 400) {
      throw ((await res.json())?.errors ?? {}) as Record<string, string>;
    }
    if (!res.ok) {
      throw new Error("No se pudo crear la cuenta contable");
    }
    return (await res.json()) as Account;
  } catch (error) {
    throw error;
  }
}

export async function updateAccount(id: string, data: Omit<Account, "id" | "children">) {
  try {
    const res = await authFetch(`/accounting/accounts/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (res.status === 400) {
      throw ((await res.json())?.errors ?? {}) as Record<string, string>;
    }
    if (!res.ok) {
      throw new Error("No se pudo actualizar la cuenta contable");
    }
    return (await res.json()) as Account;
  } catch (error) {
    throw error;
  }
}
