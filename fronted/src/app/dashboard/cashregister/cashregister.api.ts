import { getAuthHeaders } from "@/utils/auth-token";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

async function authorizedFetch(
  url: string,
  init: RequestInit = {},
  requireAuth = true,
): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  if (requireAuth && !("Authorization" in authHeaders)) {
    throw new Error("No se encontro un token de autenticacion");
  }

  const headers = new Headers(init.headers ?? {});
  for (const [key, value] of Object.entries(authHeaders)) {
    if (value != null && value !== "") {
      headers.set(key, value);
    }
  }

  return fetch(url, {
    ...init,
    headers,
    credentials: init.credentials ?? "include",
  });
}

async function safeJson<T>(response: Response): Promise<T | null> {
  if (response.status === 204) return null;
  try {
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
}

// CAJA
export async function getCashRegisterBalance(storeId: number) {
  try {
    const response = await authorizedFetch(
      `${BACKEND_URL}/api/cashregister/balance/${storeId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error("Error al obtener el balance");
    }

    if (response.status === 204) {
      return null;
    }

    const data = await safeJson<{ currentBalance?: number }>(response);
    if (data === null || data.currentBalance == null) {
      return null;
    }

    return Number(data.currentBalance ?? 0);
  } catch (error: any) {
    console.error("Error al obtener el balance de la caja:", error.message || error);
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
}

export async function getTodayTransactions(storeId: number) {
  try {
    const response = await authorizedFetch(
      `${BACKEND_URL}/api/cashregister/transactions/${storeId}/today`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Error al obtener las transacciones del dia.");
    }

    return response.json();
  } catch (error: any) {
    console.error("Error al obtener las transacciones del dia:", error.message || error);
    throw error;
  }
}

export const createIndependentTransaction = async (data: {
  cashRegisterId: number;
  userId: number;
  type: "INCOME" | "EXPENSE";
  amount: number;
  employee: string;
  description?: string;
  paymentMethods: { method: string; amount: number }[];
  clientName?: string;
  clientDocument?: string;
  clientDocumentType?: string;
}) => {
  const payload = {
    cashRegisterId: data.cashRegisterId,
    userId: data.userId,
    type: data.type,
    amount: data.amount,
    description: data.description || "",
    employee: data.employee,
    clientName: data.clientName,
    clientDocument: data.clientDocument,
    clientDocumentType: data.clientDocumentType,
    paymentMethods: data.paymentMethods.map((pm) => ({
      method: pm.method,
      amount: Number(pm.amount),
    })),
  };

  const response = await authorizedFetch(`${BACKEND_URL}/api/cashregister/transaction`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Error Body:", text);
    throw new Error("Error al registrar la transaccion");
  }

  return response.json();
};

export async function getActiveCashRegister(
  storeId: number,
): Promise<{ id: number; name: string; currentBalance: number; initialBalance: number } | null> {
  try {
    const response = await authorizedFetch(`${BACKEND_URL}/api/cashregister/active/${storeId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error("No se pudo obtener la caja activa.");
    }

    if (response.status === 204) {
      return null;
    }

    const data = await safeJson<{
      id: number;
      name: string;
      currentBalance: number;
      initialBalance: number;
    }>(response);

    if (data === null) {
      return null;
    }

    console.log("Response de la caja activa:", data);
    return data;
  } catch (error) {
    console.error("Error al obtener la caja activa:", error);
    if (error instanceof SyntaxError) {
      return null;
    }
    throw new Error("Error al obtener la caja activa. Por favor, intente nuevamente.");
  }
}

export interface CashClosureSummary {
  id: number;
  cashRegisterId: number;
  userId: number;
  openingBalance: number;
  closingBalance: number;
  totalIncome: number;
  totalExpense: number;
  nextOpeningBalance?: number | null;
  notes?: string | null;
  createdAt: string;
  storeId?: number;
}

export interface CashRegisterSummary {
  id: number;
  name: string;
  description?: string | null;
  storeId: number;
  initialBalance: number;
  currentBalance: number;
  status: string;
  createdAt: string;
}

export interface CreateCashClosureResponse {
  closure: CashClosureSummary;
  closedCashRegister: CashRegisterSummary | null;
  nextCashRegister: CashRegisterSummary | null;
  requestedNextInitialBalance?: number;
}

export async function createCashClosure(payload: any): Promise<CreateCashClosureResponse> {
  const cleanPayload = {
    ...payload,
    storeId: Number(payload.storeId),
    cashRegisterId: Number(payload.cashRegisterId),
    userId: Number(payload.userId),
    openingBalance: Number(payload.openingBalance),
    closingBalance: Number(payload.closingBalance),
    totalIncome: Number(payload.totalIncome),
    totalExpense: Number(payload.totalExpense),
    nextInitialBalance:
      payload.nextInitialBalance !== undefined && payload.nextInitialBalance !== null
        ? Number(payload.nextInitialBalance)
        : undefined,
  };

  const response = await authorizedFetch(`${BACKEND_URL}/api/cashregister/closure`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cleanPayload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const errorMessage = errorBody?.message || "Error desconocido al cerrar la caja";
    console.error("Error en createCashClosure:", errorMessage);
    throw new Error(errorMessage);
  }

  const raw = await response.json();

  const parseDecimal = (value: unknown): number => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const normalizeCashRegister = (value: any): CashRegisterSummary | null => {
    if (!value) return null;
    return {
      id: Number(value.id),
      name: value.name,
      description: value.description ?? null,
      storeId: Number(value.storeId),
      initialBalance: parseDecimal(value.initialBalance),
      currentBalance: parseDecimal(value.currentBalance),
      status: value.status,
      createdAt: value.createdAt,
    };
  };

  const closure = raw?.closure ?? null;
  const normalizedClosure: CashClosureSummary = {
    id: Number(closure?.id ?? 0),
    cashRegisterId: Number(closure?.cashRegisterId ?? payload.cashRegisterId ?? 0),
    userId: Number(closure?.userId ?? payload.userId ?? 0),
    openingBalance: parseDecimal(closure?.openingBalance ?? payload.openingBalance ?? 0),
    closingBalance: parseDecimal(closure?.closingBalance ?? payload.closingBalance ?? 0),
    totalIncome: parseDecimal(closure?.totalIncome ?? payload.totalIncome ?? 0),
    totalExpense: parseDecimal(closure?.totalExpense ?? payload.totalExpense ?? 0),
    nextOpeningBalance:
      closure?.nextOpeningBalance !== undefined && closure?.nextOpeningBalance !== null
        ? parseDecimal(closure.nextOpeningBalance)
        : undefined,
    notes: closure?.notes ?? payload.notes ?? null,
    createdAt: closure?.createdAt ?? new Date().toISOString(),
    storeId: Number(closure?.storeId ?? payload.storeId ?? 0) || undefined,
  };

  const requestedNextInitialBalance =
    typeof raw?.requestedNextInitialBalance === "number"
      ? raw.requestedNextInitialBalance
      : payload.nextInitialBalance !== undefined
        ? Number(payload.nextInitialBalance)
        : undefined;

  return {
    closure: normalizedClosure,
    closedCashRegister: normalizeCashRegister(raw?.closedCashRegister),
    nextCashRegister: normalizeCashRegister(raw?.nextCashRegister),
    requestedNextInitialBalance,
  };
}

export async function getClosuresByStore(storeId: number) {
  const response = await authorizedFetch(`${BACKEND_URL}/api/cashregister/closures/${storeId}`);
  if (!response.ok) {
    throw new Error("Error al obtener los cierres de caja");
  }
  return response.json();
}

export async function getTransactionsByDate(storeId: number, date: string) {
  try {
    const res = await authorizedFetch(
      `${BACKEND_URL}/api/cashregister/get-transactions/${storeId}/${date}`,
    );
    if (!res.ok) {
      throw new Error("Error obteniendo transacciones por fecha");
    }
    return res.json();
  } catch (error) {
    console.error("Error en getTransactionsByDate:", error);
    throw error;
  }
}

export async function getClosureByDate(storeId: number, date: string) {
  const response = await authorizedFetch(
    `${BACKEND_URL}/api/cashregister/closure/${storeId}/by-date/${date}`,
  );
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export const createCashRegister = async (payload: any) => {
  const response = await authorizedFetch(`${BACKEND_URL}/api/cashregister`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Error al crear la caja registradora");
  }

  return response.json();
};

export const getTransactions = async (cashRegisterId: number) => {
  const response = await authorizedFetch(
    `${BACKEND_URL}/api/cashregister/transaction/cashregister/${cashRegisterId}`,
  );

  if (!response.ok) {
    throw new Error("Error al obtener las transacciones de la caja");
  }

  return response.json();
};

export const getAllCashRegisters = async () => {
  const response = await authorizedFetch(`${BACKEND_URL}/api/cashregister`);
  if (!response.ok) {
    throw new Error("Error al obtener las cajas registradoras");
  }
  return response.json();
};
